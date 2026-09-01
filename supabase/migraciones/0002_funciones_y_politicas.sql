-- Centro de Trabajo — funciones auxiliares, disparadores y políticas de acceso.
--
-- Las funciones son SECURITY DEFINER a propósito: consultan space_members sin
-- quedar atrapadas en la política de esa misma tabla (recursión infinita).

-- ---------- Quién es quién ----------

create or replace function public.is_space_member(p_space uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1 from public.space_members
    where space_id = p_space and user_id = auth.uid()
  );
$$;

create or replace function public.can_manage_space(p_space uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1 from public.space_members
    where space_id = p_space and user_id = auth.uid()
      and role in ('owner', 'socio')
  );
$$;

create or replace function public.space_role_of(p_space uuid)
returns space_role language sql stable security definer set search_path to 'public' as $$
  select role from public.space_members
  where space_id = p_space and user_id = auth.uid()
  limit 1;
$$;

create or replace function public.shares_space_with(p_user uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1
    from public.space_members a
    join public.space_members b on a.space_id = b.space_id
    where a.user_id = auth.uid() and b.user_id = p_user
  );
$$;

create or replace function public.task_space(p_task uuid)
returns uuid language sql stable security definer set search_path to 'public' as $$
  select space_id from public.tasks where id = p_task;
$$;

-- ---------- Disparadores ----------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, new.phone, new.id::text),
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, ''), '@', 1),
      'Usuario'
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set email = excluded.email;
  return new;
