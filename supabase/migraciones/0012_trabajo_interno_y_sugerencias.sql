-- Trabajo interno y sugerencias de la IA.
--
-- Dos cosas que hasta ahora vivían revueltas con las tareas normales:
--
--   1. Trabajo interno. Hay tareas que el cliente no tiene por qué leer:
--      "corregir la vista que se salta las políticas", "revisar las funciones
--      abiertas sin sesión". Son ciertas y hay que hacerlas, pero enseñárselas
--      a quien contrató el producto no ayuda a nadie.
--
--   2. Sugerencias. Lo que propone un agente al revisar el repositorio, los
--      despliegues o la base. Todavía no las aceptó nadie, así que no son
--      trabajo: son ideas esperando un sí o un no. Se guardan con
--      status = 'inbox' y origin de IA, y solo las alcanza quien administra.
--
-- Quien decide sigue siendo la base, no la pantalla: las políticas de abajo
-- son las que quitan las filas antes de responder.

alter table public.tasks
  add column if not exists visible_cliente boolean not null default true;

-- El origen deja de ser texto libre.
alter table public.tasks drop constraint if exists tasks_origin_conocido;
alter table public.tasks add constraint tasks_origin_conocido
  check (origin in ('persona', 'agente', 'vigilante'));

comment on column public.tasks.origin is
  'persona = alguien la escribió; agente/vigilante = la propuso la IA.';
comment on column public.tasks.visible_cliente is
  'false = trabajo interno: solo lo alcanza quien administra el espacio.';

-- La bandeja pregunta siempre por lo mismo: las sugerencias sin responder.
create index if not exists tasks_sugerencias_idx on public.tasks (space_id)
  where origin in ('agente', 'vigilante') and status = 'inbox';

-- Leer: lo interno lo ve quien administra el espacio (owner o socio). Ni el
-- cliente ni un invitado, aunque el invitado sí vea el resto del espacio.
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks for select to authenticated
using (
  (case when project_id is null
     then public.is_space_member(space_id) and not public.es_cliente_en(space_id)
     else public.alcanza_proyecto(project_id) end)
  and (visible_cliente or public.can_manage_space(space_id))
);

-- Escribir: quien no administra solo puede dejar una solicitud suya, firmada
-- como persona y visible. Así nadie de fuera puede fabricar una sugerencia ni
-- esconder lo que pidió.
drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks for insert to authenticated
with check (
  created_by = auth.uid()
  and (project_id is null or space_id = public.espacio_del_proyecto(project_id))
  and (case when project_id is null
         then public.is_space_member(space_id) and not public.es_cliente_en(space_id)
         else public.alcanza_proyecto(project_id) end)
  and (public.can_manage_space(space_id) or (status = 'inbox' and due_date is null))
  and (public.can_manage_space(space_id) or (visible_cliente and origin = 'persona'))
);

drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks for update to authenticated
using (
  public.can_manage_space(space_id)
  or (created_by = auth.uid() and status = 'inbox' and origin = 'persona')
)
with check (
  public.can_manage_space(space_id)
  or (created_by = auth.uid() and status = 'inbox' and due_date is null
      and visible_cliente and origin = 'persona')
);

drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks for delete to authenticated
using (
  public.can_manage_space(space_id)
  or (created_by = auth.uid() and status = 'inbox' and origin = 'persona')
);
