// Formato de fechas y utilidades de presentación.

export function formatearFecha(iso) {
  if (!iso) return '—'
  const [a, m, d] = iso.split('-').map(Number)
  if (!a || !m || !d) return iso
  const fecha = new Date(a, m - 1, d)
  return fecha.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function hoyISO() {
  const ahora = new Date()
  const mes = String(ahora.getMonth() + 1).padStart(2, '0')
  const dia = String(ahora.getDate()).padStart(2, '0')
  return `${ahora.getFullYear()}-${mes}-${dia}`
}

// Días que faltan para una fecha (negativo si ya pasó). null si no hay fecha.
export function diasRestantes(iso) {
  if (!iso) return null
  const dia = 86400000
  const objetivo = new Date(`${iso}T00:00:00`).getTime()
  const hoy = new Date(`${hoyISO()}T00:00:00`).getTime()
  return Math.round((objetivo - hoy) / dia)
}

export function iniciales(nombre) {
  return (nombre || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

// Color estable a partir del nombre, para los avatares.
export function colorDeNombre(nombre) {
  const paleta = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#0891b2', '#16a34a']
  let suma = 0
  for (const ch of nombre || '') suma += ch.charCodeAt(0)
  return paleta[suma % paleta.length]
}
