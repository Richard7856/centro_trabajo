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
qué y cuándo, con enlace a GitHub.

La lectura no sale del navegador, sino de la función `commits`
(`supabase/functions/commits/`). Está así por dos razones:

- **El token vive en el servidor.** En el navegador quedaría a la vista de quien
  abriera esa sesión, y habría que repartirlo a cada socio para que viera los
  commits de un repositorio privado.
- **Quien pregunta no elige el repositorio.** Manda el id de un proyecto, y la
  función consulta la base *con la sesión de esa persona*: si el proyecto no le
  corresponde, no obtiene nada. Sin eso, la función sería un túnel para leer
  cualquier repositorio privado con el token del servidor.

### Configurar el token

Sin token, los repositorios públicos funcionan y los privados devuelven un aviso
diciendo que falta. Para los privados, en el panel de Supabase:
**Project Settings → Edge Functions → Secrets**, agregar `GITHUB_TOKEN`.

Conviene un token *fine-grained* con permiso **Contents: Read-only** y solo
sobre los repositorios que se vayan a mostrar. Con eso basta: la función nunca
escribe en GitHub.

Comprobado con usuarios de prueba: un socio del espacio «Jose» recibe los
commits de Clínica; el mismo socio pidiendo un proyecto del espacio «Personal»
recibe «Proyecto no disponible»; alguien sin espacios no recibe nada; y sin
sesión la función rechaza la petición.

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
