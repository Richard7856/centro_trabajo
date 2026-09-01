import { useState } from 'react'
import { ESTADOS_ENTREGA, estadoEntrega } from '../data/modelo.js'
import { diasRestantes, formatearFecha } from '../lib/formato.js'
import { avanceEntregas } from '../lib/calculos.js'
import { Barra, Etiqueta } from './Piezas.jsx'

// Los pasos del proyecto: lo que se le promete al cliente y cuándo.
// Distinto de las tareas, que son el trabajo interno para llegar ahí.
export default function Entregas({ entregas, permisos, onCrear, onCambiar, onEliminar }) {
  const [titulo, setTitulo] = useState('')
  const [fecha, setFecha] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const avance = avanceEntregas(entregas)

  async function agregar(e) {
    e.preventDefault()
    if (!titulo.trim()) return
    setOcupado(true)
    try {
      await onCrear({
        title: titulo.trim(),
        due_date: fecha || null,
        position: entregas.length,
      })
      setTitulo('')
      setFecha('')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <>
      {avance && (
        <>
          <div className="entre mini suave" style={{ marginBottom: 5 }}>
            <span>Entregas cumplidas</span>
            <span>{avance.hechas} de {avance.total}</span>
          </div>
          <Barra valor={avance.porcentaje} />
        </>
      )}

      {permisos.gestionarEntregas && (
        <form onSubmit={agregar} className="filtros" style={{ margin: '14px 0' }}>
          <input
            style={{ flex: 1, minWidth: 200 }}
            placeholder="Nueva entrega… (ej. Entrega 1: alta de inquilinos)"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <button className="boton primario" type="submit" disabled={ocupado}>
            {ocupado ? 'Agregando…' : 'Agregar'}
          </button>
        </form>
      )}

      {entregas.length === 0 ? (
        <p className="suave mini" style={{ marginBottom: 0 }}>
          Sin entregas todavía.
          {permisos.gestionarEntregas && ' Agrega los pasos que le vas a ir mostrando al cliente.'}
        </p>
      ) : (
        <ol className="pasos">
          {entregas.map((e, i) => {
            const d = diasRestantes(e.due_date)
            const abierta = e.status === 'planeada' || e.status === 'en_progreso'
            return (
              <li key={e.id} className={`paso ${abierta && d !== null && d < 0 ? 'atrasado' : ''}`}>
                <span className="paso-numero">{i + 1}</span>
                <span className="paso-cuerpo">
                  <div className="entre">
                    <strong>{e.title}</strong>
                    {permisos.gestionarEntregas ? (
                      <span className="linea">
                        <select
                          className="mini-select"
                          value={e.status}
                          onChange={(ev) => onCambiar(e, { status: ev.target.value })}
                        >
                          {ESTADOS_ENTREGA.map((x) => (
                            <option key={x.id} value={x.id}>{x.nombre}</option>
                          ))}
                        </select>
                        <button
                          className="boton sm"
                          title={e.visible_cliente ? 'Visible para el cliente' : 'Oculta al cliente'}
                          onClick={() => onCambiar(e, { visible_cliente: !e.visible_cliente })}
                        >
                          {e.visible_cliente ? '👁' : '🚫'}
                        </button>
                        <button className="boton sm peligro" onClick={() => onEliminar(e)}>✕</button>
                      </span>
                    ) : (
                      <Etiqueta item={estadoEntrega(e.status)} />
                    )}
                  </div>

                  {e.description && <p className="mini suave" style={{ margin: '4px 0' }}>{e.description}</p>}

                  <span className="mini suave">
                    {e.due_date ? formatearFecha(e.due_date) : 'sin fecha'}
                    {abierta && d !== null && d <= 14 && (
                      <span className={d < 0 ? 'vencida' : 'proxima'}>
                        {d < 0 ? ` · ${Math.abs(d)} días de retraso` : d === 0 ? ' · es hoy' : ` · en ${d} días`}
                      </span>
                    )}
                    {permisos.gestionarEntregas && !e.visible_cliente && (
                      <span className="chip" style={{ marginLeft: 6 }}>Interna</span>
                    )}
                  </span>
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </>
  )
}
