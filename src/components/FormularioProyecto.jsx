import { useState } from 'react'
import { ESTADOS_PROYECTO, PRIORIDADES, proyectoVacio } from '../data/modelo.js'
import { Campo } from './Piezas.jsx'

export default function FormularioProyecto({
  inicial, espacios, espacioPorDefecto, personasDe, onGuardar, onCancelar,
}) {
  const [p, setP] = useState(() => {
    if (inicial) return { ...inicial, clienteIds: inicial.clienteIds ?? [] }
    const espacioId = espacioPorDefecto || espacios[0]?.id || ''
    const espacio = espacios.find((e) => e.id === espacioId)
    return {
      ...proyectoVacio(espacioId),
      repo: { ...(espacio?.repoPorDefecto ?? { propietario: '', nombre: '', rama: 'main' }) },
    }
  })
  const [error, setError] = useState('')

  // El equipo elegible sale del espacio del proyecto: no se puede asignar a
  // alguien que no pertenece a él.
  const { equipo, clientes } = personasDe(p.espacioId)

  const set = (campo) => (e) => setP({ ...p, [campo]: e.target.value })
  const setRepo = (campo) => (e) => setP({ ...p, repo: { ...p.repo, [campo]: e.target.value } })

  function cambiarEspacio(e) {
    const espacioId = e.target.value
    const espacio = espacios.find((x) => x.id === espacioId)
    // Al mover el proyecto de espacio se sueltan las asignaciones anteriores.
    setP({
      ...p,
      espacioId,
      responsableId: '',
      colaboradorIds: [],
      clienteIds: [],
      repo: p.repo?.nombre ? p.repo : { ...(espacio?.repoPorDefecto ?? p.repo) },
    })
  }

  const alternar = (campo, id) =>
    setP((prev) => ({
      ...prev,
      [campo]: prev[campo].includes(id)
        ? prev[campo].filter((x) => x !== id)
        : [...prev[campo], id],
    }))

  function enviar(e) {
    e.preventDefault()
    if (!p.nombre.trim()) return setError('El nombre del proyecto es obligatorio.')
    if (!p.espacioId) return setError('Elige el espacio al que pertenece.')
    if (p.fechaInicio && p.fechaFin && p.fechaFin < p.fechaInicio) {
      return setError('La fecha de entrega no puede ser anterior al inicio.')
    }
    const conResponsable = p.responsableId
      ? Array.from(new Set([...p.colaboradorIds, p.responsableId]))
      : p.colaboradorIds
    onGuardar({ ...p, nombre: p.nombre.trim(), colaboradorIds: conResponsable })
  }

  return (
    <form onSubmit={enviar}>
      <Campo etiqueta="Espacio *">
        <select value={p.espacioId} onChange={cambiarEspacio}>
          <option value="">Elige un espacio…</option>
          {espacios.map((e) => (
            <option key={e.id} value={e.id}>{e.nombre}</option>
          ))}
        </select>
        <span className="mini suave">
          Solo los miembros de ese espacio podrán ver este proyecto.
        </span>
      </Campo>

      <Campo etiqueta="Nombre del proyecto *">
        <input value={p.nombre} onChange={set('nombre')} autoFocus placeholder="Ej. Tienda en línea" />
      </Campo>

      <Campo etiqueta="Cliente o área (texto libre)">
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

      <Campo etiqueta="Repositorio (para ver los commits)">
        <div className="fila">
          <input
            value={p.repo?.propietario ?? ''}
            onChange={setRepo('propietario')}
            placeholder="Propietario"
          />
          <input value={p.repo?.nombre ?? ''} onChange={setRepo('nombre')} placeholder="Repositorio" />
        </div>
        <input
          value={p.repo?.rama ?? ''}
          onChange={setRepo('rama')}
          placeholder="Rama (por defecto main)"
          style={{ marginTop: 8 }}
        />
      </Campo>

      <Campo etiqueta="Responsable">
        <select value={p.responsableId} onChange={set('responsableId')}>
          <option value="">Sin responsable</option>
          {equipo.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </Campo>

      <Campo etiqueta="Equipo asignado">
        {equipo.length === 0 ? (
          <span className="suave mini">Este espacio no tiene miembros con rol de trabajo.</span>
        ) : (
          <div className="envuelve">
            {equipo.map((c) => {
              const puesto = p.colaboradorIds.includes(c.id)
              return (
                <button
                  type="button"
                  key={c.id}
                  className={`boton sm${puesto ? ' primario' : ''}`}
                  onClick={() => alternar('colaboradorIds', c.id)}
                >
                  {puesto ? '✓ ' : '+ '}{c.nombre}
                </button>
              )
            })}
          </div>
        )}
      </Campo>

      <Campo etiqueta="Clientes con acceso a este proyecto">
        {clientes.length === 0 ? (
          <span className="suave mini">
            Ningún miembro del espacio tiene rol de cliente. Agrégalo desde el espacio.
          </span>
        ) : (
          <div className="envuelve">
            {clientes.map((c) => {
              const puesto = p.clienteIds.includes(c.id)
              return (
                <button
                  type="button"
                  key={c.id}
                  className={`boton sm${puesto ? ' primario' : ''}`}
                  onClick={() => alternar('clienteIds', c.id)}
                >
                  {puesto ? '✓ ' : '+ '}{c.nombre}
                </button>
              )
            })}
          </div>
        )}
        <span className="mini suave">
          Un cliente solo ve los proyectos donde aparece aquí, nunca los demás del espacio.
        </span>
      </Campo>

      {error && <p style={{ color: 'var(--peligro)' }} className="mini">{error}</p>}

      <div className="modal-pie">
        <button type="button" className="boton" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="boton primario">Guardar proyecto</button>
      </div>
    </form>
  )
}
