// El token de invitación viaja en la dirección (?inv=…) y se guarda hasta
// poder canjearlo.
//
// No se canjea en el momento de registrarse: si el proyecto exige confirmar el
// correo, ahí todavía no hay sesión. Se guarda y se intenta en cuanto exista
// una, venga del registro o de un inicio de sesión posterior.

const CLAVE = 'centro_trabajo_invitacion'

export function tokenDeLaUrl() {
  try {
    return new URLSearchParams(window.location.search).get('inv') || ''
  } catch {
    return ''
  }
}

export function guardarToken(token) {
  try {
    if (token) localStorage.setItem(CLAVE, token)
  } catch { /* sin persistencia: se canjeará en esta misma visita */ }
}

export function tokenGuardado() {
  try {
    return localStorage.getItem(CLAVE) || ''
  } catch {
    return ''
  }
}

export function olvidarToken() {
  try {
    localStorage.removeItem(CLAVE)
  } catch { /* nada que limpiar */ }
}

// Quita ?inv= de la barra de direcciones para que no quede a la vista ni se
// reenvíe por accidente.
export function limpiarUrl() {
  try {
    const u = new URL(window.location.href)
    if (!u.searchParams.has('inv')) return
    u.searchParams.delete('inv')
    window.history.replaceState({}, '', u.pathname + u.search + u.hash)
  } catch { /* sin history API */ }
}

export const MENSAJES = {
  no_existe: 'Ese enlace de invitación no es válido.',
  usada: 'Esa invitación ya se usó. Pide una nueva si la necesitas.',
  caducada: 'La invitación caducó. Pide una nueva.',
}
