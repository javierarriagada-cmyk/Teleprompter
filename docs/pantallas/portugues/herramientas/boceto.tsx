// EL BOCETO DEL PORTUGUÉS -portugues-voz, 2026-10-22-. NO es código de la app. Dibuja sobre el editor real lo que
// piden los puntos 6 y 7 de la orden, que todavía no se programan:
//   6. Tocar el idioma del guion -btn-idioma-guion- abre un menú de tres idiomas, con los mismos componentes del
//      menú adjunto de Ajustes -MenuAdjuntoAjustes, fila-menu-adjunto, CheckMenu-, anclado al botón.
//   7. Si el idioma del guion no es el de la app, un aviso en el idioma DEL GUION, con la acción que cambia la
//      app -fijarIdioma-. Con un guion en portugués no sale: la app no está en portugués.
// Los textos van aquí escritos solo para el boceto; en el código irán en src/textos/es.ts y en.ts.
import { useRef, useState, useLayoutEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { MenuAdjuntoAjustes, CheckMenu } from '../../../../src/components/FilasAjustesLectura'

const q = new URLSearchParams(location.search)
const idiomaGuion = q.get('guion') === 'pt' ? 'pt' : 'en'

const IDIOMAS = [
  { v: 'es', n: 'Español' },
  { v: 'en', n: 'Inglés' },
  { v: 'pt', n: 'Portugués' }
]
// El aviso, en el idioma del guion. Solo inglés: con pt no sale.
const AVISO = { texto: 'Your script is in English. Use Sigo in English?', accion: 'Switch' }

function Boceto({ boton }: { boton: HTMLElement }) {
  const ancla = useRef<HTMLElement | null>(boton)
  const [listo, setListo] = useState(false)
  useLayoutEffect(() => setListo(true), [])
  if (!listo) return null
  return (
    <>
      <MenuAdjuntoAjustes anclaRef={ancla} onCerrar={() => {}} testid="dialogo-idioma-guion">
        <div className="lista-menu-adjunto">
          {IDIOMAS.map((o) => (
            <button
              key={o.v}
              type="button"
              className={`fila-menu-adjunto${idiomaGuion === o.v ? ' elegida' : ''}`}
              role="menuitemradio"
              aria-checked={idiomaGuion === o.v}
            >
              <span className="fila-menu-adjunto-etiqueta">{o.n}</span>
              <CheckMenu visible={idiomaGuion === o.v} />
            </button>
          ))}
        </div>
      </MenuAdjuntoAjustes>
      {idiomaGuion !== 'pt' && (
        // El mismo aviso breve de la app -AvisoBreve.tsx, .aviso-breve-, en su lugar de abajo.
        <div
          className="aviso-breve"
          lang="en"
          style={{
            position: 'fixed',
            bottom: 'calc(var(--aire-5) + env(safe-area-inset-bottom, 0px))',
            left: 0,
            right: 0,
            marginLeft: 'auto',
            marginRight: 'auto',
            width: 'max-content',
            maxWidth: 'calc(100% - 2 * var(--aire-4))',
            color: 'var(--color-texto)',
            padding: 'var(--aire-2) var(--aire-3)',
            borderRadius: 'var(--redondeo-pildora)',
            fontSize: 'var(--texto-cuerpo)',
            fontWeight: 600,
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--aire-3)'
          }}
        >
          <span>{AVISO.texto}</span>
          <button style={{ background: 'transparent', border: 'none', color: 'var(--color-acento)', fontWeight: 'bold', fontSize: 'var(--texto-cuerpo)', padding: 0 }}>
            {AVISO.accion}
          </button>
        </div>
      )}
    </>
  )
}

// Espera el editor y monta el boceto una vez.
let montado = false
new MutationObserver(() => {
  if (montado) return
  const boton = document.querySelector<HTMLElement>('[data-testid="btn-idioma-guion"]')
  if (!boton || !(window as any).__abrirBoceto) return
  montado = true
  const caja = document.createElement('div')
  document.body.appendChild(caja)
  createRoot(caja).render(<Boceto boton={boton} />)
}).observe(document.documentElement, { childList: true, subtree: true, attributes: true })
