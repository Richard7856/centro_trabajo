// Cálculos derivados. Se mantienen fuera de las vistas para que el Panel y el
// detalle de un proyecto no puedan mostrar números distintos.

import { ENTREGAS_ABIERTAS, TAREAS_ABIERTAS, anualizado } from '../data/modelo.js'
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

// ---------- Agenda ----------


// Todo lo que tiene fecha, en una sola lista: entregas, tareas y cobros.
// El calendario y el panel leen de aquí para no contar cosas distintas.
export function agenda({ entregas = [], tareas = [], cobros = [], proyectos = [] }) {
  const nombreProyecto = (id) => proyectos.find((p) => p.id === id)?.name ?? ''
  const items = []

  for (const e of entregas) {
    if (!e.due_date) continue
    items.push({
      tipo: 'entrega',
      id: e.id,
      fecha: e.due_date,
      titulo: e.title,
      contexto: nombreProyecto(e.project_id),
      proyectoId: e.project_id,
      cerrado: !ENTREGAS_ABIERTAS.includes(e.status),
      estado: e.status,
    })
  }

  for (const t of tareas) {
    if (!t.due_date) continue
    items.push({
      tipo: 'tarea',
      id: t.id,
      fecha: t.due_date,
      titulo: t.title,
      contexto: nombreProyecto(t.project_id),
      proyectoId: t.project_id,
      cerrado: t.status === 'completada' || t.status === 'descartada',
      estado: t.status,
    })
  }

  for (const c of cobros) {
    items.push({
      tipo: 'cobro',
      id: c.id,
      fecha: c.due_date,
      titulo: c.concepto ?? 'Cobro',
      contexto: c.cliente ?? '',
      monto: c.amount,
      moneda: c.currency,
      cerrado: c.status === 'pagado' || c.status === 'cancelado',
      estado: c.status,
    })
  }

  return items.sort((a, b) => a.fecha.localeCompare(b.fecha))
}

// Ingreso recurrente: lo que entra al mes si nada cambia.
export function ingresos(suscripciones) {
  const activas = suscripciones.filter((s) => s.status === 'activa')
  const alAnio = activas.reduce((suma, s) => suma + anualizado(s), 0)
  return {
    activas: activas.length,
    mensual: alAnio / 12,
    anual: alAnio,
    moneda: activas[0]?.currency ?? 'MXN',
  }
}

export function resumenCobros(cobros) {
  const pendientes = cobros.filter((c) => c.status === 'pendiente')
  const vencidos = cobros.filter((c) => c.status === 'vencido')
  const hoy = new Date().toISOString().slice(0, 10)
  const en30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

  const proximos = pendientes.filter((c) => c.due_date >= hoy && c.due_date <= en30)
  const suma = (lista) => lista.reduce((s, c) => s + Number(c.amount || 0), 0)

  return {
    vencidos: vencidos.length,
    montoVencido: suma(vencidos),
    proximos: proximos.length,
    montoProximo: suma(proximos),
    cobrado: suma(cobros.filter((c) => c.status === 'pagado')),
    moneda: cobros[0]?.currency ?? 'MXN',
  }
}

// Entregas abiertas que ya vencieron o vencen pronto.
export function entregasEnRiesgo(entregas, dias = 14) {
  return entregas
    .filter((e) => ENTREGAS_ABIERTAS.includes(e.status) && e.due_date)
    .map((e) => ({ ...e, dias: diasRestantes(e.due_date) }))
    .filter((e) => e.dias !== null && e.dias <= dias)
    .sort((a, b) => a.dias - b.dias)
}

export function avanceEntregas(entregas) {
  const cuentan = entregas.filter((e) => e.status !== 'cancelada')
  if (cuentan.length === 0) return null
  const hechas = cuentan.filter((e) => e.status === 'entregada' || e.status === 'aprobada').length
  return { hechas, total: cuentan.length, porcentaje: Math.round((hechas / cuentan.length) * 100) }
}
