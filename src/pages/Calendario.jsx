import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDatos } from '../lib/datos.jsx'
import { dinero, estadoCobro, estadoEntrega, estadoTarea } from '../data/modelo.js'
import { agenda } from '../lib/calculos.js'
import { formatearFecha, hoyISO } from '../lib/formato.js'
import { Etiqueta } from '../components/Piezas.jsx'

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

const iso = (a, m, d) =>
  `${a}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

// Cuadrícula del mes empezando en lunes.
function celdas(anio, mes) {
  const primero = new Date(anio, mes, 1)
  // getDay(): 0 = domingo. Se corre para que la semana abra en lunes.
  const desfase = (primero.getDay() + 6) % 7
  const dias = new Date(anio, mes + 1, 0).getDate()
  const lista = []
  for (let i = 0; i < desfase; i++) lista.push(null)
  for (let d = 1; d <= dias; d++) lista.push(iso(anio, mes, d))
  while (lista.length % 7 !== 0) lista.push(null)
  return lista
}

const TIPOS = {
  entrega: { nombre: 'Entregas', color: 'var(--c-morado)' },
  tarea: { nombre: 'Tareas', color: 'var(--c-azul)' },
  cobro: { nombre: 'Cobros', color: 'var(--c-verde)' },
}

export default function Calendario() {
  const {
    entregas, tareas, cobros, suscripciones, proyectos, espacioActivo, permisosEn, espacios,
  } = useDatos()

  const hoy = new Date()
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [mes, setMes] = useState(hoy.getMonth())
  const [oculto, setOculto] = useState({})
  const [verCerrados, setVerCerrados] = useState(false)

  const hayDinero = espacios.some((e) => permisosEn(e.id).verDinero)

  const items = useMemo(() => {
    // Los cobros guardan solo el monto: el concepto y el cliente están en la
    // suscripción, así que se traen aquí para que el calendario los muestre.
    const cobrosConNombre = cobros.map((c) => {
      const s = suscripciones.find((x) => x.id === c.subscription_id)
      return { ...c, concepto: s?.concepto, cliente: s?.cliente }
    })
    return agenda({ entregas, tareas, cobros: cobrosConNombre, proyectos })
      .filter((i) => !oculto[i.tipo])
      .filter((i) => verCerrados || !i.cerrado)
  }, [entregas, tareas, cobros, suscripciones, proyectos, oculto, verCerrados])

  const porDia = useMemo(() => {
    const mapa = {}
    for (const i of items) (mapa[i.fecha] ??= []).push(i)
    return mapa
  }, [items])

  const rejilla = celdas(anio, mes)
  const prefijo = `${anio}-${String(mes + 1).padStart(2, '0')}`
  const delMes = items.filter((i) => i.fecha.startsWith(prefijo))
  const hoyStr = hoyISO()

  const mover = (paso) => {
    const d = new Date(anio, mes + paso, 1)
    setAnio(d.getFullYear())
    setMes(d.getMonth())
  }

  const etiquetaDe = (i) =>
    i.tipo === 'entrega' ? estadoEntrega(i.estado)
      : i.tipo === 'tarea' ? estadoTarea(i.estado)
        : estadoCobro(i.estado)

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Calendario</h1>
          <p>
            {espacioActivo ? `Espacio: ${espacioActivo.name}` : 'Todos mis espacios'}
            {' · '}entregas, tareas{hayDinero && ' y cobros'} con fecha
          </p>
        </div>
        <div className="acciones">
          <button className="boton" onClick={() => mover(-1)} aria-label="Mes anterior">←</button>
          <button
            className="boton"
            onClick={() => { setAnio(hoy.getFullYear()); setMes(hoy.getMonth()) }}
          >
            Hoy
          </button>
          <button className="boton" onClick={() => mover(1)} aria-label="Mes siguiente">→</button>
        </div>
      </div>

      <div className="filtros">
        <strong style={{ fontSize: 16, minWidth: 170 }}>
          {MESES[mes]} {anio}
        </strong>
        {Object.entries(TIPOS).map(([id, t]) => {
          if (id === 'cobro' && !hayDinero) return null
          const activo = !oculto[id]
          return (
            <button
              key={id}
              className={`boton sm${activo ? '' : ' apagado'}`}
              onClick={() => setOculto({ ...oculto, [id]: activo })}
            >
              <span className="punto-espacio" style={{ background: t.color, marginRight: 6 }} />
              {t.nombre}
            </button>
          )
        })}
        <label className="linea mini">
          <input
            type="checkbox"
            checked={verCerrados}
            onChange={(e) => setVerCerrados(e.target.checked)}
          />
          Ver lo ya cerrado
        </label>
      </div>

      <section className="tarjeta" style={{ padding: 10 }}>
        <div className="calendario">
          {DIAS.map((d) => <div key={d} className="cal-dia-nombre">{d}</div>)}
          {rejilla.map((fecha, i) => {
            if (!fecha) return <div key={`v${i}`} className="cal-celda vacia" />
            const delDia = porDia[fecha] ?? []
            const numero = Number(fecha.slice(-2))
            return (
              <div key={fecha} className={`cal-celda${fecha === hoyStr ? ' hoy' : ''}`}>
                <div className="cal-numero">{numero}</div>
                {delDia.slice(0, 3).map((i) => (
                  <div
                    key={`${i.tipo}-${i.id}`}
                    className={`cal-item${i.cerrado ? ' cerrado' : ''}`}
                    style={{ borderLeftColor: TIPOS[i.tipo].color }}
                    title={`${i.titulo}${i.contexto ? ` · ${i.contexto}` : ''}`}
                  >
                    {i.tipo === 'cobro' && <strong>{dinero(i.monto, i.moneda)} </strong>}
                    {i.titulo}
                  </div>
                ))}
                {delDia.length > 3 && (
                  <div className="mini suave">+{delDia.length - 3} más</div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section className="tarjeta" style={{ marginTop: 14 }}>
        <h2 style={{ marginBottom: 12 }}>
          {MESES[mes]} en detalle ({delMes.length})
        </h2>
        {delMes.length === 0 ? (
          <p className="suave mini">Nada con fecha en este mes.</p>
        ) : (
          delMes.map((i) => (
            <div
              key={`${i.tipo}-${i.id}`}
              className="entre"
              style={{ padding: '9px 0', borderBottom: '1px solid var(--borde)' }}
            >
              <span className="linea" style={{ minWidth: 0 }}>
                <span className="punto-espacio" style={{ background: TIPOS[i.tipo].color }} />
                <span style={{ minWidth: 0 }}>
                  <div className={i.cerrado ? 'tachado recorte' : 'recorte'}>
                    {i.proyectoId ? (
                      <Link to={`/proyectos/${i.proyectoId}`}>{i.titulo}</Link>
                    ) : i.titulo}
                  </div>
                  <span className="mini suave">
                    {formatearFecha(i.fecha)}{i.contexto && ` · ${i.contexto}`}
                  </span>
                </span>
              </span>
              <span className="linea">
                {i.tipo === 'cobro' && <strong className="mini">{dinero(i.monto, i.moneda)}</strong>}
                <Etiqueta item={etiquetaDe(i)} />
              </span>
            </div>
          ))
        )}
      </section>
    </>
  )
}
