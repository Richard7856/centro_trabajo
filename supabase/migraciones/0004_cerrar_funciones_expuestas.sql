-- Ninguna de estas funciones debería poder llamarse desde fuera.
--
-- Las de disparador (handle_*, log_*, touch_*, stamp_*) las ejecuta Postgres al
-- disparar el trigger, sin pasar por los permisos de quien hace la consulta:
-- se les quita el permiso a todos.
--
-- Las auxiliares (is_space_member y compañía) sí las necesita 'authenticated',
-- porque las políticas RLS se evalúan con los permisos de quien consulta; pero
-- 'anon' no las necesita, ya que todas las políticas son para sesiones abiertas.

revoke execute on function public.handle_new_user()   from public, anon, authenticated;
revoke execute on function public.handle_new_space()  from public, anon, authenticated;
revoke execute on function public.log_task_event()    from public, anon, authenticated;
revoke execute on function public.log_comment_event() from public, anon, authenticated;
revoke execute on function public.touch_updated_at()  from public, anon, authenticated;
revoke execute on function public.stamp_task_state()  from public, anon, authenticated;

revoke execute on function public.is_space_member(uuid)   from public, anon;
revoke execute on function public.can_manage_space(uuid)  from public, anon;
revoke execute on function public.space_role_of(uuid)     from public, anon;
revoke execute on function public.shares_space_with(uuid) from public, anon;
revoke execute on function public.task_space(uuid)        from public, anon;

grant execute on function public.is_space_member(uuid)   to authenticated;
grant execute on function public.can_manage_space(uuid)  to authenticated;
grant execute on function public.space_role_of(uuid)     to authenticated;
grant execute on function public.shares_space_with(uuid) to authenticated;
grant execute on function public.task_space(uuid)        to authenticated;

revoke execute on function public.sembrar_organizador() from public, anon;
grant execute on function public.sembrar_organizador() to authenticated;
