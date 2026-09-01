# Centro de Trabajo

Organizador de proyectos con espacios aislados, roles y seguimiento de commits.
React + Vite.

## Idea

Cada **espacio** es un compartimento estanco. Quien pertenece a uno no ve los
demás ni sabe que existen: ni sus proyectos, ni sus tareas, ni sus miembros.

Espacios iniciales:

| Espacio | Tipo | Miembros |
|---|---|---|
| Jose & Richard | sociedad | Richard (dueño), Jose (socio) |
| Jaime & Richard | sociedad | Richard (dueño), Jaime (socio) |
| Yimi & Richard | sociedad | Richard (dueño), Yimi (socio) |
| Proyectos personales | personal | Richard (dueño) |

## Roles

| Rol | Alcance | Crea proyectos | Levanta tareas | Cierra tareas | Miembros |
|---|---|---|---|---|---|
| Dueño | Todo el espacio | sí | sí | sí | sí |
| Socio | Todo el espacio | sí | sí | sí | no |
| Colaborador | Solo sus proyectos | no | sí | sí | no |
| Cliente | Solo los proyectos donde se le da acceso | no | sí (solicitudes) | no | no |

Un cliente no ve los demás proyectos del espacio, aunque pertenezca a él.

## Estado del aislamiento — importante

Hoy la aplicación vive en el navegador y **el aislamiento es de pantalla, no de
seguridad**. Sirve para diseñar y probar las reglas, no para repartir accesos:
quien abra las herramientas de desarrollo ve todos los datos cargados.

Las reglas de `src/lib/permisos.js` están escritas para traducirse a políticas de
base de datos por fila. Hasta que eso esté, no se comparte el acceso con nadie.

## GitHub

Cada proyecto puede apuntar a un repositorio (propietario, nombre y rama) y su
ficha muestra los últimos commits: quién, qué y cuándo, con enlace a GitHub.

Un repositorio público no necesita nada. Para uno privado hace falta un token de
solo lectura, que se guarda **solo en el equipo de quien lo escribe**
(Ajustes → Acceso a GitHub) y nunca se incluye en los respaldos.

## Cómo correrlo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run preview
```

En la barra lateral, **Ver como** cambia de identidad para comprobar qué alcanza
cada rol. Es un apoyo de desarrollo; lo sustituye el inicio de sesión real.

## Estructura

```
src/
├── App.jsx                  Layout, selector de espacio e identidad, rutas
├── data/
│   ├── modelo.js            Catálogos: estados, prioridades, roles, tipos
│   └── semilla.js           Espacios y personas iniciales
├── lib/
│   ├── almacen.jsx          Estado global, persistencia y alcance del usuario
│   ├── permisos.js          Qué ve y qué puede hacer cada rol
│   ├── calculos.js          Avance, carga de trabajo y vencimientos
│   ├── github.js            Lectura de commits
│   └── formato.js           Fechas, iniciales y colores
├── components/              Piezas, formularios y panel de commits
└── pages/                   Panel, Espacios, Proyectos, Personas, Ajustes
```
