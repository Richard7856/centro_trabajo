import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDatos } from '../lib/datos.jsx'
import { PESO_PRIORIDAD, TAREAS_ABIERTAS, color, esSugerencia, esTrabajo } from '../data/modelo.js'
import { Vacio } from '../components/Piezas.jsx'
import ListaTareas from '../components/ListaTareas.jsx'
import Sugerencias from '../components/Sugerencias.jsx'

// Todo lo que pide atención, en un solo lugar: solicitudes sin revisar primero,
// luego el trabajo abierto ordenado por prioridad y fecha.
export default function Bandeja() {
  const {
    tareas, espacios, todosLosProyectos, espacioActivo,
    permisosEn, guardarTarea, eliminarTarea,
  } = useDatos()
  const [error, setError] = useState('')

  const intentar = async (accion) => {
    setError('')
    try { await accion() } catch (e) { setError(e.message) }
  }

  const nombreProyecto = (id) =>
    todosLosProyectos.find((p) => p.id === id)?.name ?? 'Sin proyecto'

  const ordenar = (lista) =>
    [...lista].sort(
      (a, b) =>
        PESO_PRIORIDAD[a.priority] - PESO_PRIORIDAD[b.priority] ||
        (a.due_date || '9999').localeCompare(b.due_date || '9999'),
    )

  // Lo que propone la IA va aparte de lo que pide una persona: son cosas
  // distintas y se responden distinto. La base solo se las manda a quien
  // administra el espacio, así que si esta lista trae algo, es de los suyos.
  const sugerencias = ordenar(tareas.filter(esSugerencia))
  const solicitudes = ordenar(tareas.filter((t) => t.status === 'inbox' && esTrabajo(t)))
  const enCurso = ordenar(
    tareas.filter((t) => esTrabajo(t) && TAREAS_ABIERTAS.includes(t.status) && t.status !== 'inbox'),
  )

  // Los permisos son por espacio; en la bandeja se mezclan varios.
  const permisosDe = (t) => permisosEn(t.space_id)

  const bloque = (titulo, lista, vacio) => (
    <section className="tarjeta" style={{ marginTop: 14 }}>
      <div className="entre" style={{ marginBottom: 12 }}>
        <h2>{titulo}</h2>
        <span className="chip">{lista.length}</span>
      </div>
      {lista.length === 0 ? (
        <p className="suave mini">{vacio}</p>
      ) : (
        <ListaTareas
          tareas={lista}
          permisos={lista.every((t) => permisosDe(t).gestionarTareas)
            ? { gestionarTareas: true }
            : { gestionarTareas: false }}
          mostrarProyecto
          nombreProyecto={nombreProyecto}
          onCambiar={(t, campos) => intentar(() => guardarTarea({ id: t.id, ...campos }))}
          onEliminar={(t) => intentar(() => eliminarTarea(t.id))}
        />
      )}
    </section>
  )

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Bandeja</h1>
          <p>
            {espacioActivo ? `Espacio: ${espacioActivo.name}` : 'Todos mis espacios'}
            {' · '}lo que pide atención
          </p>
        </div>
        <Link className="boton" to="/proyectos">Proyectos</Link>
      </div>

      {error && <div className="aviso alerta">{error}</div>}

      {tareas.length === 0 ? (
        <Vacio titulo="Nada pendiente" texto="No hay tareas en tus espacios." />
      ) : (
        <>
          {bloque('Solicitudes sin revisar', solicitudes,
            'Nada por revisar. Las solicitudes llegan aquí antes de agendarse.')}

          {sugerencias.length > 0 && (
            <section className="tarjeta" style={{ marginTop: 14 }}>
              <div className="entre" style={{ marginBottom: 4 }}>
                <h2>Sugerencias de la IA</h2>
                <span className="chip">{sugerencias.length}</span>
              </div>
              <p className="mini suave" style={{ marginTop: 0, marginBottom: 12 }}>
                Solo las ves tú y quien administra el espacio contigo.
              </p>
              <Sugerencias
                sugerencias={sugerencias}
                mostrarProyecto
                nombreProyecto={nombreProyecto}
                onAceptar={(t) => intentar(() => guardarTarea({ id: t.id, status: 'pendiente' }))}
                onDescartar={(t) =>
                  confirm(`¿Descartar "${t.title}"? Se borra de la lista.`) &&
                  intentar(() => eliminarTarea(t.id))
                }
              />
            </section>
          )}

          {bloque('En curso', enCurso, 'Sin trabajo abierto.')}
        </>
      )}

      {espacios.length > 1 && (
        <p className="mini suave" style={{ marginTop: 14 }}>
          Estás viendo{' '}
          {espacioActivo ? (
            <>solo <span className="linea" style={{ display: 'inline-flex' }}>
              <span className="punto-espacio" style={{ background: color(espacioActivo.color) }} />
              {espacioActivo.name}</span></>
          ) : (
            'todos tus espacios juntos'
          )}
          . Se cambia desde el selector de la barra lateral.
        </p>
      )}
    </>
  )
}
