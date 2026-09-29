// Salio de App.tsx el 29-09-2026, tarea 81: el aviso de que se esta bajando el modelo de Vosk,
// o de que fallo, con su boton para reintentar. La condicion de cuando se muestra queda en App;
// oculto es la de siempre -camara detras o en recuadro durante la lectura-, calculada en App.
import React from 'react'
import { t } from '../textos'
import { EstadoPrecarga } from '../hooks/usePrecargaModelo'

interface IndicadorPrecargaProps {
  estadoPrecarga: EstadoPrecarga
  progresoPrecarga: number
  errorPrecarga: string | null
  reintentarPrecarga: () => void
  oculto: boolean
}

export function IndicadorPrecarga({ estadoPrecarga, progresoPrecarga, errorPrecarga, reintentarPrecarga, oculto }: IndicadorPrecargaProps) {
  return (
    /* Indicador de precarga de modelo Vosk */
    <div
      style={{
        background: 'var(--bg-suelo)',
        color: estadoPrecarga === 'error' || estadoPrecarga === 'sin-conexion' ? 'var(--color-grabando)' : 'var(--color-texto)',
        padding: 'var(--aire-2) var(--aire-3)',
        borderRadius: 'var(--redondeo)',
        marginBottom: 'var(--aire-4)',
        fontSize: 'var(--texto-meta)',
        border: '1px solid var(--color-borde)',
        display: oculto ? 'none' : 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}
    >
      {estadoPrecarga === 'descargando' && (
        <span>
          ⏬ {t('descargandoModelo')} <strong>{Math.round(progresoPrecarga * 100)}%</strong>
        </span>
      )}
      {/* Sin internet para bajar la voz en inglés -tarea 84, D3-: qué pasa y que es una sola vez.
          Reintentar vuelve a apretar Empezar. */}
      {estadoPrecarga === 'sin-conexion' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--aire-3)', width: '100%', justifyContent: 'space-between' }}>
          <span data-testid="aviso-voz-sin-conexion">⚠️ {t('vozSinConexion')}</span>
          <button
            onClick={reintentarPrecarga}
            style={{ padding: 'var(--aire-1) var(--aire-2)', fontSize: 'var(--texto-meta)', cursor: 'pointer' }}
          >
            {t('reintentar')}
          </button>
        </div>
      )}
      {estadoPrecarga === 'error' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--aire-3)', width: '100%', justifyContent: 'space-between' }}>
          <span>
            ⚠️ {t('errorModelo', { detalle: errorPrecarga || t('desconocido') })}
          </span>
          <button
            onClick={reintentarPrecarga}
            style={{ padding: 'var(--aire-1) var(--aire-2)', fontSize: 'var(--texto-meta)', cursor: 'pointer' }}
          >
            {t('reintentar')}
          </button>
        </div>
      )}
    </div>
  )
}
