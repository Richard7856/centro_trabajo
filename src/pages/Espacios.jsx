import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAlmacen } from '../lib/almacen.jsx'
import { ROLES, rol as rolPorId } from '../data/modelo.js'
import { Etiqueta, Modal, Vacio } from '../components/Piezas.jsx'
import FormularioEspacio from '../components/FormularioEspacio.jsx'

export default function Espacios() {
  const {
    misEspacios, misProyectosTodos, miembros, colaboradores,
    usuarioId, guardarEspacio, guardarMiembro, permisosEn, setEspacioId,
  } = useAlmacen()
  const [creando, setCreando] = useState(false)

  // Solo un dueño puede abrir espacios nuevos; se identifica por tener ese rol
  // en al menos uno de los que ya administra.
  const puedeCrear = misEspacios.some((e) => permisosEn(e.id).esDueno) || misEspacios.length === 0

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Espacios</h1>
          <p>
            Cada espacio es independiente: quien pertenece a uno no ve los demás ni
            sabe que existen.
          </p>
        </div>
        {puedeCrear && (
          <button className="boton primario" onClick={() => setCreando(true)}>+ Nuevo espacio</button>
        )}
      </div>

      {misEspacios.length === 0 ? (
        <Vacio titulo="Sin espacios" texto="No perteneces a ningún espacio todavía." />
      ) : (
        <div className="rejilla cards">
          {misEspacios.map((e) => {
            const p = permisosEn(e.id)
            const gente = miembros.filter((m) => m.espacioId === e.id)
            const proyectos = misProyectosTodos.filter((x) => x.espacioId === e.id)
            return (
              <Link
                key={e.id}
                to={`/espacios/${e.id}`}
                className="tarjeta tarjeta-enlace"
                onClick={() => setEspacioId(e.id)}
              >
                <div className="entre" style={{ marginBottom: 8 }}>
                  <span className="linea">
                    <span className="punto-espacio" style={{ background: e.color }} />
                    <h3>{e.nombre}</h3>
                  </span>
                  <Etiqueta item={rolPorId(p.rol)} />
                </div>

                {e.descripcion && <p className="mini suave" style={{ marginTop: 0 }}>{e.descripcion}</p>}

                <div className="entre mini suave" style={{ marginTop: 12 }}>
                  <span>{proyectos.length} proyecto(s)</span>
                  <span>{p.verEquipoCompleto ? `${gente.length} miembro(s)` : ''}</span>
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
                <th>Rol</th>
                <th>Alcance</th>
                <th>Crear proyectos</th>
                <th>Levantar tareas</th>
                <th>Cerrar tareas</th>
                <th>Miembros</th>
              </tr>
            </thead>
            <tbody>
              {ROLES.map((r) => {
                const marca = (v) => <span className={v ? 'si' : 'no'}>{v ? '✓' : '—'}</span>
                const mando = r.id === 'dueno' || r.id === 'socio'
                return (
                  <tr key={r.id}>
                    <td><Etiqueta item={r} /></td>
                    <td className="suave">{r.descripcion}</td>
                    <td>{marca(mando)}</td>
                    <td>{marca(true)}</td>
                    <td>{marca(mando || r.id === 'colaborador')}</td>
                    <td>{marca(r.id === 'dueno')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {creando && (
        <Modal titulo="Nuevo espacio" onCerrar={() => setCreando(false)}>
          <FormularioEspacio
            onCancelar={() => setCreando(false)}
            onGuardar={(e) => {
              guardarEspacio(e)
              // Quien lo crea queda como dueño; si no, nadie podría entrar.
              guardarMiembro({
                id: `mbr_${e.id}_${usuarioId}`,
                espacioId: e.id,
                colaboradorId: usuarioId,
                rolEspacio: 'dueno',
              })
              setCreando(false)
            }}
          />
        </Modal>
      )}
    </>
  )
}
