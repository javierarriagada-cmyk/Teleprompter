// LA LÁMINA DEL AVISO DE LS-M2 -tarea 83, parte B, 04-10-2026-. NO es código de la app: no lo importa nada
// de src/ y vite build no lo empaqueta. Monta App como main.tsx y, encima, AvisoBreve con el texto que App
// muestra al cortar la toma -avisoDePerdida en lib/recursosToma.ts-. controles.cjs lo abre en LISTO de Grabar,
// que es donde App deja la toma después del corte.
import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/source-sans-3/latin-400.css'
import '@fontsource/source-sans-3/latin-600.css'
import '@fontsource/source-sans-3/latin-ext-400.css'
import '@fontsource/source-sans-3/latin-ext-600.css'
import '@fontsource/source-serif-4/latin-400.css'
import '@fontsource/source-serif-4/latin-600.css'
import App from '../../../../src/App'
import '../../../../src/styles.css'
import '../../../../src/styles-ajustes.css'
import '../../../../src/styles-horizontal.css'
import '../../../../src/styles-tableta.css'
import '../../../../src/styles-visor-de-lado.css'
import { AvisoBreve } from '../../../../src/components/AvisoBreve'
import { avisoDePerdida } from '../../../../src/lib/recursosToma'
import { es } from '../../../../src/textos/es'
import { en } from '../../../../src/textos/en'

const q = new URLSearchParams(location.search)
const recurso = q.get('recurso') === 'microfono' ? 'microfono' : 'camara'
const textos = q.get('idioma') === 'en' ? en : es
createRoot(document.getElementById('root')!).render(<App />)
;(window as any).mostrarAvisoM2 = () => {
  createRoot(document.getElementById('aviso')!).render(
    <AvisoBreve avisoInfo={{ texto: textos[avisoDePerdida(recurso)] }} enLectura cerrarAviso={() => {}} />
  )
}
