import { useCallback, useEffect, useState } from 'react'
import { repoTexto, repoValido } from '../data/modelo.js'
import { fechaRelativa, traerCommits } from '../lib/github.js'
import { useAlmacen } from '../lib/almacen.jsx'

// Últimos commits del repositorio del proyecto: es la vista de "qué se ha hecho"
// que ven el socio y el cliente sin tener que entrar a GitHub.
export default function Commits({ repo }) {
  const { tokenGithub } = useAlmacen()
  const [commits, setCommits] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    if (!repoValido(repo)) return
    setCargando(true)
    setError('')
    try {
      setCommits(await traerCommits(repo, tokenGithub))
    } catch (e) {
      setError(e.message)
      setCommits([])
    } finally {
      setCargando(false)
    }
  }, [repo?.propietario, repo?.nombre, repo?.rama, tokenGithub])

  useEffect(() => { cargar() }, [cargar])

  if (!repoValido(repo)) {
    return (
      <p className="suave mini" style={{ marginBottom: 0 }}>
        Este proyecto todavía no está vinculado a un repositorio. Edítalo para
        agregar el propietario y el nombre del repo.
      </p>
    )
  }

  return (
    <>
      <div className="entre" style={{ marginBottom: 10 }}>
        <span className="linea mini suave">
          <span className="chip">{repoTexto(repo)}</span>
          <span>rama {repo.rama || 'main'}</span>
        </span>
        <span className="linea">
          <a
            className="boton sm"
            href={`https://github.com/${repo.propietario}/${repo.nombre}/commits/${repo.rama || 'main'}`}
            target="_blank"
            rel="noreferrer"
          >
            Abrir en GitHub ↗
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
          <a
            className="sha"
            href={c.url}
            target="_blank"
            rel="noreferrer"
            title="Ver el commit en GitHub"
          >
            {c.shaCorto}
          </a>
          <div className="cuerpo">
            <div className="titulo-commit">{c.titulo}</div>
            <span className="mini suave">
              {c.autor}
              {c.fecha && ` · ${fechaRelativa(c.fecha)}`}
            </span>
          </div>
        </div>
      ))}
    </>
  )
}
