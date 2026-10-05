// El servidor de las láminas de la tarea 88. NO es la configuración de la app -esa es vite.config.ts,
// que no cambia-: sirve el repo con el plugin de React. Uso, desde la raíz del repo:
//   npx vite --config docs/pantallas/tarea88/herramientas/vite.config.mjs --port 5188 --host 127.0.0.1
// y después: node docs/pantallas/tarea88/herramientas/laminas.cjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const aqui = path.dirname(fileURLToPath(import.meta.url))
const raiz = path.resolve(aqui, '../../../..')
// node_modules puede ser un enlace -en los worktrees lo es-: sin permitir su ruta real, vite contesta
// 403 a las letras de @fontsource.
const modulosReales = fs.realpathSync(path.join(raiz, 'node_modules'))

export default defineConfig({
  server: { fs: { allow: [raiz, modulosReales] } },
  root: raiz,
  plugins: [react()]
})
