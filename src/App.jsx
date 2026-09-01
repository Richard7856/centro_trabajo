import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useSesion } from './lib/sesion.jsx'
import { useDatos } from './lib/datos.jsx'
import { color } from './data/modelo.js'
import Entrar from './pages/Entrar.jsx'
import Panel from './pages/Panel.jsx'
import Espacios from './pages/Espacios.jsx'
import DetalleEspacio from './pages/DetalleEspacio.jsx'
import Proyectos from './pages/Proyectos.jsx'
import DetalleProyecto from './pages/DetalleProyecto.jsx'
import Bandeja from './pages/Bandeja.jsx'
import Ajustes from './pages/Ajustes.jsx'

function Enlace({ a, children, conteo }) {
  return (
    <NavLink to={a} className={({ isActive }) => (isActive ? 'activo' : '')} end={a === '/'}>
      <span>{children}</span>
      {conteo !== undefined && conteo > 0 && <span className="conteo">{conteo}</span>}
    </NavLink>
  )
}

export default function App() {
  const { cargando: cargandoSesion, sesion, perfil, correo, salir } = useSesion()
  const { espacios, proyectos, tareas, espacioId, setEspacioId, cargando, error } = useDatos()

  if (cargandoSesion) {
    return <div className="portada"><p className="suave">Cargando…</p></div>
  }

  // Sin sesión no hay aplicación: ni siquiera se montan las rutas.
  if (!sesion) return <Entrar />

  const solicitudes = tareas.filter((t) => t.status === 'inbox').length

  return (
    <div className="app">
      <aside className="lateral">
        <div className="marca">
          <div className="marca-logo">CT</div>
          <div>
            <div className="marca-texto">Centro de Trabajo</div>
            <div className="marca-sub">Organizador de proyectos</div>
          </div>
        </div>

        <div className="selector-espacio">
          <label className="mini suave">Espacio</label>
          <select value={espacioId} onChange={(e) => setEspacioId(e.target.value)}>
            <option value="">Todos mis espacios ({espacios.length})</option>
            {espacios.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}{e.archived_at ? ' (archivado)' : ''}
              </option>
            ))}
          </select>
        </div>

        <nav className="nav">
          <Enlace a="/">Panel</Enlace>
          <Enlace a="/proyectos" conteo={proyectos.length}>Proyectos</Enlace>
          <Enlace a="/bandeja" conteo={solicitudes}>Bandeja</Enlace>
          <Enlace a="/espacios" conteo={espacios.length}>Espacios</Enlace>
          <Enlace a="/ajustes">Ajustes</Enlace>
        </nav>

        <div className="sesion">
          <div className="linea" style={{ marginBottom: 8 }}>
            <span
              className="avatar sm"
              style={{ background: color(espacios[0]?.color) }}
              aria-hidden="true"
            >
              {(perfil?.full_name || correo || '?').slice(0, 1).toUpperCase()}
            </span>
            <span style={{ minWidth: 0 }}>
              <div className="mini" style={{ fontWeight: 600 }}>
                {perfil?.full_name || 'Mi cuenta'}
              </div>
              <div className="mini suave recorte">{correo}</div>
            </span>
          </div>
          <button className="boton sm" style={{ width: '100%' }} onClick={salir}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="contenido">
        {error && <div className="aviso alerta">{error}</div>}
        {cargando && espacios.length === 0 && !error ? (
          <p className="suave">Cargando tus espacios…</p>
        ) : (
          <Routes>
            <Route path="/" element={<Panel />} />
            <Route path="/espacios" element={<Espacios />} />
            <Route path="/espacios/:id" element={<DetalleEspacio />} />
            <Route path="/proyectos" element={<Proyectos />} />
            <Route path="/proyectos/:id" element={<DetalleProyecto />} />
            <Route path="/bandeja" element={<Bandeja />} />
            <Route path="/ajustes" element={<Ajustes />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
    </div>
  )
}
