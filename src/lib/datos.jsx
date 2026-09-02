// Acceso a los datos. Todo pasa por Supabase; no hay copia local.
//
// Aquí no se filtra por espacio: las políticas por fila de la base ya devuelven
// únicamente lo que el usuario alcanza. Si algo no llega, es porque no le
// corresponde, no porque la pantalla lo esconda.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase.js'
import { useSesion } from './sesion.jsx'
import { olvidarToken, tokenGuardado } from './invitacion.js'
import { permisos } from '../data/modelo.js'

const DatosContexto = createContext(null)

const VACIO = {
  espacios: [], miembros: [], proyectos: [], tareas: [], personas: [],
  entregas: [], suscripciones: [], cobros: [], miembrosProyecto: [],
}

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
      // Las suscripciones y los cobros solo los devuelve la base a quien manda
      // en algún espacio; para el resto llegan vacíos y no hay nada que ocultar.
      const [
        espacios, miembros, proyectos, tareas, personas,
        entregas, suscripciones, cobros, miembrosProyecto,
      ] = await Promise.all([
        supabase.from('spaces').select('*').order('created_at'),
        supabase.from('space_members').select('*'),
        supabase.from('projects').select('*').order('position').order('created_at'),
        supabase.from('tasks').select('*').order('due_date', { nullsFirst: false }),
        supabase.from('profiles').select('id, email, full_name, avatar_url, kind'),
        supabase.from('milestones').select('*').order('position').order('due_date', { nullsFirst: false }),
        supabase.from('subscriptions').select('*').order('created_at'),
        supabase.from('subscription_charges').select('*').order('due_date'),
        supabase.from('project_members').select('*'),
      ])

      const respuestas = [
        espacios, miembros, proyectos, tareas, personas,
        entregas, suscripciones, cobros, miembrosProyecto,
      ]
      const fallo = respuestas.find((r) => r.error)
      if (fallo) throw fallo.error

      setDatos({
        espacios: espacios.data ?? [],
        miembros: miembros.data ?? [],
        proyectos: proyectos.data ?? [],
        tareas: tareas.data ?? [],
        personas: personas.data ?? [],
        entregas: entregas.data ?? [],
        suscripciones: suscripciones.data ?? [],
        cobros: cobros.data ?? [],
        miembrosProyecto: miembrosProyecto.data ?? [],
      })
    } catch (e) {
      setError(traducir(e))
      setDatos(VACIO)
    } finally {
      setCargando(false)
    }
  }, [usuarioId])

  useEffect(() => { recargar() }, [recargar])

  // Canje de la invitación. Se hace aquí y no al registrarse porque si el
  // proyecto exige confirmar el correo, en ese momento todavía no hay sesión.
  useEffect(() => {
    const token = tokenGuardado()
    if (!usuarioId || !token) return
    let vivo = true
    supabase.rpc('aceptar_invitacion', { p_token: token }).then(({ data, error: err }) => {
      if (!vivo) return
      // Si es de otro correo se conserva: quizá entró con la cuenta equivocada
      // y al cambiar de sesión sí le corresponde.
      if (!err && data?.estado !== 'otro_correo') olvidarToken()
      if (data?.estado === 'aceptada') recargar()
      else if (data?.estado === 'otro_correo') {
        setError(
          `Esta invitación es para ${data.esperado}. Cierra sesión y entra con ese correo.`,
        )
      }
    })
    return () => { vivo = false }
  }, [usuarioId, recargar])

  const api = useMemo(() => {
    const {
      espacios, miembros, proyectos, tareas, personas,
      entregas, suscripciones, cobros, miembrosProyecto,
    } = datos

    const rolEn = (id) =>
      miembros.find((m) => m.space_id === id && m.user_id === usuarioId)?.role ?? null

    const espacioActivo = espacios.find((e) => e.id === espacioId) ?? null
    const proyectosVisibles = espacioId
      ? proyectos.filter((p) => p.space_id === espacioId)
      : proyectos
    const tareasVisibles = espacioId
      ? tareas.filter((t) => t.space_id === espacioId)
      : tareas

    const idsProyectosVisibles = new Set(proyectosVisibles.map((p) => p.id))
    const entregasVisibles = espacioId
      ? entregas.filter((e) => idsProyectosVisibles.has(e.project_id))
      : entregas
    const suscripcionesVisibles = espacioId
      ? suscripciones.filter((s) => s.space_id === espacioId)
      : suscripciones
    const cobrosVisibles = espacioId
      ? cobros.filter((c) => c.space_id === espacioId)
      : cobros

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
      entregas: entregasVisibles,
      suscripciones: suscripcionesVisibles,
      cobros: cobrosVisibles,
      miembrosProyecto,
      todosLosProyectos: proyectos,
      todasLasTareas: tareas,
      todasLasEntregas: entregas,

      espacioId, espacioActivo, setEspacioId,
      rolEn,
      permisosEn: (id) => permisos(rolEn(id)),
      nombreDe: (id) => {
        const p = personas.find((x) => x.id === id)
        return p ? (p.full_name || p.email) : null
      },
      miembrosDe: (id) => miembros.filter((m) => m.space_id === id),

      crearEspacio: (campos) =>
        escribir(supabase.from('spaces').insert({ ...campos, owner_id: usuarioId })),
      guardarEspacio: ({ id, ...campos }) =>
        escribir(supabase.from('spaces').update(campos).eq('id', id)),
      eliminarEspacio: (id) =>
        escribir(supabase.from('spaces').delete().eq('id', id)),

      // Genera un enlace de invitación que ya lleva dentro el espacio, el rol y
      // los proyectos: quien lo abre se registra y entra viendo lo suyo.
      crearInvitacion: async (space_id, email, rol, proyectos = []) => {
        const { data, error: err } = await supabase.rpc('crear_invitacion', {
          p_space: space_id, p_email: email, p_rol: rol, p_proyectos: proyectos,
        })
        if (err) throw new Error(traducir(err))
        return {
          ...data,
          enlace: `${window.location.origin}/?inv=${data.token}`,
        }
      },

      // Suma a alguien por su correo. Devuelve 'sin_cuenta' si esa persona
      // todavía no se ha registrado, para poder decírselo con claridad.
      agregarMiembro: async (space_id, email, rol) => {
        const { data, error: err } = await supabase.rpc('agregar_miembro', {
          p_space: space_id, p_email: email, p_rol: rol,
        })
        if (err) throw new Error(traducir(err))
        if (data?.estado === 'agregado') await recargar()
        return data
      },

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

      entregasDe: (proyectoId) =>
        entregas.filter((e) => e.project_id === proyectoId),
      clientesDe: (proyectoId) =>
        miembrosProyecto.filter((m) => m.project_id === proyectoId),

      crearEntrega: (campos) =>
        escribir(supabase.from('milestones').insert({ ...campos, created_by: usuarioId })),
      guardarEntrega: ({ id, ...campos }) =>
        escribir(supabase.from('milestones').update(campos).eq('id', id)),
      eliminarEntrega: (id) =>
        escribir(supabase.from('milestones').delete().eq('id', id)),

      darAccesoCliente: (project_id, user_id) =>
        escribir(supabase.from('project_members').insert({ project_id, user_id })),
      quitarAccesoCliente: (id) =>
        escribir(supabase.from('project_members').delete().eq('id', id)),

      crearSuscripcion: async (campos) => {
        const { data, error: err } = await supabase
          .from('subscriptions')
          .insert({ ...campos, created_by: usuarioId })
          .select()
          .single()
        if (err) throw new Error(traducir(err))
        // Al dar de alta se genera el calendario de cobros del año siguiente.
        await supabase.rpc('generar_cobros', { p_sub: data.id })
        await recargar()
        return data
      },
      guardarSuscripcion: async ({ id, ...campos }) => {
        const { error: err } = await supabase.from('subscriptions').update(campos).eq('id', id)
        if (err) throw new Error(traducir(err))
        await supabase.rpc('generar_cobros', { p_sub: id })
        await recargar()
      },
      eliminarSuscripcion: (id) =>
        escribir(supabase.from('subscriptions').delete().eq('id', id)),

      guardarCobro: ({ id, ...campos }) =>
        escribir(supabase.from('subscription_charges').update(campos).eq('id', id)),

      // Extiende el calendario y marca lo que ya se pasó de fecha.
      refrescarCobros: async () => {
        for (const s of suscripciones.filter((x) => x.status === 'activa')) {
          await supabase.rpc('generar_cobros', { p_sub: s.id })
        }
        await supabase.rpc('marcar_vencidos')
        await recargar()
      },

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
