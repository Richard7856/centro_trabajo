import { prioridad } from '../data/modelo.js'
import { Etiqueta } from './Piezas.jsx'

// Lo que la IA propone después de revisar el repositorio, los despliegues o la
// base. Todavía no es trabajo: son ideas esperando un sí o un no.
//
// Solo llega aquí quien administra el espacio. Al cliente la base ni siquiera
// se las manda: se guardan con visible_cliente = false y la política de tasks
// se las quita antes de responder. Esta pantalla no es la que esconde nada.
export default function Sugerencias({ sugerencias, onAceptar, onDescartar, mostrarProyecto, nombreProyecto }) {
  if (sugerencias.length === 0) {
    return <p className="suave mini">Sin sugerencias por ahora.</p>
  }

  return (
    <div className="lista-tareas">
      {sugerencias.map((t) => (
        <div key={t.id} className="tarea">
          <span className="titulo">
            <div>
              {t.title}
              <span className="chip" style={{ marginLeft: 6 }}>
                {t.origin === 'vigilante' ? 'Vigilante' : 'IA'}
              </span>
            </div>
            {t.description && <div className="mini suave">{t.description}</div>}
            {mostrarProyecto && (
              <span className="mini suave">{nombreProyecto(t.project_id)}</span>
            )}
          </span>

          <Etiqueta item={prioridad(t.priority)} />

          <div className="acciones">
            <button className="boton sm primario" onClick={() => onAceptar(t)}>
              Aceptar
            </button>
            <button
              className="boton sm peligro"
              onClick={() => onDescartar(t)}
              title="La borra de la lista. No se convierte en tarea."
            >
              Descartar
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
