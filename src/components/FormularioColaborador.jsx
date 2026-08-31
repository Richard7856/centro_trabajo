import { useState } from 'react'
import { colaboradorVacio } from '../data/modelo.js'
import { Campo } from './Piezas.jsx'

export default function FormularioColaborador({ inicial, onGuardar, onCancelar }) {
  const [c, setC] = useState(() => inicial ?? colaboradorVacio())
  const [habilidades, setHabilidades] = useState(() => (inicial?.habilidades ?? []).join(', '))
  const [error, setError] = useState('')

  const set = (campo) => (e) => setC({ ...c, [campo]: e.target.value })

  function enviar(e) {
    e.preventDefault()
    if (!c.nombre.trim()) return setError('El nombre es obligatorio.')
    onGuardar({
      ...c,
      nombre: c.nombre.trim(),
      habilidades: habilidades.split(',').map((h) => h.trim()).filter(Boolean),
    })
  }

  return (
    <form onSubmit={enviar}>
      <Campo etiqueta="Nombre completo *">
        <input value={c.nombre} onChange={set('nombre')} autoFocus placeholder="Ej. José Pérez" />
      </Campo>

      <div className="fila">
        <Campo etiqueta="Puesto o rol">
          <input value={c.rol} onChange={set('rol')} />
        </Campo>
        <Campo etiqueta="Área">
          <input value={c.area} onChange={set('area')} />
        </Campo>
      </div>

      <div className="fila">
        <Campo etiqueta="Correo">
          <input type="email" value={c.email} onChange={set('email')} />
        </Campo>
        <Campo etiqueta="Teléfono">
          <input value={c.telefono} onChange={set('telefono')} />
        </Campo>
      </div>

      <Campo etiqueta="Fecha de ingreso">
        <input type="date" value={c.fechaIngreso} onChange={set('fechaIngreso')} />
      </Campo>

      <Campo etiqueta="Habilidades (separadas por coma)">
        <input
          value={habilidades}
          onChange={(e) => setHabilidades(e.target.value)}
          placeholder="Planeación, Presupuestos, AutoCAD"
        />
      </Campo>

      <Campo etiqueta="Notas">
        <textarea value={c.notas} onChange={set('notas')} />
      </Campo>

      <Campo etiqueta="Estatus">
        <select value={c.activo ? 'si' : 'no'} onChange={(e) => setC({ ...c, activo: e.target.value === 'si' })}>
          <option value="si">Activo</option>
          <option value="no">Inactivo</option>
        </select>
      </Campo>

      {error && <p style={{ color: 'var(--peligro)' }} className="mini">{error}</p>}

      <div className="modal-pie">
        <button type="button" className="boton" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="boton primario">Guardar colaborador</button>
      </div>
    </form>
  )
}
