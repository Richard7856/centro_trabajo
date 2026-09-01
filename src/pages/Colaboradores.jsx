import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAlmacen } from '../lib/almacen.jsx'
import { rol as rolPorId } from '../data/modelo.js'
import { cargaDeColaborador } from '../lib/calculos.js'
import { personasVisibles } from '../lib/permisos.js'
import { Avatar, Etiqueta, Modal, Vacio } from '../components/Piezas.jsx'
import FormularioColaborador from '../components/FormularioColaborador.jsx'

export default function Colaboradores() {
  const {
    colaboradores, espacios, miembros, proyectos, usuarioId,
    misProyectos, misTareas, misEspacios, guardarColaborador, permisosEn,
  } = useAlmacen()

  const [busqueda, setBusqueda] = useState('')
  const [soloActivos, setSoloActivos] = useState(false)
  const [creando, setCreando] = useState(false)

  const puedeDarDeAlta = misEspacios.some((e) => permisosEn(e.id).gestionarMiembros)

  const lista = useMemo(() => {
    const visibles = personasVisibles(usuarioId, colaboradores, proyectos, espacios, miembros)
    const texto = busqueda.trim().toLowerCase()

    return visibles
      .filter((c) => {
        if (soloActivos && !c.activo) return false
        if (!texto) return true
        return [c.nombre, c.rol, c.area, c.email, ...(c.habilidades ?? [])]
          .filter(Boolean)
          .some((campo) => campo.toLowerCase().includes(texto))
      })
      .map((c) => ({
        ...c,
        carga: cargaDeColaborador(c.id, misProyectos, misTareas),
        // Solo se muestran los espacios que el observador también alcanza.
        roles: miembros
          .filter((m) => m.colaboradorId === c.id && misEspacios.some((e) => e.id === m.espacioId))
          .map((m) => ({
            espacio: misEspacios.find((e) => e.id === m.espacioId),
            rol: m.rolEspacio,
          })),
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [colaboradores, espacios, miembros, proyectos, misProyectos, misTareas, misEspacios, usuarioId, busqueda, soloActivos])

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Personas</h1>
          <p>{lista.length} persona(s) que alcanzas desde tus espacios.</p>
        </div>
        {puedeDarDeAlta && (
          <button className="boton primario" onClick={() => setCreando(true)}>+ Nueva persona</button>
        )}
      </div>

      <div className="filtros">
        <input
          type="search"
          placeholder="Buscar por nombre, puesto, área o habilidad…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <label className="linea mini">
          <input type="checkbox" checked={soloActivos} onChange={(e) => setSoloActivos(e.target.checked)} />
          Solo activos
        </label>
      </div>

      {lista.length === 0 ? (
        <Vacio
          titulo="Sin personas"
          texto={
            busqueda ? 'Nadie coincide con la búsqueda.' : 'Todavía no hay personas registradas.'
          }
          accion={
            puedeDarDeAlta && !busqueda ? (
              <button className="boton primario" onClick={() => setCreando(true)}>
                + Nueva persona
              </button>
            ) : null
          }
        />
      ) : (
        <div className="desplaza tarjeta" style={{ padding: 0 }}>
          <table className="tabla">
            <thead>
              <tr>
                <th>Persona</th>
                <th>Espacios y rol</th>
                <th>Proyectos</th>
                <th>Lidera</th>
                <th>Tareas abiertas</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link className="linea" to={`/colaboradores/${c.id}`}>
                      <Avatar nombre={c.nombre} />
                      <span>
                        <div style={{ fontWeight: 600 }}>
                          {c.nombre}
                          {!c.activo && <span className="chip" style={{ marginLeft: 6 }}>Inactivo</span>}
                        </div>
                        <span className="mini suave">{c.rol || 'Sin puesto'}</span>
                      </span>
                    </Link>
                  </td>
                  <td>
                    {c.roles.length === 0 ? (
                      <span className="suave mini">—</span>
                    ) : (
                      <span className="envuelve">
                        {c.roles.map(({ espacio, rol }) => (
                          <span key={espacio.id} className="chip linea">
                            <span className="punto-espacio" style={{ background: espacio.color }} />
                            {espacio.nombre}
                            <Etiqueta item={rolPorId(rol)} />
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                  <td>{c.carga.proyectosActivos} activo(s) / {c.carga.proyectos}</td>
                  <td>{c.carga.lidera}</td>
                  <td>{c.carga.tareasAbiertas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creando && (
        <Modal titulo="Nueva persona" onCerrar={() => setCreando(false)}>
          <p className="mini suave" style={{ marginTop: 0 }}>
            Al darla de alta queda registrada, pero no ve nada hasta que la agregues a un
            espacio con un rol.
          </p>
          <FormularioColaborador
            onCancelar={() => setCreando(false)}
            onGuardar={(c) => {
              guardarColaborador(c)
              setCreando(false)
            }}
          />
        </Modal>
      )}
    </>
  )
}
