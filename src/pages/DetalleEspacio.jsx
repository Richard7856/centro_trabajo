import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useDatos } from '../lib/datos.jsx'
import { ROLES, color, estadoProyecto, rol as rolPorId } from '../data/modelo.js'
import { avance } from '../lib/calculos.js'
import { formatearFecha } from '../lib/formato.js'
import { Avatar, Barra, Etiqueta, Modal, Vacio } from '../components/Piezas.jsx'
import FormularioEspacio from '../components/FormularioEspacio.jsx'

export default function DetalleEspacio() {
  const { id } = useParams()
  const navegar = useNavigate()
  const {
    espacios, todosLosProyectos, todasLasTareas, personas, miembrosDe, permisosEn,
    guardarEspacio, eliminarEspacio, guardarMiembro, quitarMiembro, setEspacioId, nombreDe,
  } = useDatos()

  const [editando, setEditando] = useState(false)
  const [error, setError] = useState('')

  // Si no está en la lista, la base no lo entregó: para esta cuenta no existe.
  const espacio = espacios.find((e) => e.id === id)
  if (!espacio) {
    return (
      <Vacio
        titulo="Espacio no disponible"
        texto="No eres miembro de este espacio o fue eliminado."
        accion={<Link className="boton" to="/espacios">Volver a espacios</Link>}
      />
    )
  }

  const p = permisosEn(espacio.id)
  const gente = miembrosDe(espacio.id)
  const proyectos = todosLosProyectos.filter((x) => x.space_id === espacio.id)

  const intentar = async (accion) => {
    setError('')
    try { await accion() } catch (e) { setError(e.message) }
  }

  return (
    <>
      <Link className="mini suave" to="/espacios">← Espacios</Link>

      <div className="encabezado" style={{ marginTop: 10 }}>
        <div>
          <h1 className="linea">
            <span className="punto-espacio" style={{ background: color(espacio.color), width: 12, height: 12 }} />
            {espacio.name}
          </h1>
          <p>
            Tu rol: {rolPorId(p.rol).nombre}
            {espacio.archived_at && ' · espacio archivado'}
          </p>
        </div>
        {p.gestionarEspacio && (
          <div className="acciones">
            <button className="boton" onClick={() => setEditando(true)}>Editar</button>
            <button
              className="boton"
              onClick={() => intentar(() =>
                guardarEspacio({ id: espacio.id, archived_at: espacio.archived_at ? null : new Date().toISOString() }),
              )}
            >
              {espacio.archived_at ? 'Desarchivar' : 'Archivar'}
            </button>
            <button
              className="boton peligro"
              onClick={() => {
                if (!confirm(`¿Eliminar "${espacio.name}"?\n\nSe borran también sus ${proyectos.length} proyecto(s) y las tareas de estos. No se puede deshacer.`)) return
                intentar(async () => {
                  await eliminarEspacio(espacio.id)
                  setEspacioId('')
                  navegar('/espacios')
                })
              }}
            >
              Eliminar
            </button>
          </div>
        )}
      </div>

      {error && <div className="aviso alerta">{error}</div>}

      <section className="tarjeta">
        <div className="entre" style={{ marginBottom: 12 }}>
          <h2>Miembros ({gente.length})</h2>
        </div>

        {gente.map((m) => (
          <div key={m.id} className="entre" style={{ padding: '9px 0', borderBottom: '1px solid var(--borde)' }}>
            <span className="linea">
              <Avatar nombre={nombreDe(m.user_id) ?? '?'} tam="sm" />
              <span>
                <div>{nombreDe(m.user_id) ?? 'Cuenta sin perfil visible'}</div>
                <span className="mini suave">
                  {personas.find((x) => x.id === m.user_id)?.email ?? ''}
                </span>
              </span>
            </span>
            <span className="linea">
              {p.gestionarMiembros && m.role !== 'owner' ? (
                <select
                  value={m.role}
                  onChange={(e) => intentar(() => guardarMiembro({ id: m.id, role: e.target.value }))}
                  className="mini-select"
                >
                  {ROLES.map((r) => (
                    <option key={r.id} value={r.id}>{r.nombre}</option>
                  ))}
                </select>
              ) : (
                <Etiqueta item={rolPorId(m.role)} />
              )}
              {p.gestionarMiembros && m.role !== 'owner' && (
                <button
                  className="boton sm peligro"
                  onClick={() => confirm('¿Quitar a esta persona del espacio?') && intentar(() => quitarMiembro(m.id))}
                >
                  ✕
                </button>
              )}
            </span>
          </div>
        ))}

        {p.gestionarMiembros && (
          <p className="mini suave" style={{ marginTop: 12, marginBottom: 0 }}>
            Para sumar a alguien nuevo hace falta que primero cree su cuenta. El envío
            de invitaciones por correo está en la tabla <code>invitations</code> pero
            todavía no conectado a la pantalla.
          </p>
        )}
      </section>

      <section className="tarjeta" style={{ marginTop: 14 }}>
        <div className="entre" style={{ marginBottom: 12 }}>
          <h2>Proyectos ({proyectos.length})</h2>
          <Link className="boton sm" to="/proyectos" onClick={() => setEspacioId(espacio.id)}>
            Ver en Proyectos →
          </Link>
        </div>

        {proyectos.length === 0 ? (
          <p className="suave mini">Todavía no hay proyectos en este espacio.</p>
        ) : (
          <div className="desplaza">
            <table className="tabla">
              <thead>
                <tr><th>Proyecto</th><th>Estado</th><th>Repositorio</th><th>Entrega</th><th style={{ width: 130 }}>Avance</th></tr>
              </thead>
              <tbody>
                {proyectos.map((x) => {
                  const pct = avance(x, todasLasTareas)
                  return (
                    <tr key={x.id}>
                      <td><Link to={`/proyectos/${x.id}`} style={{ fontWeight: 600 }}>{x.name}</Link></td>
                      <td><Etiqueta item={estadoProyecto(x.status)} /></td>
                      <td className="mini suave recorte">{x.repo_url?.replace('https://github.com/', '') ?? '—'}</td>
                      <td className="suave">{formatearFecha(x.due_date)}</td>
                      <td>
                        <div className="mini suave">{pct}%</div>
                        <Barra valor={pct} />
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
        <Modal titulo="Editar espacio" onCerrar={() => setEditando(false)}>
          <FormularioEspacio
            inicial={{ id: espacio.id, name: espacio.name, kind: espacio.kind, color: espacio.color }}
            onCancelar={() => setEditando(false)}
            onGuardar={async (e) => {
              await guardarEspacio(e)
              setEditando(false)
            }}
          />
        </Modal>
      )}
    </>
  )
}
