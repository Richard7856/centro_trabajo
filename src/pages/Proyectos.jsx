import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAlmacen } from '../lib/almacen.jsx'
import { ESTADOS_PROYECTO, PRIORIDADES, estadoProyecto, prioridad } from '../data/modelo.js'
import { avanceProyecto, nombrePorId, tareasDeProyecto } from '../lib/calculos.js'
import { formatearFecha } from '../lib/formato.js'
import { Barra, Etiqueta, Modal, PilaAvatares, Vacio } from '../components/Piezas.jsx'
import FormularioProyecto from '../components/FormularioProyecto.jsx'

const ORDENES = [
  { id: 'entrega', nombre: 'Fecha de entrega' },
  { id: 'nombre', nombre: 'Nombre' },
  { id: 'prioridad', nombre: 'Prioridad' },
  { id: 'avance', nombre: 'Avance' },
]

export default function Proyectos() {
  const { proyectos, colaboradores, tareas, guardarProyecto } = useAlmacen()
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroPrioridad, setFiltroPrioridad] = useState('')
  const [filtroColaborador, setFiltroColaborador] = useState('')
  const [orden, setOrden] = useState('entrega')
  const [creando, setCreando] = useState(false)

  const lista = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    const pesoPrioridad = { alta: 0, media: 1, baja: 2 }

    return proyectos
      .filter((p) => {
        if (filtroEstado && p.estado !== filtroEstado) return false
        if (filtroPrioridad && p.prioridad !== filtroPrioridad) return false
        if (
          filtroColaborador &&
          p.responsableId !== filtroColaborador &&
          !p.colaboradorIds.includes(filtroColaborador)
        ) {
          return false
        }
        if (!texto) return true
        return [p.nombre, p.cliente, p.descripcion]
          .filter(Boolean)
          .some((campo) => campo.toLowerCase().includes(texto))
      })
      .sort((a, b) => {
        if (orden === 'nombre') return a.nombre.localeCompare(b.nombre)
        if (orden === 'prioridad') return pesoPrioridad[a.prioridad] - pesoPrioridad[b.prioridad]
        if (orden === 'avance') return avanceProyecto(b, tareas) - avanceProyecto(a, tareas)
        return (a.fechaFin || '9999-99-99').localeCompare(b.fechaFin || '9999-99-99')
      })
  }, [proyectos, tareas, busqueda, filtroEstado, filtroPrioridad, filtroColaborador, orden])

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Proyectos</h1>
          <p>{proyectos.length} registrado(s) · {lista.length} mostrado(s)</p>
        </div>
        <button className="boton primario" onClick={() => setCreando(true)}>+ Nuevo proyecto</button>
      </div>

      <div className="filtros">
        <input
          type="search"
          placeholder="Buscar por nombre, cliente o descripción…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADOS_PROYECTO.map((e) => (
            <option key={e.id} value={e.id}>{e.nombre}</option>
          ))}
        </select>
        <select value={filtroPrioridad} onChange={(e) => setFiltroPrioridad(e.target.value)}>
          <option value="">Toda prioridad</option>
          {PRIORIDADES.map((e) => (
            <option key={e.id} value={e.id}>{e.nombre}</option>
          ))}
        </select>
        <select value={filtroColaborador} onChange={(e) => setFiltroColaborador(e.target.value)}>
          <option value="">Todo el equipo</option>
          {colaboradores.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
        <select value={orden} onChange={(e) => setOrden(e.target.value)}>
          {ORDENES.map((o) => (
            <option key={o.id} value={o.id}>Ordenar por: {o.nombre}</option>
          ))}
        </select>
      </div>

      {lista.length === 0 ? (
        <Vacio
          titulo={proyectos.length === 0 ? 'Todavía no hay proyectos' : 'Sin resultados'}
          texto={
            proyectos.length === 0
              ? 'Crea el primer proyecto para empezar a organizar el trabajo.'
              : 'Ningún proyecto coincide con los filtros aplicados.'
          }
          accion={
            proyectos.length === 0 && (
              <button className="boton primario" onClick={() => setCreando(true)}>
                + Nuevo proyecto
              </button>
            )
          }
        />
      ) : (
        <div className="rejilla cards">
          {lista.map((p) => {
            const avance = avanceProyecto(p, tareas)
            const propias = tareasDeProyecto(p.id, tareas)
            const equipo = p.colaboradorIds.map((id) => nombrePorId(colaboradores, id))
            return (
              <Link key={p.id} to={`/proyectos/${p.id}`} className="tarjeta tarjeta-enlace">
                <div className="entre" style={{ marginBottom: 8 }}>
                  <h3>{p.nombre}</h3>
                  <Etiqueta item={prioridad(p.prioridad)} />
                </div>

                <div className="envuelve" style={{ marginBottom: 10 }}>
                  <Etiqueta item={estadoProyecto(p.estado)} />
                  {p.cliente && <span className="chip">{p.cliente}</span>}
                </div>

                {p.descripcion && (
                  <p className="mini suave" style={{ margin: '0 0 12px' }}>
                    {p.descripcion.length > 110 ? `${p.descripcion.slice(0, 110)}…` : p.descripcion}
                  </p>
                )}

                <div className="entre mini suave" style={{ marginBottom: 5 }}>
                  <span>Avance</span>
                  <span>{avance}% · {propias.filter((t) => t.estado === 'completada').length}/{propias.length} tareas</span>
                </div>
                <Barra valor={avance} />

                <div className="entre" style={{ marginTop: 12 }}>
                  <span className="mini suave">Entrega: {formatearFecha(p.fechaFin)}</span>
                  {equipo.length > 0 ? <PilaAvatares nombres={equipo} /> : <span className="mini suave">Sin equipo</span>}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {creando && (
        <Modal titulo="Nuevo proyecto" onCerrar={() => setCreando(false)}>
          <FormularioProyecto
            colaboradores={colaboradores}
            onCancelar={() => setCreando(false)}
            onGuardar={(p) => {
              guardarProyecto(p)
              setCreando(false)
            }}
          />
        </Modal>
      )}
    </>
  )
}
