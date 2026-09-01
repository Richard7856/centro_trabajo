# Centro de Trabajo

Organizador de proyectos con espacios aislados, roles y seguimiento de commits.
React + Vite sobre Supabase.

## Idea

Cada **espacio** es un compartimento estanco. Quien pertenece a uno no ve los
demás ni sabe que existen: ni sus proyectos, ni sus tareas, ni sus miembros.

Y no es la pantalla la que lo esconde. La política de la base dice
`spaces_select = is_space_member(id)`, así que a quien no es miembro la base
sencillamente **no le entrega la fila**. Comprobado: una sesión anónima recibe
cero en todas las tablas, y un socio del espacio «Jose» recibe un solo espacio.

## Roles

| Rol | Alcance | Proyectos | Pedir | Agendar y cerrar | Miembros |
|---|---|---|---|---|---|
| Dueño | Todo el espacio | sí | sí | sí | sí |
| Socio | Todo el espacio | sí | sí | sí | no |
| Invitado | Consulta el espacio | no | sí | no | no |

Un invitado puede levantar solicitudes (`inbox`, sin fecha) y nada más: lo
impide la política `tasks_insert`, no el botón.

## Correr en local

```bash
npm install
cp .env.example .env
npm run dev
```

Las dos variables de `.env.example` son públicas por diseño: viajan al
navegador, y lo que protege los datos son las políticas por fila.

## Desplegar en Vercel

En **Settings → Environment Variables** hay que definir, para Production,
Preview y Development:

| Variable | Valor |
|---|---|
| `VITE_SUPABASE_URL` | `https://duzfvyfhsvhavptuxehi.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | la clave publicable del proyecto |

Vite las incrusta **al construir**, no al arrancar: después de agregarlas hay
que volver a desplegar. Si faltan, la aplicación lo dice en la pantalla de
acceso en vez de fallar en cada consulta.

## Correo de confirmación

El enlace del correo lo arma **Supabase**, no la aplicación. De fábrica usa el
`Site URL` del proyecto, que apunta a `http://localhost:3000`: por eso un
correo abierto en el teléfono lleva a una página que no existe.

En el panel de Supabase, **Authentication → URL Configuration**:

- **Site URL**: `https://centro-trabajo.vercel.app`
- **Redirect URLs**, una por línea:
  - `https://centro-trabajo.vercel.app/**`
  - `https://centro-trabajo-*-richards-projects-b633518f.vercel.app/**` (vistas previas)
  - `http://localhost:5173/**` (desarrollo)

La aplicación además manda `emailRedirectTo` con el origen desde el que se
registró, así el correo vuelve al mismo sitio donde se estaba trabajando. Ese
valor solo se respeta si coincide con la lista de arriba.

## Primer arranque

1. Crear la cuenta desde la pantalla de acceso. Un disparador crea el perfil.
2. El panel ofrece el botón **Crear mis espacios**, que llama una sola vez a
   `sembrar_organizador()`: deja los cinco espacios —Jose, Jaime, Yimi, Personal
   y Access archivado—, los dos proyectos y sus 23 tareas.

## GitHub

Cada proyecto guarda su `repo_url` y la ficha lista los últimos commits: quién,
qué y cuándo, con enlace a GitHub. Funciona con repositorios públicos, porque la
llamada sale del navegador sin credenciales.

Para un repositorio **privado** hace falta un token, y un token en el navegador
queda a la vista de quien abra esa sesión. Se resuelve moviendo la llamada a una
función del servidor; está pendiente.

## Qué falta

- **Rol de cliente.** El enum es `owner | socio | invitado` y un invitado
  alcanza todos los proyectos del espacio. Para que un cliente vea solo el suyo
  hacen falta el rol nuevo, una tabla de acceso por proyecto y ajustar
  `projects_select` y `tasks_select`.
- **Invitaciones por correo.** La tabla `invitations` existe y tiene políticas,
  pero no está conectada a la pantalla: hoy alguien se suma creando su cuenta y
  agregándolo el dueño desde la ficha del espacio.
- **Commits de repositorios privados**, según lo anterior.
- **Asignar responsables** a proyectos y tareas: el esquema todavía no guarda a
  quién le toca cada cosa.

## Estructura

```
src/
├── App.jsx              Portón de sesión, menú y rutas
├── lib/
│   ├── supabase.js      Cliente
│   ├── sesion.jsx       Inicio de sesión y perfil
│   ├── datos.jsx        Lectura y escritura contra la base
│   ├── calculos.js      Avance, resumen y vencimientos
│   ├── github.js        Lectura de commits
│   └── formato.js       Fechas, iniciales y colores
├── data/modelo.js       Catálogos (idénticos a los enums) y permisos
├── components/          Piezas, formularios, lista de tareas, commits
└── pages/               Entrar, Panel, Espacios, Proyectos, Bandeja, Ajustes

supabase/migraciones/    Esquema, políticas, siembra y endurecimiento
```
