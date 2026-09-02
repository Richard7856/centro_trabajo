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

| Rol | Alcance | Proyectos | Pedir | Agendar y cerrar | Ve el dinero | Miembros |
|---|---|---|---|---|---|---|
| Dueño | Todo el espacio | sí | sí | sí | sí | sí |
| Socio | Todo el espacio | sí | sí | sí | sí | no |
| Invitado | Todo el espacio | no | sí | no | no | no |
| Cliente | **Solo los proyectos donde se le da acceso** | no | sí | no | no | no |

Lo impiden las políticas, no los botones. Comprobado con cuentas de prueba en
un mismo espacio con dos proyectos:

| | Socio | Cliente con acceso a un proyecto |
|---|---|---|
| Proyectos | 2 | **1** |
| Entregas | 4 (incluida una marcada interna) | **2** |
| Tareas | 23, de las cuales 6 sueltas del espacio | 8, **0** sueltas |
| Suscripciones y cobros | 1 | **0** |

Además: el cliente no puede editar una entrega, sí puede levantar una
solicitud, y no puede agendarla con fecha.

## Entregas, tareas y cobros

Tres cosas distintas a propósito:

- **Entregas** (`milestones`): los pasos que se le prometen al cliente, con
  fecha y estado. Una entrega puede marcarse **interna** y entonces el cliente
  no la ve.
- **Tareas** (`tasks`): el trabajo para llegar a esas entregas. Una tarea sin
  proyecto es trabajo suelto del espacio y nunca la ve un cliente.
- **Cobros** (`subscriptions` + `subscription_charges`): lo que se factura.

Los cobros no se calculan al vuelo: `generar_cobros()` crea una fila por
periodo, así el calendario, los vencidos y lo cobrado salen del mismo sitio. El
día de cobro se respeta sin arrastre — si es 31 y febrero no llega, se cobra el
28, y en marzo vuelve al 31.

El **Calendario** junta las tres en una vista mensual; el **Panel** levanta lo
que va tarde.

## Sumar personas

**Invitación** (para quien todavía no tiene cuenta). El dueño genera un enlace
que ya lleva dentro el espacio, el rol y —para un cliente— los proyectos. La
persona lo abre, crea su cuenta y entra viendo lo suyo, sin pasos intermedios.

- Un cliente se invita desde la **ficha del proyecto**: el acceso viene incluido.
  `crear_invitacion()` rechaza una invitación de cliente sin proyectos, porque
  entraría a ver una pantalla vacía.
- El enlace se activa **solo con el correo al que va dirigido**, caduca a los 30
  días y sirve una vez. Con otro correo devuelve `otro_correo` y no da acceso.
- El correo no se envía desde la aplicación: no hay servicio de correo
  configurado. Se copia el enlace y se manda por donde sea. Un enlace pegado en
  WhatsApp llega hoy.

**Agregar directo** (para quien ya tiene cuenta). Desde la ficha del espacio,
correo y rol. Se hace con `agregar_miembro()` y no con un INSERT desde la
pantalla, porque la política de `profiles` solo deja ver a quien ya comparte
espacio contigo — el dueño no alcanzaría a buscar a alguien recién registrado.

### Lo que ve un cliente

A un cliente se le retira todo el andamiaje de espacios: sin selector, sin la
sección Espacios, sin Cobros, y la ficha del proyecto no muestra el nombre del
espacio. Esto no es solo estética — un espacio puede llamarse como otro socio.

Comprobado renderizando la aplicación con la respuesta que la base le da a un
cliente: el menú queda en Panel, Proyectos, Bandeja, Calendario y Ajustes; la
palabra del espacio no aparece en ninguna pantalla; y `/espacios` por dirección
directa redirige al panel.

Lo que sí alcanza: los perfiles de quienes comparten espacio con él, es decir el
equipo con el que trata. No alcanza a nadie de otro espacio.

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

## Cuentas nuevas

Cualquiera puede crear su cuenta desde la pantalla de acceso; un disparador le
crea el perfil. Pero **una cuenta nueva no pertenece a ningún espacio**, así que
no ve ni un proyecto hasta que el dueño de un espacio la agrega por su correo.

El mensaje que ve mientras tanto no nombra espacios ni personas: quien acaba de
llegar no tiene por qué saber con quién más se trabaja.

La siembra inicial (`sembrar_organizador()`) se retiró en la migración 0009.
Estaba concedida a cualquier sesión iniciada, así que un socio o un cliente
entrando por primera vez podía quedarse con su propia copia de los cinco
espacios y las 23 tareas. Ya cumplió su función de arranque.

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

- **Invitaciones por correo.** La tabla `invitations` existe y tiene políticas,
  pero no está conectada: hoy la persona crea su cuenta y el dueño la suma por
  correo desde la ficha del espacio.
- **Asignar responsables** a tareas y entregas: el esquema todavía no guarda a
  quién le toca cada cosa.
- **Cobro real.** Los cobros se marcan pagados a mano; no hay pasarela conectada.
- **Borrar una persona** que ya creó tareas falla por la llave foránea de
  `tasks.created_by`, que existe para no perder la autoría. Quitarla del espacio
  sí funciona.

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
├── components/          Piezas, formularios, tareas, entregas, commits
└── pages/               Entrar, Panel, Espacios, Proyectos, Bandeja,
                         Calendario, Cobros, Ajustes

supabase/migraciones/    Esquema, políticas, siembra y endurecimiento
```
