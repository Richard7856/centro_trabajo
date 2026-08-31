// Datos de ejemplo para ver la plataforma funcionando antes de cargar los
// perfiles reales. Se pueden borrar de un clic desde Ajustes.

export const ES_DEMO = true

export const semilla = {
  colaboradores: [
    {
      id: 'col_demo1',
      nombre: 'Colaborador de ejemplo A',
      rol: 'Coordinador de proyecto',
      area: 'Operaciones',
      email: 'ejemplo.a@centro.local',
      telefono: '',
      fechaIngreso: '2025-02-03',
      habilidades: ['Planeación', 'Seguimiento'],
      notas: 'Registro de ejemplo. Reemplazar por un perfil real.',
      activo: true,
    },
    {
      id: 'col_demo2',
      nombre: 'Colaborador de ejemplo B',
      rol: 'Analista',
      area: 'Administración',
      email: 'ejemplo.b@centro.local',
      telefono: '',
      fechaIngreso: '2025-06-16',
      habilidades: ['Reportes', 'Excel'],
      notas: '',
      activo: true,
    },
  ],
  proyectos: [
    {
      id: 'prj_demo1',
      nombre: 'Proyecto de ejemplo',
      cliente: 'Cliente interno',
      descripcion:
        'Proyecto de muestra para revisar cómo se ven la ficha, el equipo y las tareas.',
      estado: 'en_progreso',
      prioridad: 'alta',
      fechaInicio: '2026-08-03',
      fechaFin: '2026-10-30',
      responsableId: 'col_demo1',
      colaboradorIds: ['col_demo1', 'col_demo2'],
    },
    {
      id: 'prj_demo2',
      nombre: 'Segundo proyecto de ejemplo',
      cliente: '',
      descripcion: 'Sirve para ver el tablero con más de una tarjeta.',
      estado: 'planeado',
      prioridad: 'media',
      fechaInicio: '2026-09-15',
      fechaFin: '',
      responsableId: 'col_demo2',
      colaboradorIds: ['col_demo2'],
    },
  ],
  tareas: [
    {
      id: 'tar_demo1',
      proyectoId: 'prj_demo1',
      titulo: 'Definir alcance con el cliente',
      estado: 'completada',
      asignadoId: 'col_demo1',
      fechaLimite: '2026-08-14',
    },
    {
      id: 'tar_demo2',
      proyectoId: 'prj_demo1',
      titulo: 'Armar cronograma de entregas',
      estado: 'en_progreso',
      asignadoId: 'col_demo1',
      fechaLimite: '2026-09-05',
    },
    {
      id: 'tar_demo3',
      proyectoId: 'prj_demo1',
      titulo: 'Primer reporte de avance',
      estado: 'pendiente',
      asignadoId: 'col_demo2',
      fechaLimite: '2026-09-30',
    },
    {
      id: 'tar_demo4',
      proyectoId: 'prj_demo2',
      titulo: 'Levantar requerimientos',
      estado: 'pendiente',
      asignadoId: 'col_demo2',
      fechaLimite: '',
    },
  ],
}

export const vacio = { colaboradores: [], proyectos: [], tareas: [] }
