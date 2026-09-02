-- Invitaciones que ya traen el proyecto dentro.
--
-- Antes había que esperar a que la persona se registrara para poder darle
-- acceso: entraba, no veía nada, y había que asignarla a mano. Ahora se le
-- manda un enlace que ya sabe a qué espacio y a qué proyectos entra, así que en
-- cuanto crea su cuenta ve su proyecto y nada más.

alter table public.invitations
  add column if not exists project_ids uuid[] not null default '{}';

create or replace function public.crear_invitacion(
  p_space     uuid,
  p_email     text,
  p_rol       space_role default 'cliente',
  p_proyectos uuid[] default '{}'
)
returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare
  v_token text;
  v_malos int;
begin
  if not exists (
    select 1 from public.space_members
    where space_id = p_space and user_id = auth.uid() and role = 'owner'
  ) then
    raise exception 'Solo el dueño del espacio puede invitar.';
  end if;

  if p_email is null or position('@' in p_email) = 0 then
    raise exception 'Hace falta un correo válido.';
  end if;

  -- Un proyecto de otro espacio colado aquí sería una fuga: se rechaza.
  select count(*) into v_malos
  from unnest(p_proyectos) pid
  where not exists (
    select 1 from public.projects where id = pid and space_id = p_space
  );
  if v_malos > 0 then
    raise exception 'Algún proyecto no pertenece a este espacio.';
  end if;

  if p_rol = 'cliente' and coalesce(array_length(p_proyectos, 1), 0) = 0 then
    raise exception 'Un cliente necesita al menos un proyecto, o entraría sin ver nada.';
  end if;

  -- Una invitación pendiente por persona y espacio: la nueva reemplaza.
  delete from public.invitations
  where space_id = p_space and lower(email) = lower(trim(p_email)) and accepted_at is null;

  insert into public.invitations (space_id, email, role, invited_by, project_ids)
  values (p_space, lower(trim(p_email)), p_rol, auth.uid(), p_proyectos)
  returning token into v_token;

  return jsonb_build_object('estado', 'creada', 'token', v_token,
                            'email', lower(trim(p_email)));
end;
$$;

-- La llama la pantalla de acceso, antes de que exista sesión: quien tiene el
-- enlace puede ver a qué lo invitaron y con qué correo debe registrarse.
-- El token es el secreto; sin él no se devuelve nada.
create or replace function public.ver_invitacion(p_token text)
returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare
  inv record;
begin
  select * into inv from public.invitations where token = p_token;
  if not found then return jsonb_build_object('estado', 'no_existe'); end if;
  if inv.accepted_at is not null then return jsonb_build_object('estado', 'usada'); end if;
  if inv.expires_at < now() then return jsonb_build_object('estado', 'caducada'); end if;

  return jsonb_build_object(
    'estado', 'valida',
    'email', inv.email,
    'rol', inv.role,
    'proyectos', coalesce(
      (select jsonb_agg(p.name order by p.name)
         from public.projects p where p.id = any(inv.project_ids)),
      '[]'::jsonb
    )
  );
end;
$$;

create or replace function public.aceptar_invitacion(p_token text)
returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare
  inv     record;
  v_email text;
  pid     uuid;
begin
  if auth.uid() is null then
    raise exception 'Hay que iniciar sesión para aceptar la invitación.';
  end if;

  select * into inv from public.invitations where token = p_token;
  if not found then return jsonb_build_object('estado', 'no_existe'); end if;
  if inv.accepted_at is not null then return jsonb_build_object('estado', 'usada'); end if;
  if inv.expires_at < now() then return jsonb_build_object('estado', 'caducada'); end if;

  select email into v_email from public.profiles where id = auth.uid();

  -- El correo debe coincidir: si no, cualquiera con el enlace entraría.
  if lower(coalesce(v_email, '')) <> lower(inv.email) then
    return jsonb_build_object('estado', 'otro_correo', 'esperado', inv.email);
  end if;

  insert into public.space_members (space_id, user_id, role)
  values (inv.space_id, auth.uid(), inv.role)
  on conflict (space_id, user_id) do update set role = excluded.role;

  foreach pid in array inv.project_ids loop
    insert into public.project_members (project_id, user_id)
    values (pid, auth.uid())
    on conflict (project_id, user_id) do nothing;
  end loop;

  update public.invitations set accepted_at = now() where id = inv.id;

  return jsonb_build_object('estado', 'aceptada',
                            'proyectos', coalesce(array_length(inv.project_ids, 1), 0));
end;
$$;

revoke execute on function public.crear_invitacion(uuid, text, space_role, uuid[]) from public, anon;
grant   execute on function public.crear_invitacion(uuid, text, space_role, uuid[]) to authenticated;

-- ver_invitacion sí es para anónimos: se consulta desde la pantalla de acceso.
revoke execute on function public.ver_invitacion(text) from public;
grant   execute on function public.ver_invitacion(text) to anon, authenticated;

revoke execute on function public.aceptar_invitacion(text) from public, anon;
grant   execute on function public.aceptar_invitacion(text) to authenticated;
