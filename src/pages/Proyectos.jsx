import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDatos } from '../lib/datos.jsx'
import { ESTADOS_PROYECTO, color, estadoProyecto } from '../data/modelo.js'
import { avance, tareasDe } from '../lib/calculos.js'
import { formatearFecha } from '../lib/formato.js'
import { Barra, Etiqueta, Modal, Vacio } from '../components/Piezas.jsx'
import FormularioProyecto from '../components/FormularioProyecto.jsx'

const ORDENES = [
  { id: 'entrega', nombre: 'Fecha de entrega' },
  { id: 'nombre', nombre: 'Nombre' },
  { id: 'avance', nombre: 'Avance' },
]

export default function Proyectos() {
  const {
    proyectos, tareas, espacios, espacioId, espacioActivo,
    permisosEn, crearProyecto,
  } = useDatos()

  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [orden, setOrden] = useState('entrega')
  const [creando, setCreando] = useState(false)

  const espaciosEditables = espacios.filter((e) => permisosEn(e.id).crearProyecto && !e.archived_at)

  const lista = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return proyectos
      .filter((p) => {
        if (filtroEstado && p.status !== filtroEstado) return false
        if (!texto) return true
        return [p.name, p.description, p.repo_url]
          .filter(Boolean)
          .some((c) => c.toLowerCase().includes(texto))
      })
      .sort((a, b) => {
        if (orden === 'nombre') return a.name.localeCompare(b.name)
        if (orden === 'avance') return avance(b, tareas) - avance(a, tareas)
        return (a.due_date || '9999-99-99').localeCompare(b.due_date || '9999-99-99')
      })
  }, [proyectos, tareas, busqueda, filtroEstado, orden])

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Proyectos</h1>
          <p>
            {espacioActivo ? `Espacio: ${espacioActivo.name}` : `Todos mis espacios (${espacios.length})`}
            {' · '}{lista.length} de {proyectos.length}
          </p>
        </div>
        {espaciosEditables.length > 0 && (
          <button className="boton primario" onClick={() => setCreando(true)}>+ Nuevo proyecto</button>
        )}
      </div>

      <div className="filtros">
        <input
          type="search"
          placeholder="Buscar por nombre, descripción o repositorio…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADOS_PROYECTO.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        <select value={orden} onChange={(e) => setOrden(e.target.value)}>
          {ORDENES.map((o) => <option key={o.id} value={o.id}>Ordenar por: {o.nombre}</option>)}
        </select>
      </div>

      {lista.length === 0 ? (
        <Vacio
          titulo={proyectos.length === 0 ? 'Todavía no hay proyectos' : 'Sin resultados'}
          texto={
            proyectos.length === 0
              ? 'Crea el primero y asígnalo al espacio que corresponda.'
              : 'Ningún proyecto coincide con los filtros.'
          }
          accion={
            proyectos.length === 0 && espaciosEditables.length > 0 ? (
              <button className="boton primario" onClick={() => setCreando(true)}>+ Nuevo proyecto</button>
            ) : null
          }
        />
      ) : (
        <div className="rejilla cards">
          {lista.map((p) => {
            const pct = avance(p, tareas)
            const propias = tareasDe(p.id, tareas)
            const espacio = espacios.find((e) => e.id === p.space_id)
            return (
              <Link key={p.id} to={`/proyectos/${p.id}`} className="tarjeta tarjeta-enlace">
                <div className="entre" style={{ marginBottom: 8 }}>
                  <h3>{p.name}</h3>
                  <Etiqueta item={estadoProyecto(p.status)} />
                </div>

                <div className="envuelve" style={{ marginBottom: 10 }}>
                  {espacio && (
                    <span className="chip linea">
                      <span className="punto-espacio" style={{ background: color(espacio.color) }} />
                      {espacio.name}
                    </span>
                  )}
                  {p.repo_url && (
                    <span className="chip">⎇ {p.repo_url.replace('https://github.com/', '')}</span>
                  )}
                </div>

                {p.description && (
                  <p className="mini suave" style={{ margin: '0 0 12px' }}>
                    {p.description.length > 120 ? `${p.description.slice(0, 120)}…` : p.description}
                  </p>
                )}

                <div className="entre mini suave" style={{ marginBottom: 5 }}>
                  <span>Avance</span>
                  <span>
                    {pct}% · {propias.filter((t) => t.status === 'completada').length}/{propias.length} tareas
                  </span>
                </div>
                <Barra valor={pct} />

                <div className="entre" style={{ marginTop: 12 }}>
                  <span className="mini suave">Entrega: {formatearFecha(p.due_date)}</span>
                  {p.last_commit_at && (
                    <span className="mini suave">último commit registrado</span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {creando && (
        <Modal titulo="Nuevo proyecto" onCerrar={() => setCreando(false)}>
          <FormularioProyecto
            espacios={espaciosEditables}
            espacioPorDefecto={espacioId}
            onCancelar={() => setCreando(false)}
            onGuardar={async (p) => {
              await crearProyecto(p)
              setCreando(false)
            }}
          />
        </Modal>
      )}
    </>
  )
}