exception when others then
  -- Un fallo aquí no debe impedir el alta del usuario.
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Quien crea un espacio queda dentro como dueño; si no, nadie podría entrar.
create or replace function public.handle_new_space()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  insert into public.space_members (space_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (space_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_space_created on public.spaces;
create trigger on_space_created
  after insert on public.spaces
  for each row execute function public.handle_new_space();

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path to '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

drop trigger if exists tasks_touch on public.tasks;
create trigger tasks_touch before update on public.tasks
  for each row execute function public.touch_updated_at();

-- Marca sola la fecha de cierre y la de aprobación al salir de la bandeja.
create or replace function public.stamp_task_state()
returns trigger language plpgsql set search_path to '' as $$
begin
  if new.status = 'completada' and (old.status is distinct from 'completada') then
    new.completed_at = now();
  elsif new.status <> 'completada' then
    new.completed_at = null;
  end if;

  if old.status = 'inbox' and new.status <> 'inbox' and new.approved_at is null then
    new.approved_at = now();
    new.approved_by = auth.uid();
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_stamp on public.tasks;
create trigger tasks_stamp before update on public.tasks
  for each row execute function public.stamp_task_state();

-- Bitácora y avisos. Una solicitud nueva avisa a quien manda en el espacio;
-- un cambio de estado avisa a quien la pidió.
create or replace function public.log_task_event()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  v_actor uuid := auth.uid();
  v_space uuid := coalesce(new.space_id, old.space_id);
  v_type  text;
  v_title text;
  v_body  text;
  m       record;
begin
  if tg_op = 'INSERT' then
    v_type := case when new.status = 'inbox' then 'task.requested' else 'task.created' end;
    insert into public.activity (space_id, project_id, task_id, actor_id, type, payload)
    values (v_space, new.project_id, new.id, v_actor, v_type, jsonb_build_object('title', new.title));

    if new.status = 'inbox' then
      select coalesce(p.full_name, p.email) into v_title from public.profiles p where p.id = v_actor;
      for m in
        select sm.user_id from public.space_members sm
        where sm.space_id = v_space and sm.role in ('owner', 'socio') and sm.user_id <> v_actor
      loop
        insert into public.notifications (user_id, type, title, body, url)
        values (m.user_id, 'task.requested',
                'Nueva solicitud de ' || coalesce(v_title, 'un colaborador'),
                new.title, '/bandeja');
      end loop;
    end if;

  elsif tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      insert into public.activity (space_id, project_id, task_id, actor_id, type, payload)
      values (v_space, new.project_id, new.id, v_actor, 'task.status',
              jsonb_build_object('from', old.status, 'to', new.status, 'title', new.title));

      if new.created_by <> coalesce(v_actor, '00000000-0000-0000-0000-000000000000'::uuid) then
        v_body := case new.status
          when 'pendiente'   then 'Tu solicitud fue aceptada y agendada'
          when 'en_progreso' then 'Ya está en progreso'
          when 'completada'  then 'Quedó completada'
          when 'bloqueada'   then 'Quedó bloqueada'
          when 'descartada'  then 'Fue descartada'
          else null end;
        if v_body is not null then
          insert into public.notifications (user_id, type, title, body, url)
          values (new.created_by, 'task.status', new.title, v_body, '/bandeja');
        end if;
      end if;
    end if;
  end if;

  return null;
end;
$$;

drop trigger if exists tasks_log on public.tasks;
create trigger tasks_log after insert or update on public.tasks
  for each row execute function public.log_task_event();

create or replace function public.log_comment_event()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  v_space uuid := public.task_space(new.task_id);
  v_name  text;
  v_task  text;
  m       record;
begin
  select coalesce(p.full_name, p.email) into v_name from public.profiles p where p.id = new.author_id;
  select t.title into v_task from public.tasks t where t.id = new.task_id;

  insert into public.activity (space_id, task_id, actor_id, type, payload)
  values (v_space, new.task_id, new.author_id, 'comment.created', jsonb_build_object('task', v_task));

  for m in
    select distinct sm.user_id from public.space_members sm
    where sm.space_id = v_space and sm.user_id <> new.author_id
  loop
    insert into public.notifications (user_id, type, title, body, url)
    values (m.user_id, 'comment.created',
            coalesce(v_name, 'Alguien') || ' comentó en «' || coalesce(v_task, 'una tarea') || '»',
            left(new.body, 140), '/bandeja');
  end loop;
  return null;
end;
$$;

drop trigger if exists comments_log on public.comments;
create trigger comments_log after insert on public.comments
  for each row execute function public.log_comment_event();

-- ---------- Aislamiento ----------

alter table public.profiles           enable row level security;
alter table public.spaces             enable row level security;
alter table public.space_members      enable row level security;
alter table public.projects           enable row level security;
alter table public.tasks              enable row level security;
alter table public.comments           enable row level security;
alter table public.activity           enable row level security;
alter table public.notifications      enable row level security;
alter table public.invitations        enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.watch_events       enable row level security;

-- Solo se ve a quien comparte espacio contigo.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_space_with(id));

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- La regla central: un espacio no existe para quien no es miembro.
drop policy if exists spaces_select on public.spaces;
create policy spaces_select on public.spaces for select to authenticated
  using (public.is_space_member(id));

drop policy if exists spaces_insert on public.spaces;
create policy spaces_insert on public.spaces for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists spaces_update on public.spaces;
create policy spaces_update on public.spaces for update to authenticated
  using (public.space_role_of(id) = 'owner') with check (public.space_role_of(id) = 'owner');

drop policy if exists spaces_delete on public.spaces;
create policy spaces_delete on public.spaces for delete to authenticated
  using (public.space_role_of(id) = 'owner');

drop policy if exists members_select on public.space_members;
create policy members_select on public.space_members for select to authenticated
  using (public.is_space_member(space_id));

drop policy if exists members_write on public.space_members;
create policy members_write on public.space_members for insert to authenticated
  with check (public.space_role_of(space_id) = 'owner');

drop policy if exists members_update on public.space_members;
create policy members_update on public.space_members for update to authenticated
  using (public.space_role_of(space_id) = 'owner')
  with check (public.space_role_of(space_id) = 'owner');

drop policy if exists members_delete on public.space_members;
create policy members_delete on public.space_members for delete to authenticated
  using (public.space_role_of(space_id) = 'owner' or user_id = auth.uid());

drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects for select to authenticated
  using (public.is_space_member(space_id));

drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects for insert to authenticated
  with check (public.can_manage_space(space_id) and created_by = auth.uid());

drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects for update to authenticated
  using (public.can_manage_space(space_id)) with check (public.can_manage_space(space_id));

drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects for delete to authenticated
  using (public.can_manage_space(space_id));

drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks for select to authenticated
  using (public.is_space_member(space_id));

-- Quien no manda solo puede dejar una solicitud (inbox, sin fecha comprometida).
drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks for insert to authenticated
  with check (
    public.is_space_member(space_id) and created_by = auth.uid()
    and (public.can_manage_space(space_id) or (status = 'inbox' and due_date is null))
  );

drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks for update to authenticated
  using (public.can_manage_space(space_id) or (created_by = auth.uid() and status = 'inbox'))
  with check (
    public.can_manage_space(space_id)
    or (created_by = auth.uid() and status = 'inbox' and due_date is null)
  );

drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks for delete to authenticated
  using (public.can_manage_space(space_id) or (created_by = auth.uid() and status = 'inbox'));

drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments for select to authenticated
  using (public.is_space_member(public.task_space(task_id)));

drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert to authenticated
  with check (public.is_space_member(public.task_space(task_id)) and author_id = auth.uid());

drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments for delete to authenticated
  using (author_id = auth.uid() or public.can_manage_space(public.task_space(task_id)));

drop policy if exists activity_select on public.activity;
create policy activity_select on public.activity for select to authenticated
  using (public.is_space_member(space_id));

drop policy if exists invitations_select on public.invitations;
create policy invitations_select on public.invitations for select to authenticated
  using (
    public.can_manage_space(space_id)
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists invitations_insert on public.invitations;
create policy invitations_insert on public.invitations for insert to authenticated
  with check (public.can_manage_space(space_id) and invited_by = auth.uid());

drop policy if exists invitations_delete on public.invitations;
create policy invitations_delete on public.invitations for delete to authenticated
  using (public.can_manage_space(space_id));

-- Los avisos y las suscripciones son de cada quien.
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists push_select on public.push_subscriptions;
create policy push_select on public.push_subscriptions for select to authenticated
  using (user_id = auth.uid());

drop policy if exists push_write on public.push_subscriptions;
create policy push_write on public.push_subscriptions for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists push_delete on public.push_subscriptions;
create policy push_delete on public.push_subscriptions for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists watch_select on public.watch_events;
create policy watch_select on public.watch_events for select to authenticated
  using (public.is_space_member(space_id));
