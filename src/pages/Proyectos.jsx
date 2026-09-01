import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAlmacen } from '../lib/almacen.jsx'
import {
  ESTADOS_PROYECTO, PRIORIDADES, estadoProyecto, prioridad, repoTexto,
} from '../data/modelo.js'
import { avanceProyecto, tareasDeProyecto } from '../lib/calculos.js'
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
  const {
    misProyectos, misEspacios, espacioId, colaboradores, misTareas,
    guardarProyecto, permisosEn, personasDe,
  } = useAlmacen()

  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroPrioridad, setFiltroPrioridad] = useState('')
  const [orden, setOrden] = useState('entrega')
  const [creando, setCreando] = useState(false)

  // Espacios donde esta persona puede dar de alta proyectos.
  const espaciosEditables = misEspacios.filter((e) => permisosEn(e.id).crearProyecto)
  const puedeCrear = espaciosEditables.length > 0

  const nombreEspacio = (id) => misEspacios.find((e) => e.id === id)
  const nombrePersona = (id) => colaboradores.find((c) => c.id === id)?.nombre ?? 'Sin asignar'

  const lista = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    const peso = { alta: 0, media: 1, baja: 2 }

    return misProyectos
      .filter((p) => {
        if (filtroEstado && p.estado !== filtroEstado) return false
        if (filtroPrioridad && p.prioridad !== filtroPrioridad) return false
        if (!texto) return true
        return [p.nombre, p.cliente, p.descripcion, repoTexto(p.repo)]
          .filter(Boolean)
          .some((campo) => campo.toLowerCase().includes(texto))
      })
      .sort((a, b) => {
        if (orden === 'nombre') return a.nombre.localeCompare(b.nombre)
        if (orden === 'prioridad') return peso[a.prioridad] - peso[b.prioridad]
        if (orden === 'avance') return avanceProyecto(b, misTareas) - avanceProyecto(a, misTareas)
        return (a.fechaFin || '9999-99-99').localeCompare(b.fechaFin || '9999-99-99')
      })
  }, [misProyectos, misTareas, busqueda, filtroEstado, filtroPrioridad, orden])

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Proyectos</h1>
          <p>
            {espacioId
              ? `Espacio: ${nombreEspacio(espacioId)?.nombre ?? '—'}`
              : `Todos mis espacios (${misEspacios.length})`}{' '}
            · {lista.length} de {misProyectos.length}
          </p>
        </div>
        {puedeCrear && (
          <button className="boton primario" onClick={() => setCreando(true)}>+ Nuevo proyecto</button>
        )}
      </div>

      <div className="filtros">
        <input
          type="search"
          placeholder="Buscar por nombre, cliente, descripción o repo…"
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
        <select value={orden} onChange={(e) => setOrden(e.target.value)}>
          {ORDENES.map((o) => (
            <option key={o.id} value={o.id}>Ordenar por: {o.nombre}</option>
          ))}
        </select>
      </div>

      {lista.length === 0 ? (
        <Vacio
          titulo={misProyectos.length === 0 ? 'Todavía no hay proyectos' : 'Sin resultados'}
          texto={
            misProyectos.length === 0
              ? puedeCrear
                ? 'Crea el primero y asígnalo al espacio que corresponda.'
                : 'No tienes proyectos asignados en este momento.'
              : 'Ningún proyecto coincide con los filtros aplicados.'
          }
          accion={
            misProyectos.length === 0 && puedeCrear ? (
              <button className="boton primario" onClick={() => setCreando(true)}>
                + Nuevo proyecto
              </button>
            ) : null
          }
        />
      ) : (
        <div className="rejilla cards">
          {lista.map((p) => {
            const avance = avanceProyecto(p, misTareas)
            const propias = tareasDeProyecto(p.id, misTareas)
            const espacio = nombreEspacio(p.espacioId)
            const equipo = p.colaboradorIds.map(nombrePersona)
            return (
              <Link key={p.id} to={`/proyectos/${p.id}`} className="tarjeta tarjeta-enlace">
                <div className="entre" style={{ marginBottom: 8 }}>
                  <h3>{p.nombre}</h3>
                  <Etiqueta item={prioridad(p.prioridad)} />
                </div>

                <div className="envuelve" style={{ marginBottom: 10 }}>
                  {espacio && (
                    <span className="chip linea">
                      <span className="punto-espacio" style={{ background: espacio.color }} />
                      {espacio.nombre}
                    </span>
                  )}
                  <Etiqueta item={estadoProyecto(p.estado)} />
                  {repoTexto(p.repo) && <span className="chip">⎇ {repoTexto(p.repo)}</span>}
                </div>

                {p.descripcion && (
                  <p className="mini suave" style={{ margin: '0 0 12px' }}>
                    {p.descripcion.length > 110 ? `${p.descripcion.slice(0, 110)}…` : p.descripcion}
                  </p>
                )}

                <div className="entre mini suave" style={{ marginBottom: 5 }}>
                  <span>Avance</span>
                  <span>
                    {avance}% · {propias.filter((t) => t.estado === 'completada').length}/{propias.length} tareas
                  </span>
                </div>
                <Barra valor={avance} />

                <div className="entre" style={{ marginTop: 12 }}>
                  <span className="mini suave">Entrega: {formatearFecha(p.fechaFin)}</span>
                  {equipo.length > 0
                    ? <PilaAvatares nombres={equipo} />
                    : <span className="mini suave">Sin equipo</span>}
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
            personasDe={personasDe}
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
