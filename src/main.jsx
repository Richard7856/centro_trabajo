import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { ProveedorAlmacen } from './lib/almacen.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ProveedorAlmacen>
      <HashRouter>
        <App />
      </HashRouter>
    </ProveedorAlmacen>
  </React.StrictMode>,
)
