// Catálogos y helpers del modelo de datos del Centro de Trabajo.
// Todo el vocabulario de la app vive aquí para que agregar un estado, un rol o
// una prioridad no obligue a tocar las vistas.

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

// Roles dentro de un espacio. El orden va de más a menos alcance.
export const ROLES = [
  {
    id: 'dueno',
    nombre: 'Dueño',
    color: '#7c3aed',
    descripcion: 'Administra el espacio, sus miembros y todos sus proyectos.',
  },
  {
    id: 'socio',
    nombre: 'Socio',
    color: '#2563eb',
    descripcion: 'Ve y gestiona todos los proyectos del espacio. No administra miembros.',
  },
  {
    id: 'colaborador',
    nombre: 'Colaborador',
    color: '#0891b2',
    descripcion: 'Ve únicamente los proyectos en los que está asignado.',
  },
  {
    id: 'cliente',
    nombre: 'Cliente',
    color: '#ea580c',
    descripcion: 'Ve solo su proyecto: avance, commits y tareas. Puede levantar solicitudes.',
  },
]

export const TIPOS_ESPACIO = [
  { id: 'sociedad', nombre: 'Sociedad', descripcion: 'Compartido con un socio.' },
  { id: 'personal', nombre: 'Personal', descripcion: 'Proyectos propios.' },
]

const porId = (catalogo) => (id) =>
  catalogo.find((item) => item.id === id) || { id, nombre: id, color: '#6b7280' }

export const estadoProyecto = porId(ESTADOS_PROYECTO)
export const prioridad = porId(PRIORIDADES)
export const estadoTarea = porId(ESTADOS_TAREA)
export const rol = porId(ROLES)

export function nuevoId(prefijo) {
  return `${prefijo}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

export function espacioVacio() {
  return {
    id: nuevoId('esp'),
    nombre: '',
    tipo: 'sociedad',
    descripcion: '',
    color: '#2563eb',
    repoPorDefecto: { propietario: '', nombre: '', rama: 'main' },
  }
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

export function miembroVacio(espacioId = '') {
  return {
    id: nuevoId('mbr'),
    espacioId,
    colaboradorId: '',
    rolEspacio: 'colaborador',
  }
}

export function proyectoVacio(espacioId = '') {
  return {
    id: nuevoId('prj'),
    espacioId,
    nombre: '',
    cliente: '',
    descripcion: '',
    estado: 'planeado',
    prioridad: 'media',
    fechaInicio: '',
    fechaFin: '',
    responsableId: '',
    colaboradorIds: [],
    clienteIds: [],
    repo: { propietario: '', nombre: '', rama: 'main' },
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
    creadaPor: '',
    esSolicitud: false,
  }
}

export function repoValido(repo) {
  return Boolean(repo?.propietario?.trim() && repo?.nombre?.trim())
}

export function repoTexto(repo) {
  return repoValido(repo) ? `${repo.propietario}/${repo.nombre}` : ''
}
