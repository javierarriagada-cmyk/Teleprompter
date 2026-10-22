// LA APP REAL PARA EL BOCETO DEL PORTUGUÉS -portugues-voz, 2026-10-22-. NO es código de la app. Monta la App de
// verdad -src/App.tsx- con las mismas hojas que src/main.tsx, como mejoras-claridad y tarea90, y le suma
// boceto.tsx -ya no-. El tema y los guiones los siembra capturas.cjs.
import { createRoot } from 'react-dom/client'
import '@fontsource/source-sans-3/latin-400.css'
import '@fontsource/source-sans-3/latin-600.css'
import '@fontsource/source-sans-3/latin-ext-400.css'
import '@fontsource/source-sans-3/latin-ext-600.css'
import '@fontsource/source-serif-4/latin-400.css'
import '@fontsource/source-serif-4/latin-600.css'
import '@fontsource/source-serif-4/latin-ext-400.css'
import '@fontsource/source-serif-4/latin-ext-600.css'
import '../../../../src/styles.css'
import '../../../../src/styles-ajustes.css'
import '../../../../src/styles-horizontal.css'
import '../../../../src/styles-tableta.css'
import '../../../../src/styles-visor-de-lado.css'
import App from '../../../../src/App'
// -portugues-voz, 2026-10-22- Los puntos 6 y 7 ya están en src/: la lámina sale del código. Antes: import './boceto'

createRoot(document.getElementById('root')!).render(<App />)
