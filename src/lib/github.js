// Utilidades de presentación para los commits.
//
// La lectura ya no se hace desde aquí: la pide la función `commits` del
// servidor, que es quien guarda el token y comprueba que el proyecto le
// corresponda a quien pregunta.

export function partirRepo(url) {
  if (!url) return null
  const m = String(url).match(/github\.com\/([^/\s]+)\/([^/\s#?]+)/i)
  if (!m) return null
  return { propietario: m[1], nombre: m[2].replace(/\.git$/i, '') }
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
