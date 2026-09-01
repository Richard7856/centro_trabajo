// Sesión del usuario. Sustituye al selector "Ver como": ahora la identidad
// viene del inicio de sesión y es la base sube al servidor quien decide qué
// devuelve, no la pantalla.

import { createContext, useContext, useEffect, useState } from 'react'
import { configurado, supabase } from './supabase.js'

const SesionContexto = createContext(null)

export function ProveedorSesion({ children }) {
  const [sesion, setSesion] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!configurado) {
      setCargando(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session)
      setCargando(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => {
      setSesion(s)
      setCargando(false)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // El perfil lo crea solo un disparador al darse de alta el usuario.
  useEffect(() => {
    let vivo = true
    if (!sesion?.user) {
      setPerfil(null)
      return
    }
    supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .eq('id', sesion.user.id)
      .maybeSingle()
      .then(({ data }) => vivo && setPerfil(data))
    return () => { vivo = false }
  }, [sesion?.user?.id])

  const api = {
    sesion,
    perfil,
    cargando,
    usuarioId: sesion?.user?.id ?? null,
    correo: sesion?.user?.email ?? null,

    entrar: (email, password) =>
      supabase.auth.signInWithPassword({ email: email.trim(), password }),

    registrar: (email, password, nombre) =>
      supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: nombre.trim() || email.split('@')[0] } },
      }),

    recuperar: (email) =>
      supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      }),

    salir: () => supabase.auth.signOut(),
  }

  return <SesionContexto.Provider value={api}>{children}</SesionContexto.Provider>
}

export function useSesion() {
  const ctx = useContext(SesionContexto)
  if (!ctx) throw new Error('useSesion debe usarse dentro de ProveedorSesion')
  return ctx
}
