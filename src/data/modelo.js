// Vocabulario de la aplicación. Los identificadores son exactamente los de la
// base (enums de Postgres): si aquí y allá dejan de coincidir, la base rechaza
// la escritura, que es justo lo que queremos.

export const ESTADOS_PROYECTO = [
  { id: 'activo', nombre: 'Activo', color: '#2563eb' },
  { id: 'pausado', nombre: 'Pausado', color: '#d97706' },
  { id: 'completado', nombre: 'Completado', color: '#16a34a' },
  { id: 'cancelado', nombre: 'Cancelado', color: '#dc2626' },
]

export const ESTADOS_TAREA = [
  { id: 'inbox', nombre: 'Solicitud', color: '#7c3aed' },
  { id: 'pendiente', nombre: 'Pendiente', color: '#6b7280' },
  { id: 'en_progreso', nombre: 'En progreso', color: '#2563eb' },
  { id: 'bloqueada', nombre: 'Bloqueada', color: '#dc2626' },
  { id: 'completada', nombre: 'Completada', color: '#16a34a' },
  { id: 'descartada', nombre: 'Descartada', color: '#9ca3af' },
]

// Las que siguen pidiendo trabajo.
export const TAREAS_ABIERTAS = ['inbox', 'pendiente', 'en_progreso', 'bloqueada']

export const PRIORIDADES = [
  { id: 'urgente', nombre: 'Urgente', color: '#b91c1c' },
  { id: 'alta', nombre: 'Alta', color: '#dc2626' },
  { id: 'media', nombre: 'Media', color: '#d97706' },
  { id: 'baja', nombre: 'Baja', color: '#16a34a' },
]

export const PESO_PRIORIDAD = { urgente: 0, alta: 1, media: 2, baja: 3 }

export const ROLES = [
  {
    id: 'owner',
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
    id: 'invitado',
    nombre: 'Invitado',
    color: '#0891b2',
    descripcion: 'Consulta todo el espacio y puede levantar solicitudes, no cerrarlas.',
  },
  {
    id: 'cliente',
    nombre: 'Cliente',
    color: '#ea580c',
    descripcion: 'Solo los proyectos donde se le da acceso. No ve el resto del espacio ni el dinero.',
  },
]

export const TIPOS_ESPACIO = [
  { id: 'persona', nombre: 'Persona', descripcion: 'Compartido con un socio.' },
  { id: 'empresa', nombre: 'Empresa', descripcion: 'Compartido con una organización.' },
  { id: 'personal', nombre: 'Personal', descripcion: 'Proyectos propios.' },
]

// La base guarda el color por nombre; aquí se traduce a algo que se pueda pintar.
export const COLORES = {
  slate: '#64748b',
  indigo: '#4f46e5',
  violet: '#7c3aed',
  cyan: '#0891b2',
  emerald: '#059669',
  amber: '#d97706',
  rose: '#e11d48',
}

export const color = (nombre) => COLORES[nombre] ?? COLORES.slate

const porId = (catalogo) => (id) =>
  catalogo.find((item) => item.id === id) || { id, nombre: id ?? '—', color: '#6b7280' }

export const estadoProyecto = porId(ESTADOS_PROYECTO)
export const estadoTarea = porId(ESTADOS_TAREA)
export const prioridad = porId(PRIORIDADES)
export const rol = porId(ROLES)

// ---------- Permisos ----------
// Reflejan las políticas de la base. Sirven para no ofrecer botones que el
// servidor va a rechazar; quien manda sigue siendo la base.

export function permisos(rolEspacio) {
  const mando = rolEspacio === 'owner' || rolEspacio === 'socio'
  return {
    rol: rolEspacio,
    miembro: Boolean(rolEspacio),
    esDueno: rolEspacio === 'owner',
    esCliente: rolEspacio === 'cliente',
    gestionarEspacio: rolEspacio === 'owner',
    gestionarMiembros: rolEspacio === 'owner',
    crearProyecto: mando,
    editarProyecto: mando,
    eliminarProyecto: mando,
    // Cualquier miembro puede pedir; solo quien manda agenda y cierra.
    crearSolicitud: Boolean(rolEspacio),
    gestionarTareas: mando,
    gestionarEntregas: mando,
    // El dinero no lo ve ni un invitado ni un cliente.
    verDinero: mando,
  }
}

// ---------- Entregas ----------

export const ESTADOS_ENTREGA = [
  { id: 'planeada', nombre: 'Planeada', color: '#6b7280' },
  { id: 'en_progreso', nombre: 'En progreso', color: '#2563eb' },
  { id: 'entregada', nombre: 'Entregada', color: '#0891b2' },
  { id: 'aprobada', nombre: 'Aprobada', color: '#16a34a' },
  { id: 'cancelada', nombre: 'Cancelada', color: '#9ca3af' },
]

export const ENTREGAS_ABIERTAS = ['planeada', 'en_progreso']

// ---------- Cobros ----------

export const CADENCIAS = [
  { id: 'mensual', nombre: 'Mensual', meses: 1 },
  { id: 'bimestral', nombre: 'Bimestral', meses: 2 },
  { id: 'trimestral', nombre: 'Trimestral', meses: 3 },
  { id: 'semestral', nombre: 'Semestral', meses: 6 },
  { id: 'anual', nombre: 'Anual', meses: 12 },
]

export const ESTADOS_SUSCRIPCION = [
  { id: 'activa', nombre: 'Activa', color: '#16a34a' },
  { id: 'pausada', nombre: 'Pausada', color: '#d97706' },
  { id: 'cancelada', nombre: 'Cancelada', color: '#9ca3af' },
]

export const ESTADOS_COBRO = [
  { id: 'pendiente', nombre: 'Pendiente', color: '#6b7280' },
  { id: 'pagado', nombre: 'Pagado', color: '#16a34a' },
  { id: 'vencido', nombre: 'Vencido', color: '#dc2626' },
  { id: 'cancelado', nombre: 'Cancelado', color: '#9ca3af' },
]

export const estadoEntrega = porIdEntrega(ESTADOS_ENTREGA)
export const cadencia = porIdEntrega(CADENCIAS)
export const estadoSuscripcion = porIdEntrega(ESTADOS_SUSCRIPCION)
export const estadoCobro = porIdEntrega(ESTADOS_COBRO)

function porIdEntrega(catalogo) {
  return (id) =>
    catalogo.find((item) => item.id === id) || { id, nombre: id ?? '—', color: '#6b7280' }
}

// Lo que factura una suscripción al año, para poder compararlas entre sí
// aunque unas cobren cada mes y otras cada año.
export function anualizado(sub) {
  const meses = CADENCIAS.find((c) => c.id === sub.cadence)?.meses ?? 1
  return (Number(sub.amount) || 0) * (12 / meses)
}

export const dinero = (monto, moneda = 'MXN') =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: moneda, maximumFractionDigits: 0,
  }).format(Number(monto) || 0)
