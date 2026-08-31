import { Link } from 'react-router-dom'
import { useAlmacen } from '../lib/almacen.jsx'
import { ESTADOS_PROYECTO, estadoProyecto, prioridad } from '../data/modelo.js'
import { avanceProyecto, cargaDeColaborador, resumen, vencimientos } from '../lib/calculos.js'
import { formatearFecha } from '../lib/formato.js'
import { Avatar, Barra, Etiqueta, Vacio } from '../components/Piezas.jsx'

function Kpi({ etiqueta, valor }) {
  return (
    <div className="tarjeta">
      <div className="kpi-etiqueta">{etiqueta}</div>
      <div className="kpi-valor">{valor}</div>
    </div>
  )
}

export default function Panel() {
  const { proyectos, colaboradores, tareas, demo } = useAlmacen()
  const r = resumen(proyectos, tareas)
  const proximos = vencimientos(proyectos, tareas).slice(0, 8)

  const activos = [...proyectos]
    .filter((p) => p.estado === 'en_progreso' || p.estado === 'planeado')
    .sort((a, b) => (a.fechaFin || '9999').localeCompare(b.fechaFin || '9999'))
    .slice(0, 5)

  const carga = colaboradores
    .map((c) => ({ ...c, ...cargaDeColaborador(c.id, proyectos, tareas) }))
    .sort((a, b) => b.proyectosActivos - a.proyectosActivos || b.tareasAbiertas - a.tareasAbiertas)
    .slice(0, 6)

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Panel</h1>
          <p>Vista general de proyectos, equipo y fechas próximas.</p>
        </div>
        <div className="acciones">
          <Link className="boton" to="/colaboradores">Colaboradores</Link>
          <Link className="boton primario" to="/proyectos">Ver proyectos</Link>
        </div>
      </div>

      {demo && (
        <div className="aviso">
          <span>Estás viendo datos de ejemplo. Cárgalos reales o límpialos desde Ajustes.</span>
          <Link className="boton sm" to="/ajustes">Ir a Ajustes</Link>
        </div>
      )}

      <div className="rejilla kpi" style={{ marginBottom: 18 }}>
        <Kpi etiqueta="Proyectos activos" valor={r.activos} />
        <Kpi etiqueta="En progreso" valor={r.enProgreso} />
        <Kpi etiqueta="Completados" valor={r.completados} />
        <Kpi etiqueta="Tareas abiertas" valor={r.tareasAbiertas} />
        <Kpi etiqueta="Colaboradores" valor={colaboradores.length} />
      </div>

      <div className="rejilla dos">
        <section className="tarjeta">
          <div className="entre" style={{ marginBottom: 12 }}>
            <h2>Proyectos en curso</h2>
            <Link className="mini suave" to="/proyectos">Ver todos →</Link>
          </div>

          {activos.length === 0 ? (
            <p className="suave mini">No hay proyectos planeados ni en progreso.</p>
          ) : (
            activos.map((p) => {
              const avance = avanceProyecto(p, tareas)
              return (
                <Link
                  key={p.id}
                  to={`/proyectos/${p.id}`}
                  style={{ display: 'block', padding: '10px 0', borderBottom: '1px solid var(--borde)' }}
                >
                  <div className="entre">
                    <strong>{p.nombre}</strong>
                    <Etiqueta item={estadoProyecto(p.estado)} />
                  </div>
                  <div className="entre mini suave" style={{ margin: '6px 0' }}>
                    <span>Entrega: {formatearFecha(p.fechaFin)}</span>
                    <span>{avance}%</span>
                  </div>
                  <Barra valor={avance} />
                </Link>
              )
            })
          )}
        </section>

        <section className="tarjeta">
          <h2 style={{ marginBottom: 12 }}>Próximos vencimientos</h2>
          {proximos.length === 0 ? (
            <p className="suave mini">Nada vence en los próximos 14 días.</p>
          ) : (
            proximos.map((v) => (
              <div key={`${v.tipo}-${v.id}`} className="entre" style={{ padding: '7px 0', borderBottom: '1px solid var(--borde)' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v.titulo}
                  </div>
                  <span className="mini suave">{v.tipo === 'proyecto' ? 'Proyecto' : 'Tarea'} · {formatearFecha(v.fecha)}</span>
                </div>
                <span className={`mini ${v.dias < 0 ? 'vencida' : 'proxima'}`}>
                  {v.dias < 0 ? `${Math.abs(v.dias)} d. tarde` : v.dias === 0 ? 'Hoy' : `en ${v.dias} d.`}
                </span>
              </div>
            ))
          )}
        </section>

        <section className="tarjeta">
          <h2 style={{ marginBottom: 12 }}>Proyectos por estado</h2>
          {proyectos.length === 0 ? (
            <p className="suave mini">Sin proyectos registrados.</p>
          ) : (
            ESTADOS_PROYECTO.map((e) => {
              const n = proyectos.filter((p) => p.estado === e.id).length
              const pct = Math.round((n / proyectos.length) * 100)
              return (
                <div key={e.id} style={{ marginBottom: 10 }}>
                  <div className="entre mini">
                    <span>{e.nombre}</span>
                    <span className="suave">{n}</span>
                  </div>
                  <div className="barra">
                    <div style={{ width: `${pct}%`, background: e.color }} />
                  </div>
                </div>
              )
            })
          )}
        </section>

        <section className="tarjeta">
          <div className="entre" style={{ marginBottom: 12 }}>
            <h2>Carga del equipo</h2>
            <Link className="mini suave" to="/colaboradores">Ver todos →</Link>
          </div>
          {carga.length === 0 ? (
            <Vacio
              titulo="Sin colaboradores"
              texto="Agrega los perfiles del equipo para repartir los proyectos."
            />
          ) : (
            carga.map((c) => (
              <Link
                key={c.id}
                to={`/colaboradores/${c.id}`}
                className="entre"
                style={{ padding: '8px 0', borderBottom: '1px solid var(--borde)' }}
              >
                <span className="linea">
                  <Avatar nombre={c.nombre} tam="sm" />
                  <span>
                    <div>{c.nombre}</div>
                    <span className="mini suave">{c.rol || 'Sin rol'}</span>
                  </span>
                </span>
                <span className="mini suave" style={{ textAlign: 'right' }}>
                  <div>{c.proyectosActivos} proyecto(s) activo(s)</div>
                  <div>{c.tareasAbiertas} tarea(s) abierta(s)</div>
                </span>
              </Link>
            ))
          )}
        </section>
      </div>

      {proyectos.length > 0 && (
        <section className="tarjeta" style={{ marginTop: 14 }}>
          <h2 style={{ marginBottom: 10 }}>Prioridades</h2>
          <div className="envuelve">
            {['alta', 'media', 'baja'].map((id) => (
              <span key={id} className="chip">
                <Etiqueta item={prioridad(id)} />{' '}
                {proyectos.filter((p) => p.prioridad === id).length}
              </span>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
