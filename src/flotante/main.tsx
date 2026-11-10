// PROTOTIPO DE LA VENTANA FLOTANTE, 08-11-2026: la lectura de Sigo sobre otra app, siguiendo la voz mientras esa app graba. Esta rama no va a main ni a Play.

import { createRoot } from 'react-dom/client'
import '@fontsource/source-sans-3/latin-400.css'
import '@fontsource/source-sans-3/latin-600.css'
import '@fontsource/source-sans-3/latin-ext-400.css'
import '@fontsource/source-sans-3/latin-ext-600.css'
import '@fontsource/source-serif-4/latin-400.css'
import '@fontsource/source-serif-4/latin-600.css'
import '@fontsource/source-serif-4/latin-ext-400.css'
import '@fontsource/source-serif-4/latin-ext-600.css'
import '../styles.css'
import '../styles-ajustes.css'
import '../styles-horizontal.css'
import '../styles-tableta.css'
import '../styles-visor-de-lado.css'
import './flotante.css'
import { PaginaFlotante } from './PaginaFlotante'
import { PanelAaFlotante } from './PanelAaFlotante'

const el = document.getElementById('root')!
// Antes -08-11-2026-: createRoot(el).render(<PaginaFlotante />)
// -banda A, 09-11-2026- La misma página sirve a las dos ventanas: la banda y, con ?panel=aa, el menú de Aa.
const esMenuAa = new URLSearchParams(window.location.search).get('panel') === 'aa'
if (esMenuAa) document.documentElement.classList.add('flotante-documento-menu')
createRoot(el).render(esMenuAa ? <PanelAaFlotante /> : <PaginaFlotante />)
