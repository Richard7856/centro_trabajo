import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useAlmacen } from './lib/almacen.jsx'
import Panel from './pages/Panel.jsx'
import Espacios from './pages/Espacios.jsx'
import DetalleEspacio from './pages/DetalleEspacio.jsx'
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
  const {
    misEspacios, misProyectos, colaboradores,
    usuarioId, setUsuarioId, espacioId, setEspacioId, permisosEn,
  } = useAlmacen()

  // El menú de personas solo tiene sentido para quien manda en algún espacio.
  const mandaEnAlguno = misEspacios.some((e) => permisosEn(e.id).verEquipoCompleto)

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
            <option value="">Todos mis espacios ({misEspacios.length})</option>
            {misEspacios.map((e) => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
        </div>

        <nav className="nav">
          <Enlace a="/">Panel</Enlace>
          <Enlace a="/proyectos" conteo={misProyectos.length}>Proyectos</Enlace>
          <Enlace a="/espacios" conteo={misEspacios.length}>Espacios</Enlace>
          {mandaEnAlguno && <Enlace a="/colaboradores">Personas</Enlace>}
          <Enlace a="/ajustes">Ajustes</Enlace>
        </nav>

        <div className="sesion">
          <label className="mini suave">Ver como (pruebas)</label>
          <select
            value={usuarioId}
            onChange={(e) => {
              setUsuarioId(e.target.value)
              setEspacioId('')
            }}
          >
            {colaboradores.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          <p className="mini suave" style={{ margin: '6px 0 0' }}>
            Cambia de identidad para comprobar qué alcanza cada quien. Se reemplaza
            por el inicio de sesión real.
          </p>
        </div>
      </aside>

      <main className="contenido">
        <Routes>
          <Route path="/" element={<Panel />} />
          <Route path="/espacios" element={<Espacios />} />
          <Route path="/espacios/:id" element={<DetalleEspacio />} />
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
