import { useState } from 'react'
import { COLORES, TIPOS_ESPACIO } from '../data/modelo.js'
import { Campo } from './Piezas.jsx'

export default function FormularioEspacio({ inicial, onGuardar, onCancelar }) {
  const [e, setE] = useState(() => inicial ?? { name: '', kind: 'persona', color: 'indigo' })
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const set = (campo) => (ev) => setE({ ...e, [campo]: ev.target.value })

  async function enviar(ev) {
    ev.preventDefault()
    if (!e.name.trim()) return setError('El nombre del espacio es obligatorio.')
    setOcupado(true)
    setError('')
    try {
      await onGuardar({ ...e, name: e.name.trim() })
    } catch (err) {
      setError(err.message)
      setOcupado(false)
    }
  }

  return (
    <form onSubmit={enviar}>
      <Campo etiqueta="Nombre del espacio *">
        <input value={e.name} onChange={set('name')} autoFocus placeholder="Ej. Ana" />
      </Campo>

      <Campo etiqueta="Tipo">
        <select value={e.kind} onChange={set('kind')}>
          {TIPOS_ESPACIO.map((t) => (
            <option key={t.id} value={t.id}>{t.nombre} — {t.descripcion}</option>
          ))}
        </select>
      </Campo>

      <Campo etiqueta="Color">
        <div className="envuelve">
          {Object.entries(COLORES).map(([nombre, hex]) => (
            <button
              type="button"
              key={nombre}
              onClick={() => setE({ ...e, color: nombre })}
              aria-label={nombre}
              title={nombre}
              style={{
                width: 30, height: 30, borderRadius: 8, background: hex, cursor: 'pointer',
                border: e.color === nombre ? '3px solid var(--texto)' : '1px solid var(--borde)',
              }}
            />
          ))}
        </div>
      </Campo>

      {error && <p className="mini vencida">{error}</p>}

      <div className="modal-pie">
        <button type="button" className="boton" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="boton primario" disabled={ocupado}>
          {ocupado ? 'Guardando…' : 'Guardar espacio'}
        </button>
      </div>
    </form>
  )
}
