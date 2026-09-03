// Vocabulario de la aplicación. Los identificadores son exactamente los de la
// base (enums de Postgres): si aquí y allá dejan de coincidir, la base rechaza
// la escritura, que es justo lo que queremos.

export const ESTADOS_PROYECTO = [
  { id: 'activo', nombre: 'Activo', color: 'var(--c-azul)' },
  { id: 'pausado', nombre: 'Pausado', color: 'var(--c-ambar)' },
  { id: 'completado', nombre: 'Completado', color: 'var(--c-verde)' },
  { id: 'cancelado', nombre: 'Cancelado', color: 'var(--c-rojo)' },
]

export const ESTADOS_TAREA = [
  { id: 'inbox', nombre: 'Solicitud', color: 'var(--c-morado)' },
  { id: 'pendiente', nombre: 'Pendiente', color: 'var(--c-gris)' },
  { id: 'en_progreso', nombre: 'En progreso', color: 'var(--c-azul)' },
  { id: 'bloqueada', nombre: 'Bloqueada', color: 'var(--c-rojo)' },
  { id: 'completada', nombre: 'Completada', color: 'var(--c-verde)' },
  { id: 'descartada', nombre: 'Descartada', color: 'var(--c-gris)' },
]

// Las que siguen pidiendo trabajo.
export const TAREAS_ABIERTAS = ['inbox', 'pendiente', 'en_progreso', 'bloqueada']

// De dónde salió la tarea. 'persona' es alguien escribiéndola; las otras dos
// las propone la IA revisando el repositorio, los despliegues o la base.
export const ORIGENES_IA = ['agente', 'vigilante']

// Una sugerencia es una propuesta que todavía nadie aceptó. Se guarda con
// visible_cliente = false, así que la base ya se la esconde al cliente; esto
// solo sirve para acomodarlas en su propia sección.
export const esSugerencia = (t) => ORIGENES_IA.includes(t.origin) && t.status === 'inbox'

// Lo que de verdad es trabajo del proyecto: cuenta para el avance y para los
// números del panel. Una sugerencia no cuenta hasta que se acepta.
export const esTrabajo = (t) => !esSugerencia(t)

export const PRIORIDADES = [
  { id: 'urgente', nombre: 'Urgente', color: 'var(--c-rojo-fuerte)' },
  { id: 'alta', nombre: 'Alta', color: 'var(--c-rojo)' },
  { id: 'media', nombre: 'Media', color: 'var(--c-ambar)' },
  { id: 'baja', nombre: 'Baja', color: 'var(--c-verde)' },
]

export const PESO_PRIORIDAD = { urgente: 0, alta: 1, media: 2, baja: 3 }

export const ROLES = [
  {
    id: 'owner',
    nombre: 'Dueño',
    color: 'var(--c-morado)',
    descripcion: 'Administra el espacio, sus miembros y todos sus proyectos.',
  },
  {
    id: 'socio',
    nombre: 'Socio',
    color: 'var(--c-azul)',
    descripcion: 'Ve y gestiona todos los proyectos del espacio. No administra miembros.',
  },
  {
    id: 'invitado',
    nombre: 'Invitado',
    color: 'var(--c-cian)',
    descripcion: 'Consulta todo el espacio y puede levantar solicitudes, no cerrarlas.',
  },
  {
    id: 'cliente',
    nombre: 'Cliente',
    color: 'var(--c-naranja)',
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
  slate: 'var(--e-slate)',
  indigo: 'var(--e-indigo)',
  violet: 'var(--e-violet)',
  cyan: 'var(--e-cyan)',
  emerald: 'var(--e-emerald)',
  amber: 'var(--e-amber)',
  rose: 'var(--e-rose)',
}

export const color = (nombre) => COLORES[nombre] ?? COLORES.slate

const porId = (catalogo) => (id) =>
  catalogo.find((item) => item.id === id) || { id, nombre: id ?? '—', color: 'var(--c-gris)' }

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
  { id: 'planeada', nombre: 'Planeada', color: 'var(--c-gris)' },
  { id: 'en_progreso', nombre: 'En progreso', color: 'var(--c-azul)' },
  { id: 'entregada', nombre: 'Entregada', color: 'var(--c-cian)' },
  { id: 'aprobada', nombre: 'Aprobada', color: 'var(--c-verde)' },
  { id: 'cancelada', nombre: 'Cancelada', color: 'var(--c-gris)' },
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
  { id: 'activa', nombre: 'Activa', color: 'var(--c-verde)' },
  { id: 'pausada', nombre: 'Pausada', color: 'var(--c-ambar)' },
  { id: 'cancelada', nombre: 'Cancelada', color: 'var(--c-gris)' },
]

export const ESTADOS_COBRO = [
  { id: 'pendiente', nombre: 'Pendiente', color: 'var(--c-gris)' },
  { id: 'pagado', nombre: 'Pagado', color: 'var(--c-verde)' },
  { id: 'vencido', nombre: 'Vencido', color: 'var(--c-rojo)' },
  { id: 'cancelado', nombre: 'Cancelado', color: 'var(--c-gris)' },
]

export const estadoEntrega = porIdEntrega(ESTADOS_ENTREGA)
export const cadencia = porIdEntrega(CADENCIAS)
export const estadoSuscripcion = porIdEntrega(ESTADOS_SUSCRIPCION)
export const estadoCobro = porIdEntrega(ESTADOS_COBRO)

function porIdEntrega(catalogo) {
  return (id) =>
    catalogo.find((item) => item.id === id) || { id, nombre: id ?? '—', color: 'var(--c-gris)' }
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
