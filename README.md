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

### Dar acceso a los repositorios privados

**No hace falta un token por repositorio.** Un solo acceso cubre todos. Hay dos
formas, y la función acepta cualquiera de las dos sin cambiar código.

#### Opción A — GitHub App (automática, nada que renovar)

La App emite sus propios tokens de una hora y la función los renueva sola. Es la
vía recomendada si no quieres acordarte de nada.

1. GitHub → Settings → Developer settings → **GitHub Apps** → New GitHub App.
2. Ponle nombre y una Homepage URL. **Desmarca** Webhook → Active.
3. Permissions → Repository permissions → **Contents: Read-only**.
   (Metadata: Read-only se agrega solo.)
4. Where can this be installed → *Only on this account*. Crear.
5. Anota el **App ID** y genera una **private key** (descarga un `.pem`).
6. **Install App** en tu cuenta → *All repositories*.
7. En Supabase → Project Settings → Edge Functions → Secrets:
   - `GITHUB_APP_ID` — el número
   - `GITHUB_APP_PRIVATE_KEY` — el contenido completo del `.pem`, con sus
     líneas `BEGIN`/`END`

La llave viene en PKCS#1 y Web Crypto solo importa PKCS#8; la función hace esa
conversión sola, así que se pega tal cual viene.

Opcional: `GITHUB_APP_INSTALLATION_ID` si la App queda instalada en más de una
cuenta y quieres fijar cuál se usa.

#### Opción B — un token personal (dos minutos)

GitHub → Settings → Developer settings → Personal access tokens →
**Fine-grained tokens**. Repository access: **All repositories**. Permissions →
**Contents: Read-only**. Guardarlo en Supabase como `GITHUB_TOKEN`.

Es más rápido de montar, pero caduca y hay que renovarlo. Un token *classic* con
alcance `repo` también sirve y puede no caducar, pero concede lectura **y
escritura** sobre todo: para mostrar commits es más permiso del necesario.

#### Sin ninguna de las dos

Los repositorios públicos funcionan igual. Los privados devuelven un aviso que
dice qué falta, en lugar de un error opaco.

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
