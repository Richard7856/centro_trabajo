import { useEffect, useState } from 'react'
import { useDatos } from '../lib/datos.jsx'
import {
  CADENCIAS, ESTADOS_COBRO, anualizado, dinero,
  estadoCobro, estadoSuscripcion,
} from '../data/modelo.js'
import { ingresos, resumenCobros } from '../lib/calculos.js'
import { diasRestantes, formatearFecha } from '../lib/formato.js'
import { Etiqueta, Modal, Vacio } from '../components/Piezas.jsx'
import FormularioSuscripcion from '../components/FormularioSuscripcion.jsx'

function Kpi({ etiqueta, valor, tono }) {
  return (
    <div className="tarjeta">
      <div className="kpi-etiqueta">{etiqueta}</div>
      <div className="kpi-valor" style={tono ? { color: tono } : undefined}>{valor}</div>
    </div>
  )
}

export default function Cobros() {
  const {
    suscripciones, cobros, espacios, proyectos, espacioId, espacioActivo, permisosEn,
    crearSuscripcion, guardarSuscripcion, eliminarSuscripcion, guardarCobro, refrescarCobros,
  } = useDatos()

  const [editando, setEditando] = useState(null)
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')

  const espaciosConDinero = espacios.filter((e) => permisosEn(e.id).verDinero)

  // Al abrir la pantalla se extiende el calendario y se marcan los vencidos.
  useEffect(() => {
    if (suscripciones.length > 0) refrescarCobros().catch((e) => setError(e.message))
    // Solo al montar: refrescarCobros ya recarga los datos por su cuenta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (espaciosConDinero.length === 0) {
    return (
      <Vacio
        titulo="Sin acceso a cobros"
        texto="Solo el dueño y los socios de un espacio ven sus suscripciones."
      />
    )
  }

  const ing = ingresos(suscripciones)
  const res = resumenCobros(cobros)
  const hoy = new Date().toISOString().slice(0, 10)

  const agenda = cobros
    .filter((c) => c.status === 'pendiente' || c.status === 'vencido')
    .slice(0, 24)

  const nombreSub = (id) => suscripciones.find((s) => s.id === id)
  const intentar = async (accion) => {
    setError('')
    try { await accion() } catch (e) { setError(e.message) }
  }

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Cobros</h1>
          <p>
            {espacioActivo ? `Espacio: ${espacioActivo.name}` : 'Todos mis espacios'}
            {' · '}{suscripciones.length} suscripción(es)
          </p>
        </div>
        <button className="boton primario" onClick={() => setCreando(true)}>+ Nueva suscripción</button>
      </div>

      {error && <div className="aviso alerta">{error}</div>}

      <div className="rejilla kpi" style={{ marginBottom: 18 }}>
        <Kpi etiqueta="Ingreso mensual" valor={dinero(ing.mensual, ing.moneda)} />
        <Kpi etiqueta="Al año" valor={dinero(ing.anual, ing.moneda)} />
        <Kpi etiqueta="Activas" valor={ing.activas} />
        <Kpi
          etiqueta="Vencido"
          valor={dinero(res.montoVencido, res.moneda)}
          tono={res.montoVencido > 0 ? 'var(--peligro)' : undefined}
        />
        <Kpi etiqueta="Por cobrar (30 d)" valor={dinero(res.montoProximo, res.moneda)} />
      </div>

      <section className="tarjeta" style={{ marginBottom: 14 }}>
          <h2 style={{ marginBottom: 12 }}>Suscripciones</h2>
          {suscripciones.length === 0 ? (
            <p className="suave mini">
              Ninguna todavía. Agrega la primera y se genera solo su calendario de cobros.
            </p>
          ) : (
            <div className="desplaza">
              <table className="tabla acciones-fijas">
                <thead>
                  <tr>
                    <th>Concepto</th><th>Cliente</th><th>Monto</th>
                    <th>Cada</th><th>Día</th><th>Estado</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {suscripciones.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{s.concepto}</div>
                        <span className="mini suave">{dinero(anualizado(s), s.currency)} al año</span>
                      </td>
                      <td className="suave">{s.cliente || '—'}</td>
                      <td>{dinero(s.amount, s.currency)}</td>
                      <td className="suave">{CADENCIAS.find((c) => c.id === s.cadence)?.nombre}</td>
                      <td className="suave">{s.billing_day}</td>
                      <td><Etiqueta item={estadoSuscripcion(s.status)} /></td>
                      <td>
                        <span className="linea">
                          <button className="boton sm" onClick={() => setEditando(s)}>Editar</button>
                          <button
                            className="boton sm peligro"
                            onClick={() =>
                              confirm(`¿Eliminar "${s.concepto}" y todos sus cobros?`) &&
                              intentar(() => eliminarSuscripcion(s.id))
                            }
                          >
                            ✕
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </section>

      <div className="rejilla dos">
        <section className="tarjeta">
          <div className="entre" style={{ marginBottom: 12 }}>
            <h2>Calendario de cobro</h2>
            <button className="boton sm" onClick={() => intentar(refrescarCobros)}>Actualizar</button>
          </div>

          {agenda.length === 0 ? (
            <p className="suave mini">Nada pendiente de cobrar.</p>
          ) : (
            agenda.map((c) => {
              const d = diasRestantes(c.due_date)
              const sub = nombreSub(c.subscription_id)
              return (
                <div key={c.id} className="entre" style={{ padding: '9px 0', borderBottom: '1px solid var(--borde)' }}>
                  <span style={{ minWidth: 0 }}>
                    <div className="recorte">{sub?.concepto ?? 'Cobro'}</div>
                    <span className="mini suave">
                      {sub?.cliente ? `${sub.cliente} · ` : ''}{formatearFecha(c.due_date)}
                      {c.status === 'pendiente' && d !== null && d <= 7 && (
                        <span className={d < 0 ? 'vencida' : 'proxima'}>
                          {d < 0 ? ' · vencido' : d === 0 ? ' · hoy' : ` · en ${d} d.`}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="linea">
                    <strong className="mini">{dinero(c.amount, c.currency)}</strong>
                    <select
                      className="mini-select"
                      value={c.status}
                      onChange={(e) =>
                        intentar(() =>
                          guardarCobro({
                            id: c.id,
                            status: e.target.value,
                            paid_at: e.target.value === 'pagado' ? new Date().toISOString() : null,
                          }),
                        )
                      }
                    >
                      {ESTADOS_COBRO.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
                    </select>
                  </span>
                </div>
              )
            })
          )}
        </section>

        {cobros.some((c) => c.status === 'pagado') && (
        <section className="tarjeta">
          <h2 style={{ marginBottom: 12 }}>Cobrado</h2>
          <p style={{ marginTop: 0 }}>
            <strong style={{ fontSize: 20 }}>{dinero(res.cobrado, res.moneda)}</strong>{' '}
            <span className="mini suave">en {cobros.filter((c) => c.status === 'pagado').length} cobro(s)</span>
          </p>
          <div className="desplaza">
            <table className="tabla">
              <thead><tr><th>Concepto</th><th>Fecha</th><th>Monto</th></tr></thead>
              <tbody>
                {cobros.filter((c) => c.status === 'pagado').slice(-10).reverse().map((c) => (
                  <tr key={c.id}>
                    <td>{nombreSub(c.subscription_id)?.concepto ?? '—'}</td>
                    <td className="suave">{formatearFecha(c.due_date)}</td>
                    <td>{dinero(c.amount, c.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        )}
      </div>

      {(creando || editando) && (
        <Modal
          titulo={editando ? 'Editar suscripción' : 'Nueva suscripción'}
          onCerrar={() => { setCreando(false); setEditando(null) }}
        >
          <FormularioSuscripcion
            inicial={editando}
            espacios={espaciosConDinero}
            proyectos={proyectos}
            espacioPorDefecto={espacioId}
            onCancelar={() => { setCreando(false); setEditando(null) }}
            onGuardar={async (s) => {
              if (editando) await guardarSuscripcion(s)
              else await crearSuscripcion(s)
              setCreando(false)
              setEditando(null)
            }}
          />
        </Modal>
      )}
    </>
  )
}
