// Estado global del Centro de Trabajo.
// Por ahora persiste en localStorage; el día que pasemos a Supabase solo
// cambia la implementación de leer/guardar, no las vistas.

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { semilla, vacio } from '../data/semilla.js'

const CLAVE = 'centro_trabajo_v1'
const AlmacenContexto = createContext(null)

function leer() {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (!crudo) return { ...semilla, demo: true }
    const datos = JSON.parse(crudo)
    return {
      colaboradores: datos.colaboradores ?? [],
      proyectos: datos.proyectos ?? [],
      tareas: datos.tareas ?? [],
      demo: datos.demo ?? false,
    }
  } catch {
    return { ...semilla, demo: true }
  }
}

export function ProveedorAlmacen({ children }) {
  const [datos, setDatos] = useState(leer)

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(datos))
    } catch {
      // Modo privado o almacenamiento lleno: la app sigue funcionando en memoria.
    }
  }, [datos])

  const api = useMemo(() => {
    const guardarEn = (coleccion, registro) =>
      setDatos((prev) => {
        const lista = prev[coleccion]
        const existe = lista.some((r) => r.id === registro.id)
        return {
          ...prev,
          demo: false,
          [coleccion]: existe
            ? lista.map((r) => (r.id === registro.id ? registro : r))
            : [...lista, registro],
        }
      })

    return {
      ...datos,

      guardarColaborador: (c) => guardarEn('colaboradores', c),
      guardarProyecto: (p) => guardarEn('proyectos', p),
      guardarTarea: (t) => guardarEn('tareas', t),

      // Al borrar un colaborador se limpian sus asignaciones para no dejar
      // proyectos apuntando a un id inexistente.
      eliminarColaborador: (id) =>
        setDatos((prev) => ({
          ...prev,
          demo: false,
          colaboradores: prev.colaboradores.filter((c) => c.id !== id),
          proyectos: prev.proyectos.map((p) => ({
            ...p,
            responsableId: p.responsableId === id ? '' : p.responsableId,
            colaboradorIds: p.colaboradorIds.filter((cid) => cid !== id),
          })),
          tareas: prev.tareas.map((t) =>
            t.asignadoId === id ? { ...t, asignadoId: '' } : t,
          ),
        })),

      // Borrar un proyecto se lleva sus tareas.
      eliminarProyecto: (id) =>
        setDatos((prev) => ({
          ...prev,
          demo: false,
          proyectos: prev.proyectos.filter((p) => p.id !== id),
          tareas: prev.tareas.filter((t) => t.proyectoId !== id),
        })),

      eliminarTarea: (id) =>
        setDatos((prev) => ({
          ...prev,
          demo: false,
          tareas: prev.tareas.filter((t) => t.id !== id),
        })),

      vaciar: () => setDatos({ ...vacio, demo: false }),
      restaurarEjemplo: () => setDatos({ ...semilla, demo: true }),

      exportar: () =>
        JSON.stringify(
          {
            colaboradores: datos.colaboradores,
            proyectos: datos.proyectos,
            tareas: datos.tareas,
          },
          null,
          2,
        ),

      importar: (texto) => {
        const parseado = JSON.parse(texto)
        if (
          !Array.isArray(parseado.colaboradores) ||
          !Array.isArray(parseado.proyectos)
        ) {
          throw new Error('El archivo no tiene el formato esperado.')
        }
        setDatos({
          colaboradores: parseado.colaboradores,
          proyectos: parseado.proyectos,
          tareas: Array.isArray(parseado.tareas) ? parseado.tareas : [],
          demo: false,
        })
      },
    }
  }, [datos])

  return <AlmacenContexto.Provider value={api}>{children}</AlmacenContexto.Provider>
}

export function useAlmacen() {
  const ctx = useContext(AlmacenContexto)
  if (!ctx) throw new Error('useAlmacen debe usarse dentro de ProveedorAlmacen')
  return ctx
}
