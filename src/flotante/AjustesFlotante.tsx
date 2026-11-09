// PROTOTIPO DE LA VENTANA FLOTANTE, 08-11-2026: la lectura de Sigo sobre otra app, siguiendo la voz mientras esa app graba. Esta rama no va a main ni a Play.

// LOS DOS CONTROLES DE LA VENTANA, CON LAS PIEZAS DE SIGO -revisión del 957fc97, 08-11-2026-. Los usan la hoja
// de preparación -App.tsx- y el panel Aa de la ventana -PaginaFlotante.tsx-, para que no haya dos copias.
// Son los del panel de Aa de LISTO -FichasListo.tsx-: la cabeza con el valor, la barra aprobada del 28-09
// -.barra-pasos y .barra-brillo, styles-ajustes.css- y, para la letra, los botones − y +.
// Antes -957fc97-: dos <input type="range"> sin clase, con la pista fina y la bolita azul del navegador.
import { PASOS_LETRA } from '../components/estiloLectura'
import { limitarTamanoLetra, limitarTransparencia } from '../lib/flotante'
import { t } from '../textos'

interface Props {
  transparencia: number
  fontSize: number
  onTransparencia: (n: number) => void
  onLetra: (n: number) => void
  // -banda A, 09-11-2026- De lado y con espacio, el menú de Aa pone los dos controles uno al lado del otro.
  enFila?: boolean
}

// Antes -08-11-2026-: export function AjustesFlotante({ transparencia, fontSize, onTransparencia, onLetra }: Props) {
export function AjustesFlotante({ transparencia, fontSize, onTransparencia, onLetra, enFila = false }: Props) {
  const idx = Math.max(0, PASOS_LETRA.indexOf(limitarTamanoLetra(fontSize, PASOS_LETRA)))
  const ultimo = PASOS_LETRA.length - 1
  return (
    // Antes -08-11-2026-: <div className="ajustes-flotante"> con los dos controles seguidos, sin mitades.
    <div className={`ajustes-flotante${enFila ? ' en-fila' : ''}`}>
      <div className="ajustes-flotante-mitad">
      <div className="panel-ficha-cabeza">
        <span>{t('transparenciaFondo')}</span>
        <span>{transparencia} %</span>
      </div>
      <input
        type="range"
        className="barra-brillo"
        aria-label={t('transparenciaFondo')}
        min={0}
        max={100}
        step={1}
        value={transparencia}
        style={{ ['--relleno' as string]: `${transparencia}%` }}
        onChange={(e) => onTransparencia(limitarTransparencia(Number(e.target.value)))}
      />
      </div>
      <div className="ajustes-flotante-mitad">
      <div className="panel-ficha-cabeza">
        <span>{t('tamanoLetra')}</span>
        <span>{PASOS_LETRA[idx]}</span>
      </div>
      <div className="fila-deslizador-letra">
        <button
          type="button"
          className="btn-paso-letra"
          aria-label={t('letraMenos')}
          disabled={idx <= 0}
          onClick={() => onLetra(PASOS_LETRA[Math.max(0, idx - 1)])}
        >
          −
        </button>
        <input
          type="range"
          className="barra-pasos"
          aria-label={t('tamanoLetra')}
          min={0}
          max={ultimo}
          step={1}
          value={idx}
          style={{ ['--relleno' as string]: `${(idx / ultimo) * 100}%` }}
          onChange={(e) => {
            const n = PASOS_LETRA[Number(e.target.value)]
            if (n !== undefined) onLetra(n)
          }}
        />
        <button
          type="button"
          className="btn-paso-letra"
          aria-label={t('letraMas')}
          disabled={idx >= ultimo}
          onClick={() => onLetra(PASOS_LETRA[Math.min(ultimo, idx + 1)])}
        >
          +
        </button>
      </div>
      </div>
    </div>
  )
}
