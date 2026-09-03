import { useState } from 'react'
import { ESTADOS_PROYECTO } from '../data/modelo.js'
import { Campo } from './Piezas.jsx'

export default function FormularioProyecto({ inicial, espacios, espacioPorDefecto, onGuardar, onCancelar }) {
  const [p, setP] = useState(() => inicial ?? {
    space_id: espacioPorDefecto || espacios[0]?.id || '',
    name: '', description: '', status: 'activo', due_date: '', repo_url: '',
    enlaces: [], doc_path: '', doc_rama: '',
  })
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const set = (campo) => (e) => setP({ ...p, [campo]: e.target.value })

  const cambiarEnlace = (i, campos) =>
    setP((prev) => ({
      ...prev,
      enlaces: prev.enlaces.map((e, j) => (j === i ? { ...e, ...campos } : e)),
    }))

  const quitarEnlace = (i) =>
    setP((prev) => ({ ...prev, enlaces: prev.enlaces.filter((_, j) => j !== i) }))

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
        doc_path: p.doc_path?.trim() || null,
        doc_rama: p.doc_rama?.trim() || null,
        // Un enlace a medio escribir no se guarda.
        enlaces: (p.enlaces ?? [])
          .map((e) => ({ titulo: (e.titulo ?? '').trim(), url: (e.url ?? '').trim() }))
          .filter((e) => e.url),
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

      <Campo etiqueta="Enlaces">
        <div className="lista-enlaces">
          {(p.enlaces ?? []).map((e, i) => (
            <div className="fila-enlace" key={i}>
              <input
                placeholder="Nombre (ej. Sitio en producción)"
                value={e.titulo ?? ''}
                onChange={(ev) => cambiarEnlace(i, { titulo: ev.target.value })}
              />
              <input
                placeholder="https://…"
                value={e.url ?? ''}
                onChange={(ev) => cambiarEnlace(i, { url: ev.target.value })}
              />
              <button type="button" className="boton sm peligro" onClick={() => quitarEnlace(i)}>✕</button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="boton sm"
          style={{ marginTop: 8 }}
          onClick={() => setP({ ...p, enlaces: [...(p.enlaces ?? []), { titulo: '', url: '' }] })}
        >
          + Agregar enlace
        </button>
        <span className="mini suave">
          El sitio, el panel, una demo. Es lo primero que busca un cliente.
        </span>
      </Campo>

      <Campo etiqueta="Repositorio (para el último cambio y el avance)">
        <input
          value={p.repo_url ?? ''}
          onChange={set('repo_url')}
          placeholder="https://github.com/Richard7856/mi-proyecto"
        />
      </Campo>

      <Campo etiqueta="Documento de avance">
        <div className="fila">
          <input
            value={p.doc_path ?? ''}
            onChange={set('doc_path')}
            placeholder="AVANCE.md"
          />
          <input
            value={p.doc_rama ?? ''}
            onChange={set('doc_rama')}
            placeholder="Rama (por defecto la principal)"
          />
        </div>
        <span className="mini suave">
          Un Markdown del repositorio, <strong>escrito para quien no es técnico</strong>.
          Lo van a leer socios y clientes: no apuntes aquí a un README ni a un
          documento interno con notas de configuración.
        </span>
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
