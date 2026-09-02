import { useState } from 'react'
import { useDatos } from '../lib/datos.jsx'

// Genera el enlace de invitación y lo deja listo para copiar.
//
// No se manda el correo desde aquí a propósito: no hay servicio de correo
// configurado, y un enlace que tú pegas en WhatsApp llega igual y llega hoy.
export default function Invitar({ espacioId, rol, proyectos = [], texto }) {
  const { crearInvitacion } = useDatos()
  const [email, setEmail] = useState('')
  const [enlace, setEnlace] = useState('')
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [copiado, setCopiado] = useState(false)

  async function invitar(e) {
    e.preventDefault()
    if (!email.trim()) return
    setOcupado(true)
    setError('')
    setEnlace('')
    try {
      const r = await crearInvitacion(espacioId, email, rol, proyectos)
      setEnlace(r.enlace)
      setEmail('')
    } catch (err) {
      setError(err.message)
    } finally {
      setOcupado(false)
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(enlace)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      // Sin permiso de portapapeles: el enlace está a la vista para copiarlo a mano.
      setError('No se pudo copiar solo. Selecciona el enlace y cópialo.')
    }
  }

  return (
    <>
      <form className="filtros" style={{ marginBottom: 8 }} onSubmit={invitar}>
        <input
          type="email"
          style={{ flex: 1, minWidth: 200 }}
          placeholder={texto ?? 'Correo de la persona…'}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="boton primario" type="submit" disabled={ocupado}>
          {ocupado ? 'Generando…' : 'Crear invitación'}
        </button>
      </form>

      {error && <p className="mini vencida">{error}</p>}

      {enlace && (
        <div className="aviso" style={{ display: 'block' }}>
          <div className="mini" style={{ marginBottom: 8 }}>
            Listo. Mándale este enlace; se activa solo cuando entre con ese mismo
            correo, y caduca en 30 días.
          </div>
          <div className="linea" style={{ alignItems: 'stretch' }}>
            <input
              readOnly
              value={enlace}
              onFocus={(e) => e.target.select()}
              style={{
                flex: 1, minWidth: 0, fontSize: 12, padding: '7px 9px',
                border: '1px solid var(--borde)', borderRadius: 8,
                background: 'var(--superficie)', color: 'var(--texto)',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              }}
            />
            <button type="button" className="boton sm primario" onClick={copiar}>
              {copiado ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
