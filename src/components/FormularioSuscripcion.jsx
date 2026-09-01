import { useState } from 'react'
import { CADENCIAS, ESTADOS_SUSCRIPCION, anualizado, dinero } from '../data/modelo.js'
import { Campo } from './Piezas.jsx'

export default function FormularioSuscripcion({ inicial, espacios, proyectos, espacioPorDefecto, onGuardar, onCancelar }) {
  const [s, setS] = useState(() => inicial ?? {
    space_id: espacioPorDefecto || espacios[0]?.id || '',
    project_id: '',
    concepto: '',
    cliente: '',
    amount: '',
    currency: 'MXN',
    cadence: 'mensual',
    billing_day: 1,
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    status: 'activa',
    notas: '',
  })
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const set = (campo) => (e) => setS({ ...s, [campo]: e.target.value })
  const delEspacio = proyectos.filter((p) => p.space_id === s.space_id)

  async function enviar(e) {
    e.preventDefault()
    if (!s.concepto.trim()) return setError('Escribe qué se cobra.')
    if (!s.space_id) return setError('Elige el espacio.')
    const monto = Number(s.amount)
    if (!Number.isFinite(monto) || monto < 0) return setError('El monto no es válido.')
    const dia = Number(s.billing_day)
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
      return setError('El día de cobro debe estar entre 1 y 31.')
    }
    if (s.end_date && s.end_date < s.start_date) {
      return setError('La fecha de fin no puede ser anterior al inicio.')
    }

    setOcupado(true)
    setError('')
    try {
      await onGuardar({
        ...s,
        concepto: s.concepto.trim(),
        cliente: s.cliente?.trim() || null,
        amount: monto,
        billing_day: dia,
        // La base espera null, no cadena vacía.
        project_id: s.project_id || null,
        end_date: s.end_date || null,
        notas: s.notas?.trim() || null,
      })
    } catch (err) {
      setError(err.message)
      setOcupado(false)
    }
  }

  const previo = Number(s.amount) > 0
    ? `${dinero(s.amount, s.currency)} ${CADENCIAS.find((c) => c.id === s.cadence)?.nombre.toLowerCase()} · ${dinero(anualizado(s), s.currency)} al año`
    : null

  return (
    <form onSubmit={enviar}>
      <Campo etiqueta="Espacio *">
        <select value={s.space_id} onChange={(e) => setS({ ...s, space_id: e.target.value, project_id: '' })}>
          <option value="">Elige un espacio…</option>
          {espacios.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </Campo>

      <Campo etiqueta="Qué se cobra *">
        <input value={s.concepto} onChange={set('concepto')} autoFocus placeholder="Ej. Mantenimiento y hospedaje" />
      </Campo>

      <div className="fila">
        <Campo etiqueta="Cliente">
          <input value={s.cliente ?? ''} onChange={set('cliente')} placeholder="A quién se le cobra" />
        </Campo>
        <Campo etiqueta="Proyecto (opcional)">
          <select value={s.project_id ?? ''} onChange={set('project_id')}>
            <option value="">Sin proyecto</option>
            {delEspacio.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Campo>
      </div>

      <div className="fila">
        <Campo etiqueta="Monto *">
          <input type="number" min="0" step="0.01" value={s.amount} onChange={set('amount')} />
        </Campo>
        <Campo etiqueta="Moneda">
          <select value={s.currency} onChange={set('currency')}>
            <option value="MXN">MXN — peso mexicano</option>
            <option value="USD">USD — dólar</option>
            <option value="EUR">EUR — euro</option>
          </select>
        </Campo>
      </div>

      <div className="fila">
        <Campo etiqueta="Cada cuándo">
          <select value={s.cadence} onChange={set('cadence')}>
            {CADENCIAS.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Día de cobro">
          <input type="number" min="1" max="31" value={s.billing_day} onChange={set('billing_day')} />
          <span className="mini suave">
            Si el mes no llega a ese día, se cobra el último.
          </span>
        </Campo>
      </div>

      <div className="fila">
        <Campo etiqueta="Inicio">
          <input type="date" value={s.start_date} onChange={set('start_date')} />
        </Campo>
        <Campo etiqueta="Fin (opcional)">
          <input type="date" value={s.end_date ?? ''} onChange={set('end_date')} />
        </Campo>
      </div>

      <Campo etiqueta="Estado">
        <select value={s.status} onChange={set('status')}>
          {ESTADOS_SUSCRIPCION.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
      </Campo>

      <Campo etiqueta="Notas">
        <textarea value={s.notas ?? ''} onChange={set('notas')} />
      </Campo>

      {previo && <p className="mini suave" style={{ marginTop: 0 }}>{previo}</p>}
      {error && <p className="mini vencida">{error}</p>}

      <div className="modal-pie">
        <button type="button" className="boton" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="boton primario" disabled={ocupado}>
          {ocupado ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}
