// Piezas de interfaz reutilizadas por todas las vistas.

import { colorDeNombre, iniciales } from '../lib/formato.js'

export function Etiqueta({ item }) {
  return (
    <span className="etiqueta" style={{ color: item.color }}>
      <span className="punto" />
      {item.nombre}
    </span>
  )
}

export function Avatar({ nombre, tam = '' }) {
  return (
    <span
      className={`avatar ${tam}`}
      style={{ background: colorDeNombre(nombre) }}
      title={nombre}
    >
      {iniciales(nombre)}
    </span>
  )
}

export function PilaAvatares({ nombres, max = 4 }) {
  const visibles = nombres.slice(0, max)
  const resto = nombres.length - visibles.length
  return (
    <span className="pila">
      {visibles.map((n) => (
        <Avatar key={n} nombre={n} tam="sm" />
      ))}
      {resto > 0 && (
        <span className="avatar sm" style={{ background: '#6b7280' }}>
          +{resto}
        </span>
      )}
    </span>
  )
}

export function Barra({ valor }) {
  return (
    <div className="barra" role="progressbar" aria-valuenow={valor} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${Math.max(0, Math.min(100, valor))}%` }} />
    </div>
  )
}

export function Vacio({ titulo, texto, accion }) {
  return (
    <div className="tarjeta vacio">
      <h3>{titulo}</h3>
      <p>{texto}</p>
      {accion}
    </div>
  )
}

export function Modal({ titulo, children, onCerrar }) {
  return (
    <div
      className="velo"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar()
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal-cabecera">
          <h2>{titulo}</h2>
          <button className="boton sm" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Campo({ etiqueta, children }) {
  return (
    <div className="campo">
      <label>{etiqueta}</label>
      {children}
    </div>
  )
}
