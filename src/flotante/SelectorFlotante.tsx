// PROTOTIPO DE LA VENTANA FLOTANTE, 09-11-2026: la entrada de la banda A en LISTO. Esta rama no va a main ni a Play.

// EL SELECTOR «VENTANA FLOTANTE», DENTRO DEL DOCK -boceto A, 807-01-. Un solo objeto de 56 de alto que se toca entero:
// el ícono, el nombre, la consecuencia corta y una marca. Es una superficie secundaria: Empezar sigue siendo el
// único botón lleno, y es Empezar el que abre la ventana. Vale para esta lectura: App lo guarda en un estado de
// memoria, nunca en los ajustes. De lado va al pie del riel izquierdo, sin el ícono -no cabe-.
// Antes -08-11-2026, App.tsx-: un botón suelto «Ventana flotante» arriba de la lectura -.prueba-flotante-casos-, que
// abría la hoja de una vez.
import { IconoVentanaFlotante } from '../components/IconosApp'
import { t, useTextos } from '../textos'

interface Props {
  elegido: boolean
  disponible: boolean
  onCambiar: (elegido: boolean) => void
}

export function SelectorFlotante({ elegido, disponible, onCambiar }: Props) {
  useTextos()
  return (
    <button
      type="button"
      className={`selector-flotante${elegido ? ' elegido' : ''}`}
      data-testid="selector-flotante"
      aria-pressed={elegido}
      disabled={!disponible}
      onClick={(e) => {
        e.stopPropagation()
        onCambiar(!elegido)
      }}
    >
      <span className="selector-flotante-icono" aria-hidden="true"><IconoVentanaFlotante tamano={22} /></span>
      <span className="selector-flotante-textos">
        <b>{t('ventanaFlotante')}</b>
        <small>{t('consecuenciaFlotante')}</small>
      </span>
      <span className="selector-flotante-marca" aria-hidden="true">
        {elegido && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        )}
      </span>
    </button>
  )
}
