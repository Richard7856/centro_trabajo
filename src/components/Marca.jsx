// El maletín sigue al acento del tema: azul en claro, coral en oscuro. El
// hueco del asa y el broche se pintan con el mismo color del fondo del icono,
// así que basta con cambiar una variable.
export default function Marca({ tam = 32 }) {
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 64 64"
      aria-hidden="true"
      style={{ display: 'block', borderRadius: tam * 0.22, color: 'var(--acento)' }}
    >
      <rect width="64" height="64" rx="14" fill="currentColor" />
      <path
        d="M25 20v-3a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v3"
        fill="none"
        stroke="var(--superficie)"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <rect x="13" y="20" width="38" height="29" rx="4.5" fill="var(--superficie)" />
      <rect x="13" y="30" width="38" height="2.6" fill="currentColor" opacity=".28" />
      <rect x="28.5" y="28" width="7" height="7" rx="2" fill="currentColor" />
    </svg>
  )
}
