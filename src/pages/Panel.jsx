import { Link } from 'react-router-dom'
import { useDatos } from '../lib/datos.jsx'
import { useSesion } from '../lib/sesion.jsx'
import {
  ESTADOS_PROYECTO, color, dinero, estadoProyecto, rol as rolPorId,
} from '../data/modelo.js'
import {
  avance, entregasEnRiesgo, ingresos, resumen, resumenCobros, vencimientos,
} from '../lib/calculos.js'
import { formatearFecha } from '../lib/formato.js'
import { Barra, Etiqueta } from '../components/Piezas.jsx'

function Kpi({ etiqueta, valor, tono }) {
  return (
    <div className="tarjeta">
      <div className="kpi-etiqueta">{etiqueta}</div>
      <div className="kpi-valor" style={tono ? { color: tono } : undefined}>{valor}</div>
    </div>
  )
}

// Una cuenta puede existir sin pertenecer a ningún espacio: es lo normal al
// registrarse. El mensaje no nombra espacios ni personas, porque quien llega
// aquí no tiene por qué saber con quién más se trabaja.
function SinEspacios() {
  const { correo } = useSesion()
  return (
    <div className="tarjeta vacio">
      <h3>Todavía no tienes acceso a ningún espacio</h3>
      <p>
        Tu cuenta quedó creada con <strong>{correo}</strong>. Quien te invitó
        tiene que darte acceso con ese mismo correo; en cuanto lo haga, aquí
        aparecerán tus proyectos.
      </p>
    </div>
  )
}

