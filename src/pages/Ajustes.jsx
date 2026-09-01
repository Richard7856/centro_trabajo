import { useRef, useState } from 'react'
import { useAlmacen } from '../lib/almacen.jsx'

export default function Ajustes() {
  const almacen = useAlmacen()
  const {
    colaboradores, espacios, miembros, proyectos, tareas,
    tokenGithub, setTokenGithub, usuario, misEspacios, permisosEn,
  } = almacen

  const archivo = useRef(null)
  const [mensaje, setMensaje] = useState(null)
  const [token, setToken] = useState(tokenGithub)

  const esDueno = misEspacios.some((e) => permisosEn(e.id).esDueno)

  function avisar(texto, error = false) {
    setMensaje({ texto, error })
    setTimeout(() => setMensaje(null), 4000)
  }

  function descargar() {
    const blob = new Blob([almacen.exportar()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `centro-trabajo-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function cargar(e) {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      almacen.importar(await f.text())
      avisar('Datos importados correctamente.')
    } catch (err) {
      avisar(`No se pudo importar: ${err.message}`, true)
    }
    e.target.value = ''
  }

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Ajustes</h1>
          <p>Sesión actual: {usuario?.nombre ?? '—'}</p>
        </div>
      </div>

      {mensaje && (
        <div
          className="aviso"
          style={mensaje.error ? { color: 'var(--peligro)', borderColor: 'var(--peligro)', background: 'transparent' } : undefined}
        >
          {mensaje.texto}
        </div>
      )}

      <div className="aviso alerta">
        Los datos viven en este navegador y el aislamiento entre espacios es solo de
        pantalla. Antes de compartir el acceso con alguien, hay que moverlos al
        servidor con inicio de sesión.
      </div>

      <div className="rejilla dos">
        <section className="tarjeta">
          <h2 style={{ marginBottom: 10 }}>Contenido</h2>
          <table className="tabla">
            <tbody>
              <tr><td className="suave">Espacios</td><td>{espacios.length}</td></tr>
              <tr><td className="suave">Personas</td><td>{colaboradores.length}</td></tr>
              <tr><td className="suave">Membresías</td><td>{miembros.length}</td></tr>
              <tr><td className="suave">Proyectos</td><td>{proyectos.length}</td></tr>
              <tr><td className="suave">Tareas</td><td>{tareas.length}</td></tr>
            </tbody>
          </table>
        </section>

        <section className="tarjeta">
          <h2 style={{ marginBottom: 10 }}>Acceso a GitHub</h2>
          <p className="mini suave">
            Para leer los commits de un repositorio privado. El token se guarda solo en
            este equipo y nunca se incluye en los respaldos ni viaja con los proyectos.
            Basta un token de solo lectura sobre los repos que quieras mostrar.
          </p>
          <div className="campo">
            <label>Token personal de GitHub</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={tokenGithub ? '•••••••• (guardado)' : 'github_pat_…'}
              autoComplete="off"
            />
          </div>
          <div className="acciones">
            <button
              className="boton primario"
              onClick={() => {
                setTokenGithub(token.trim())
                avisar(token.trim() ? 'Token guardado en este equipo.' : 'Token eliminado.')
              }}
            >
              Guardar token
            </button>
            {tokenGithub && (
              <button
                className="boton"
                onClick={() => {
                  setToken('')
                  setTokenGithub('')
                  avisar('Token eliminado de este equipo.')
                }}
              >
                Quitar
              </button>
            )}
          </div>
        </section>

        <section className="tarjeta">
          <h2 style={{ marginBottom: 10 }}>Respaldo</h2>
          <p className="mini suave">
            Exporta un archivo JSON con espacios, personas, proyectos y tareas para
            respaldarlos o pasarlos a otro equipo.
          </p>
          <div className="acciones">
            <button className="boton" onClick={descargar}>Exportar JSON</button>
            <button className="boton" onClick={() => archivo.current?.click()}>Importar JSON</button>
            <input
              ref={archivo}
              type="file"
              accept="application/json,.json"
              onChange={cargar}
              style={{ display: 'none' }}
            />
          </div>
        </section>

        {esDueno && (
          <section className="tarjeta">
            <h2 style={{ marginBottom: 10 }}>Reiniciar</h2>
            <p className="mini suave">
              «Borrar todo» deja la aplicación vacía. «Restaurar estructura» vuelve a los
              cuatro espacios iniciales sin proyectos.
            </p>
            <div className="acciones">
              <button
                className="boton peligro"
                onClick={() => {
                  if (confirm('¿Borrar todo el contenido? No se puede deshacer.')) {
                    almacen.vaciar()
                    avisar('Contenido borrado.')
                  }
                }}
              >
                Borrar todo
              </button>
              <button
                className="boton"
                onClick={() => {
                  if (confirm('¿Volver a los espacios iniciales? Se pierde lo capturado.')) {
                    almacen.restaurarEstructura()
                    avisar('Estructura restaurada.')
                  }
                }}
              >
                Restaurar estructura
              </button>
            </div>
          </section>
        )}
      </div>
    </>
  )
}
