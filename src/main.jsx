import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { ProveedorSesion } from './lib/sesion.jsx'
import { ProveedorDatos } from './lib/datos.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ProveedorSesion>
      <ProveedorDatos>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ProveedorDatos>
    </ProveedorSesion>
  </React.StrictMode>,
)
