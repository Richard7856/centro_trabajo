import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDatos } from '../lib/datos.jsx'
import { ROLES, color, rol as rolPorId } from '../data/modelo.js'
import { Etiqueta, Modal, Vacio } from '../components/Piezas.jsx'
import FormularioEspacio from '../components/FormularioEspacio.jsx'

export default function Espacios() {
  const { espacios, todosLosProyectos, miembrosDe, permisosEn, crearEspacio, setEspacioId } = useDatos()
  const [creando, setCreando] = useState(false)

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Espacios</h1>
          <p>
            Cada espacio es independiente: quien pertenece a uno no ve los demás ni
            sabe que existen. Lo decide la base, no la pantalla.
          </p>
        </div>
        <button className="boton primario" onClick={() => setCreando(true)}>+ Nuevo espacio</button>
      </div>

      {espacios.length === 0 ? (
        <Vacio titulo="Sin espacios" texto="No perteneces a ningún espacio todavía." />
      ) : (
        <div className="rejilla cards">
          {espacios.map((e) => {
            const p = permisosEn(e.id)
            return (
              <Link
                key={e.id}
                to={`/espacios/${e.id}`}
                className="tarjeta tarjeta-enlace"
                onClick={() => setEspacioId(e.id)}
              >
                <div className="entre" style={{ marginBottom: 8 }}>
                  <span className="linea">
                    <span className="punto-espacio" style={{ background: color(e.color) }} />
                    <h3>{e.name}</h3>
                  </span>
                  <Etiqueta item={rolPorId(p.rol)} />
                </div>
                <div className="entre mini suave">
                  <span>
                    {todosLosProyectos.filter((x) => x.space_id === e.id).length} proyecto(s) ·{' '}
                    {miembrosDe(e.id).length} miembro(s)
                  </span>
                  {e.archived_at && <span className="chip">Archivado</span>}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <section className="tarjeta" style={{ marginTop: 18 }}>
        <h2 style={{ marginBottom: 10 }}>Qué puede hacer cada rol</h2>
        <div className="desplaza">
          <table className="tabla matriz">
            <thead>
              <tr>
                <th>Rol</th><th>Alcance</th><th>Proyectos</th>
                <th>Pedir</th><th>Agendar y cerrar</th><th>Miembros</th>
              </tr>
            </thead>
            <tbody>
              {ROLES.map((r) => {
                const marca = (v) => <span className={v ? 'si' : 'no'}>{v ? '✓' : '—'}</span>
                const mando = r.id === 'owner' || r.id === 'socio'
                return (
                  <tr key={r.id}>
                    <td><Etiqueta item={r} /></td>
                    <td className="suave">{r.descripcion}</td>
                    <td>{marca(mando)}</td>
                    <td>{marca(true)}</td>
                    <td>{marca(mando)}</td>
                    <td>{marca(r.id === 'owner')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mini suave" style={{ marginBottom: 0 }}>
          Todavía no existe el rol de cliente: un invitado alcanza todos los proyectos
          del espacio. Para que vea solo el suyo hace falta agregarlo en la base.
        </p>
      </section>

      {creando && (
        <Modal titulo="Nuevo espacio" onCerrar={() => setCreando(false)}>
          <FormularioEspacio
            onCancelar={() => setCreando(false)}
            onGuardar={async (e) => {
              await crearEspacio(e)
              setCreando(false)
            }}
          />
        </Modal>
      )}
    </>
  )
}