export default function Panel() {
  const {
    espacios, proyectos, tareas, entregas, cobros, suscripciones,
    espacioId, espacioActivo, permisosEn, setEspacioId, cargando,
  } = useDatos()

  if (!cargando && espacios.length === 0) {
    return (
      <>
        <div className="encabezado"><div><h1>Panel</h1></div></div>
        <SinEspacios />
      </>
    )
  }

  const r = resumen(proyectos, tareas)
  const proximos = vencimientos(proyectos, tareas).slice(0, 8)
  const solicitudes = tareas.filter((t) => t.status === 'inbox')
  const riesgo = entregasEnRiesgo(entregas)
  const ing = ingresos(suscripciones)
  const cob = resumenCobros(cobros)
  const hayDinero = espacios.some((e) => permisosEn(e.id).verDinero)
  const soloCliente = espacios.length > 0 && espacios.every((e) => permisosEn(e.id).esCliente)
  const nombreProyecto = (id) => proyectos.find((p) => p.id === id)?.name ?? ''

  const activos = [...proyectos]
    .filter((p) => p.status === 'activo')
    .sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'))
    .slice(0, 5)

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Panel</h1>
          <p>
            {soloCliente
              ? `${proyectos.length} proyecto(s)`
              : espacioActivo ? `Espacio: ${espacioActivo.name}` : `${espacios.length} espacio(s)`}
          </p>
        </div>
        <div className="acciones">
          {!soloCliente && <Link className="boton" to="/espacios">Espacios</Link>}
          <Link className="boton primario" to="/proyectos">Ver proyectos</Link>
        </div>
      </div>

      <div className="rejilla kpi" style={{ marginBottom: 18 }}>
        <Kpi etiqueta="Proyectos activos" valor={r.activos} />
        <Kpi etiqueta="Tareas abiertas" valor={r.abiertas} />
        <Kpi etiqueta="Solicitudes" valor={r.solicitudes} />
        {hayDinero ? (
          <>
            <Kpi etiqueta="Ingreso mensual" valor={dinero(ing.mensual, ing.moneda)} />
            <Kpi
              etiqueta="Vencido"
              valor={dinero(cob.montoVencido, cob.moneda)}
              tono={cob.montoVencido > 0 ? 'var(--peligro)' : undefined}
            />
          </>
        ) : (
          <>
            <Kpi etiqueta="Completados" valor={r.completados} />
            <Kpi etiqueta="Espacios" valor={espacios.length} />
          </>
        )}
      </div>

      {(riesgo.length > 0 || (hayDinero && cob.vencidos > 0)) && (
        <section className="tarjeta" style={{ marginBottom: 14, borderColor: 'var(--peligro)' }}>
          <h2 style={{ marginBottom: 10 }}>Requiere atención</h2>
          {riesgo.slice(0, 5).map((e) => (
            <Link
              key={e.id}
              to={`/proyectos/${e.project_id}`}
              className="entre"
              style={{ padding: '7px 0', borderBottom: '1px solid var(--borde)' }}
            >
              <span style={{ minWidth: 0 }}>
                <div className="recorte">{e.title}</div>
                <span className="mini suave">Entrega · {nombreProyecto(e.project_id)}</span>
              </span>
              <span className={`mini ${e.dias < 0 ? 'vencida' : 'proxima'}`}>
                {e.dias < 0 ? `${Math.abs(e.dias)} d. tarde` : e.dias === 0 ? 'Hoy' : `en ${e.dias} d.`}
              </span>
            </Link>
          ))}
          {hayDinero && cob.vencidos > 0 && (
            <Link className="entre" to="/cobros" style={{ padding: '7px 0' }}>
              <span>
                <div>{cob.vencidos} cobro(s) vencido(s)</div>
                <span className="mini suave">Ir a Cobros →</span>
              </span>
              <strong className="mini vencida">{dinero(cob.montoVencido, cob.moneda)}</strong>
            </Link>
          )}
        </section>
      )}

      {!espacioId && !soloCliente && (
        <section className="tarjeta" style={{ marginBottom: 14 }}>
          <h2 style={{ marginBottom: 12 }}>Mis espacios</h2>
          <div className="rejilla cards">
            {espacios.map((e) => {
              const suyos = proyectos.filter((p) => p.space_id === e.id)
              return (
                <Link
                  key={e.id}
                  to={`/espacios/${e.id}`}
                  className="tarjeta tarjeta-enlace"
                  onClick={() => setEspacioId(e.id)}
                >
                  <div className="entre" style={{ marginBottom: 6 }}>
                    <span className="linea">
                      <span className="punto-espacio" style={{ background: color(e.color) }} />
                      <strong>{e.name}</strong>
                    </span>
                    <Etiqueta item={rolPorId(permisosEn(e.id).rol)} />
                  </div>
                  <span className="mini suave">
                    {suyos.length} proyecto(s)
                    {e.archived_at && ' · archivado'}
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
            <h2>Proyectos activos</h2>
            <Link className="mini suave" to="/proyectos">Ver todos →</Link>
          </div>
          {activos.length === 0 ? (
            <p className="suave mini">No hay proyectos activos.</p>
          ) : (
            activos.map((p) => {
              const pct = avance(p, tareas)
              return (
                <Link
                  key={p.id}
                  to={`/proyectos/${p.id}`}
                  style={{ display: 'block', padding: '10px 0', borderBottom: '1px solid var(--borde)' }}
                >
                  <div className="entre">
                    <strong>{p.name}</strong>
                    <Etiqueta item={estadoProyecto(p.status)} />
                  </div>
                  <div className="entre mini suave" style={{ margin: '6px 0' }}>
                    <span>Entrega: {formatearFecha(p.due_date)}</span>
                    <span>{pct}%</span>
                  </div>
                  <Barra valor={pct} />
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
                  <div className="recorte">{v.titulo}</div>
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
          {proyectos.length === 0 ? (
            <p className="suave mini">Sin proyectos.</p>
          ) : (
            ESTADOS_PROYECTO.map((e) => {
              const n = proyectos.filter((p) => p.status === e.id).length
              const pct = Math.round((n / proyectos.length) * 100)
              return (
                <div key={e.id} style={{ marginBottom: 10 }}>
                  <div className="entre mini">
                    <span>{e.nombre}</span>
                    <span className="suave">{n}</span>
                  </div>
                  <div className="barra"><div style={{ width: `${pct}%`, background: e.color }} /></div>
                </div>
              )
            })
          )}
        </section>

        <section className="tarjeta">
          <div className="entre" style={{ marginBottom: 12 }}>
            <h2>Solicitudes sin revisar</h2>
            <Link className="mini suave" to="/bandeja">Ver bandeja →</Link>
          </div>
          {solicitudes.length === 0 ? (
            <p className="suave mini">Nada pendiente de revisar.</p>
          ) : (
            solicitudes.slice(0, 6).map((t) => (
              <Link
                key={t.id}
                to="/bandeja"
                className="entre"
                style={{ padding: '8px 0', borderBottom: '1px solid var(--borde)' }}
              >
                <span className="recorte">{t.title}</span>
                <span className="chip">{t.origin === 'vigilante' ? 'Vigilante' : 'Solicitud'}</span>
              </Link>
            ))
          )}
        </section>
      </div>
    </>
  )
}
