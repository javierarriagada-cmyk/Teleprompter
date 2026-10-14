// EL SERVIDOR DE LAS LÁMINAS DE LA TAREA 96 -05-10-2026-. NO es la configuración de la app -esa es
// vite.config.ts, que no cambia-: sirve el repo con el plugin de React y cambia src/lib/archivosNativos.ts
// por herramientas/archivosNativos-de-prueba.ts -como en la tarea 90-, para que el visor tenga el registro
// del motor de una toma del corpus y salga la ficha de Subtítulos junto a la de Filtro. Uso, desde la raíz:
//   npx vite --config docs/pantallas/tarea96/herramientas/vite.config.mjs --port 5196 --host 127.0.0.1
// y después: node docs/pantallas/tarea96/herramientas/laminas.mjs
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
const falso = path.join(aqui, 'archivosNativos-de-prueba.ts')

export default defineConfig({
  server: { fs: { allow: [raiz, modulosReales] } },
  root: raiz,
  plugins: [
    react(),
    {
      name: 'archivos-nativos-de-prueba',
      enforce: 'pre',
      async resolveId(fuente, importador) {
        if (!importador || importador.includes('archivosNativos-de-prueba')) return null
        if (/(^|\/)archivosNativos(\.ts)?$/.test(fuente) && /lib/.test(fuente + importador)) return falso
        return null
      }
    }
  ]
})
