# Sugerencias de la IA

Una **sugerencia** es lo que un agente propone después de revisar el
repositorio, los despliegues o la base: «esta vista se salta las políticas»,
«hay trabajo fuera de main», «quedan siete incidencias abiertas».

No es una tarea. Nadie la aceptó todavía, así que:

- vive en su propia sección de la ficha del proyecto y de la bandeja,
- no cuenta para el porcentaje de avance,
- **solo la alcanza quien administra el espacio** (dueño y socio). Ni el
  cliente ni un invitado la reciben, y no porque la pantalla la esconda: la
  política de `tasks` no les entrega la fila.

Quien administra responde con **Aceptar** —pasa a pendiente, conservando su
origen, y sigue siendo trabajo interno— o con **Descartar**, que la borra.

## Cómo dejar una sugerencia

No se escriben desde la aplicación: las deja un agente contra la base, con la
llave de servicio. La forma de la fila es siempre la misma:

```sql
insert into public.tasks
  (space_id, project_id, title, description,
   status, origin, visible_cliente, priority, created_by)
values
  ('<espacio>', '<proyecto>',
   'Corregir la vista de administración: se salta las políticas',
   'Corre como su dueño, así que cualquiera con sesión lee todas las filas.',
   'inbox',        -- sin responder
   'agente',       -- 'vigilante' si la levantó una revisión automática
   false,          -- trabajo interno
   'alta',
   '<uuid de quien opera el agente>');
```

Las tres columnas que importan son `status = 'inbox'`, un `origin` de IA
(`agente` o `vigilante`) y `visible_cliente = false`. Si falta cualquiera, la
fila deja de ser sugerencia: aparecería como tarea normal, contaría para el
avance y —con `visible_cliente = true`— el cliente la leería.

`origin` está limitado por `check (origin in ('persona','agente','vigilante'))`,
y las políticas impiden que alguien que no administra el espacio firme una fila
como si viniera de un agente.

## Qué sí vale la pena proponer

Cosas verificadas, no impresiones. Una sugerencia útil dice **qué está mal y
cómo se comprueba**; el título se lee en una línea y la descripción cabe en dos.

Lo que no: recordatorios de estilo, «considerar refactorizar», o cualquier cosa
que ya esté en la lista de tareas. La sección es para que quien administra
decida rápido, y una lista larga de ruido hace que deje de mirarla.
