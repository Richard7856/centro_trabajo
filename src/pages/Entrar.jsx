import { useState } from 'react'
import { useSesion } from '../lib/sesion.jsx'
import { configurado } from '../lib/supabase.js'

export default function Entrar() {
  const { entrar, registrar, recuperar } = useSesion()
  const [modo, setModo] = useState('entrar')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [aviso, setAviso] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  if (!configurado) {
    return (
      <div className="portada">
        <div className="tarjeta acceso">
          <h1>Falta la configuración</h1>
          <p className="suave">
            No están definidas <code>VITE_SUPABASE_URL</code> y{' '}
            <code>VITE_SUPABASE_ANON_KEY</code>. En Vercel se agregan en
            Settings → Environment Variables y hay que volver a desplegar.
          </p>
        </div>
      </div>
    )
  }

  async function enviar(e) {
    e.preventDefault()
    setOcupado(true)
    setAviso(null)
    try {
      if (modo === 'recuperar') {
        const { error } = await recuperar(email)
        if (error) throw error
        setAviso({ texto: 'Te enviamos un correo para restablecer la contraseña.' })
      } else if (modo === 'registrar') {
        const { data, error } = await registrar(email, password, nombre)
        if (error) throw error
        if (!data.session) {
          setAviso({ texto: 'Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.' })
          setModo('entrar')
        }
      } else {
        const { error } = await entrar(email, password)
        if (error) throw error
      }
    } catch (err) {
      setAviso({ texto: traducir(err.message), error: true })
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="portada">
      <form className="tarjeta acceso" onSubmit={enviar}>
        <div className="marca" style={{ padding: 0, marginBottom: 18 }}>
          <div className="marca-logo">CT</div>
          <div>
            <div className="marca-texto">Centro de Trabajo</div>
            <div className="marca-sub">Organizador de proyectos</div>
          </div>
        </div>

        <h1 style={{ fontSize: 18, marginBottom: 4 }}>
          {modo === 'entrar' && 'Inicia sesión'}
          {modo === 'registrar' && 'Crea tu cuenta'}
          {modo === 'recuperar' && 'Recupera tu acceso'}
        </h1>
        <p className="mini suave" style={{ marginTop: 0, marginBottom: 18 }}>
          Cada quien ve únicamente los espacios de los que es miembro.
        </p>

        {modo === 'registrar' && (
          <div className="campo">
            <label>Nombre</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" />
          </div>
        )}

        <div className="campo">
          <label>Correo</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            autoComplete="email"
          />
        </div>

        {modo !== 'recuperar' && (
          <div className="campo">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={modo === 'registrar' ? 'new-password' : 'current-password'}
            />
          </div>
        )}

        {aviso && (
          <p className={`mini ${aviso.error ? 'vencida' : ''}`} style={{ marginTop: 0 }}>
            {aviso.texto}
          </p>
        )}

        <button className="boton primario" type="submit" disabled={ocupado} style={{ width: '100%' }}>
          {ocupado ? 'Un momento…' : modo === 'registrar' ? 'Crear cuenta' : modo === 'recuperar' ? 'Enviar correo' : 'Entrar'}
        </button>

        <div className="entre mini" style={{ marginTop: 14 }}>
          {modo === 'entrar' ? (
            <>
              <button type="button" className="enlace" onClick={() => setModo('registrar')}>
                Crear una cuenta
              </button>
              <button type="button" className="enlace" onClick={() => setModo('recuperar')}>
                Olvidé mi contraseña
              </button>
            </>
          ) : (
            <button type="button" className="enlace" onClick={() => setModo('entrar')}>
              ← Volver a iniciar sesión
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

function traducir(mensaje = '') {
  if (/failed to fetch|networkerror|load failed/i.test(mensaje)) {
    return 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.'
  }
  if (/invalid login credentials/i.test(mensaje)) return 'Correo o contraseña incorrectos.'
  if (/email not confirmed/i.test(mensaje)) return 'Falta confirmar el correo. Revisa tu bandeja.'
  if (/user already registered/i.test(mensaje)) return 'Ese correo ya tiene cuenta. Inicia sesión.'
  if (/password should be at least/i.test(mensaje)) return 'La contraseña debe tener al menos 8 caracteres.'
  if (/rate limit|too many/i.test(mensaje)) return 'Demasiados intentos. Espera un momento.'
  return mensaje || 'No se pudo completar la operación.'
}
