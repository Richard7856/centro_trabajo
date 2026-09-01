import { Link } from 'react-router-dom'
import { useAlmacen } from '../lib/almacen.jsx'
import { ESTADOS_PROYECTO, estadoProyecto, rol as rolPorId } from '../data/modelo.js'
import { avanceProyecto, resumen, vencimientos } from '../lib/calculos.js'
import { formatearFecha } from '../lib/formato.js'
import { Barra, Etiqueta, Vacio } from '../components/Piezas.jsx'

function Kpi({ etiqueta, valor }) {
  return (
    <div className="tarjeta">
      <div className="kpi-etiqueta">{etiqueta}</div>
      <div className="kpi-valor">{valor}</div>
    </div>
  )
}

export default function Panel() {
  const {
    usuario, misEspacios, misProyectos, misTareas, espacioId, espacioActivo,
    permisosEn, setEspacioId,
  } = useAlmacen()

  const r = resumen(misProyectos, misTareas)
  const proximos = vencimientos(misProyectos, misTareas).slice(0, 8)
  const solicitudes = misTareas.filter((t) => t.esSolicitud && t.estado !== 'completada')

  const activos = [...misProyectos]
    .filter((p) => p.estado === 'en_progreso' || p.estado === 'planeado')
    .sort((a, b) => (a.fechaFin || '9999').localeCompare(b.fechaFin || '9999'))
    .slice(0, 5)

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Panel</h1>
          <p>
            {usuario ? `${usuario.nombre} · ` : ''}
            {espacioActivo ? `Espacio: ${espacioActivo.nombre}` : `${misEspacios.length} espacio(s)`}
          </p>
        </div>
        <div className="acciones">
          <Link className="boton" to="/espacios">Espacios</Link>
          <Link className="boton primario" to="/proyectos">Ver proyectos</Link>
        </div>
      </div>

      {misProyectos.length === 0 && (
        <div className="aviso">
          <span>
            Los espacios ya están creados. El siguiente paso es dar de alta los proyectos
            y asignarlos a cada uno.
          </span>
          <Link className="boton sm" to="/proyectos">Crear proyecto</Link>
        </div>
      )}

      <div className="rejilla kpi" style={{ marginBottom: 18 }}>
        <Kpi etiqueta="Proyectos activos" valor={r.activos} />
        <Kpi etiqueta="En progreso" valor={r.enProgreso} />
        <Kpi etiqueta="Completados" valor={r.completados} />
        <Kpi etiqueta="Tareas abiertas" valor={r.tareasAbiertas} />
        <Kpi etiqueta="Solicitudes" valor={solicitudes.length} />
      </div>

      {!espacioId && misEspacios.length > 0 && (
        <section className="tarjeta" style={{ marginBottom: 14 }}>
          <h2 style={{ marginBottom: 12 }}>Mis espacios</h2>
          <div className="rejilla cards">
            {misEspacios.map((e) => {
              const suyos = misProyectos.filter((p) => p.espacioId === e.id)
              const activosEsp = suyos.filter((p) => p.estado === 'en_progreso').length
              return (
                <Link
                  key={e.id}
                  to={`/espacios/${e.id}`}
                  className="tarjeta tarjeta-enlace"
                  onClick={() => setEspacioId(e.id)}
                >
                  <div className="entre" style={{ marginBottom: 6 }}>
                    <span className="linea">
                      <span className="punto-espacio" style={{ background: e.color }} />
                      <strong>{e.nombre}</strong>
                    </span>
                    <Etiqueta item={rolPorId(permisosEn(e.id).rol)} />
                  </div>
                  <span className="mini suave">
                    {suyos.length} proyecto(s) · {activosEsp} en progreso
                  </span>
                </Link>
              )
            })}
          </div>
        </section>
      )}

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
              const avance = avanceProyecto(p, misTareas)
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
              <div
                key={`${v.tipo}-${v.id}`}
                className="entre"
                style={{ padding: '7px 0', borderBottom: '1px solid var(--borde)' }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v.titulo}
                  </div>
                  <span className="mini suave">
                    {v.tipo === 'proyecto' ? 'Proyecto' : 'Tarea'} · {formatearFecha(v.fecha)}
                  </span>
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
          {misProyectos.length === 0 ? (
            <p className="suave mini">Sin proyectos registrados.</p>
          ) : (
            ESTADOS_PROYECTO.map((e) => {
              const n = misProyectos.filter((p) => p.estado === e.id).length
              const pct = Math.round((n / misProyectos.length) * 100)
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
          <h2 style={{ marginBottom: 12 }}>Solicitudes de clientes</h2>
          {solicitudes.length === 0 ? (
            <p className="suave mini">Sin solicitudes abiertas.</p>
          ) : (
            solicitudes.slice(0, 8).map((t) => {
              const p = misProyectos.find((x) => x.id === t.proyectoId)
              return (
                <Link
                  key={t.id}
                  to={`/proyectos/${t.proyectoId}`}
                  className="entre"
                  style={{ padding: '8px 0', borderBottom: '1px solid var(--borde)' }}
                >
                  <span style={{ minWidth: 0 }}>
                    <div>{t.titulo}</div>
                    <span className="mini suave">{p?.nombre ?? 'Proyecto'}</span>
                  </span>
                  <span className="chip">Solicitud</span>
                </Link>
              )
            })
          )}
        </section>
      </div>

      {misEspacios.length === 0 && (
        <Vacio titulo="Sin espacios" texto="No perteneces a ningún espacio todavía." />
      )}
    </>
  )
}
