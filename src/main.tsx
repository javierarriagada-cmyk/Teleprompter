import React from 'react'
import { createRoot } from 'react-dom/client'
// SOLO LOS SUBCONJUNTOS LATINOS. Importar 400.css a secas trae ademas cirilico, griego y
// vietnamita: 26 archivos y 352 kB, de los cuales unos 250 no se usan nunca en un producto
// en espanol. El navegador no los descargaria -cada uno tiene su unicode-range-, pero
// nosotros empaquetamos un APK y ahi adentro van todos igual, y el usuario los baja de la
// tienda. latin-ext hace falta por los acentos y la enie.
import '@fontsource/source-sans-3/latin-400.css'
import '@fontsource/source-sans-3/latin-600.css'
import '@fontsource/source-sans-3/latin-ext-400.css'
import '@fontsource/source-sans-3/latin-ext-600.css'
import '@fontsource/source-serif-4/latin-400.css'
import '@fontsource/source-serif-4/latin-600.css'
import '@fontsource/source-serif-4/latin-ext-400.css'
import '@fontsource/source-serif-4/latin-ext-600.css'
import App from './App'
import './styles.css'

const el = document.getElementById('root')!
createRoot(el).render(<App />)
