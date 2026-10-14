// LAS LÁMINAS DE LA TAREA 88 -04-10-2026-. NO es código de la app: no lo importa nada de src/ y vite
// build no lo empaqueta.
//   ?vista=panel&motivo=ninguno|soloFrontal|noDisponible&tema=claro|oscuro
//     LISTO de Grabar con la ficha de la cámara abierta -la abre laminas.cjs tocándola- y la fila de
//     Control por gestos: frontal -encendida-, trasera -deshabilitada- o un equipo que no puede.
//   ?vista=pausa&lado=0|1&tema=…
//     Grabando en pausa: el punto de grabar en pausa -parpadea; la lámina lo toma encendido- y el
//     símbolo grande de pausa que aparece cuando pausa la palma. El símbolo es el mismo marcado que
//     dibuja App.tsx -simbolo-pausa-grande, IconoPausa de 48 en el círculo de 96-. Los botones de la
//     toma -pausa, tacho y parar- son de App y no están en esta página.
import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/source-sans-3/latin-400.css'
import '@fontsource/source-sans-3/latin-600.css'
import '@fontsource/source-sans-3/latin-ext-400.css'
import '@fontsource/source-sans-3/latin-ext-600.css'
import '../../../../src/styles.css'
import '../../../../src/styles-ajustes.css'
import '../../../../src/styles-horizontal.css'
import TeleprompterView from '../../../../src/components/TeleprompterView'
import { IconoPausa } from '../../../../src/components/IconosApp'
import { fijarIdioma } from '../../../../src/lib/idioma'
import type { Guion } from '../../../../src/datos/modelo'

const q = new URLSearchParams(location.search)
const vista = q.get('vista') === 'pausa' ? 'pausa' : 'panel'
const tema = q.get('tema') === 'claro' ? 'claro' : 'oscuro'
const lado = q.get('lado') === '1'
const motivo = (q.get('motivo') === 'soloFrontal' || q.get('motivo') === 'noDisponible') ? q.get('motivo') as 'soloFrontal' | 'noDisponible' : null
document.documentElement.setAttribute('data-tema', tema)
fijarIdioma('es')

const guion: Guion = {
  id: 'lamina-88', titulo: 'Larralde', idioma: 'es', creado: 0, modificado: 0, archivado: false,
  bloques: [{ id: 'b1', nombre: '', texto: 'Si me vieras por dentro sabrías que no duermo nunca. La casa vieja del puerto tenía ventanas azules y rotas. Mi abuelo pescaba congrios grandes cuando el mar estaba tranquilo. Los domingos subíamos al cerro alto a mirar los barcos.' }]
}

function Pagina() {
  const [gestos, setGestos] = React.useState(true)
  return (
    <div className="alto-pantalla" style={{ width: '100%', height: '100vh', position: 'relative', overflow: 'hidden', background: '#000' }}>
      <TeleprompterView
        script={guion}
        currentLineIndex={0}
        currentWordIndex={vista === 'pausa' ? 12 : 0}
        fontSize={lado ? 30 : 36}
        anclajeZona="arriba"
        colorFondo="#000000"
        colorLetra="#FFFFFF"
        conCamara
        camaraEncendida={false}
        fondoToma="detras"
        estadoToma={vista === 'pausa' ? 'leyendo' : 'listo'}
        grabandoVideo={vista === 'pausa'}
        enPausa={vista === 'pausa'}
        horizontal={lado}
        calidadesSoportadas={['720p', '1080p']}
        calidadVideo="1080p"
        gestosAlGrabar={gestos}
        setGestosAlGrabar={setGestos}
        motivoSinGestos={motivo}
      />
      {vista === 'pausa' && (
        <div data-testid="simbolo-pausa-grande" className="simbolo-pausa-grande" aria-hidden="true">
          <IconoPausa tamano={48} />
        </div>
      )}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Pagina />)
