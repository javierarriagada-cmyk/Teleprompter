import React from 'react'
import { ResumenGrabacion } from '../datos/modelo'
import { srcDeRuta, formatearDuracionMs } from './TiraGrabaciones'
import { duracionVisible } from '../lib/tramos'
import { movimientoApagado, MS_CHICO, CURVA_ENTRA } from './movimiento'
import { hapticaToqueSuave } from '../haptica'
import { t, useTextos } from '../textos'

// LAS TOMAS DEL GUION ABIERTO -tarea 76, 28-09-2026-. Javier: al abrir un guion, abajo, una banda
// con las tomas de ESE guion. Vive encima de Leer y Grabar, dentro del mismo contenedor fijo
// -EditorView.tsx-, así que sube y baja con ellos sin un transform propio.
//
// La miniatura es la de la tira de la portada a escala -84 x 56, 3:2- y lleva lo mismo encima:
// la duración y, si la toma las tiene, las marcas "incompleta" y "sin audio". Sin título ni
// fecha: todas son del mismo guion.
//
// SIN MENÚ DE BORRAR. Un toque abre la toma en el reproductor, y ahí se borra, o desde la tira
// de la portada. Un gesto destructivo no se agrega en una banda de paso.
//
// Las medidas, el fondo y las marcas viven en styles.css -.banda-tomas y compañía-: acá no se
// escribe a mano ni un color ni un tamaño -T209-.

interface Props {
  // Ya filtradas por guion y ordenadas de la más nueva a la más vieja: lo hace App.tsx.
  tomas: ResumenGrabacion[]
  onAbrirToma: (g: ResumenGrabacion) => void
}

export default function BandaTomas({ tomas, onAbrirToma }: Props) {
  useTextos()
  // Sin tomas no hay banda: ni título ni hueco. EditorView ya no la monta; esto es por si
  // alguien la monta igual.
  if (tomas.length === 0) return null
  return (
    <div
      data-testid="banda-tomas"
      className="banda-tomas"
      // Entra como entra lo chico de la casa: aparece en su lugar -MS_CHICO, CURVA_ENTRA-. Al
      // volver del teclado, y al abrir el guion junto con la pantalla. Sale sin animación: se
      // esconde porque la persona empezó a escribir, y el espacio lo necesita ya.
      style={movimientoApagado() ? undefined : { animation: `pantallaEntraInicial ${MS_CHICO}ms ${CURVA_ENTRA} both` }}
    >
      <div className="banda-tomas-titulo">{t('tomasConteo', { n: tomas.length })}</div>
      <div className="banda-tomas-fila">
        {tomas.map((g) => {
          // -tarea 88- La duración FINAL, sin lo pausado. Antes: formatearDuracionMs(g.duracionMs).
          const duracion = formatearDuracionMs(duracionVisible(g))
          return (
            <button
              key={g.id}
              type="button"
              data-testid={`toma-banda-${g.id}`}
              data-incompleta={g.incompleta ? 'si' : 'no'}
              className="btn-deformable miniatura-banda"
              aria-label={t('tomaDuracion', { duracion })}
              title={t('tomaDuracion', { duracion })}
              onClick={() => {
                hapticaToqueSuave()
                onAbrirToma(g)
              }}
            >
              {g.rutaMiniatura ? <img src={srcDeRuta(g.rutaMiniatura)} alt="" /> : null}
              {/* Tanda 2, 15-10-2026: el velo de abajo de la tira de la portada -.velo-miniatura-, bajo la duracion. */}
              <span className="velo-miniatura" aria-hidden="true" />
              <span className="marca-toma marca-toma-duracion">{duracion}</span>
              {g.incompleta && <span data-testid={`marca-incompleta-banda-${g.id}`} className="marca-toma marca-toma-incompleta">{t('incompleta')}</span>}
              {g.errorMudo && <span className="marca-toma marca-toma-sin-audio">{t('sinAudio')}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
