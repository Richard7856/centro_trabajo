import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useAlmacen } from './lib/almacen.jsx'
import Panel from './pages/Panel.jsx'
import Proyectos from './pages/Proyectos.jsx'
import DetalleProyecto from './pages/DetalleProyecto.jsx'
import Colaboradores from './pages/Colaboradores.jsx'
import DetalleColaborador from './pages/DetalleColaborador.jsx'
import Ajustes from './pages/Ajustes.jsx'

function Enlace({ a, children, conteo }) {
  return (
    <NavLink to={a} className={({ isActive }) => (isActive ? 'activo' : '')} end={a === '/'}>
      <span>{children}</span>
      {conteo !== undefined && <span className="conteo">{conteo}</span>}
    </NavLink>
  )
}

export default function App() {
  const { proyectos, colaboradores } = useAlmacen()

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

        <nav className="nav">
          <Enlace a="/">Panel</Enlace>
          <Enlace a="/proyectos" conteo={proyectos.length}>Proyectos</Enlace>
          <Enlace a="/colaboradores" conteo={colaboradores.length}>Colaboradores</Enlace>
          <Enlace a="/ajustes">Ajustes</Enlace>
        </nav>
      </aside>

      <main className="contenido">
        <Routes>
          <Route path="/" element={<Panel />} />
          <Route path="/proyectos" element={<Proyectos />} />
          <Route path="/proyectos/:id" element={<DetalleProyecto />} />
          <Route path="/colaboradores" element={<Colaboradores />} />
          <Route path="/colaboradores/:id" element={<DetalleColaborador />} />
          <Route path="/ajustes" element={<Ajustes />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
