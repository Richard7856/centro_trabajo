// Lee los commits de un repositorio y se los entrega a la aplicación.
//
// Existe por dos razones:
//
// 1. Las credenciales se quedan aquí. En el navegador quedarían a la vista de
//    cualquiera que abriera esa sesión, y habría que repartirlas a cada socio
//    para que viera los commits de un repositorio privado.
//
// 2. Quien pregunta no elige el repositorio: manda el id de un proyecto. La
//    consulta se hace con SU sesión, así que las políticas por fila deciden si
//    ese proyecto le corresponde. Sin eso, esta función sería un túnel para leer
//    cualquier repositorio privado con las credenciales del servidor.
//
// Admite dos formas de autenticarse ante GitHub, y ninguna necesita un token
// por repositorio:
//
//   - GITHUB_TOKEN: un token personal. Uno solo cubre todos los repositorios
//     que le hayas marcado (o "All repositories"). Caduca y hay que renovarlo.
//
//   - GITHUB_APP_ID + GITHUB_APP_PRIVATE_KEY: una GitHub App instalada en la
//     cuenta. Ella misma emite tokens de una hora que se renuevan solos, así
//     que no hay nada que recordar. Es la vía automática.
//
// Si no hay ninguna, funcionan los repositorios públicos.

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

const API = 'https://api.github.com'
const cabecerasBase = { Accept: 'application/vnd.github+json', 'User-Agent': 'centro-trabajo' }

function partirRepo(url: string | null) {
  if (!url) return null
  const m = url.match(/github\.com\/([^/\s]+)\/([^/\s#?]+)/i)
  return m ? { propietario: m[1], nombre: m[2].replace(/\.git$/i, '') } : null
}

// ---------- GitHub App ----------

const base64url = (datos: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(datos)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const derLongitud = (n: number): number[] => {
  if (n < 0x80) return [n]
  const bytes: number[] = []
  let v = n
  while (v > 0) { bytes.unshift(v & 0xff); v >>= 8 }
  return [0x80 | bytes.length, ...bytes]
}

// GitHub entrega la llave en PKCS#1; Web Crypto solo importa PKCS#8. La
// diferencia es una cabecera DER fija que declara el algoritmo RSA.
function aPkcs8(pem: string): Uint8Array {
  const crudo = Uint8Array.from(
    atob(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')),
    (c) => c.charCodeAt(0),
  )
  if (!pem.includes('BEGIN RSA PRIVATE KEY')) return crudo

  const ALGORITMO = [
    0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86,
    0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00,
  ]
  const octetos = [0x04, ...derLongitud(crudo.length), ...crudo]
  const cuerpo = [0x02, 0x01, 0x00, ...ALGORITMO, ...octetos]
  return new Uint8Array([0x30, ...derLongitud(cuerpo.length), ...cuerpo])
}

async function jwtDeLaApp(appId: string, pem: string) {
  const llave = await crypto.subtle.importKey(
    'pkcs8', aPkcs8(pem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'],
  )
  const ahora = Math.floor(Date.now() / 1000)
  const cabecera = base64url(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })))
  // iat un minuto atrás por si el reloj del servidor va adelantado.
  const carga = base64url(new TextEncoder().encode(
    JSON.stringify({ iat: ahora - 60, exp: ahora + 540, iss: appId }),
  ))
  const firma = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', llave, new TextEncoder().encode(`${cabecera}.${carga}`),
  )
  return `${cabecera}.${carga}.${base64url(firma)}`
}

// El token de instalación dura una hora; se guarda entre invocaciones mientras
// la instancia siga viva, para no pedir uno en cada carga de pantalla.
let tokenEnCache: { valor: string; expira: number } | null = null

async function tokenDeInstalacion(): Promise<string> {
  if (tokenEnCache && tokenEnCache.expira > Date.now() + 300_000) return tokenEnCache.valor

  const appId = Deno.env.get('GITHUB_APP_ID')!
  const pem = Deno.env.get('GITHUB_APP_PRIVATE_KEY')!
  const jwt = await jwtDeLaApp(appId, pem)
  const auth = { ...cabecerasBase, Authorization: `Bearer ${jwt}` }

  let instalacion = Deno.env.get('GITHUB_APP_INSTALLATION_ID') ?? ''
  if (!instalacion) {
    const r = await fetch(`${API}/app/installations`, { headers: auth })
    if (!r.ok) throw new Error(`GitHub no aceptó la GitHub App (error ${r.status}). Revisa el App ID y la llave privada.`)
    const lista = await r.json()
    if (!lista.length) throw new Error('La GitHub App no está instalada en ninguna cuenta todavía.')
    instalacion = String(lista[0].id)
  }

  const r = await fetch(`${API}/app/installations/${instalacion}/access_tokens`, {
    method: 'POST', headers: auth,
  })
  if (!r.ok) throw new Error(`No se pudo emitir el token de instalación (error ${r.status}).`)

  const { token, expires_at } = await r.json()
  tokenEnCache = { valor: token, expira: new Date(expires_at).getTime() }
  return token
}

async function autorizacionGithub(): Promise<{ token: string; via: string }> {
  if (Deno.env.get('GITHUB_APP_ID') && Deno.env.get('GITHUB_APP_PRIVATE_KEY')) {
    return { token: await tokenDeInstalacion(), via: 'app' }
  }
  const pat = Deno.env.get('GITHUB_TOKEN') ?? ''
  return { token: pat, via: pat ? 'token' : 'ninguna' }
}

// ---------- Petición ----------

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

  let token = ''
  let via = 'ninguna'
  try {
    ({ token, via } = await autorizacionGithub())
  } catch (e) {
    return responder({ error: (e as Error).message }, 500)
  }

  const cabeceras: Record<string, string> = { ...cabecerasBase }
  if (token) cabeceras.Authorization = `Bearer ${token}`

  const parametros = new URLSearchParams({
    per_page: String(Math.min(Math.max(limite ?? 10, 1), 50)),
  })
  if (rama) parametros.set('sha', rama)

  const respuesta = await fetch(
    `${API}/repos/${encodeURIComponent(repo.propietario)}/${encodeURIComponent(repo.nombre)}/commits?${parametros}`,
    { headers: cabeceras },
  )

  if (!respuesta.ok) {
    const nombre = `${repo.propietario}/${repo.nombre}`
    const detalle =
      respuesta.status === 404
        ? via === 'ninguna'
          ? `No se encontró ${nombre}. Si es privado, falta configurar el acceso a GitHub en el servidor.`
          : via === 'app'
            ? `No se encontró ${nombre}. La GitHub App no tiene acceso a ese repositorio: agrégalo en la instalación.`
            : `No se encontró ${nombre}. El token del servidor no cubre ese repositorio.`
        : respuesta.status === 401 || respuesta.status === 403
          ? 'GitHub rechazó la petición: credenciales inválidas, sin permisos, o límite por hora agotado.'
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

  return responder({ repo: `${repo.propietario}/${repo.nombre}`, via, commits })
})
