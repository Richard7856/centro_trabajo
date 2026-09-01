import { useState } from 'react'
import { ESTADOS_PROYECTO } from '../data/modelo.js'
import { Campo } from './Piezas.jsx'

export default function FormularioProyecto({ inicial, espacios, espacioPorDefecto, onGuardar, onCancelar }) {
  const [p, setP] = useState(() => inicial ?? {
    space_id: espacioPorDefecto || espacios[0]?.id || '',
    name: '', description: '', status: 'activo', due_date: '', repo_url: '',
  })
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const set = (campo) => (e) => setP({ ...p, [campo]: e.target.value })

  async function enviar(e) {
    e.preventDefault()
    if (!p.name.trim()) return setError('El nombre del proyecto es obligatorio.')
    if (!p.space_id) return setError('Elige el espacio al que pertenece.')
    if (p.repo_url && !/github\.com\/[^/\s]+\/[^/\s]+/i.test(p.repo_url)) {
      return setError('El repositorio debe verse así: https://github.com/propietario/nombre')
    }
    setOcupado(true)
    setError('')
    try {
      await onGuardar({
        ...p,
        name: p.name.trim(),
        description: p.description?.trim() || null,
        // La base espera null, no cadena vacía, en fechas y texto opcional.
        due_date: p.due_date || null,
        repo_url: p.repo_url?.trim() || null,
      })
    } catch (err) {
      setError(err.message)
      setOcupado(false)
    }
  }

  return (
    <form onSubmit={enviar}>
      <Campo etiqueta="Espacio *">
        <select value={p.space_id} onChange={set('space_id')} disabled={Boolean(inicial)}>
          <option value="">Elige un espacio…</option>
          {espacios.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
        <span className="mini suave">
          Solo los miembros de ese espacio podrán ver este proyecto.
        </span>
      </Campo>

      <Campo etiqueta="Nombre del proyecto *">
        <input value={p.name} onChange={set('name')} autoFocus placeholder="Ej. Tienda en línea" />
      </Campo>

      <Campo etiqueta="Descripción">
        <textarea value={p.description ?? ''} onChange={set('description')} />
      </Campo>

      <div className="fila">
        <Campo etiqueta="Estado">
          <select value={p.status} onChange={set('status')}>
            {ESTADOS_PROYECTO.map((e) => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Entrega">
          <input type="date" value={p.due_date ?? ''} onChange={set('due_date')} />
        </Campo>
      </div>

      <Campo etiqueta="Repositorio (para ver los commits)">
        <input
          value={p.repo_url ?? ''}
          onChange={set('repo_url')}
          placeholder="https://github.com/Richard7856/mi-proyecto"
        />
      </Campo>

      {error && <p className="mini vencida">{error}</p>}

      <div className="modal-pie">
        <button type="button" className="boton" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="boton primario" disabled={ocupado}>
          {ocupado ? 'Guardando…' : 'Guardar proyecto'}
        </button>
      </div>
    </form>
  )
}
