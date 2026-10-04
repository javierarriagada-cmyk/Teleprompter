import React from 'react'
import { hapticaSeleccion } from '../haptica'
import { t, useTextos } from '../textos'
import type { PosicionSubtitulos } from '../lib/posicionSubtitulos'

// LA POSICIÓN DE LOS SUBTÍTULOS -tarea 87, parte D, 04-10-2026-. Va DENTRO del panel de Subtítulos,
// debajo de los cuatro estilos -corrección (2) de A4, aprobada en el boceto ab86ccc-: la cabeza
// .panel-ficha-cabeza con lo elegido a la derecha, el .segmentado de las fichas de LISTO y la línea
// chica con las redes, alineada a la derecha. Es el único lugar donde se nombran redes. Elegir la
// posición NO cierra el panel -respuesta de Claude del 04-10-: se ve subir el subtítulo arriba.
export function SelectorPosicion({
  posicion,
  onCambiar,
  desactivado
}: {
  posicion: PosicionSubtitulos
  onCambiar: (p: PosicionSubtitulos) => void
  desactivado?: boolean
}) {
  useTextos()
  const opcion = (p: PosicionSubtitulos, texto: string) => (
    <button
      type="button"
      data-testid={`btn-posicion-${p}`}
      aria-pressed={posicion === p}
      disabled={desactivado}
      className={`segmentado-opcion${posicion === p ? ' activa' : ''}`}
      onClick={() => {
        if (posicion === p) return
        hapticaSeleccion()
        onCambiar(p)
      }}
    >
      <span>{texto}</span>
    </button>
  )
  return (
    <div data-testid="selector-posicion-subtitulos" style={{ marginTop: 'var(--aire-1)' }}>
      <div className="panel-ficha-cabeza">
        <span>{t('posicionSubtitulos')}</span>
        <span>{posicion === 'redes' ? t('posicionRedes') : t('posicionNormal')}</span>
      </div>
      <div className="segmentado" role="group" aria-label={t('posicionSubtitulos')}>
        {opcion('normal', t('posicionNormal'))}
        {opcion('redes', t('posicionRedes'))}
      </div>
      <div className="texto-meta" style={{ textAlign: 'right', color: 'var(--color-apagado)', marginTop: 'var(--aire-1)' }}>
        {t('posicionRedesExplicacion')}
      </div>
    </div>
  )
}

export default SelectorPosicion
