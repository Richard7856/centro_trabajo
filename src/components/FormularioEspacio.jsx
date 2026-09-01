import { useState } from 'react'
import { TIPOS_ESPACIO, espacioVacio } from '../data/modelo.js'
import { Campo } from './Piezas.jsx'

const COLORES = ['#2563eb', '#7c3aed', '#0891b2', '#16a34a', '#ea580c', '#db2777']

export default function FormularioEspacio({ inicial, onGuardar, onCancelar }) {
  const [e, setE] = useState(() => inicial ?? espacioVacio())
  const [error, setError] = useState('')

  const set = (campo) => (ev) => setE({ ...e, [campo]: ev.target.value })
  const setRepo = (campo) => (ev) =>
    setE({ ...e, repoPorDefecto: { ...e.repoPorDefecto, [campo]: ev.target.value } })

  function enviar(ev) {
    ev.preventDefault()
    if (!e.nombre.trim()) return setError('El nombre del espacio es obligatorio.')
    onGuardar({ ...e, nombre: e.nombre.trim() })
  }

  return (
    <form onSubmit={enviar}>
      <Campo etiqueta="Nombre del espacio *">
        <input value={e.nombre} onChange={set('nombre')} autoFocus placeholder="Ej. Jose & Richard" />
      </Campo>

      <Campo etiqueta="Tipo">
        <select value={e.tipo} onChange={set('tipo')}>
          {TIPOS_ESPACIO.map((t) => (
            <option key={t.id} value={t.id}>{t.nombre} — {t.descripcion}</option>
          ))}
        </select>
      </Campo>

      <Campo etiqueta="Descripción">
        <textarea value={e.descripcion} onChange={set('descripcion')} />
      </Campo>

      <Campo etiqueta="Color">
        <div className="envuelve">
          {COLORES.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setE({ ...e, color: c })}
              aria-label={`Color ${c}`}
              style={{
                width: 30, height: 30, borderRadius: 8, background: c, cursor: 'pointer',
                border: e.color === c ? '3px solid var(--texto)' : '1px solid var(--borde)',
              }}
            />
          ))}
        </div>
      </Campo>

      <Campo etiqueta="Repositorio por defecto (opcional)">
        <div className="fila">
          <input
            value={e.repoPorDefecto?.propietario ?? ''}
            onChange={setRepo('propietario')}
            placeholder="Propietario (ej. Richard7856)"
          />
          <input
            value={e.repoPorDefecto?.nombre ?? ''}
            onChange={setRepo('nombre')}
            placeholder="Repositorio"
          />
        </div>
        <span className="mini suave">
          Se propone al crear proyectos en este espacio; cada proyecto puede usar otro.
        </span>
      </Campo>

      {error && <p style={{ color: 'var(--peligro)' }} className="mini">{error}</p>}

      <div className="modal-pie">
        <button type="button" className="boton" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="boton primario">Guardar espacio</button>
      </div>
    </form>
  )
}
