import { ESTADOS_TAREA, ORIGENES_IA, PRIORIDADES, estadoTarea, prioridad } from '../data/modelo.js'
import { diasRestantes, formatearFecha } from '../lib/formato.js'
import { Etiqueta } from './Piezas.jsx'

// Lista de tareas reutilizada por la ficha del proyecto y por la bandeja.
//
// `mostrarVisibilidad` solo se enciende donde hay un cliente con acceso: si
// nadie de fuera va a leer la lista, el interruptor de "interna" sobra.
export default function ListaTareas({
  tareas, permisos, onCambiar, onEliminar,
  mostrarProyecto, nombreProyecto, mostrarVisibilidad,
}) {
  if (tareas.length === 0) return <p className="suave mini">Sin tareas.</p>

  return (
    <div className="lista-tareas">
      {tareas.map((t) => {
        const d = diasRestantes(t.due_date)
        const hecha = t.status === 'completada'
        return (
          <div key={t.id} className="tarea">
            <input
              type="checkbox"
              checked={hecha}
              disabled={!permisos.gestionarTareas}
              aria-label={`Marcar "${t.title}" como completada`}
              onChange={() => onCambiar(t, { status: hecha ? 'pendiente' : 'completada' })}
            />

            <span className="titulo">
              <div className={hecha ? 'tachado' : ''}>
                {t.title}
                {t.status === 'inbox' && <span className="chip" style={{ marginLeft: 6 }}>Sin revisar</span>}
                {ORIGENES_IA.includes(t.origin) && (
                  <span className="chip" style={{ marginLeft: 6 }}>
                    {t.origin === 'vigilante' ? 'Vigilante' : 'IA'}
                  </span>
                )}
                {mostrarVisibilidad && permisos.gestionarTareas && (
                  <button
                    type="button"
                    className={`interruptor ${t.visible_cliente ? '' : 'apagado'}`}
                    style={{ marginLeft: 6 }}
                    title={t.visible_cliente
                      ? 'El cliente ve esta tarea. Clic para volverla interna.'
                      : 'Trabajo interno: el cliente no la recibe. Clic para mostrársela.'}
                    onClick={() => onCambiar(t, { visible_cliente: !t.visible_cliente })}
                  >
                    {t.visible_cliente ? 'visible' : 'Interna'}
                  </button>
                )}
              </div>
              {t.description && <div className="mini suave">{t.description}</div>}
              <span className="mini suave">
                {mostrarProyecto && `${nombreProyecto(t.project_id)} · `}
                {t.due_date ? formatearFecha(t.due_date) : 'sin fecha'}
                {!hecha && d !== null && d <= 7 && (
                  <span className={d < 0 ? 'vencida' : 'proxima'}>
                    {d < 0 ? ' · vencida' : d === 0 ? ' · vence hoy' : ` · vence en ${d} d.`}
                  </span>
                )}
              </span>
            </span>

            {permisos.gestionarTareas ? (
              <>
                <select
                  value={t.priority}
                  onChange={(e) => onCambiar(t, { priority: e.target.value })}
                  className="mini-select"
                  aria-label="Prioridad"
                >
                  {PRIORIDADES.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
                <select
                  value={t.status}
                  onChange={(e) => onCambiar(t, { status: e.target.value })}
                  className="mini-select"
                  aria-label="Estado"
                >
                  {ESTADOS_TAREA.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
                <button className="boton sm peligro" onClick={() => onEliminar(t)} aria-label="Eliminar">✕</button>
              </>
            ) : (
              <>
                <Etiqueta item={prioridad(t.priority)} />
                <Etiqueta item={estadoTarea(t.status)} />
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
