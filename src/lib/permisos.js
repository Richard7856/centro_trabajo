// Capa de visibilidad y permisos.
//
// IMPORTANTE: mientras la app viva solo en el navegador, esto controla lo que
// se MUESTRA, no lo que se puede alcanzar. El aislamiento real entre espacios
// (que un socio no pueda siquiera saber que existen los demás) se consigue
// hasta que la información esté en el servidor con reglas por usuario.
// Este archivo define las reglas que después se traducen a esas políticas.

const TODO_EL_ESPACIO = ['dueno', 'socio']

// Membresías de una persona, una por espacio.
export function membresiasDe(colaboradorId, miembros) {
  return miembros.filter((m) => m.colaboradorId === colaboradorId)
}

export function rolEn(colaboradorId, espacioId, miembros) {
  return (
    miembros.find((m) => m.colaboradorId === colaboradorId && m.espacioId === espacioId)
      ?.rolEspacio ?? null
  )
}

// Un espacio solo es visible para quien tiene una membresía en él.
export function espaciosVisibles(colaboradorId, espacios, miembros) {
  const suyos = new Set(membresiasDe(colaboradorId, miembros).map((m) => m.espacioId))
  return espacios.filter((e) => suyos.has(e.id))
}

// Dentro de un espacio, qué proyectos alcanza cada rol.
export function proyectosVisibles(colaboradorId, proyectos, espacios, miembros) {
  const idsVisibles = new Set(espaciosVisibles(colaboradorId, espacios, miembros).map((e) => e.id))

  return proyectos.filter((p) => {
    if (!idsVisibles.has(p.espacioId)) return false
    const r = rolEn(colaboradorId, p.espacioId, miembros)
    if (TODO_EL_ESPACIO.includes(r)) return true
    if (r === 'colaborador') {
      return p.responsableId === colaboradorId || p.colaboradorIds.includes(colaboradorId)
    }
    if (r === 'cliente') return p.clienteIds.includes(colaboradorId)
    return false
  })
}

// Las personas que alguien puede ver: en su espacio completo si es dueño o
// socio; si no, solo quienes comparten proyecto con él.
export function personasVisibles(colaboradorId, colaboradores, proyectos, espacios, miembros) {
  const ids = new Set([colaboradorId])

  for (const e of espaciosVisibles(colaboradorId, espacios, miembros)) {
    const r = rolEn(colaboradorId, e.id, miembros)
    if (TODO_EL_ESPACIO.includes(r)) {
      for (const m of miembros.filter((x) => x.espacioId === e.id)) ids.add(m.colaboradorId)
    }
  }

  for (const p of proyectosVisibles(colaboradorId, proyectos, espacios, miembros)) {
    if (p.responsableId) ids.add(p.responsableId)
    for (const cid of p.colaboradorIds) ids.add(cid)
  }

  return colaboradores.filter((c) => ids.has(c.id))
}

// ---------- Permisos de acción ----------

export function permisos(colaboradorId, espacioId, miembros) {
  const r = rolEn(colaboradorId, espacioId, miembros)
  const mando = TODO_EL_ESPACIO.includes(r)

  return {
    rol: r,
    esDueno: r === 'dueno',
    esCliente: r === 'cliente',
    verEspacio: r !== null,
    gestionarEspacio: r === 'dueno',
    gestionarMiembros: r === 'dueno',
    crearProyecto: mando,
    editarProyecto: mando,
    eliminarProyecto: r === 'dueno',
    // El cliente sí puede levantar tareas: así pide cambios sin correo de por medio.
    crearTarea: r !== null,
    // Pero no puede darlas por terminadas ni borrarlas.
    cambiarEstadoTarea: mando || r === 'colaborador',
    eliminarTarea: mando,
    verEquipoCompleto: mando,
    verRepositorio: r !== null,
  }
}

// Permisos para una persona sobre un proyecto concreto.
export function permisosProyecto(colaboradorId, proyecto, miembros) {
  return permisos(colaboradorId, proyecto?.espacioId ?? '', miembros)
}

// Personas de un espacio agrupadas por para qué sirven en un proyecto:
// "equipo" son quienes trabajan en él, "clientes" quienes solo lo consultan.
export function personasDelEspacio(espacioId, miembros, colaboradores) {
  const del = miembros.filter((m) => m.espacioId === espacioId)
  const buscar = (ids) => colaboradores.filter((c) => ids.has(c.id))

  const equipoIds = new Set(
    del.filter((m) => m.rolEspacio !== 'cliente').map((m) => m.colaboradorId),
  )
  const clienteIds = new Set(
    del.filter((m) => m.rolEspacio === 'cliente').map((m) => m.colaboradorId),
  )

  return { equipo: buscar(equipoIds), clientes: buscar(clienteIds) }
}
