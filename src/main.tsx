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
import './styles-ajustes.css'
// El teléfono de lado -tarea 82, 29-09-2026-: va después de las otras dos porque las pisa
// solo dentro de .layout-tel-h.
import './styles-horizontal.css'
// La tableta -tarea 83, 30-09-2026-: va después del teléfono de lado porque de lado usa sus mismos
// rieles con otras medidas, y las pisa solo dentro de .layout-tab-v y .layout-tab-h.
import './styles-tableta.css'

import { instalarRecargaAlActualizar, sacarServiceWorkerEnNativo } from './lib/actualizacion'

// Antes de dibujar nada: si el telefono tenia guardada una version vieja y acaba de llegar
// una nueva, que se aplique sola en vez de esperar a una segunda carga que nadie hace.
instalarRecargaAlActualizar()

// Y en el APK, que no haya service worker en absoluto: ahi el cache solo sirve para hacerte
// probar el codigo de ayer creyendo que es el de hoy. El motivo largo esta en actualizacion.ts.
sacarServiceWorkerEnNativo()

const el = document.getElementById('root')!
createRoot(el).render(<App />)
