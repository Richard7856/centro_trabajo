# Base de datos del organizador

El organizador vive en su propio proyecto de Supabase. Antes compartía base con
una aplicación en producción, es decir, con sus usuarios; separarlo salió gratis
porque había un proyecto ya pagado y vacío, y la base anterior queda intacta
como respaldo.

La dirección y la llave pública del proyecto están en `.env.example`. Son
públicas por diseño: viajan al navegador, y lo que protege los datos son las
políticas por fila, no el secreto de la llave.

## Migraciones

Se aplican en orden. Cada archivo dice en su encabezado por qué existe.

| Archivo | Qué hace |
|---|---|
| `0001_organizador.sql` | Catálogos, tablas e índices |
| `0002_funciones_y_politicas.sql` | Funciones auxiliares, disparadores y RLS |
| `0003_semilla.sql` | Retirada; ver `0009` |
| `0004_cerrar_funciones_expuestas.sql` | Cierra las funciones a la API pública |
| `0005_rol_cliente.sql` | Rol `cliente` y acceso por proyecto |
| `0006_entregas_y_politicas_cliente.sql` | Entregas, y qué alcanza un cliente |
| `0007_suscripciones_y_cobros.sql` | Suscripciones, cobros y día de cobro |
| `0008_agregar_miembro.sql` | Sumar a alguien por correo |
| `0009_retirar_semilla.sql` | Elimina `sembrar_organizador()` |
| `0010_invitaciones_con_proyecto.sql` | Invitaciones que ya traen el proyecto |
| `0011_enlaces_y_documento.sql` | Enlaces del proyecto y documento de avance |
| `0012_trabajo_interno_y_sugerencias.sql` | Trabajo interno y sugerencias de la IA |

## El aislamiento

Un espacio solo existe para sus miembros. No es que la pantalla lo oculte: la
política `spaces_select` es `is_space_member(id)`, así que la base no entrega la
fila. Comprobado con cuentas de prueba:

| Quién | Espacios | Proyectos del espacio |
|---|---|---|
| Dueño | los suyos | todos |
| Socio de un espacio | ese, y nada más | todos los de ese espacio |
| Cliente | ese, sin nombre en la pantalla | solo donde se le dio acceso |
| Alguien sin membresía | 0 | 0 |

## Qué no va en este repositorio

Nombres de socios o de clientes, sus proyectos, sus llaves, sus direcciones de
producción y los hallazgos de seguridad de sus sistemas. Nada de eso es esquema:
son datos, y su lugar es la base, donde las políticas por fila deciden quién los
alcanza. Un archivo del repositorio no lo decide nadie.
