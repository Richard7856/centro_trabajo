// Llamadas a la función `commits` del servidor y limpieza de sus resultados.

import { supabase } from './supabase.js'

async function pedir(cuerpo) {
  const { data, error } = await supabase.functions.invoke('commits', { body: cuerpo })
  if (error) {
    // El detalle del fallo viene en el cuerpo de la respuesta, no en el mensaje.
    const detalle = await error.context?.json?.().catch(() => null)
    throw new Error(traducir(detalle?.error ?? error.message))
  }
  if (data?.error) throw new Error(traducir(data.error))
  return data
}

const traducir = (mensaje = '') =>
  /failed to fetch|networkerror/i.test(mensaje)
    ? 'No se pudo conectar con el servidor.'
    : mensaje

export const traerCommits = (proyectoId, limite = 10) =>
  pedir({ project_id: proyectoId, accion: 'commits', limite })

export const traerDocumento = (proyectoId) =>
  pedir({ project_id: proyectoId, accion: 'doc' })

// Las capturas de un repositorio privado no las puede cargar el navegador por su
// cuenta: se piden a la función, que las trae con las credenciales del servidor.
export async function traerImagen(proyectoId, ruta) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Sin sesión.')

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/commits`
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ project_id: proyectoId, accion: 'imagen', ruta }),
  })
  if (!r.ok) throw new Error('No se pudo cargar la imagen.')
  return URL.createObjectURL(await r.blob())
}

// ---------- Presentación ----------

// Los mensajes de commit vienen en jerga: "feat(admin): panel interno…". Quien
// lee esto no es quien lo escribió, así que se le quita el prefijo y se le pone
// mayúscula. No se inventa nada: el texto es el mismo.
export function humanizar(titulo = '') {
  const limpio = titulo
    .replace(/^(feat|fix|docs|chore|refactor|style|test|perf|build|ci|revert)(\([^)]*\))?!?:\s*/i, '')
    .trim()
  const texto = limpio || titulo.trim()
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export function partirRepo(url) {
  if (!url) return null
  const m = String(url).match(/github\.com\/([^/\s]+)\/([^/\s#?]+)/i)
  return m ? { propietario: m[1], nombre: m[2].replace(/\.git$/i, '') } : null
}

export const repoTexto = (url) => {
  const r = partirRepo(url)
  return r ? `${r.propietario}/${r.nombre}` : ''
}

export function fechaRelativa(iso) {
  if (!iso) return ''
  const seg = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (seg < 60) return 'hace un momento'
  if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`
  if (seg < 86400) return `hace ${Math.floor(seg / 3600)} h`
  const dias = Math.floor(seg / 86400)
  if (dias < 30) return `hace ${dias} d`
  if (dias < 365) return `hace ${Math.floor(dias / 30)} meses`
  return `hace ${Math.floor(dias / 365)} años`
}
