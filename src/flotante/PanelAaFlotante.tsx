// PROTOTIPO DE LA VENTANA FLOTANTE, 08-11-2026: la lectura de Sigo sobre otra app, siguiendo la voz mientras esa app graba. Esta rama no va a main ni a Play.

// EL MENÚ DE Aa EN SU PROPIA VENTANA -banda A, 09-11-2026-. Es flotante.html?panel=aa, cargada por
// VentanaDePrueba.abrirMenuAa en una segunda ventana de accesibilidad del tamaño justo del menú: así no queda
// ninguna superficie invisible sobre la Cámara y su zoom y su disparador siguen recibiendo los toques. Usa los
// mismos controles de la preparación -AjustesFlotante-, en columna o, de lado y con espacio, en una fila.
// Cada cambio va a lo nativo como 'ajuste'; lo nativo lo guarda y se lo pasa a la banda como 'ajusteAa'.
import { useEffect, useState } from 'react'
import { PASOS_LETRA } from '../components/estiloLectura'
import { limitarTamanoLetra, limitarTransparencia } from '../lib/flotante'
import { idiomaApp, mostrarIdiomaSinGuardar, normalizarIdioma } from '../lib/idioma'
import { useTextos } from '../textos'
import { AjustesFlotante } from './AjustesFlotante'

function enviar(mensaje: Record<string, unknown>) {
  const puente = (window as unknown as { sigo?: { postMessage: (d: string) => void } }).sigo
  puente?.postMessage(JSON.stringify(mensaje))
}

export function PanelAaFlotante() {
  useTextos()
  const [transparencia, setTransparencia] = useState(0)
  const [fontSize, setFontSize] = useState(24)
  const [forma, setForma] = useState<'columna' | 'fila'>('columna')

  useEffect(() => {
    function alMensaje(ev: MessageEvent) {
      let datos: Record<string, unknown>
      try {
        datos = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data
      } catch {
        return
      }
      if (!datos || typeof datos !== 'object' || datos.tipo !== 'valores') return
      if (typeof datos.transparencia === 'number') setTransparencia(limitarTransparencia(datos.transparencia))
      if (typeof datos.fontSize === 'number') setFontSize(limitarTamanoLetra(datos.fontSize, PASOS_LETRA))
      setForma(datos.forma === 'fila' ? 'fila' : 'columna')
      if (typeof datos.idiomaApp === 'string' && normalizarIdioma(datos.idiomaApp) !== idiomaApp()) {
        mostrarIdiomaSinGuardar(normalizarIdioma(datos.idiomaApp))
      }
    }
    window.addEventListener('message', alMensaje)
    enviar({ tipo: 'listo' })
    return () => window.removeEventListener('message', alMensaje)
  }, [])

  return (
    <div className={`flotante-menu-aa flotante-menu-aa-${forma}`} data-tema="oscuro">
      <AjustesFlotante
        enFila={forma === 'fila'}
        transparencia={transparencia}
        fontSize={fontSize}
        onTransparencia={(n) => {
          const v = limitarTransparencia(n)
          setTransparencia(v)
          enviar({ tipo: 'ajuste', transparencia: v })
        }}
        onLetra={(n) => {
          const v = limitarTamanoLetra(n, PASOS_LETRA)
          setFontSize(v)
          enviar({ tipo: 'ajuste', fontSize: v })
        }}
      />
    </div>
  )
}
