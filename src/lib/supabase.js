import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const clave = import.meta.env.VITE_SUPABASE_ANON_KEY

// Si faltan las variables, es mejor decirlo claro que fallar en cada consulta.
export const configurado = Boolean(url && clave)

export const supabase = configurado
  ? createClient(url, clave, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null
