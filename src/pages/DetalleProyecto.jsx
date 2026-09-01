import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useDatos } from '../lib/datos.jsx'
import { PESO_PRIORIDAD, color, estadoProyecto } from '../data/modelo.js'
import { avance, tareasDe } from '../lib/calculos.js'
import { partirRepo } from '../lib/github.js'
import { diasRestantes, formatearFecha } from '../lib/formato.js'
import { Barra, Etiqueta, Modal, Vacio } from '../components/Piezas.jsx'
import FormularioProyecto from '../components/FormularioProyecto.jsx'
import ListaTareas from '../components/ListaTareas.jsx'
import Commits from '../components/Commits.jsx'

export default function DetalleProyecto() {
  const { id } = useParams()
  const navegar = useNavigate()
  const {
    proyectos, todosLosProyectos, tareas, todasLasTareas, espacios, permisosEn,
    guardarProyecto, eliminarProyecto, crearTarea, guardarTarea, eliminarTarea,
  } = useDatos()

  const [editando, setEditando] = useState(false)
  const [nueva, setNueva] = useState('')
  const [limite, setLimite] = useState('')
  const [error, setError] = useState('')

  const proyecto = todosLosProyectos.find((p) => p.id === id)
  if (!proyecto) {
    return (
      <Vacio
        titulo="Proyecto no disponible"
        texto="No eres miembro del espacio al que pertenece, o fue eliminado."
        accion={<Link className="boton" to="/proyectos">Volver a proyectos</Link>}
      />
    )
  }

  const permisos = permisosEn(proyecto.space_id)
  const espacio = espacios.find((e) => e.id === proyecto.space_id)
  const propias = [...tareasDe(proyecto.id, todasLasTareas)].sort(
    (a, b) =>
      Number(a.status === 'completada') - Number(b.status === 'completada') ||
      PESO_PRIORIDAD[a.priority] - PESO_PRIORIDAD[b.priority] ||
      (a.due_date || '9999').localeCompare(b.due_date || '9999'),
  )
  const pct = avance(proyecto, todasLasTareas)
  const dias = diasRestantes(proyecto.due_date)
  const repo = partirRepo(proyecto.repo_url)

  const intentar = async (accion) => {
    setError('')
    try { await accion() } catch (e) { setError(e.message) }
  }

  async function agregar(e) {
    e.preventDefault()
    if (!nueva.trim()) return
    // Quien no manda solo puede dejar una solicitud, y la base lo verifica.
    await intentar(async () => {
      await crearTarea({
        space_id: proyecto.space_id,
        project_id: proyecto.id,
        title: nueva.trim(),
        status: permisos.gestionarTareas ? 'pendiente' : 'inbox',
        due_date: permisos.gestionarTareas ? (limite || null) : null,
      })
      setNueva('')
      setLimite('')
    })
  }

  return (
    <>
      <Link className="mini suave" to="/proyectos">← Proyectos</Link>

      <div className="encabezado" style={{ marginTop: 10 }}>
        <div>
          <h1>{proyecto.name}</h1>
          <div className="envuelve" style={{ marginTop: 8 }}>
            {espacio && (
              <Link className="chip linea" to={`/espacios/${espacio.id}`}>
                <span className="punto-espacio" style={{ background: color(espacio.color) }} />
                {espacio.name}
              </Link>
            )}
            <Etiqueta item={estadoProyecto(proyecto.status)} />
          </div>
        </div>
        {permisos.editarProyecto && (
          <div className="acciones">
            <button className="boton" onClick={() => setEditando(true)}>Editar</button>
            <button
              className="boton peligro"
              onClick={() => {
                if (!confirm(`¿Eliminar "${proyecto.name}" y sus ${propias.length} tarea(s)?`)) return
                intentar(async () => {
                  await eliminarProyecto(proyecto.id)
                  navegar('/proyectos')
                })
              }}
            >
              Eliminar
            </button>
          </div>
        )}
      </div>

      {error && <div className="aviso alerta">{error}</div>}

      <div className="rejilla dos">
        <section className="tarjeta">
          <h2 style={{ marginBottom: 12 }}>Ficha</h2>
          {proyecto.description && <p style={{ marginTop: 0 }}>{proyecto.description}</p>}

          <div className="entre mini suave" style={{ marginBottom: 5 }}>
            <span>Avance</span><span>{pct}%</span>
          </div>
          <Barra valor={pct} />

          <table className="tabla" style={{ marginTop: 16 }}>
            <tbody>
              <tr>
                <td className="suave">Entrega</td>
                <td>
                  {formatearFecha(proyecto.due_date)}{' '}
                  {dias !== null && proyecto.status === 'activo' && (
                    <span className={`mini ${dias < 0 ? 'vencida' : dias <= 14 ? 'proxima' : 'suave'}`}>
                      ({dias < 0 ? `${Math.abs(dias)} días de retraso` : dias === 0 ? 'es hoy' : `faltan ${dias} días`})
                    </span>
                  )}
                </td>
              </tr>
              <tr>
                <td className="suave">Repositorio</td>
                <td className="mini">
                  {proyecto.repo_url
                    ? <a href={proyecto.repo_url} target="_blank" rel="noreferrer">{proyecto.repo_url.replace('https://github.com/', '')}</a>
                    : <span className="suave">Sin vincular</span>}
                </td>
              </tr>
              <tr>
                <td className="suave">Tareas</td>
                <td>{propias.filter((t) => t.status === 'completada').length} de {propias.length} completadas</td>
              </tr>
              {proyecto.last_deploy_url && (
                <tr>
                  <td className="suave">Último despliegue</td>
                  <td className="mini">
                    <a href={`https://${proyecto.last_deploy_url}`} target="_blank" rel="noreferrer">
                      {proyecto.last_deploy_state ?? 'ver'}
                    </a>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="tarjeta">
          <h2 style={{ marginBottom: 12 }}>Cambios en el repositorio</h2>
          <Commits repo={repo} />
        </section>
      </div>

      <section className="tarjeta" style={{ marginTop: 14 }}>
        <h2 style={{ marginBottom: 4 }}>Tareas</h2>
        {!permisos.gestionarTareas && (
          <p className="mini suave" style={{ marginTop: 0 }}>
            Lo que escribas llega como solicitud. Quien administra el espacio la agenda
            y la cierra.
          </p>
        )}

        <form onSubmit={agregar} className="filtros" style={{ margin: '12px 0 14px' }}>
          <input
            style={{ flex: 1, minWidth: 220 }}
            placeholder={permisos.gestionarTareas ? 'Nueva tarea…' : 'Describe lo que necesitas…'}
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
          />
          {permisos.gestionarTareas && (
            <input type="date" value={limite} onChange={(e) => setLimite(e.target.value)} />
          )}
          <button className="boton primario" type="submit">
            {permisos.gestionarTareas ? 'Agregar' : 'Enviar solicitud'}
          </button>
        </form>

        <ListaTareas
          tareas={propias}
          permisos={permisos}
          onCambiar={(t, campos) => intentar(() => guardarTarea({ id: t.id, ...campos }))}
          onEliminar={(t) => intentar(() => eliminarTarea(t.id))}
        />
      </section>

      {editando && (
        <Modal titulo="Editar proyecto" onCerrar={() => setEditando(false)}>
          <FormularioProyecto
            inicial={{
              id: proyecto.id, space_id: proyecto.space_id, name: proyecto.name,
              description: proyecto.description, status: proyecto.status,
              due_date: proyecto.due_date, repo_url: proyecto.repo_url,
            }}
            espacios={espacios}
            onCancelar={() => setEditando(false)}
            onGuardar={async (p) => {
              const { space_id, ...campos } = p
              await guardarProyecto(campos)
              setEditando(false)
            }}
          />
        </Modal>
      )}
    </>
  )
}
