// Catálogos y helpers del modelo de datos del Centro de Trabajo.
// Todo el vocabulario de la app vive aquí para que agregar un estado o una
// prioridad no obligue a tocar las vistas.

export const ESTADOS_PROYECTO = [
  { id: 'planeado', nombre: 'Planeado', color: '#6b7280' },
  { id: 'en_progreso', nombre: 'En progreso', color: '#2563eb' },
  { id: 'en_pausa', nombre: 'En pausa', color: '#d97706' },
  { id: 'completado', nombre: 'Completado', color: '#16a34a' },
  { id: 'cancelado', nombre: 'Cancelado', color: '#dc2626' },
]

export const PRIORIDADES = [
  { id: 'alta', nombre: 'Alta', color: '#dc2626' },
  { id: 'media', nombre: 'Media', color: '#d97706' },
  { id: 'baja', nombre: 'Baja', color: '#16a34a' },
]

export const ESTADOS_TAREA = [
  { id: 'pendiente', nombre: 'Pendiente', color: '#6b7280' },
  { id: 'en_progreso', nombre: 'En progreso', color: '#2563eb' },
  { id: 'completada', nombre: 'Completada', color: '#16a34a' },
]

export const ESTADOS_ACTIVOS = ['planeado', 'en_progreso', 'en_pausa']

const porId = (catalogo) => (id) =>
  catalogo.find((item) => item.id === id) || { id, nombre: id, color: '#6b7280' }

export const estadoProyecto = porId(ESTADOS_PROYECTO)
export const prioridad = porId(PRIORIDADES)
export const estadoTarea = porId(ESTADOS_TAREA)

export function nuevoId(prefijo) {
  return `${prefijo}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

export function colaboradorVacio() {
  return {
    id: nuevoId('col'),
    nombre: '',
    rol: '',
    area: '',
    email: '',
    telefono: '',
    fechaIngreso: '',
    habilidades: [],
    notas: '',
    activo: true,
  }
}

export function proyectoVacio() {
  return {
    id: nuevoId('prj'),
    nombre: '',
    cliente: '',
    descripcion: '',
    estado: 'planeado',
    prioridad: 'media',
    fechaInicio: '',
    fechaFin: '',
    responsableId: '',
    colaboradorIds: [],
  }
}

export function tareaVacia(proyectoId = '') {
  return {
    id: nuevoId('tar'),
    proyectoId,
    titulo: '',
    estado: 'pendiente',
    asignadoId: '',
    fechaLimite: '',
  }
}
