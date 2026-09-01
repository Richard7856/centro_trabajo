// Lectura de commits desde GitHub.
//
// Solo lectura y desde el navegador. Para un repositorio público no hace falta
// nada; para uno privado se necesita un token, y un token en el navegador es
// visible para quien tenga esa sesión abierta: por eso el token se guarda solo
// en el equipo de quien lo escribe y nunca viaja con los datos del proyecto.
// Cuando la app pase al servidor, esta llamada se mueve allí y el token deja de
// tocar el navegador.

const API = 'https://api.github.com'

function cabeceras(token) {
  const h = { Accept: 'application/vnd.github+json' }
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

function mensajeDeError(estado, repo) {
  if (estado === 404) {
    return `No se encontró ${repo}. Si el repositorio es privado, hace falta un token con permiso de lectura (Ajustes).`
  }
  if (estado === 401 || estado === 403) {
    return 'GitHub rechazó la petición: token inválido, sin permisos, o se agotó el límite de consultas por hora.'
  }
  if (estado === 409) return 'El repositorio está vacío: todavía no tiene commits.'
  return `GitHub respondió con error ${estado}.`
}

export async function traerCommits({ propietario, nombre, rama }, token, limite = 20) {
  const repo = `${propietario}/${nombre}`
  const parametros = new URLSearchParams({ per_page: String(limite) })
  if (rama) parametros.set('sha', rama)

  const respuesta = await fetch(
    `${API}/repos/${encodeURIComponent(propietario)}/${encodeURIComponent(nombre)}/commits?${parametros}`,
    { headers: cabeceras(token) },
  )

  if (!respuesta.ok) throw new Error(mensajeDeError(respuesta.status, repo))

  const crudos = await respuesta.json()
  return crudos.map((c) => {
    const [titulo, ...resto] = (c.commit.message || '').split('\n')
    return {
      sha: c.sha,
      shaCorto: c.sha.slice(0, 7),
      titulo,
      cuerpo: resto.join('\n').trim(),
      autor: c.commit.author?.name || c.author?.login || 'Desconocido',
      usuarioGithub: c.author?.login || '',
      fecha: c.commit.author?.date || '',
      url: c.html_url,
    }
  })
}

export async function traerRamas({ propietario, nombre }, token) {
  const respuesta = await fetch(
    `${API}/repos/${encodeURIComponent(propietario)}/${encodeURIComponent(nombre)}/branches?per_page=100`,
    { headers: cabeceras(token) },
  )
  if (!respuesta.ok) throw new Error(mensajeDeError(respuesta.status, `${propietario}/${nombre}`))
  return (await respuesta.json()).map((r) => r.name)
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

// La base guarda el repositorio como URL completa; aquí se parte en piezas.
export function partirRepo(url, rama = 'main') {
  if (!url) return null
  const m = String(url).match(/github\.com\/([^/\s]+)\/([^/\s#?]+)/i)
  if (!m) return null
  return { propietario: m[1], nombre: m[2].replace(/\.git$/i, ''), rama }
}
