import { useState } from 'react'
import { useDatos } from '../lib/datos.jsx'
import { useSesion } from '../lib/sesion.jsx'
import { supabase } from '../lib/supabase.js'

export default function Ajustes() {
  const { espacios, todosLosProyectos, todasLasTareas, personas, recargar } = useDatos()
  const { perfil, correo, salir } = useSesion()
  const [nombre, setNombre] = useState(perfil?.full_name ?? '')
  const [aviso, setAviso] = useState(null)

  const url = import.meta.env.VITE_SUPABASE_URL ?? ''
  const proyectoSupabase = url.replace('https://', '').split('.')[0]

  function avisar(texto, error = false) {
    setAviso({ texto, error })
    setTimeout(() => setAviso(null), 4000)
  }

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Ajustes</h1>
          <p>{correo}</p>
        </div>
        <button className="boton" onClick={salir}>Cerrar sesión</button>
      </div>

      {aviso && (
        <div className={`aviso${aviso.error ? ' alerta' : ''}`}>{aviso.texto}</div>
      )}

      <div className="rejilla dos">
        <section className="tarjeta">
          <h2 style={{ marginBottom: 10 }}>Tu perfil</h2>
          <div className="campo">
            <label>Nombre</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <button
            className="boton primario"
            onClick={async () => {
              const { error } = await supabase
                .from('profiles')
                .update({ full_name: nombre.trim() })
                .eq('id', perfil.id)
              if (error) return avisar(error.message, true)
              await recargar()
              avisar('Nombre actualizado.')
            }}
          >
            Guardar
          </button>
        </section>

        <section className="tarjeta">
          <h2 style={{ marginBottom: 10 }}>Lo que alcanzas</h2>
          <table className="tabla">
            <tbody>
              <tr><td className="suave">Espacios</td><td>{espacios.length}</td></tr>
              <tr><td className="suave">Proyectos</td><td>{todosLosProyectos.length}</td></tr>
              <tr><td className="suave">Tareas</td><td>{todasLasTareas.length}</td></tr>
              <tr><td className="suave">Personas visibles</td><td>{personas.length}</td></tr>
            </tbody>
          </table>
          <p className="mini suave" style={{ marginBottom: 0 }}>
            Estos números son lo que la base te entrega a ti. Otra cuenta vería otros.
          </p>
        </section>

        <section className="tarjeta">
          <h2 style={{ marginBottom: 10 }}>Dónde viven los datos</h2>
          <table className="tabla">
            <tbody>
              <tr><td className="suave">Proyecto Supabase</td><td>{proyectoSupabase || '—'}</td></tr>
              <tr><td className="suave">Aislamiento</td><td>Políticas por fila (RLS)</td></tr>
            </tbody>
          </table>
          <p className="mini suave" style={{ marginBottom: 0 }}>
            Ya no se guarda nada en este navegador: todo está en la base y cada
            consulta se filtra por quién eres.
          </p>
        </section>

        <section className="tarjeta">
          <h2 style={{ marginBottom: 10 }}>Commits privados</h2>
          <p className="mini suave" style={{ marginBottom: 0 }}>
            Los commits de un repositorio público se leen sin más. Para uno privado
            hace falta un token, y ponerlo en el navegador lo dejaría a la vista de
            quien abra la sesión: se resuelve moviendo esa llamada al servidor, que
            es el siguiente paso pendiente.
          </p>
        </section>
      </div>
    </>
  )
}
