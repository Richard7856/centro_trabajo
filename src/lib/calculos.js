// Cálculos derivados. Se mantienen fuera de las vistas para que el Panel y el
// detalle de un proyecto no puedan mostrar números distintos.

import { TAREAS_ABIERTAS } from '../data/modelo.js'
import { diasRestantes } from './formato.js'

export const tareasDe = (proyectoId, tareas) =>
  tareas.filter((t) => t.project_id === proyectoId)

// El avance sale de las tareas del proyecto; sin tareas, solo cuenta su estado.
export function avance(proyecto, tareas) {
  const propias = tareasDe(proyecto.id, tareas).filter((t) => t.status !== 'descartada')
  if (propias.length === 0) return proyecto.status === 'completado' ? 100 : 0
  const hechas = propias.filter((t) => t.status === 'completada').length
  return Math.round((hechas / propias.length) * 100)
}

export const abiertas = (tareas) => tareas.filter((t) => TAREAS_ABIERTAS.includes(t.status))

export function resumen(proyectos, tareas) {
  return {
    proyectos: proyectos.length,
    activos: proyectos.filter((p) => p.status === 'activo').length,
    completados: proyectos.filter((p) => p.status === 'completado').length,
    abiertas: abiertas(tareas).length,
    solicitudes: tareas.filter((t) => t.status === 'inbox').length,
  }
}

// Proyectos y tareas que vencen pronto o ya vencieron.
export function vencimientos(proyectos, tareas, dias = 14) {
  const items = []

  for (const p of proyectos) {
    if (p.status !== 'activo') continue
    const d = diasRestantes(p.due_date)
    if (d !== null && d <= dias) {
      items.push({ tipo: 'proyecto', id: p.id, titulo: p.name, fecha: p.due_date, dias: d })
    }
  }

  for (const t of tareas) {
    if (!TAREAS_ABIERTAS.includes(t.status)) continue
    const d = diasRestantes(t.due_date)
    if (d !== null && d <= dias) {
      items.push({
        tipo: 'tarea', id: t.id, proyectoId: t.project_id,
        titulo: t.title, fecha: t.due_date, dias: d,
      })
    }
  }

  return items.sort((a, b) => a.dias - b.dias)
}
