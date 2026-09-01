import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAlmacen } from '../lib/almacen.jsx'
import {
  ESTADOS_TAREA, estadoProyecto, prioridad, repoTexto, tareaVacia,
} from '../data/modelo.js'
import { avanceProyecto, tareasDeProyecto } from '../lib/calculos.js'
import { diasRestantes, formatearFecha } from '../lib/formato.js'
import { Avatar, Barra, Etiqueta, Modal, Vacio } from '../components/Piezas.jsx'
import FormularioProyecto from '../components/FormularioProyecto.jsx'
import Commits from '../components/Commits.jsx'

export default function DetalleProyecto() {
  const { id } = useParams()
  const navegar = useNavigate()
  const {
    misProyectos, misEspacios, misTareas, colaboradores, usuarioId,
    guardarProyecto, eliminarProyecto, guardarTarea, eliminarTarea,
    permisosEn, personasDe,
  } = useAlmacen()

  const [editando, setEditando] = useState(false)
  const [nuevaTarea, setNuevaTarea] = useState('')
  const [asignadoNueva, setAsignadoNueva] = useState('')
  const [limiteNueva, setLimiteNueva] = useState('')

  // misProyectos ya está filtrado por lo que esta persona alcanza: si no está
  // aquí, para ella el proyecto no existe.
  const proyecto = misProyectos.find((p) => p.id === id)

  if (!proyecto) {
    return (
      <Vacio
        titulo="Proyecto no disponible"
        texto="No tienes acceso a este proyecto o fue eliminado."
        accion={<Link className="boton" to="/proyectos">Volver a proyectos</Link>}
      />
    )
  }

  const permisos = permisosEn(proyecto.espacioId)
  const espacio = misEspacios.find((e) => e.id === proyecto.espacioId)
  const propias = tareasDeProyecto(proyecto.id, misTareas)
  const avance = avanceProyecto(proyecto, misTareas)
  const nombrePersona = (pid) => colaboradores.find((c) => c.id === pid)?.nombre ?? 'Sin asignar'

  const equipo = proyecto.colaboradorIds
    .map((cid) => colaboradores.find((c) => c.id === cid))
    .filter(Boolean)
  const clientes = (proyecto.clienteIds ?? [])
    .map((cid) => colaboradores.find((c) => c.id === cid))
    .filter(Boolean)
  const dias = diasRestantes(proyecto.fechaFin)

  function agregarTarea(e) {
    e.preventDefault()
    if (!nuevaTarea.trim()) return
    guardarTarea({
      ...tareaVacia(proyecto.id),
      titulo: nuevaTarea.trim(),
      // Un cliente levanta solicitudes, no asigna trabajo.
      asignadoId: permisos.esCliente ? '' : asignadoNueva,
      fechaLimite: permisos.esCliente ? '' : limiteNueva,
      creadaPor: usuarioId,
      esSolicitud: permisos.esCliente,
    })
    setNuevaTarea('')
    setLimiteNueva('')
  }

  function borrarProyecto() {
    if (!confirm(`¿Eliminar "${proyecto.nombre}" y sus ${propias.length} tarea(s)?`)) return
    eliminarProyecto(proyecto.id)
    navegar('/proyectos')
  }

  return (
    <>
      <Link className="mini suave" to="/proyectos">← Proyectos</Link>

      <div className="encabezado" style={{ marginTop: 10 }}>
        <div>
          <h1>{proyecto.nombre}</h1>
          <div className="envuelve" style={{ marginTop: 8 }}>
            {espacio && (
              <Link className="chip linea" to={`/espacios/${espacio.id}`}>
                <span className="punto-espacio" style={{ background: espacio.color }} />
                {espacio.nombre}
              </Link>
            )}
            <Etiqueta item={estadoProyecto(proyecto.estado)} />
            <Etiqueta item={prioridad(proyecto.prioridad)} />
            {proyecto.cliente && <span className="chip">{proyecto.cliente}</span>}
          </div>
        </div>
        <div className="acciones">
          {permisos.editarProyecto && (
            <button className="boton" onClick={() => setEditando(true)}>Editar</button>
          )}
          {permisos.eliminarProyecto && (
            <button className="boton peligro" onClick={borrarProyecto}>Eliminar</button>
          )}
        </div>
      </div>

      <div className="rejilla dos">
        <section className="tarjeta">
          <h2 style={{ marginBottom: 12 }}>Ficha</h2>

          {proyecto.descripcion && <p style={{ marginTop: 0 }}>{proyecto.descripcion}</p>}

          <div className="entre mini suave" style={{ marginBottom: 5 }}>
            <span>Avance</span>
            <span>{avance}%</span>
          </div>
          <Barra valor={avance} />

          <table className="tabla" style={{ marginTop: 16 }}>
            <tbody>
              <tr>
                <td className="suave">Inicio</td>
                <td>{formatearFecha(proyecto.fechaInicio)}</td>
              </tr>
              <tr>
                <td className="suave">Entrega</td>
                <td>
                  {formatearFecha(proyecto.fechaFin)}{' '}
                  {dias !== null && proyecto.estado !== 'completado' && (
                    <span className={`mini ${dias < 0 ? 'vencida' : dias <= 14 ? 'proxima' : 'suave'}`}>
                      ({dias < 0 ? `${Math.abs(dias)} días de retraso` : dias === 0 ? 'es hoy' : `faltan ${dias} días`})
                    </span>
                  )}
                </td>
              </tr>
              <tr>
                <td className="suave">Responsable</td>
                <td>
                  {proyecto.responsableId ? (
                    <span className="linea">
                      <Avatar nombre={nombrePersona(proyecto.responsableId)} tam="sm" />
                      {nombrePersona(proyecto.responsableId)}
                    </span>
                  ) : (
                    <span className="suave">Sin asignar</span>
                  )}
                </td>
              </tr>
              <tr>
                <td className="suave">Repositorio</td>
                <td className="mini">{repoTexto(proyecto.repo) || <span className="suave">Sin vincular</span>}</td>
              </tr>
              <tr>
                <td className="suave">Tareas</td>
                <td>{propias.filter((t) => t.estado === 'completada').length} de {propias.length} completadas</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="tarjeta">
          <h2 style={{ marginBottom: 12 }}>Equipo ({equipo.length})</h2>
          {equipo.length === 0 ? (
            <p className="suave mini">Nadie asignado todavía.</p>
          ) : (
            equipo.map((c) => (
              <div key={c.id} className="linea" style={{ padding: '8px 0', borderBottom: '1px solid var(--borde)' }}>
                <Avatar nombre={c.nombre} />
                <span>
                  <div>
                    {c.nombre}
                    {c.id === proyecto.responsableId && (
                      <span className="chip" style={{ marginLeft: 6 }}>Responsable</span>
                    )}
                  </div>
                  <span className="mini suave">{c.rol || 'Sin puesto'}</span>
                </span>
              </div>
            ))
          )}

          {permisos.verEquipoCompleto && clientes.length > 0 && (
            <>
              <h3 style={{ margin: '16px 0 8px' }}>Clientes con acceso</h3>
              <div className="envuelve">
                {clientes.map((c) => <span key={c.id} className="chip">{c.nombre}</span>)}
              </div>
            </>
          )}
        </section>
      </div>

      <section className="tarjeta" style={{ marginTop: 14 }}>
        <h2 style={{ marginBottom: 12 }}>Cambios en el repositorio</h2>
        <Commits repo={proyecto.repo} />
      </section>

      <section className="tarjeta" style={{ marginTop: 14 }}>
        <h2 style={{ marginBottom: 4 }}>
          {permisos.esCliente ? 'Solicitudes y pendientes' : 'Tareas'}
        </h2>
        {permisos.esCliente && (
          <p className="mini suave" style={{ marginTop: 0 }}>
            Lo que escribas aquí llega como solicitud al equipo. Ellos la asignan y la
            dan por terminada.
          </p>
        )}

        {permisos.crearTarea && (
          <form onSubmit={agregarTarea} className="filtros" style={{ margin: '12px 0 14px' }}>
            <input
              style={{ flex: 1, minWidth: 220 }}
              placeholder={permisos.esCliente ? 'Describe lo que necesitas…' : 'Nueva tarea…'}
              value={nuevaTarea}
              onChange={(e) => setNuevaTarea(e.target.value)}
            />
            {!permisos.esCliente && (
              <>
                <select value={asignadoNueva} onChange={(e) => setAsignadoNueva(e.target.value)}>
                  <option value="">Sin asignar</option>
                  {equipo.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
                <input type="date" value={limiteNueva} onChange={(e) => setLimiteNueva(e.target.value)} />
              </>
            )}
            <button className="boton primario" type="submit">
              {permisos.esCliente ? 'Enviar solicitud' : 'Agregar'}
            </button>
          </form>
        )}

        {propias.length === 0 ? (
          <p className="suave mini">Sin tareas registradas.</p>
        ) : (
          <div className="lista-tareas">
            {propias.map((t) => {
              const d = diasRestantes(t.fechaLimite)
              const hecha = t.estado === 'completada'
              return (
                <div key={t.id} className="tarea">
                  <input
                    type="checkbox"
                    checked={hecha}
                    disabled={!permisos.cambiarEstadoTarea}
                    aria-label={`Marcar "${t.titulo}" como completada`}
                    onChange={() => guardarTarea({ ...t, estado: hecha ? 'pendiente' : 'completada' })}
                  />
                  <span className="titulo">
                    <div className={hecha ? 'tachado' : ''}>
                      {t.titulo}
                      {t.esSolicitud && <span className="chip" style={{ marginLeft: 6 }}>Solicitud</span>}
                    </div>
                    <span className="mini suave">
                      {t.asignadoId ? nombrePersona(t.asignadoId) : 'Sin asignar'}
                      {t.fechaLimite && ` · ${formatearFecha(t.fechaLimite)}`}
                      {t.creadaPor && ` · pedida por ${nombrePersona(t.creadaPor)}`}
                    </span>
                    {!hecha && d !== null && d <= 7 && (
                      <span className={`mini ${d < 0 ? 'vencida' : 'proxima'}`}>
                        {' '}{d < 0 ? '· vencida' : d === 0 ? '· vence hoy' : `· vence en ${d} d.`}
                      </span>
                    )}
                  </span>

                  {permisos.cambiarEstadoTarea ? (
                    <select
                      value={t.estado}
                      onChange={(e) => guardarTarea({ ...t, estado: e.target.value })}
                      style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--borde)', background: 'var(--superficie)', color: 'var(--texto)', fontSize: 12 }}
                    >
                      {ESTADOS_TAREA.map((e) => (
                        <option key={e.id} value={e.id}>{e.nombre}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="chip">{ESTADOS_TAREA.find((e) => e.id === t.estado)?.nombre}</span>
                  )}

                  {permisos.eliminarTarea && (
                    <button
                      className="boton sm peligro"
                      onClick={() => eliminarTarea(t.id)}
                      aria-label={`Eliminar ${t.titulo}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {editando && (
        <Modal titulo="Editar proyecto" onCerrar={() => setEditando(false)}>
          <FormularioProyecto
            inicial={proyecto}
            espacios={misEspacios.filter((e) => permisosEn(e.id).crearProyecto)}
            espacioPorDefecto={proyecto.espacioId}
            personasDe={personasDe}
            onCancelar={() => setEditando(false)}
            onGuardar={(p) => {
              guardarProyecto(p)
              setEditando(false)
            }}
          />
        </Modal>
      )}
    </>
  )
}
