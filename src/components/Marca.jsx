export default function Marca({ tam = 32 }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 64 64" aria-hidden="true" style={{ display: 'block', borderRadius: tam * 0.22 }}>
      <rect width="64" height="64" rx="14" fill="#2563eb" />
      <path
        d="M25 20v-3a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v3"
        fill="none"
        stroke="#fff"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <rect x="13" y="20" width="38" height="29" rx="4.5" fill="#fff" />
      <rect x="13" y="30" width="38" height="2.6" fill="#2563eb" opacity=".28" />
      <rect x="28.5" y="28" width="7" height="7" rx="2" fill="#2563eb" />
    </svg>
  )
}
