import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { fechaRelativa, partirRepo, repoTexto } from '../lib/github.js'

// Últimos commits del repositorio del proyecto.
//
// La petición va a la función `commits` del servidor, no a GitHub: allí vive el
// token —así los repositorios privados también se ven— y allí se comprueba que
// el proyecto le corresponda a quien pregunta.
export default function Commits({ proyectoId, repoUrl }) {
  const [commits, setCommits] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const repo = partirRepo(repoUrl)

  const cargar = useCallback(async () => {
    if (!proyectoId || !repo) return
    setCargando(true)
    setError('')
    try {
      const { data, error: err } = await supabase.functions.invoke('commits', {
        body: { project_id: proyectoId },
      })
      // Un error de la función trae el detalle en el cuerpo de la respuesta.
      if (err) {
        const detalle = await err.context?.json?.().catch(() => null)
        throw new Error(detalle?.error ?? err.message)
      }
      if (data?.error) throw new Error(data.error)
      setCommits(data?.commits ?? [])
    } catch (e) {
      setError(
        /failed to fetch|networkerror/i.test(e.message)
          ? 'No se pudo conectar con el servidor.'
          : e.message,
      )
      setCommits([])
    } finally {
      setCargando(false)
    }
  }, [proyectoId, repoUrl])

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
        <span className="chip">{repoTexto(repoUrl)}</span>
        <span className="linea">
          <a
            className="boton sm"
            href={`https://github.com/${repo.propietario}/${repo.nombre}/commits`}
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
        <p className="suave mini">Sin commits para mostrar.</p>
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
