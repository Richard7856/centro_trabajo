// Cálculos derivados: avance, carga de trabajo y alertas.
// Se mantienen fuera de las vistas para que el Panel y los detalles siempre
// muestren el mismo número.

import { ESTADOS_ACTIVOS } from '../data/modelo.js'
import { diasRestantes } from './formato.js'

// El avance de un proyecto sale de sus tareas; si no tiene, un proyecto
// completado vale 100% y cualquier otro 0%.
export function avanceProyecto(proyecto, tareas) {
  const propias = tareas.filter((t) => t.proyectoId === proyecto.id)
  if (propias.length === 0) return proyecto.estado === 'completado' ? 100 : 0
  const hechas = propias.filter((t) => t.estado === 'completada').length
  return Math.round((hechas / propias.length) * 100)
}

export function tareasDeProyecto(proyectoId, tareas) {
  return tareas.filter((t) => t.proyectoId === proyectoId)
}

export function proyectosDeColaborador(colaboradorId, proyectos) {
  return proyectos.filter(
    (p) => p.responsableId === colaboradorId || p.colaboradorIds.includes(colaboradorId),
  )
}

export function cargaDeColaborador(colaboradorId, proyectos, tareas) {
  const suyos = proyectosDeColaborador(colaboradorId, proyectos)
  const activos = suyos.filter((p) => ESTADOS_ACTIVOS.includes(p.estado))
  const susTareas = tareas.filter((t) => t.asignadoId === colaboradorId)
  return {
    proyectos: suyos.length,
    proyectosActivos: activos.length,
    lidera: suyos.filter((p) => p.responsableId === colaboradorId).length,
    tareasAbiertas: susTareas.filter((t) => t.estado !== 'completada').length,
    tareasTotales: susTareas.length,
  }
}

export function nombrePorId(colaboradores, id) {
  return colaboradores.find((c) => c.id === id)?.nombre || 'Sin asignar'
}

// Proyectos y tareas con fecha límite vencida o dentro de los próximos días.
export function vencimientos(proyectos, tareas, dias = 14) {
  const items = []

  for (const p of proyectos) {
    if (!ESTADOS_ACTIVOS.includes(p.estado)) continue
    const d = diasRestantes(p.fechaFin)
    if (d !== null && d <= dias) {
      items.push({ tipo: 'proyecto', id: p.id, titulo: p.nombre, fecha: p.fechaFin, dias: d })
    }
  }

  for (const t of tareas) {
    if (t.estado === 'completada') continue
    const d = diasRestantes(t.fechaLimite)
    if (d !== null && d <= dias) {
      items.push({
        tipo: 'tarea',
        id: t.id,
        proyectoId: t.proyectoId,
        titulo: t.titulo,
        fecha: t.fechaLimite,
        dias: d,
      })
    }
  }

  return items.sort((a, b) => a.dias - b.dias)
}

export function resumen(proyectos, tareas) {
  return {
    total: proyectos.length,
    activos: proyectos.filter((p) => ESTADOS_ACTIVOS.includes(p.estado)).length,
    enProgreso: proyectos.filter((p) => p.estado === 'en_progreso').length,
    completados: proyectos.filter((p) => p.estado === 'completado').length,
    tareasAbiertas: tareas.filter((t) => t.estado !== 'completada').length,
  }
}
