import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAlmacen } from '../lib/almacen.jsx'
import { cargaDeColaborador } from '../lib/calculos.js'
import { Avatar, Modal, Vacio } from '../components/Piezas.jsx'
import FormularioColaborador from '../components/FormularioColaborador.jsx'

export default function Colaboradores() {
  const { colaboradores, proyectos, tareas, guardarColaborador } = useAlmacen()
  const [busqueda, setBusqueda] = useState('')
  const [soloActivos, setSoloActivos] = useState(false)
  const [creando, setCreando] = useState(false)

  const lista = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return colaboradores
      .filter((c) => {
        if (soloActivos && !c.activo) return false
        if (!texto) return true
        return [c.nombre, c.rol, c.area, c.email, ...(c.habilidades ?? [])]
          .filter(Boolean)
          .some((campo) => campo.toLowerCase().includes(texto))
      })
      .map((c) => ({ ...c, carga: cargaDeColaborador(c.id, proyectos, tareas) }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [colaboradores, proyectos, tareas, busqueda, soloActivos])

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Colaboradores</h1>
          <p>{colaboradores.length} perfil(es) registrado(s)</p>
        </div>
        <button className="boton primario" onClick={() => setCreando(true)}>+ Nuevo colaborador</button>
      </div>

      <div className="filtros">
        <input
          type="search"
          placeholder="Buscar por nombre, rol, área o habilidad…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <label className="linea mini">
          <input
            type="checkbox"
            checked={soloActivos}
            onChange={(e) => setSoloActivos(e.target.checked)}
          />
          Solo activos
        </label>
      </div>

      {lista.length === 0 ? (
        <Vacio
          titulo={colaboradores.length === 0 ? 'Todavía no hay perfiles' : 'Sin resultados'}
          texto={
            colaboradores.length === 0
              ? 'Registra al equipo para poder asignarlo a los proyectos.'
              : 'Nadie coincide con la búsqueda.'
          }
          accion={
            colaboradores.length === 0 && (
              <button className="boton primario" onClick={() => setCreando(true)}>
                + Nuevo colaborador
              </button>
            )
          }
        />
      ) : (
        <div className="desplaza tarjeta" style={{ padding: 0 }}>
          <table className="tabla">
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Área</th>
                <th>Proyectos</th>
                <th>Lidera</th>
                <th>Tareas abiertas</th>
                <th>Estatus</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link className="linea" to={`/colaboradores/${c.id}`}>
                      <Avatar nombre={c.nombre} />
                      <span>
                        <div style={{ fontWeight: 600 }}>{c.nombre}</div>
                        <span className="mini suave">{c.rol || 'Sin rol'}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="suave">{c.area || '—'}</td>
                  <td>{c.carga.proyectosActivos} activo(s) / {c.carga.proyectos}</td>
                  <td>{c.carga.lidera}</td>
                  <td>{c.carga.tareasAbiertas}</td>
                  <td>
                    <span className="chip">{c.activo ? 'Activo' : 'Inactivo'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creando && (
        <Modal titulo="Nuevo colaborador" onCerrar={() => setCreando(false)}>
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
