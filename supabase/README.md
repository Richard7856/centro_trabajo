# Base de datos del organizador

Proyecto Supabase: **inkwell** (`duzfvyfhsvhavptuxehi`), organización «Agencia».

Se eligió `inkwell` porque ya estaba pagado y vacío: un proyecto nuevo cuesta
$10 USD al mes, y dejarlo en `niddo` habría mantenido el organizador conviviendo
con la aplicación de rentas en producción, compartiendo base y usuarios.

`niddo` queda **intacto** con la versión anterior, como respaldo.

## Migraciones aplicadas

| Archivo | Qué hace |
|---|---|
| `0001_organizador.sql` | Catálogos, tablas e índices |
| `0002_funciones_y_politicas.sql` | Funciones auxiliares, disparadores y RLS |
| `0003_semilla.sql` | `sembrar_organizador()`: espacios, proyectos y tareas |
| `0004_cerrar_funciones_expuestas.sql` | Cierra las funciones a la API pública |

## El aislamiento

Un espacio solo existe para sus miembros. No es que la pantalla lo oculte: la
política `spaces_select` es `is_space_member(id)`, así que la base no entrega la
fila. Comprobado con usuarios de prueba antes de dejar la base limpia:

| Quién | Espacios que ve | Proyectos | Tareas |
|---|---|---|---|
| Dueño | 5 | 2 | 23 |
| Socio solo del espacio «Jose» | 1 (solo Jose) | 2 | 23 |
| Alguien sin membresía | 0 | 0 | 0 |

## Primer arranque

1. Crear la cuenta con `rifigue97@gmail.com` desde la app.
   El disparador `on_auth_user_created` crea el perfil solo.
2. Llamar una vez a `sembrar_organizador()` (RPC). Crea los cinco espacios
   —Jose, Jaime, Yimi, Personal y Access archivado—, los dos proyectos y sus
   23 tareas, con esa cuenta como dueña.

## Pendiente

El rol **cliente** todavía no existe: el enum `space_role` es
`owner | socio | invitado`, y hoy un `invitado` ve todos los proyectos del
espacio. Para que un cliente vea solo el suyo hace falta agregar el rol y una
tabla de acceso por proyecto, y ajustar `projects_select` y `tasks_select`.
