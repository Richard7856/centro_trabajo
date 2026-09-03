// Lo que la aplicación necesita de un repositorio: sus commits, el documento de
// avance escrito para quien no es técnico, y las capturas que ese documento
// referencia.
//
// Existe por dos razones:
//
// 1. Las credenciales se quedan aquí. En el navegador quedarían a la vista de
//    cualquiera que abriera esa sesión, y habría que repartirlas a cada socio
//    para que viera un repositorio privado.
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
//     cuenta. Ella misma emite tokens de una hora que se renuevan solos.
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

// ---------- Rutas dentro del repositorio ----------

const carpetaDe = (ruta: string) => {
  const i = ruta.lastIndexOf('/')
  return i === -1 ? '' : ruta.slice(0, i)
}

// Resuelve una ruta relativa contra la carpeta del documento y comprueba que no
// se salga de ella. Sin esto, la ruta de una imagen sería un lector de archivos
// arbitrarios dentro de un repositorio privado.
function resolverDentroDe(carpeta: string, relativa: string): string | null {
  if (/^https?:\/\//i.test(relativa)) return null
  const partes = `${carpeta}/${relativa}`.split('/')
  const pila: string[] = []
  for (const p of partes) {
    if (p === '' || p === '.') continue
    if (p === '..') { if (pila.length === 0) return null; pila.pop(); continue }
    pila.push(p)
  }
  const ruta = pila.join('/')
  if (carpeta && !(`${ruta}/`).startsWith(`${carpeta}/`)) return null
  return ruta
}

const TIPOS: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  webp: 'image/webp', avif: 'image/avif', svg: 'image/svg+xml',
}

// ---------- Petición ----------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const autorizacion = req.headers.get('Authorization')
  if (!autorizacion) return responder({ error: 'Falta la sesión.' }, 401)

  let cuerpo: {
    project_id?: string; rama?: string; limite?: number
    accion?: 'commits' | 'doc' | 'imagen'; ruta?: string
  }
  try {
    cuerpo = await req.json()
  } catch {
    return responder({ error: 'El cuerpo de la petición no es JSON válido.' }, 400)
  }

  const { project_id, rama, limite, ruta } = cuerpo
  const accion = cuerpo.accion ?? 'commits'
  if (!project_id) return responder({ error: 'Falta el proyecto.' }, 400)

  // Cliente con la sesión de quien llama: las políticas se aplican tal cual.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: autorizacion } } },
  )

  const { data: proyecto, error } = await supabase
    .from('projects')
    .select('id, name, repo_url, doc_path, doc_rama')
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

  const nombre = `${repo.propietario}/${repo.nombre}`
  const base = `${API}/repos/${encodeURIComponent(repo.propietario)}/${encodeURIComponent(repo.nombre)}`
  const conToken = (extra: Record<string, string> = {}) => {
    const h: Record<string, string> = { ...cabecerasBase, ...extra }
    if (token) h.Authorization = `Bearer ${token}`
    return h
  }

  const explicar = (status: number) =>
    status === 404
      ? via === 'ninguna'
        ? `No se encontró ${nombre}. Si es privado, falta configurar el acceso a GitHub en el servidor.`
        : via === 'app'
          ? `No se encontró ${nombre}. La GitHub App no tiene acceso a ese repositorio: agrégalo en la instalación.`
          : `No se encontró ${nombre}. El token del servidor no cubre ese repositorio.`
      : status === 401 || status === 403
        ? 'GitHub rechazó la petición: credenciales inválidas, sin permisos, o límite por hora agotado.'
        : status === 409
          ? 'El repositorio está vacío: todavía no tiene commits.'
          : `GitHub respondió con error ${status}.`

  const ramaDoc = proyecto.doc_rama || rama || ''

  // ---------- Documento de avance ----------

  if (accion === 'doc') {
    if (!proyecto.doc_path) {
      return responder({ error: 'Este proyecto no tiene documento de avance configurado.' }, 400)
    }
    const q = ramaDoc ? `?ref=${encodeURIComponent(ramaDoc)}` : ''
    const r = await fetch(`${base}/contents/${proyecto.doc_path}${q}`, {
      headers: conToken({ Accept: 'application/vnd.github.raw' }),
    })
    if (!r.ok) {
      return responder({
        error: r.status === 404
          ? `No se encontró ${proyecto.doc_path} en ${nombre}${ramaDoc ? ` (rama ${ramaDoc})` : ''}.`
          : explicar(r.status),
      }, 502)
    }
    return responder({
      ruta: proyecto.doc_path,
      carpeta: carpetaDe(proyecto.doc_path),
      markdown: await r.text(),
      via,
    })
  }

  // ---------- Capturas que el documento referencia ----------

  if (accion === 'imagen') {
    if (!proyecto.doc_path) return responder({ error: 'Sin documento configurado.' }, 400)
    if (!ruta) return responder({ error: 'Falta la ruta de la imagen.' }, 400)

    const destino = resolverDentroDe(carpetaDe(proyecto.doc_path), ruta)
    // Solo imágenes, y solo junto al documento: la ruta la manda el navegador.
    if (!destino) return responder({ error: 'Ruta fuera del documento.' }, 400)
    const ext = destino.split('.').pop()?.toLowerCase() ?? ''
    if (!TIPOS[ext]) return responder({ error: 'Ese archivo no es una imagen.' }, 400)

    const q = ramaDoc ? `?ref=${encodeURIComponent(ramaDoc)}` : ''
    const r = await fetch(`${base}/contents/${destino}${q}`, {
      headers: conToken({ Accept: 'application/vnd.github.raw' }),
    })
    if (!r.ok) {
      return responder({
        error: r.status === 404
          ? `No se encontró ${destino} en ${nombre}.`
          : explicar(r.status),
      }, 502)
    }

    return new Response(await r.arrayBuffer(), {
      headers: {
        ...CORS,
        'Content-Type': TIPOS[ext],
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    })
  }

  // ---------- Commits ----------

  const parametros = new URLSearchParams({
    per_page: String(Math.min(Math.max(limite ?? 10, 1), 50)),
  })
  if (rama) parametros.set('sha', rama)

  const respuesta = await fetch(`${base}/commits?${parametros}`, { headers: conToken() })
  if (!respuesta.ok) return responder({ error: explicar(respuesta.status) }, 502)

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

  return responder({ repo: nombre, via, commits })
})
