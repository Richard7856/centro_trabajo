// Estado global del Centro de Trabajo.
//
// Persiste en localStorage. Cuando la información se mueva al servidor, solo
// cambia lo de este archivo: las vistas piden datos y permisos, no almacenamiento.

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { USUARIO_POR_DEFECTO, semilla, vacio } from '../data/semilla.js'
import {
  espaciosVisibles, permisos, personasDelEspacio, proyectosVisibles,
} from './permisos.js'

const CLAVE = 'centro_trabajo_v2'
const CLAVE_SESION = 'centro_trabajo_sesion'
const CLAVE_TOKEN = 'centro_trabajo_token_github'

const AlmacenContexto = createContext(null)

const COLECCIONES = ['colaboradores', 'espacios', 'miembros', 'proyectos', 'tareas']

function leer() {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (!crudo) return { ...semilla }
    const datos = JSON.parse(crudo)
    const salida = {}
    for (const c of COLECCIONES) salida[c] = Array.isArray(datos[c]) ? datos[c] : []
    return salida
  } catch {
    return { ...semilla }
  }
}

function leerClave(clave, respaldo) {
  try {
    return localStorage.getItem(clave) ?? respaldo
  } catch {
    return respaldo
  }
}

export function ProveedorAlmacen({ children }) {
  const [datos, setDatos] = useState(leer)
  // Quién está usando la app. Hoy se elige a mano ("Ver como") para poder
  // comprobar qué ve cada rol; con autenticación real vendrá del login.
  const [usuarioId, setUsuarioId] = useState(() => leerClave(CLAVE_SESION, USUARIO_POR_DEFECTO))
  const [tokenGithub, setTokenGithub] = useState(() => leerClave(CLAVE_TOKEN, ''))
  // Espacio abierto; '' significa "todos los que puedo ver".
  const [espacioId, setEspacioId] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(datos))
    } catch {
      // Modo privado o almacenamiento lleno: la app sigue en memoria.
    }
  }, [datos])

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_SESION, usuarioId)
    } catch { /* sin persistencia */ }
  }, [usuarioId])

  useEffect(() => {
    try {
      if (tokenGithub) localStorage.setItem(CLAVE_TOKEN, tokenGithub)
      else localStorage.removeItem(CLAVE_TOKEN)
    } catch { /* sin persistencia */ }
  }, [tokenGithub])

  const api = useMemo(() => {
    const { colaboradores, espacios, miembros, proyectos, tareas } = datos

    const guardarEn = (coleccion, registro) =>
      setDatos((prev) => {
        const lista = prev[coleccion]
        const existe = lista.some((r) => r.id === registro.id)
        return {
          ...prev,
          [coleccion]: existe
            ? lista.map((r) => (r.id === registro.id ? registro : r))
            : [...lista, registro],
        }
      })

    // Lo que el usuario actual alcanza. Todas las vistas leen de aquí.
    const misEspacios = espaciosVisibles(usuarioId, espacios, miembros)
    const misProyectosTodos = proyectosVisibles(usuarioId, proyectos, espacios, miembros)
    const misProyectos = espacioId
      ? misProyectosTodos.filter((p) => p.espacioId === espacioId)
      : misProyectosTodos
    const idsProyectos = new Set(misProyectosTodos.map((p) => p.id))
    const misTareas = tareas.filter((t) => idsProyectos.has(t.proyectoId))

    const usuario = colaboradores.find((c) => c.id === usuarioId) ?? null
    const espacioActivo = espacios.find((e) => e.id === espacioId) ?? null

    return {
      // Datos crudos (solo para vistas de administración del dueño).
      colaboradores, espacios, miembros, proyectos, tareas,

      // Sesión y alcance.
      usuarioId, usuario, setUsuarioId,
      espacioId, espacioActivo, setEspacioId,
      misEspacios, misProyectos, misProyectosTodos, misTareas,
      permisosEn: (id) => permisos(usuarioId, id, miembros),
      personasDe: (id) => personasDelEspacio(id, miembros, colaboradores),

      tokenGithub, setTokenGithub,

      guardarColaborador: (c) => guardarEn('colaboradores', c),
      guardarEspacio: (e) => guardarEn('espacios', e),
      guardarProyecto: (p) => guardarEn('proyectos', p),
      guardarTarea: (t) => guardarEn('tareas', t),

      // Alta o cambio de rol de un miembro: una sola membresía por persona y espacio.
      guardarMiembro: (m) =>
        setDatos((prev) => {
          const otros = prev.miembros.filter(
            (x) => !(x.espacioId === m.espacioId && x.colaboradorId === m.colaboradorId),
          )
          return { ...prev, miembros: [...otros, m] }
        }),

      quitarMiembro: (id) =>
        setDatos((prev) => ({ ...prev, miembros: prev.miembros.filter((m) => m.id !== id) })),

      // Borrar un espacio arrastra sus membresías, proyectos y tareas.
      eliminarEspacio: (id) =>
        setDatos((prev) => {
          const suyos = new Set(prev.proyectos.filter((p) => p.espacioId === id).map((p) => p.id))
          return {
            ...prev,
            espacios: prev.espacios.filter((e) => e.id !== id),
            miembros: prev.miembros.filter((m) => m.espacioId !== id),
            proyectos: prev.proyectos.filter((p) => p.espacioId !== id),
            tareas: prev.tareas.filter((t) => !suyos.has(t.proyectoId)),
          }
        }),

      // Al borrar una persona se limpian sus asignaciones y membresías.
      eliminarColaborador: (id) =>
        setDatos((prev) => ({
          ...prev,
          colaboradores: prev.colaboradores.filter((c) => c.id !== id),
          miembros: prev.miembros.filter((m) => m.colaboradorId !== id),
          proyectos: prev.proyectos.map((p) => ({
            ...p,
            responsableId: p.responsableId === id ? '' : p.responsableId,
            colaboradorIds: p.colaboradorIds.filter((cid) => cid !== id),
            clienteIds: (p.clienteIds ?? []).filter((cid) => cid !== id),
          })),
          tareas: prev.tareas.map((t) =>
            t.asignadoId === id ? { ...t, asignadoId: '' } : t,
          ),
        })),

      eliminarProyecto: (id) =>
        setDatos((prev) => ({
          ...prev,
          proyectos: prev.proyectos.filter((p) => p.id !== id),
          tareas: prev.tareas.filter((t) => t.proyectoId !== id),
        })),

      eliminarTarea: (id) =>
        setDatos((prev) => ({ ...prev, tareas: prev.tareas.filter((t) => t.id !== id) })),

      vaciar: () => setDatos({ ...vacio }),
      restaurarEstructura: () => setDatos({ ...semilla }),

      exportar: () =>
        JSON.stringify(
          Object.fromEntries(COLECCIONES.map((c) => [c, datos[c]])),
          null,
          2,
        ),

      importar: (texto) => {
        const p = JSON.parse(texto)
        if (!Array.isArray(p.colaboradores) || !Array.isArray(p.proyectos)) {
          throw new Error('El archivo no tiene el formato esperado.')
        }
        setDatos(
          Object.fromEntries(
            COLECCIONES.map((c) => [c, Array.isArray(p[c]) ? p[c] : []]),
          ),
        )
      },
    }
  }, [datos, usuarioId, espacioId, tokenGithub])

  return <AlmacenContexto.Provider value={api}>{children}</AlmacenContexto.Provider>
}

export function useAlmacen() {
  const ctx = useContext(AlmacenContexto)
  if (!ctx) throw new Error('useAlmacen debe usarse dentro de ProveedorAlmacen')
  return ctx
}
