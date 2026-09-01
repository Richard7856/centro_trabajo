import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAlmacen } from '../lib/almacen.jsx'
import { ROLES, estadoProyecto, nuevoId, repoTexto, rol as rolPorId } from '../data/modelo.js'
import { avanceProyecto } from '../lib/calculos.js'
import { formatearFecha } from '../lib/formato.js'
import { Avatar, Barra, Etiqueta, Modal, Vacio } from '../components/Piezas.jsx'
import FormularioEspacio from '../components/FormularioEspacio.jsx'

export default function DetalleEspacio() {
  const { id } = useParams()
  const navegar = useNavigate()
  const {
    misEspacios, misProyectosTodos, miembros, colaboradores, tareas,
    guardarEspacio, eliminarEspacio, guardarMiembro, quitarMiembro,
    permisosEn, setEspacioId,
  } = useAlmacen()

  const [editando, setEditando] = useState(false)
  const [agregando, setAgregando] = useState(false)
  const [nuevoMiembro, setNuevoMiembro] = useState({ colaboradorId: '', rolEspacio: 'colaborador' })

  // Si el espacio no está entre los visibles, para esta persona no existe.
  const espacio = misEspacios.find((e) => e.id === id)
  if (!espacio) {
    return (
      <Vacio
        titulo="Espacio no disponible"
        texto="No tienes acceso a este espacio o fue eliminado."
        accion={<Link className="boton" to="/espacios">Volver a espacios</Link>}
      />
    )
  }

  const p = permisosEn(espacio.id)
  const gente = miembros.filter((m) => m.espacioId === espacio.id)
  const proyectos = misProyectosTodos.filter((x) => x.espacioId === espacio.id)
  const yaMiembro = new Set(gente.map((m) => m.colaboradorId))
  const disponibles = colaboradores.filter((c) => !yaMiembro.has(c.id))

  function borrar() {
    if (
      !confirm(
        `¿Eliminar el espacio "${espacio.nombre}"?\n\nSe borran también sus ${proyectos.length} proyecto(s) y las tareas de estos. No se puede deshacer.`,
      )
    ) {
      return
    }
    eliminarEspacio(espacio.id)
    setEspacioId('')
    navegar('/espacios')
  }

  return (
    <>
      <Link className="mini suave" to="/espacios">← Espacios</Link>

      <div className="encabezado" style={{ marginTop: 10 }}>
        <div>
          <h1 className="linea">
            <span className="punto-espacio" style={{ background: espacio.color, width: 12, height: 12 }} />
            {espacio.nombre}
          </h1>
          <p>
            {espacio.descripcion || 'Sin descripción'} · Tu rol: {rolPorId(p.rol).nombre}
          </p>
        </div>
        {p.gestionarEspacio && (
          <div className="acciones">
            <button className="boton" onClick={() => setEditando(true)}>Editar</button>
            <button className="boton peligro" onClick={borrar}>Eliminar</button>
          </div>
        )}
      </div>

      <div className="rejilla dos">
        <section className="tarjeta">
          <div className="entre" style={{ marginBottom: 12 }}>
            <h2>Miembros ({gente.length})</h2>
            {p.gestionarMiembros && (
              <button className="boton sm primario" onClick={() => setAgregando(true)}>+ Agregar</button>
            )}
          </div>

          {!p.verEquipoCompleto ? (
            <p className="suave mini">
              Tu rol no incluye ver la lista completa de miembros del espacio.
            </p>
          ) : (
            gente.map((m) => {
              const persona = colaboradores.find((c) => c.id === m.colaboradorId)
              if (!persona) return null
              return (
                <div key={m.id} className="entre" style={{ padding: '9px 0', borderBottom: '1px solid var(--borde)' }}>
                  <Link className="linea" to={`/colaboradores/${persona.id}`}>
                    <Avatar nombre={persona.nombre} tam="sm" />
                    <span>
                      <div>{persona.nombre}</div>
                      <span className="mini suave">{persona.rol || 'Sin puesto'}</span>
                    </span>
                  </Link>
                  <span className="linea">
                    {p.gestionarMiembros ? (
                      <select
                        value={m.rolEspacio}
                        onChange={(e) => guardarMiembro({ ...m, rolEspacio: e.target.value })}
                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--borde)', background: 'var(--superficie)', color: 'var(--texto)', fontSize: 12 }}
                      >
                        {ROLES.map((r) => (
                          <option key={r.id} value={r.id}>{r.nombre}</option>
                        ))}
                      </select>
                    ) : (
                      <Etiqueta item={rolPorId(m.rolEspacio)} />
                    )}
                    {p.gestionarMiembros && m.rolEspacio !== 'dueno' && (
                      <button
                        className="boton sm peligro"
                        onClick={() => confirm(`¿Quitar a ${persona.nombre} del espacio?`) && quitarMiembro(m.id)}
                        aria-label={`Quitar a ${persona.nombre}`}
                      >
                        ✕
                      </button>
                    )}
                  </span>
                </div>
              )
            })
          )}
        </section>

        <section className="tarjeta">
          <h2 style={{ marginBottom: 12 }}>Repositorio por defecto</h2>
          {repoTexto(espacio.repoPorDefecto) ? (
            <>
              <p className="linea" style={{ marginTop: 0 }}>
                <span className="chip">{repoTexto(espacio.repoPorDefecto)}</span>
                <span className="mini suave">rama {espacio.repoPorDefecto.rama || 'main'}</span>
              </p>
              <p className="mini suave" style={{ marginBottom: 0 }}>
                Se propone al crear proyectos aquí. Cada proyecto puede apuntar a otro
                repositorio o rama.
              </p>
            </>
          ) : (
            <p className="suave mini" style={{ marginBottom: 0 }}>
              Sin repositorio por defecto. {p.gestionarEspacio && 'Puedes definirlo en Editar.'}
            </p>
          )}
        </section>
      </div>

      <section className="tarjeta" style={{ marginTop: 14 }}>
        <div className="entre" style={{ marginBottom: 12 }}>
          <h2>Proyectos del espacio ({proyectos.length})</h2>
          <Link className="boton sm" to="/proyectos" onClick={() => setEspacioId(espacio.id)}>
            Ver en Proyectos →
          </Link>
        </div>

        {proyectos.length === 0 ? (
          <p className="suave mini">
            Todavía no hay proyectos en este espacio.
            {p.crearProyecto && ' Créalos desde la sección Proyectos.'}
          </p>
        ) : (
          <div className="desplaza">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Proyecto</th>
                  <th>Estado</th>
                  <th>Repositorio</th>
                  <th>Entrega</th>
                  <th style={{ width: 130 }}>Avance</th>
                </tr>
              </thead>
              <tbody>
                {proyectos.map((x) => {
                  const avance = avanceProyecto(x, tareas)
                  return (
                    <tr key={x.id}>
                      <td><Link to={`/proyectos/${x.id}`} style={{ fontWeight: 600 }}>{x.nombre}</Link></td>
                      <td><Etiqueta item={estadoProyecto(x.estado)} /></td>
                      <td className="mini suave">{repoTexto(x.repo) || '—'}</td>
                      <td className="suave">{formatearFecha(x.fechaFin)}</td>
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
        <Modal titulo="Editar espacio" onCerrar={() => setEditando(false)}>
          <FormularioEspacio
            inicial={espacio}
            onCancelar={() => setEditando(false)}
            onGuardar={(e) => {
              guardarEspacio(e)
              setEditando(false)
            }}
          />
        </Modal>
      )}

      {agregando && (
        <Modal titulo={`Agregar miembro a ${espacio.nombre}`} onCerrar={() => setAgregando(false)}>
          {disponibles.length === 0 ? (
            <p className="suave">
              Todas las personas registradas ya son miembros. Da de alta a alguien nuevo
              desde <Link to="/colaboradores">Personas</Link>.
            </p>
          ) : (
            <form
              onSubmit={(ev) => {
                ev.preventDefault()
                if (!nuevoMiembro.colaboradorId) return
                guardarMiembro({
                  id: nuevoId('mbr'),
                  espacioId: espacio.id,
                  colaboradorId: nuevoMiembro.colaboradorId,
                  rolEspacio: nuevoMiembro.rolEspacio,
                })
                setNuevoMiembro({ colaboradorId: '', rolEspacio: 'colaborador' })
                setAgregando(false)
              }}
            >
              <div className="campo">
                <label>Persona</label>
                <select
                  value={nuevoMiembro.colaboradorId}
                  onChange={(e) => setNuevoMiembro({ ...nuevoMiembro, colaboradorId: e.target.value })}
                >
                  <option value="">Elige a alguien…</option>
                  {disponibles.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="campo">
                <label>Rol en este espacio</label>
                <select
                  value={nuevoMiembro.rolEspacio}
                  onChange={(e) => setNuevoMiembro({ ...nuevoMiembro, rolEspacio: e.target.value })}
                >
                  {ROLES.map((r) => (
                    <option key={r.id} value={r.id}>{r.nombre} — {r.descripcion}</option>
                  ))}
                </select>
              </div>

              <div className="modal-pie">
                <button type="button" className="boton" onClick={() => setAgregando(false)}>Cancelar</button>
                <button type="submit" className="boton primario" disabled={!nuevoMiembro.colaboradorId}>
                  Agregar al espacio
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </>
  )
}
