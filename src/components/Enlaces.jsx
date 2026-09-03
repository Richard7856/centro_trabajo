// Los enlaces del proyecto: el sitio publicado, el panel, una demo. Es lo
// primero que quiere un socio o un cliente, antes que cualquier detalle.
export default function Enlaces({ enlaces = [], despliegue }) {
  const lista = [...enlaces]

  // El último despliegue conocido se ofrece también, si no está ya puesto a mano.
  if (despliegue?.url && !lista.some((e) => (e.url ?? '').includes(despliegue.url))) {
    lista.push({ titulo: 'Última versión publicada', url: `https://${despliegue.url}` })
  }

  if (lista.length === 0) {
    return <p className="suave mini" style={{ marginBottom: 0 }}>Sin enlaces todavía.</p>
  }

  return (
    <div className="enlaces">
      {lista.map((e, i) => (
        <a
          key={`${e.url}-${i}`}
          className="enlace-tarjeta"
          href={e.url}
          target="_blank"
          rel="noreferrer"
        >
          {e.titulo || e.url}
          <span className="flecha">↗</span>
        </a>
      ))}
    </div>
  )
}
