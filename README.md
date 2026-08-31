# Centro de Trabajo

Organizador de proyectos y colaboradores. Plataforma web hecha con React + Vite.

## Estado actual

La **plataforma** está construida y funcionando con datos de ejemplo.
Los perfiles reales (José y el resto del equipo) se cargan en el siguiente paso.

## Qué hace

- **Panel**: indicadores del portafolio, proyectos en curso, próximos vencimientos,
  distribución por estado y carga de trabajo del equipo.
- **Proyectos**: alta, edición y baja; búsqueda y filtros por estado, prioridad y
  colaborador; ficha con equipo, fechas y avance calculado a partir de sus tareas.
- **Colaboradores**: perfiles con rol, área, contacto, habilidades y notas; ficha con
  sus proyectos asignados, cuáles lidera y sus tareas pendientes.
- **Tareas**: viven dentro de cada proyecto, con responsable, fecha límite y estado.
- **Ajustes**: exportar/importar la información en JSON y limpiar los datos de ejemplo.

## Cómo correrlo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/
npm run preview  # sirve dist/
```

## Dónde se guardan los datos

En el `localStorage` del navegador (clave `centro_trabajo_v1`). Eso significa que la
información es de ese navegador y ese equipo. Para respaldarla o pasarla a otra
computadora se usa **Ajustes → Exportar JSON**.

Cuando haga falta que varias personas vean lo mismo desde distintos dispositivos, se
migra a una base de datos: la lectura y escritura están aisladas en
`src/lib/almacen.jsx`, así que el cambio no toca las vistas.

## Estructura

```
src/
├── App.jsx                  Layout, menú lateral y rutas
├── main.jsx                 Punto de entrada
├── styles.css               Estilos (modo claro y oscuro)
├── data/
│   ├── modelo.js            Catálogos de estados y prioridades, registros vacíos
│   └── semilla.js           Datos de ejemplo
├── lib/
│   ├── almacen.jsx          Estado global y persistencia
│   ├── calculos.js          Avance, carga de trabajo y vencimientos
│   └── formato.js           Fechas, iniciales y colores
├── components/
│   ├── Piezas.jsx           Etiquetas, avatares, barras, modal, campos
│   ├── FormularioProyecto.jsx
│   └── FormularioColaborador.jsx
└── pages/
    ├── Panel.jsx
    ├── Proyectos.jsx
    ├── DetalleProyecto.jsx
    ├── Colaboradores.jsx
    ├── DetalleColaborador.jsx
    └── Ajustes.jsx
```
