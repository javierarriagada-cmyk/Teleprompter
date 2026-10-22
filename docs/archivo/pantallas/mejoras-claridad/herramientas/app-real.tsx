// LA APP REAL PARA LOS BOCETOS -mejoras de claridad, 21-10-2026-. NO es código de la app. Monta la App de
// verdad -src/App.tsx- con las mismas hojas que src/main.tsx, o solo la Entrada -mejora=1-, quieta en el
// instante en que el splash nativo la entrega. El tema y los guiones los siembra capturas.cjs.
// Con version=despues se suma el boceto -boceto-despues.tsx y .css-: la misma app, vestida con la mejora.
import { createRoot } from 'react-dom/client'
import '@fontsource/source-sans-3/latin-400.css'
import '@fontsource/source-sans-3/latin-600.css'
import '@fontsource/source-sans-3/latin-ext-400.css'
import '@fontsource/source-sans-3/latin-ext-600.css'
import '@fontsource/source-serif-4/latin-400.css'
import '@fontsource/source-serif-4/latin-600.css'
import '@fontsource/source-serif-4/latin-ext-400.css'
import '@fontsource/source-serif-4/latin-ext-600.css'
import '../../../../../src/styles.css'
import '../../../../../src/styles-ajustes.css'
import '../../../../../src/styles-horizontal.css'
import '../../../../../src/styles-tableta.css'
import '../../../../../src/styles-visor-de-lado.css'
import App from '../../../../../src/App'
import { Entrada } from '../../../../../src/components/Entrada'

const q = new URLSearchParams(location.search)
const despues = q.get('version') === 'despues'
const mejora = q.get('mejora') || '0'

async function arrancar() {
  if (despues) await import('./boceto-despues')
  const raiz = createRoot(document.getElementById('root')!)
  if (mejora === '1') raiz.render(<Entrada desdeSplashNativo puedeAnimar={false} />)
  else raiz.render(<App />)
}
arrancar()
