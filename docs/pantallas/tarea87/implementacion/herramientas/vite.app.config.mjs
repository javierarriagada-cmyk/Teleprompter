// El servidor de las capturas de la app implementada -tarea 87-. NO es la configuración de la app
// -esa es vite.config.ts, que no cambia-: sirve el repo con el plugin de React y reemplaza
// src/lib/archivosNativos por archivosNativosApp.ts. Uso, desde la raíz del repo:
//   npx vite --config docs/pantallas/tarea87/implementacion/herramientas/vite.app.config.mjs --port 5183 --host 127.0.0.1
// y el del boceto, desde un worktree de main con docs/pantallas/tarea87/herramientas copiado:
//   npx vite --config docs/pantallas/tarea87/herramientas/vite.boceto.config.mjs --port 5184 --host 127.0.0.1
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const aqui = path.dirname(fileURLToPath(import.meta.url))
// node_modules puede ser un enlace a otra carpeta -en los worktrees lo es-: sin permitir su ruta
// real, vite contesta 403 a las letras de @fontsource y las capturas salen con otra letra.
const raiz = path.resolve(aqui, '../../../../..')
const modulosReales = fs.realpathSync(path.join(raiz, 'node_modules'))
const fingido = path.join(aqui, 'archivosNativosApp.ts')

export default defineConfig({
  server: { fs: { allow: [raiz, modulosReales] } },
  root: path.resolve(aqui, '../../../../..'),
  plugins: [
    react(),
    {
      name: 'archivos-nativos-fingidos-app',
      enforce: 'pre',
      resolveId(fuente, desde) {
        if (desde && desde !== fingido && /\/lib\/archivosNativos(\.ts)?$/.test(fuente)) return fingido
        return null
      }
    }
  ]
})
