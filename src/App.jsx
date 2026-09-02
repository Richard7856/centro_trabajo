import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import Marca from './components/Marca.jsx'
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
import Calendario from './pages/Calendario.jsx'
import Cobros from './pages/Cobros.jsx'
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
  const {
    espacios, proyectos, tareas, cobros, espacioId, setEspacioId,
    cargando, error, permisosEn,
  } = useDatos()

  if (cargandoSesion) {
    return <div className="portada"><p className="suave">Cargando…</p></div>
  }

  // Sin sesión no hay aplicación: ni siquiera se montan las rutas.
  if (!sesion) return <Entrar />

  const solicitudes = tareas.filter((t) => t.status === 'inbox').length
  const vencidos = cobros.filter((c) => c.status === 'vencido').length
  // La sección de dinero solo aparece para quien manda en algún espacio.
  const hayDinero = espacios.some((e) => permisosEn(e.id).verDinero)
  // Quien solo es cliente no tiene por qué ver el andamiaje de espacios: para
  // él la aplicación son sus proyectos. Además el nombre de un espacio puede
  // ser el de otro socio.
  const soloCliente = espacios.length > 0 && espacios.every((e) => permisosEn(e.id).esCliente)

  return (
    <div className="app">
      <aside className="lateral">
        <div className="marca">
          <Marca />
          <div>
            <div className="marca-texto">Centro de Trabajo</div>
            <div className="marca-sub">Organizador de proyectos</div>
          </div>
        </div>

        {!soloCliente && (
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
        )}

        <nav className="nav">
          <Enlace a="/">Panel</Enlace>
          <Enlace a="/proyectos" conteo={proyectos.length}>Proyectos</Enlace>
          <Enlace a="/bandeja" conteo={solicitudes}>Bandeja</Enlace>
          <Enlace a="/calendario">Calendario</Enlace>
          {hayDinero && <Enlace a="/cobros" conteo={vencidos}>Cobros</Enlace>}
          {!soloCliente && <Enlace a="/espacios" conteo={espacios.length}>Espacios</Enlace>}
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
            <Route
              path="/espacios"
              element={soloCliente ? <Navigate to="/" replace /> : <Espacios />}
            />
            <Route
              path="/espacios/:id"
              element={soloCliente ? <Navigate to="/" replace /> : <DetalleEspacio />}
            />
            <Route path="/proyectos" element={<Proyectos />} />
            <Route path="/proyectos/:id" element={<DetalleProyecto />} />
            <Route path="/bandeja" element={<Bandeja />} />
            <Route path="/calendario" element={<Calendario />} />
            <Route path="/cobros" element={<Cobros />} />
            <Route path="/ajustes" element={<Ajustes />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
    </div>
  )
}
