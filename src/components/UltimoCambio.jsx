import { useCallback, useEffect, useState } from 'react'
import { fechaRelativa, humanizar, partirRepo, repoTexto, traerCommits } from '../lib/repositorio.js'

// Qué se hizo por última vez, en una línea.
//
// Antes se listaban los commits con su sha. Quien lee esto es un socio o un
// cliente: no le sirve el historial de git, le sirve saber que algo se movió y
// cuándo. El detalle queda detrás de "ver historial", solo para quien manda.
export default function UltimoCambio({ proyectoId, repoUrl, permisos, despliegue }) {
  const [commits, setCommits] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [historial, setHistorial] = useState(false)

  const repo = partirRepo(repoUrl)

  const cargar = useCallback(async () => {
    if (!proyectoId || !repo) return
    setCargando(true)
    setError('')
    try {
      const d = await traerCommits(proyectoId, 15)
      setCommits(d.commits ?? [])
    } catch (e) {
      setError(e.message)
      setCommits([])
    } finally {
      setCargando(false)
    }
  }, [proyectoId, repoUrl])

  useEffect(() => { cargar() }, [cargar])

  if (!repo) {
    return (
      <p className="suave mini" style={{ marginBottom: 0 }}>
        Sin repositorio vinculado.
        {permisos.editarProyecto && ' Edita el proyecto y agrega la dirección de GitHub.'}
      </p>
    )
  }

  if (error) return <div className="aviso alerta">{error}</div>
  if (cargando && commits.length === 0) return <p className="suave mini">Cargando…</p>

  const ultimo = commits[0]
  if (!ultimo) return <p className="suave mini">Todavía no hay cambios registrados.</p>

  return (
    <>
      <div className="ultimo-cambio">
        <div className="ultimo-titulo">{humanizar(ultimo.titulo)}</div>
        <div className="mini suave">
          {ultimo.autor} · {fechaRelativa(ultimo.fecha)}
          {despliegue?.estado === 'READY' && ' · publicado'}
        </div>
      </div>

      {commits.length > 1 && (
        <p className="mini suave" style={{ margin: '10px 0 0' }}>
          {commits.length === 15 ? '15 o más' : commits.length} cambios registrados en total.
        </p>
      )}

      {permisos.editarProyecto && (
        <div className="acciones" style={{ marginTop: 12 }}>
          <button className="boton sm" onClick={() => setHistorial(!historial)}>
            {historial ? 'Ocultar historial' : 'Ver historial'}
          </button>
          <button className="boton sm" onClick={cargar} disabled={cargando}>
            {cargando ? 'Cargando…' : 'Actualizar'}
          </button>
          <a
            className="boton sm"
            href={`https://github.com/${repo.propietario}/${repo.nombre}/commits`}
            target="_blank"
            rel="noreferrer"
          >
            GitHub ↗
          </a>
        </div>
      )}

      {historial && permisos.editarProyecto && (
        <div style={{ marginTop: 12 }}>
          <div className="mini suave" style={{ marginBottom: 6 }}>{repoTexto(repoUrl)}</div>
          {commits.map((c) => (
            <div key={c.sha} className="commit">
              <a className="sha" href={c.url} target="_blank" rel="noreferrer" title="Ver en GitHub">
                {c.shaCorto}
              </a>
              <div className="cuerpo">
                <div className="titulo-commit">{c.titulo}</div>
                <span className="mini suave">
                  {c.autor}{c.fecha && ` · ${fechaRelativa(c.fecha)}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
