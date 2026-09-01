import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDatos } from '../lib/datos.jsx'
import { PESO_PRIORIDAD, TAREAS_ABIERTAS, color } from '../data/modelo.js'
import { Vacio } from '../components/Piezas.jsx'
import ListaTareas from '../components/ListaTareas.jsx'

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

  const solicitudes = ordenar(tareas.filter((t) => t.status === 'inbox'))
  const enCurso = ordenar(
    tareas.filter((t) => TAREAS_ABIERTAS.includes(t.status) && t.status !== 'inbox'),
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
