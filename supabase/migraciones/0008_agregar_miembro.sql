-- Sumar a alguien a un espacio por su correo.
--
-- No se puede hacer con un INSERT desde la pantalla: la política de `profiles`
-- solo deja ver a quien ya comparte espacio contigo, así que el dueño no
-- alcanza a buscar a una persona recién registrada. Esta función mira el padrón
-- completo, pero únicamente para resolver el correo, y solo si quien llama es
-- dueño de ese espacio.

create or replace function public.agregar_miembro(
  p_space uuid,
  p_email text,
  p_rol   space_role default 'invitado'
)
returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare
  v_id     uuid;
  v_nombre text;
begin
  if not exists (
    select 1 from public.space_members
    where space_id = p_space and user_id = auth.uid() and role = 'owner'
  ) then
    raise exception 'Solo el dueño del espacio puede agregar miembros.';
  end if;

  select id, coalesce(full_name, email) into v_id, v_nombre
  from public.profiles
  where lower(email) = lower(trim(p_email));

  -- No inventamos cuentas: la persona se registra y luego se le da acceso.
  if v_id is null then
    return jsonb_build_object('estado', 'sin_cuenta', 'email', trim(p_email));
  end if;

  insert into public.space_members (space_id, user_id, role)
  values (p_space, v_id, p_rol)
  on conflict (space_id, user_id) do update set role = excluded.role;

  return jsonb_build_object('estado', 'agregado', 'user_id', v_id, 'nombre', v_nombre);
end;
$$;

revoke execute on function public.agregar_miembro(uuid, text, space_role) from public, anon;
grant execute on function public.agregar_miembro(uuid, text, space_role) to authenticated;
