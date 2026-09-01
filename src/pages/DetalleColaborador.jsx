import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAlmacen } from '../lib/almacen.jsx'
import { estadoProyecto, prioridad, rol as rolPorId } from '../data/modelo.js'
import { avanceProyecto, cargaDeColaborador, proyectosDeColaborador } from '../lib/calculos.js'
import { personasVisibles } from '../lib/permisos.js'
import { formatearFecha } from '../lib/formato.js'
import { Avatar, Barra, Etiqueta, Modal, Vacio } from '../components/Piezas.jsx'
import FormularioColaborador from '../components/FormularioColaborador.jsx'

export default function DetalleColaborador() {
  const { id } = useParams()
  const navegar = useNavigate()
  const {
    colaboradores, espacios, miembros, proyectos, usuarioId,
    misProyectos, misTareas, misEspacios,
    guardarColaborador, eliminarColaborador, permisosEn,
  } = useAlmacen()
  const [editando, setEditando] = useState(false)

  const visibles = personasVisibles(usuarioId, colaboradores, proyectos, espacios, miembros)
  const c = visibles.find((x) => x.id === id)

  if (!c) {
    return (
      <Vacio
        titulo="Persona no disponible"
        texto="No compartes ningún espacio ni proyecto con ella, o fue eliminada."
        accion={<Link className="boton" to="/colaboradores">Volver a personas</Link>}
      />
    )
  }

  // Solo los espacios que el observador también alcanza.
  const susEspacios = miembros
    .filter((m) => m.colaboradorId === c.id && misEspacios.some((e) => e.id === m.espacioId))
    .map((m) => ({ espacio: misEspacios.find((e) => e.id === m.espacioId), rolEspacio: m.rolEspacio }))

  const puedeAdministrar = susEspacios.some(({ espacio }) => permisosEn(espacio.id).gestionarMiembros)
  const suyos = proyectosDeColaborador(c.id, misProyectos)
  const carga = cargaDeColaborador(c.id, misProyectos, misTareas)
  const susTareas = misTareas
    .filter((t) => t.asignadoId === c.id && t.estado !== 'completada')
    .sort((a, b) => (a.fechaLimite || '9999').localeCompare(b.fechaLimite || '9999'))

  function borrar() {
    if (!confirm(`¿Eliminar a ${c.nombre}? Se quitará de todos los espacios y proyectos.`)) return
    eliminarColaborador(c.id)
    navegar('/colaboradores')
  }

  return (
    <>
      <Link className="mini suave" to="/colaboradores">← Personas</Link>

      <div className="encabezado" style={{ marginTop: 10 }}>
        <div className="linea">
          <Avatar nombre={c.nombre} tam="lg" />
          <div>
            <h1>{c.nombre}</h1>
            <p>
              {c.rol || 'Sin puesto'}
              {c.area && ` · ${c.area}`}
              {!c.activo && ' · Inactivo'}
            </p>
          </div>
        </div>
        {puedeAdministrar && (
          <div className="acciones">
            <button className="boton" onClick={() => setEditando(true)}>Editar</button>
            <button className="boton peligro" onClick={borrar}>Eliminar</button>
          </div>
        )}
      </div>

      <div className="rejilla kpi" style={{ marginBottom: 16 }}>
        <div className="tarjeta">
          <div className="kpi-etiqueta">Proyectos activos</div>
          <div className="kpi-valor">{carga.proyectosActivos}</div>
        </div>
        <div className="tarjeta">
          <div className="kpi-etiqueta">Proyectos totales</div>
          <div className="kpi-valor">{carga.proyectos}</div>
        </div>
        <div className="tarjeta">
          <div className="kpi-etiqueta">Lidera</div>
          <div className="kpi-valor">{carga.lidera}</div>
        </div>
        <div className="tarjeta">
          <div className="kpi-etiqueta">Tareas abiertas</div>
          <div className="kpi-valor">{carga.tareasAbiertas}</div>
        </div>
      </div>

      <div className="rejilla dos">
        <section className="tarjeta">
          <h2 style={{ marginBottom: 12 }}>Datos y espacios</h2>
          <table className="tabla">
            <tbody>
              <tr><td className="suave">Correo</td><td>{c.email || '—'}</td></tr>
              <tr><td className="suave">Teléfono</td><td>{c.telefono || '—'}</td></tr>
              <tr><td className="suave">Ingreso</td><td>{formatearFecha(c.fechaIngreso)}</td></tr>
              <tr>
                <td className="suave">Espacios</td>
                <td>
                  {susEspacios.length === 0 ? '—' : (
                    <span className="envuelve">
                      {susEspacios.map(({ espacio, rolEspacio }) => (
                        <Link key={espacio.id} to={`/espacios/${espacio.id}`} className="chip linea">
                          <span className="punto-espacio" style={{ background: espacio.color }} />
                          {espacio.nombre}
                          <Etiqueta item={rolPorId(rolEspacio)} />
                        </Link>
                      ))}
                    </span>
                  )}
                </td>
              </tr>
              <tr>
                <td className="suave">Habilidades</td>
                <td>
                  {(c.habilidades ?? []).length === 0 ? '—' : (
                    <span className="envuelve">
                      {c.habilidades.map((h) => <span key={h} className="chip">{h}</span>)}
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
          {c.notas && <p className="mini suave" style={{ marginBottom: 0 }}>{c.notas}</p>}
        </section>

        <section className="tarjeta">
          <h2 style={{ marginBottom: 12 }}>Tareas pendientes ({susTareas.length})</h2>
          {susTareas.length === 0 ? (
            <p className="suave mini">Sin tareas abiertas asignadas.</p>
          ) : (
            susTareas.map((t) => {
              const proyecto = misProyectos.find((p) => p.id === t.proyectoId)
              return (
                <Link
                  key={t.id}
                  to={`/proyectos/${t.proyectoId}`}
                  className="entre"
                  style={{ padding: '8px 0', borderBottom: '1px solid var(--borde)' }}
                >
                  <span style={{ minWidth: 0 }}>
                    <div>{t.titulo}</div>
                    <span className="mini suave">{proyecto?.nombre ?? 'Proyecto'}</span>
                  </span>
                  <span className="mini suave">{formatearFecha(t.fechaLimite)}</span>
                </Link>
              )
            })
          )}
        </section>
      </div>

      <section className="tarjeta" style={{ marginTop: 14 }}>
        <h2 style={{ marginBottom: 12 }}>Proyectos ({suyos.length})</h2>
        {suyos.length === 0 ? (
          <p className="suave mini">Sin proyectos asignados que tú puedas ver.</p>
        ) : (
          <div className="desplaza">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Proyecto</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Prioridad</th>
                  <th>Entrega</th>
                  <th style={{ width: 130 }}>Avance</th>
                </tr>
              </thead>
              <tbody>
                {suyos.map((p) => {
                  const avance = avanceProyecto(p, misTareas)
                  return (
                    <tr key={p.id}>
                      <td><Link to={`/proyectos/${p.id}`} style={{ fontWeight: 600 }}>{p.nombre}</Link></td>
                      <td className="suave">{p.responsableId === c.id ? 'Responsable' : 'Integrante'}</td>
                      <td><Etiqueta item={estadoProyecto(p.estado)} /></td>
                      <td><Etiqueta item={prioridad(p.prioridad)} /></td>
                      <td className="suave">{formatearFecha(p.fechaFin)}</td>
                      <td>
                        <div className="mini suave">{avance}%</div>
                        <Barra valor={avance} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editando && (
        <Modal titulo="Editar persona" onCerrar={() => setEditando(false)}>
          <FormularioColaborador
            inicial={c}
            onCancelar={() => setEditando(false)}
            onGuardar={(actualizado) => {
              guardarColaborador(actualizado)
              setEditando(false)
            }}
          />
        </Modal>
      )}
    </>
  )
}
