// Lee los commits de un repositorio y se los entrega a la aplicación.
//
// Existe por dos razones:
//
// 1. El token de GitHub se queda aquí. Si viviera en el navegador quedaría a la
//    vista de cualquiera que abriera esa sesión, y habría que repartirlo a cada
//    socio para que viera los commits de un repo privado.
//
// 2. Quien pregunta no elige el repositorio: manda el id de un proyecto. La
//    consulta se hace con SU sesión, así que las políticas por fila deciden si
//    ese proyecto le corresponde. Sin eso, esta función sería un túnel para leer
//    cualquier repositorio privado con el token del servidor.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const responder = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

function partirRepo(url: string | null) {
  if (!url) return null
  const m = url.match(/github\.com\/([^/\s]+)\/([^/\s#?]+)/i)
  return m ? { propietario: m[1], nombre: m[2].replace(/\.git$/i, '') } : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const autorizacion = req.headers.get('Authorization')
  if (!autorizacion) return responder({ error: 'Falta la sesión.' }, 401)

  let cuerpo: { project_id?: string; rama?: string; limite?: number }
  try {
    cuerpo = await req.json()
  } catch {
    return responder({ error: 'El cuerpo de la petición no es JSON válido.' }, 400)
  }

  const { project_id, rama, limite } = cuerpo
  if (!project_id) return responder({ error: 'Falta el proyecto.' }, 400)

  // Cliente con la sesión de quien llama: las políticas se aplican tal cual.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: autorizacion } } },
  )

  const { data: proyecto, error } = await supabase
    .from('projects')
    .select('id, name, repo_url')
    .eq('id', project_id)
    .maybeSingle()

  if (error) return responder({ error: error.message }, 500)
  // No distinguimos "no existe" de "no te corresponde": decirlo revelaría que
  // ese proyecto existe en un espacio ajeno.
  if (!proyecto) return responder({ error: 'Proyecto no disponible.' }, 404)

  const repo = partirRepo(proyecto.repo_url)
  if (!repo) return responder({ error: 'El proyecto no tiene repositorio vinculado.' }, 400)

  const token = Deno.env.get('GITHUB_TOKEN') ?? ''
  const cabeceras: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'centro-trabajo',
  }
  if (token) cabeceras.Authorization = `Bearer ${token}`

  const parametros = new URLSearchParams({
    per_page: String(Math.min(Math.max(limite ?? 10, 1), 50)),
  })
  if (rama) parametros.set('sha', rama)

  const respuesta = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(repo.propietario)}/${encodeURIComponent(repo.nombre)}/commits?${parametros}`,
    { headers: cabeceras },
  )

  if (!respuesta.ok) {
    const detalle =
      respuesta.status === 404
        ? token
          ? `No se encontró ${repo.propietario}/${repo.nombre}. Si es privado, el token del servidor no tiene permiso sobre él.`
          : `No se encontró ${repo.propietario}/${repo.nombre}. Si es privado, falta configurar GITHUB_TOKEN en el servidor.`
        : respuesta.status === 401 || respuesta.status === 403
          ? 'GitHub rechazó la petición: el token del servidor es inválido, no tiene permisos, o se agotó el límite por hora.'
          : respuesta.status === 409
            ? 'El repositorio está vacío: todavía no tiene commits.'
            : `GitHub respondió con error ${respuesta.status}.`
    return responder({ error: detalle }, 502)
  }

  const crudos = await respuesta.json()
  const commits = crudos.map((c: Record<string, any>) => {
    const [titulo, ...resto] = (c.commit?.message ?? '').split('\n')
    return {
      sha: c.sha,
      shaCorto: String(c.sha).slice(0, 7),
      titulo,
      cuerpo: resto.join('\n').trim(),
      autor: c.commit?.author?.name ?? c.author?.login ?? 'Desconocido',
      fecha: c.commit?.author?.date ?? '',
      url: c.html_url,
    }
  })

  return responder({ repo: `${repo.propietario}/${repo.nombre}`, commits })
})
