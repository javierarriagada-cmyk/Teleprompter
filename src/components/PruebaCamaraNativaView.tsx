import React, { useEffect, useState } from 'react'
import { CameraPreview } from '@capgo/camera-preview'
import { registerPlugin } from '@capacitor/core'

export interface CamaraNativaPlugin {
  fijarModoSuperficie(options: { modo: 'sistema' | 'textura' }): Promise<{ encontrado: boolean; modo: string }>
}

const CamaraNativa = registerPlugin<CamaraNativaPlugin>('CamaraNativa')

interface PruebaCamaraNativaViewProps {
  onVolver: () => void
}

export default function PruebaCamaraNativaView({ onVolver }: PruebaCamaraNativaViewProps) {
  const [toBack, setToBack] = useState<boolean>(true)
  const [modoSuperficie, setModoSuperficie] = useState<'sistema' | 'textura'>('sistema')
  const [camaraIniciada, setCamaraIniciada] = useState<boolean>(false)
  const [errorCamara, setErrorCamara] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false

    async function arrancar(modoToBack: boolean, modoSup: 'sistema' | 'textura') {
      try {
        setErrorCamara(null)
        await CameraPreview.start({
          position: 'front',
          toBack: modoToBack,
          disableAudio: true,
          force: true
        })
        try {
          await CamaraNativa.fijarModoSuperficie({ modo: modoSup })
        } catch (e) {
          console.warn('[PruebaCamaraNativa] fijarModoSuperficie no disponible en esta plataforma:', e)
        }
        if (!cancelado) {
          setCamaraIniciada(true)
        }
      } catch (err: any) {
        console.error('[PruebaCamaraNativa] Error al iniciar cámara:', err)
        if (!cancelado) {
          setErrorCamara(err?.message || 'Error desconocido al iniciar cámara')
        }
      }
    }

    arrancar(toBack, modoSuperficie)

    return () => {
      cancelado = true
      CameraPreview.stop().catch(() => {})
    }
  }, [toBack, modoSuperficie])

  async function handleToggleToBack() {
    const nuevoToBack = !toBack
    setToBack(nuevoToBack)
  }

  async function handleToggleSuperficie() {
    const nuevoModo = modoSuperficie === 'sistema' ? 'textura' : 'sistema'
    setModoSuperficie(nuevoModo)
  }

  async function handleSalir() {
    try {
      await CameraPreview.stop()
    } catch (e) {
      // ignorar
    }
    onVolver()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: toBack ? 'transparent' : '#000000',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 'calc(24px + env(safe-area-inset-top, 0px)) calc(16px + env(safe-area-inset-right, 0px)) calc(24px + env(safe-area-inset-bottom, 0px)) calc(16px + env(safe-area-inset-left, 0px))',
        boxSizing: 'border-box'
      }}
    >
      {/* Barra superior de controles */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: 'rgba(34, 31, 29, 0.85)',
          padding: '12px 16px',
          borderRadius: '12px',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}
      >
        <button
          onClick={handleSalir}
          style={{
            padding: '10px 16px',
            backgroundColor: '#1E1B19',
            color: '#E7E1DE',
            border: '1px solid #968F8B',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '15px',
            cursor: 'pointer'
          }}
        >
          ← Salir
        </button>

        <button
          onClick={handleToggleToBack}
          style={{
            padding: '10px 16px',
            backgroundColor: toBack ? '#E11D2E' : '#2D2927',
            color: '#FFFFFF',
            border: '1px solid #968F8B',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '15px',
            cursor: 'pointer'
          }}
        >
          toBack: {toBack ? 'TRUE' : 'FALSE'}
        </button>

        <button
          onClick={handleToggleSuperficie}
          style={{
            padding: '10px 16px',
            backgroundColor: modoSuperficie === 'sistema' ? '#E11D2E' : '#2D2927',
            color: '#FFFFFF',
            border: '1px solid #968F8B',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '15px',
            cursor: 'pointer'
          }}
        >
          Superficie: {modoSuperficie === 'sistema' ? 'SISTEMA' : 'TEXTURA'}
        </button>
      </div>

      {/* Estado flotante abajo */}
      <div
        style={{
          backgroundColor: 'rgba(34, 31, 29, 0.85)',
          color: '#E7E1DE',
          padding: '12px 16px',
          borderRadius: '12px',
          fontSize: '13px',
          textAlign: 'center',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}
      >
        <div>Prueba de Cámara Nativa</div>
        <div style={{ marginTop: '4px', fontWeight: 600 }}>
          Modo actual: toBack = {toBack ? 'true (detrás)' : 'false (frente)'} | Superficie = {modoSuperficie.toUpperCase()}
        </div>
        {errorCamara && (
          <div style={{ color: '#FF5A5A', marginTop: '4px' }}>
            Error: {errorCamara}
          </div>
        )}
        {!camaraIniciada && !errorCamara && (
          <div style={{ color: '#CAC5C2', marginTop: '4px' }}>
            Iniciando sesión nativa de cámara...
          </div>
        )}
      </div>
    </div>
  )
}
