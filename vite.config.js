import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Rutas absolutas: con rutas reales (no con almohadilla), una ruta como
  // /proyectos buscaría los assets en /proyectos/assets/ si la base fuera relativa.
  base: '/',
  server: { port: 5173, host: true },
})
