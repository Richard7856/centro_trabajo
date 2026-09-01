// Acceso a los datos. Todo pasa por Supabase; no hay copia local.
//
// Aquí no se filtra por espacio: las políticas por fila de la base ya devuelven
// únicamente lo que el usuario alcanza. Si algo no llega, es porque no le
// corresponde, no porque la pantalla lo esconda.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase.js'
import { useSesion } from './sesion.jsx'
import { permisos } from '../data/modelo.js'

const DatosContexto = createContext(null)

const VACIO = { espacios: [], miembros: [], proyectos: [], tareas: [], personas: [] }

export function ProveedorDatos({ children }) {
  const { usuarioId } = useSesion()
  const [datos, setDatos] = useState(VACIO)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  // Espacio abierto; '' significa "todos los que alcanzo".
  const [espacioId, setEspacioId] = useState('')

  const recargar = useCallback(async () => {
    if (!usuarioId) {
      setDatos(VACIO)
      setCargando(false)
      return
    }
    setCargando(true)
    setError('')
    try {
      const [espacios, miembros, proyectos, tareas, personas] = await Promise.all([
        supabase.from('spaces').select('*').order('created_at'),
        supabase.from('space_members').select('*'),
        supabase.from('projects').select('*').order('position').order('created_at'),
        supabase.from('tasks').select('*').order('due_date', { nullsFirst: false }),
        supabase.from('profiles').select('id, email, full_name, avatar_url, kind'),
      ])

      const fallo = [espacios, miembros, proyectos, tareas, personas].find((r) => r.error)
      if (fallo) throw fallo.error

      setDatos({
        espacios: espacios.data ?? [],
        miembros: miembros.data ?? [],
        proyectos: proyectos.data ?? [],
        tareas: tareas.data ?? [],
        personas: personas.data ?? [],
      })
    } catch (e) {
      setError(traducir(e))
      setDatos(VACIO)
    } finally {
      setCargando(false)
    }
  }, [usuarioId])

  useEffect(() => { recargar() }, [recargar])

  const api = useMemo(() => {
    const { espacios, miembros, proyectos, tareas, personas } = datos

    const rolEn = (id) =>
      miembros.find((m) => m.space_id === id && m.user_id === usuarioId)?.role ?? null

    const espacioActivo = espacios.find((e) => e.id === espacioId) ?? null
    const proyectosVisibles = espacioId
      ? proyectos.filter((p) => p.space_id === espacioId)
      : proyectos
    const tareasVisibles = espacioId
      ? tareas.filter((t) => t.space_id === espacioId)
      : tareas

    // Toda escritura vuelve a leer: así la pantalla muestra lo que la base
    // aceptó, no lo que nosotros supusimos.
    const escribir = async (promesa) => {
      const { error: err } = await promesa
      if (err) throw new Error(traducir(err))
      await recargar()
    }

    return {
      cargando, error, recargar,
      espacios, miembros, personas,
      proyectos: proyectosVisibles,
      tareas: tareasVisibles,
      todosLosProyectos: proyectos,
      todasLasTareas: tareas,

      espacioId, espacioActivo, setEspacioId,
      rolEn,
      permisosEn: (id) => permisos(rolEn(id)),
      nombreDe: (id) => {
        const p = personas.find((x) => x.id === id)
        return p ? (p.full_name || p.email) : null
      },
      miembrosDe: (id) => miembros.filter((m) => m.space_id === id),

      sembrar: async () => {
        const { data, error: err } = await supabase.rpc('sembrar_organizador')
        if (err) throw new Error(traducir(err))
        await recargar()
        return data
      },

      crearEspacio: (campos) =>
        escribir(supabase.from('spaces').insert({ ...campos, owner_id: usuarioId })),
      guardarEspacio: ({ id, ...campos }) =>
        escribir(supabase.from('spaces').update(campos).eq('id', id)),
      eliminarEspacio: (id) =>
        escribir(supabase.from('spaces').delete().eq('id', id)),

      guardarMiembro: ({ id, ...campos }) =>
        id
          ? escribir(supabase.from('space_members').update(campos).eq('id', id))
          : escribir(supabase.from('space_members').insert(campos)),
      quitarMiembro: (id) =>
        escribir(supabase.from('space_members').delete().eq('id', id)),

      crearProyecto: (campos) =>
        escribir(supabase.from('projects').insert({ ...campos, created_by: usuarioId })),
      guardarProyecto: ({ id, ...campos }) =>
        escribir(supabase.from('projects').update(campos).eq('id', id)),
      eliminarProyecto: (id) =>
        escribir(supabase.from('projects').delete().eq('id', id)),

      crearTarea: (campos) =>
        escribir(supabase.from('tasks').insert({ ...campos, created_by: usuarioId })),
      guardarTarea: ({ id, ...campos }) =>
        escribir(supabase.from('tasks').update(campos).eq('id', id)),
      eliminarTarea: (id) =>
        escribir(supabase.from('tasks').delete().eq('id', id)),
    }
  }, [datos, usuarioId, espacioId, cargando, error, recargar])

  return <DatosContexto.Provider value={api}>{children}</DatosContexto.Provider>
}

// Los mensajes de Postgres son ilegibles para quien no escribió el esquema.
function traducir(err) {
  const texto = `${err.message ?? ''} ${err.details ?? ''}`
  if (/failed to fetch|networkerror|load failed/i.test(texto)) {
    return 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.'
  }
  if (err.code === '42501' || /row-level security/i.test(texto)) {
    return 'La base rechazó el cambio: tu rol en este espacio no lo permite.'
  }
  if (err.code === '23505') return 'Ya existe un registro igual.'
  if (err.code === '23503') return 'Falta algo a lo que este registro hace referencia.'
  if (err.code === '23514') return 'Algún dato no cumple las reglas del campo.'
  return err.message ?? 'No se pudo guardar el cambio.'
}

export function useDatos() {
  const ctx = useContext(DatosContexto)
  if (!ctx) throw new Error('useDatos debe usarse dentro de ProveedorDatos')
  return ctx
}
