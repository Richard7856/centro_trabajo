-- ---------- Quién alcanza qué proyecto ----------

create or replace function public.espacio_del_proyecto(p_project uuid)
returns uuid language sql stable security definer set search_path to 'public' as $$
  select space_id from public.projects where id = p_project;
$$;

-- Un socio ve todo su espacio; un cliente solo los proyectos donde se le dio
-- acceso expreso. Esta es la regla que permite meter a dos clientes distintos
-- en el mismo espacio sin que se enteren uno del otro.
create or replace function public.alcanza_proyecto(p_project uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1
    from public.projects p
    join public.space_members m
      on m.space_id = p.space_id and m.user_id = auth.uid()
    where p.id = p_project
      and (
        m.role in ('owner', 'socio', 'invitado')
        or (
          m.role = 'cliente'
          and exists (
            select 1 from public.project_members pm
            where pm.project_id = p.id and pm.user_id = auth.uid()
          )
        )
      )
  );
$$;

create or replace function public.es_cliente_en(p_space uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1 from public.space_members
    where space_id = p_space and user_id = auth.uid() and role = 'cliente'
  );
$$;

revoke execute on function public.espacio_del_proyecto(uuid) from public, anon;
revoke execute on function public.alcanza_proyecto(uuid)     from public, anon;
revoke execute on function public.es_cliente_en(uuid)        from public, anon;
grant execute on function public.espacio_del_proyecto(uuid) to authenticated;
grant execute on function public.alcanza_proyecto(uuid)     to authenticated;
grant execute on function public.es_cliente_en(uuid)        to authenticated;

-- ---------- Proyectos y tareas: se acota al cliente ----------

drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects for select to authenticated
  using (public.alcanza_proyecto(id));

drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks for select to authenticated
  using (
    case when project_id is null
      -- Las tareas sueltas del espacio son trabajo interno: el cliente no las ve.
      then public.is_space_member(space_id) and not public.es_cliente_en(space_id)
      else public.alcanza_proyecto(project_id)
    end
  );

drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks for insert to authenticated
  with check (
    created_by = auth.uid()
    and (project_id is null or space_id = public.espacio_del_proyecto(project_id))
    and (
      case when project_id is null
        then public.is_space_member(space_id) and not public.es_cliente_en(space_id)
        else public.alcanza_proyecto(project_id)
      end
    )
    -- Quien no manda solo deja una solicitud, sin comprometer fecha.
    and (public.can_manage_space(space_id) or (status = 'inbox' and due_date is null))
  );

-- ---------- Miembros de un proyecto ----------

drop policy if exists project_members_select on public.project_members;
create policy project_members_select on public.project_members for select to authenticated
  using (user_id = auth.uid() or public.can_manage_space(public.espacio_del_proyecto(project_id)));

drop policy if exists project_members_write on public.project_members;
create policy project_members_write on public.project_members for insert to authenticated
  with check (public.can_manage_space(public.espacio_del_proyecto(project_id)));

drop policy if exists project_members_delete on public.project_members;
create policy project_members_delete on public.project_members for delete to authenticated
  using (public.can_manage_space(public.espacio_del_proyecto(project_id)));

-- ---------- Entregas ----------

do $$ begin
  create type milestone_status as enum
    ('planeada', 'en_progreso', 'entregada', 'aprobada', 'cancelada');
exception when duplicate_object then null; end $$;

create table if not exists public.milestones (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects (id) on delete cascade,
  title           text not null check (length(trim(title)) > 0),
  description     text,
  status          milestone_status not null default 'planeada',
  due_date        date,
  position        integer not null default 0,
  -- Un paso interno no tiene por qué aparecerle al cliente.
  visible_cliente boolean not null default true,
  delivered_at    timestamptz,
  approved_at     timestamptz,
  created_by      uuid not null references public.profiles (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists milestones_project_idx on public.milestones (project_id, position);
create index if not exists milestones_due_idx on public.milestones (due_date)
  where status in ('planeada', 'en_progreso');

alter table public.milestones enable row level security;

drop policy if exists milestones_select on public.milestones;
create policy milestones_select on public.milestones for select to authenticated
  using (
    public.alcanza_proyecto(project_id)
    and (visible_cliente or not public.es_cliente_en(public.espacio_del_proyecto(project_id)))
  );

drop policy if exists milestones_write on public.milestones;
create policy milestones_write on public.milestones for insert to authenticated
  with check (
    public.can_manage_space(public.espacio_del_proyecto(project_id))
    and created_by = auth.uid()
  );

drop policy if exists milestones_update on public.milestones;
create policy milestones_update on public.milestones for update to authenticated
  using (public.can_manage_space(public.espacio_del_proyecto(project_id)))
  with check (public.can_manage_space(public.espacio_del_proyecto(project_id)));

drop policy if exists milestones_delete on public.milestones;
create policy milestones_delete on public.milestones for delete to authenticated
  using (public.can_manage_space(public.espacio_del_proyecto(project_id)));

drop trigger if exists milestones_touch on public.milestones;
create trigger milestones_touch before update on public.milestones
  for each row execute function public.touch_updated_at();

create or replace function public.stamp_milestone_state()
returns trigger language plpgsql set search_path to '' as $$
begin
  if new.status in ('entregada', 'aprobada') and new.delivered_at is null then
    new.delivered_at = now();
  end if;
  if new.status = 'aprobada' and new.approved_at is null then
    new.approved_at = now();
  elsif new.status <> 'aprobada' then
    new.approved_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists milestones_stamp on public.milestones;
create trigger milestones_stamp before insert or update on public.milestones
  for each row execute function public.stamp_milestone_state();

revoke execute on function public.stamp_milestone_state() from public, anon, authenticated;
