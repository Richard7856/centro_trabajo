import { useState } from 'react'
import { ESTADOS_PROYECTO, PRIORIDADES, proyectoVacio } from '../data/modelo.js'
import { Campo } from './Piezas.jsx'

export default function FormularioProyecto({ inicial, colaboradores, onGuardar, onCancelar }) {
  const [p, setP] = useState(() => inicial ?? proyectoVacio())
  const [error, setError] = useState('')

  const set = (campo) => (e) => setP({ ...p, [campo]: e.target.value })

  const alternarColaborador = (id) =>
    setP((prev) => ({
      ...prev,
      colaboradorIds: prev.colaboradorIds.includes(id)
        ? prev.colaboradorIds.filter((x) => x !== id)
        : [...prev.colaboradorIds, id],
    }))

  function enviar(e) {
    e.preventDefault()
    if (!p.nombre.trim()) return setError('El nombre del proyecto es obligatorio.')
    if (p.fechaInicio && p.fechaFin && p.fechaFin < p.fechaInicio) {
      return setError('La fecha de entrega no puede ser anterior al inicio.')
    }
    // El responsable siempre forma parte del equipo.
    const equipo = p.responsableId
      ? Array.from(new Set([...p.colaboradorIds, p.responsableId]))
      : p.colaboradorIds
    onGuardar({ ...p, nombre: p.nombre.trim(), colaboradorIds: equipo })
  }

  return (
    <form onSubmit={enviar}>
      <Campo etiqueta="Nombre del proyecto *">
        <input value={p.nombre} onChange={set('nombre')} autoFocus placeholder="Ej. Remodelación sucursal centro" />
      </Campo>

      <Campo etiqueta="Cliente o área">
        <input value={p.cliente} onChange={set('cliente')} />
      </Campo>

      <Campo etiqueta="Descripción">
        <textarea value={p.descripcion} onChange={set('descripcion')} />
      </Campo>

      <div className="fila">
        <Campo etiqueta="Estado">
          <select value={p.estado} onChange={set('estado')}>
            {ESTADOS_PROYECTO.map((e) => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Prioridad">
          <select value={p.prioridad} onChange={set('prioridad')}>
            {PRIORIDADES.map((e) => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
        </Campo>
      </div>

      <div className="fila">
        <Campo etiqueta="Inicio">
          <input type="date" value={p.fechaInicio} onChange={set('fechaInicio')} />
        </Campo>
        <Campo etiqueta="Entrega">
          <input type="date" value={p.fechaFin} onChange={set('fechaFin')} />
        </Campo>
      </div>

      <Campo etiqueta="Responsable">
        <select value={p.responsableId} onChange={set('responsableId')}>
          <option value="">Sin responsable</option>
          {colaboradores.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </Campo>

      <Campo etiqueta="Equipo asignado">
        {colaboradores.length === 0 ? (
          <span className="suave mini">Aún no hay colaboradores registrados.</span>
        ) : (
          <div className="envuelve">
            {colaboradores.map((c) => {
              const puesto = p.colaboradorIds.includes(c.id)
              return (
                <button
                  type="button"
                  key={c.id}
                  className={`boton sm${puesto ? ' primario' : ''}`}
                  onClick={() => alternarColaborador(c.id)}
                >
                  {puesto ? '✓ ' : '+ '}{c.nombre}
                </button>
              )
            })}
          </div>
        )}
      </Campo>

      {error && <p style={{ color: 'var(--peligro)' }} className="mini">{error}</p>}

      <div className="modal-pie">
        <button type="button" className="boton" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="boton primario">Guardar proyecto</button>
      </div>
    </form>
  )
}
