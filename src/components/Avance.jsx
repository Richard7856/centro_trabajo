import { useEffect, useRef, useState } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { traerDocumento, traerImagen } from '../lib/repositorio.js'

// El documento de avance del proyecto, escrito en Markdown dentro del propio
// repositorio y actualizado por quien trabaja en él.
//
// Se renderiza pasando por DOMPurify: aunque el texto venga de un repositorio
// propio, esta pantalla la abren socios y clientes, y no se inyecta HTML sin
// limpiar en una página que otros van a ver.
export default function Avance({ proyectoId, docPath, permisos }) {
  const [estado, setEstado] = useState('cargando')
  const [error, setError] = useState('')
  const [html, setHtml] = useState('')
  const [ruta, setRuta] = useState('')
  const contenedor = useRef(null)

  useEffect(() => {
    if (!proyectoId || !docPath) { setEstado('sin_documento'); return }
    let vivo = true
    setEstado('cargando')
    setError('')

    traerDocumento(proyectoId)
      .then((d) => {
        if (!vivo) return
        const crudo = marked.parse(d.markdown ?? '', { breaks: true, gfm: true })
        setHtml(DOMPurify.sanitize(crudo))
        setRuta(d.ruta ?? docPath)
        setEstado('listo')
      })
      .catch((e) => {
        if (!vivo) return
        setError(e.message)
        setEstado('error')
      })
    return () => { vivo = false }
  }, [proyectoId, docPath])

  // Las capturas se referencian con rutas relativas del repositorio; el
  // navegador no puede pedirlas si el repo es privado, así que se traen por la
  // función y se sustituyen ya cargadas.
  useEffect(() => {
    const nodo = contenedor.current
    if (estado !== 'listo' || !nodo) return
    const urls = []
    let vivo = true

    for (const a of nodo.querySelectorAll('a')) {
      a.target = '_blank'
      a.rel = 'noreferrer'
    }

    for (const img of nodo.querySelectorAll('img')) {
      const src = img.getAttribute('src') ?? ''
      if (!src || /^(https?:|data:|blob:)/i.test(src)) continue
      img.removeAttribute('src')
      img.dataset.cargando = '1'
      traerImagen(proyectoId, src)
        .then((url) => {
          if (!vivo) { URL.revokeObjectURL(url); return }
          urls.push(url)
          img.src = url
          delete img.dataset.cargando
        })
        .catch(() => {
          if (!vivo) return
          img.replaceWith(
            Object.assign(document.createElement('p'), {
              className: 'mini suave',
              textContent: `No se pudo cargar la imagen ${src}`,
            }),
          )
        })
    }

    return () => {
      vivo = false
      for (const u of urls) URL.revokeObjectURL(u)
    }
  }, [estado, html, proyectoId])

  if (estado === 'sin_documento') {
    return (
      <p className="suave mini" style={{ marginBottom: 0 }}>
        Este proyecto todavía no tiene documento de avance.
        {permisos.editarProyecto && (
          <> Edita el proyecto y apunta a un Markdown del repositorio, por
            ejemplo <code>AVANCE.md</code>.</>
        )}
      </p>
    )
  }

  if (estado === 'cargando') return <p className="suave mini">Cargando…</p>
  if (estado === 'error') return <div className="aviso alerta">{error}</div>

  return (
    <>
      <div
        ref={contenedor}
        className="documento"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {permisos.editarProyecto && (
        <p className="mini suave" style={{ marginTop: 14, marginBottom: 0 }}>
          Se lee de <code>{ruta}</code> en el repositorio. Se actualiza solo al
          publicar cambios ahí.
        </p>
      )}
    </>
  )
}
