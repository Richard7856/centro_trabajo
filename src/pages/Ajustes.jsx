import { useRef, useState } from 'react'
import { useAlmacen } from '../lib/almacen.jsx'

export default function Ajustes() {
  const almacen = useAlmacen()
  const { colaboradores, proyectos, tareas, demo } = almacen
  const archivo = useRef(null)
  const [mensaje, setMensaje] = useState(null)

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
          <p>Respaldo de la información y limpieza de los datos de ejemplo.</p>
        </div>
      </div>

      {mensaje && (
        <div className="aviso" style={mensaje.error ? { color: 'var(--peligro)', borderColor: 'var(--peligro)', background: 'transparent' } : undefined}>
          {mensaje.texto}
        </div>
      )}

      <div className="rejilla dos">
        <section className="tarjeta">
          <h2 style={{ marginBottom: 10 }}>Contenido actual</h2>
          <table className="tabla">
            <tbody>
              <tr><td className="suave">Colaboradores</td><td>{colaboradores.length}</td></tr>
              <tr><td className="suave">Proyectos</td><td>{proyectos.length}</td></tr>
              <tr><td className="suave">Tareas</td><td>{tareas.length}</td></tr>
              <tr><td className="suave">Origen</td><td>{demo ? 'Datos de ejemplo' : 'Datos propios'}</td></tr>
            </tbody>
          </table>
        </section>

        <section className="tarjeta">
          <h2 style={{ marginBottom: 10 }}>Respaldo</h2>
          <p className="mini suave">
            La información se guarda en este navegador. Exporta un archivo JSON para
            respaldarla o pasarla a otro equipo.
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

        <section className="tarjeta">
          <h2 style={{ marginBottom: 10 }}>Datos de ejemplo</h2>
          <p className="mini suave">
            Empieza de cero cuando vayas a cargar los perfiles y proyectos reales.
          </p>
          <div className="acciones">
            <button
              className="boton peligro"
              onClick={() => {
                if (confirm('¿Borrar todo el contenido? Esta acción no se puede deshacer.')) {
                  almacen.vaciar()
                  avisar('Contenido borrado. Ya puedes cargar los datos reales.')
                }
              }}
            >
              Empezar de cero
            </button>
            <button
              className="boton"
              onClick={() => {
                if (confirm('¿Reemplazar el contenido actual por los datos de ejemplo?')) {
                  almacen.restaurarEjemplo()
                  avisar('Datos de ejemplo restaurados.')
                }
              }}
            >
              Restaurar ejemplo
            </button>
          </div>
        </section>

        <section className="tarjeta">
          <h2 style={{ marginBottom: 10 }}>Siguiente paso</h2>
          <p className="mini suave" style={{ marginBottom: 0 }}>
            Cuando la plataforma esté como la quieres, el siguiente paso es cargar el
            perfil de José y el resto del equipo, y después conectar una base de datos
            para que la información se comparta entre dispositivos.
          </p>
        </section>
      </div>
    </>
  )
}
