import { useCallback, useEffect, useState } from 'react'
import { fechaRelativa, traerCommits } from '../lib/github.js'

// Últimos commits del repositorio del proyecto: la vista de "qué se ha hecho"
// sin salir de la aplicación.
//
// La llamada sale del navegador sin credenciales, así que funciona con
// repositorios públicos. Para uno privado hace falta un token, y un token en el
// navegador queda a la vista: eso se resuelve moviendo la llamada al servidor.
export default function Commits({ repo }) {
  const [commits, setCommits] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    if (!repo) return
    setCargando(true)
    setError('')
    try {
      setCommits(await traerCommits(repo, '', 10))
    } catch (e) {
      setError(e.message)
      setCommits([])
    } finally {
      setCargando(false)
    }
  }, [repo?.propietario, repo?.nombre, repo?.rama])

  useEffect(() => { cargar() }, [cargar])

  if (!repo) {
    return (
      <p className="suave mini" style={{ marginBottom: 0 }}>
        Este proyecto no está vinculado a un repositorio. Edítalo y agrega la
        dirección de GitHub para ver aquí los commits.
      </p>
    )
  }

  return (
    <>
      <div className="entre" style={{ marginBottom: 10 }}>
        <span className="linea mini suave">
          <span className="chip">{repo.propietario}/{repo.nombre}</span>
          <span>rama {repo.rama}</span>
        </span>
        <span className="linea">
          <a
            className="boton sm"
            href={`https://github.com/${repo.propietario}/${repo.nombre}/commits/${repo.rama}`}
            target="_blank"
            rel="noreferrer"
          >
            GitHub ↗
          </a>
          <button className="boton sm" onClick={cargar} disabled={cargando}>
            {cargando ? 'Cargando…' : 'Actualizar'}
          </button>
        </span>
      </div>

      {error && <div className="aviso alerta">{error}</div>}

      {!error && commits.length === 0 && !cargando && (
        <p className="suave mini">Sin commits para mostrar en esta rama.</p>
      )}

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
    </>
  )
}
