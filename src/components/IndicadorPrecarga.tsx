// Salio de App.tsx el 29-09-2026, tarea 81: el aviso de que se esta bajando el modelo de Vosk,
// o de que fallo, con su boton para reintentar. La condicion de cuando se muestra queda en App;
// oculto es la de siempre -camara detras o en recuadro durante la lectura-, calculada en App.
import React from 'react'
import { t, idiomaEnFrase } from '../textos'
import { EstadoPrecarga } from '../hooks/usePrecargaModelo'
import { idiomaApp } from '../lib/idioma'
import { IconoAdvertencia, IconoDescarga } from './IconosApp'

interface IndicadorPrecargaProps {
  estadoPrecarga: EstadoPrecarga
  progresoPrecarga: number
  errorPrecarga: string | null
  reintentarPrecarga: () => void
  oculto: boolean
  // -portugues-voz, punto 6, 2026-10-22- El idioma de la voz que se baja. Sin él, el de la app, como antes.
  idiomaVoz?: string
}

export function IndicadorPrecarga({ estadoPrecarga, progresoPrecarga, errorPrecarga, reintentarPrecarga, oculto, idiomaVoz }: IndicadorPrecargaProps) {
  return (
    /* Indicador de precarga de modelo Vosk */
    // -pulido-1- El color va en una clase -T209-: el rojo del error es --color-grabando-texto, el que se
    // lee como letra. Antes: color: estadoPrecarga === 'error' || estadoPrecarga === 'sin-conexion' ? 'var(--color-grabando)' : 'var(--color-texto)',
    <div
      className={estadoPrecarga === 'error' || estadoPrecarga === 'sin-conexion' ? 'indicador-precarga con-error' : 'indicador-precarga'}
      style={{
        background: 'var(--bg-suelo)',
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
          {/* -pulido-1- Ícono de la casa en vez del emoji. Antes: ⏬ {t('descargandoModelo')} */}
          <IconoDescarga tamano={16} className="icono-precarga" /> {t('descargandoModelo')} <strong>{Math.round(progresoPrecarga * 100)}%</strong>
        </span>
      )}
      {/* Sin internet para bajar la voz en inglés -tarea 84, D3-: qué pasa y que es una sola vez.
          Reintentar vuelve a apretar Empezar. */}
      {/* -tarea 104- App ya no llega aquí sin conexión: ese aviso va abajo, donde se abren los paneles
          de las fichas -FichasListo, lámina b-, y aquí queda solo el error. Si alguna vez llega, el
          texto es el de cualquier idioma, con el de la app. Antes: ⚠️ {t('vozSinConexion')} */}
      {estadoPrecarga === 'sin-conexion' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--aire-3)', width: '100%', justifyContent: 'space-between' }}>
          <span data-testid="aviso-voz-sin-conexion">{/* -pulido-1- Antes: ⚠️ */}<IconoAdvertencia tamano={16} className="icono-precarga" /> {t('vozSinConexion', { idioma: idiomaEnFrase(idiomaVoz || idiomaApp()) })}</span>
          {/* -portugues-voz, punto 6, 2026-10-22- El idioma sale del mapa y es el de la voz: con tres idiomas el
              ternario mandaba pt a español. Antes: {t('vozSinConexion', { idioma: t(idiomaApp() === 'en' ? 'idiomaEn' : 'idiomaEs') })} */}
          {/* -pulido-1- Cápsula como .segmentado-opcion y 48 px de toque -.boton-reintentar-precarga-.
              Antes: <button onClick={reintentarPrecarga} style={{ padding: 'var(--aire-1) var(--aire-2)', fontSize: 'var(--texto-meta)', cursor: 'pointer' }}> */}
          <button
            type="button"
            className="segmentado-opcion boton-reintentar-precarga"
            onClick={reintentarPrecarga}
          >
            {t('reintentar')}
          </button>
        </div>
      )}
      {estadoPrecarga === 'error' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--aire-3)', width: '100%', justifyContent: 'space-between' }}>
          <span>
            {/* Antes: ⚠️ {t('errorModelo', { detalle: errorPrecarga || t('desconocido') })} */}
            {/* -pulido-1- Ícono de la casa en vez del emoji. Antes: ⚠️ {t('errorModelo')} */}
            <IconoAdvertencia tamano={16} className="icono-precarga" /> {t('errorModelo')}
          </span>
          {/* -pulido-1- Cápsula como .segmentado-opcion y 48 px de toque -.boton-reintentar-precarga-.
              Antes: <button onClick={reintentarPrecarga} style={{ padding: 'var(--aire-1) var(--aire-2)', fontSize: 'var(--texto-meta)', cursor: 'pointer' }}> */}
          <button
            type="button"
            className="segmentado-opcion boton-reintentar-precarga"
            onClick={reintentarPrecarga}
          >
            {t('reintentar')}
          </button>
        </div>
      )}
    </div>
  )
}
