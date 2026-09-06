import React from 'react'

interface ControlsBarProps {
  onStart: () => void
  onStop: () => void
  isRecording: boolean
  fontSize: number
  setFontSize: (size: number) => void
  marginPercent: number
  setMarginPercent: (margin: number) => void
  mirror: boolean
  setMirror: (mirror: boolean) => void
  lineasZona?: number
  setLineasZona?: (val: number) => void
  anclajeZona?: 'arriba' | 'medio' | 'abajo'
  setAnclajeZona?: (val: 'arriba' | 'medio' | 'abajo') => void
  verTranscripcion?: boolean
  setVerTranscripcion?: (ver: boolean) => void
  onToggleFullscreen?: () => void
}

export default function ControlsBar({
  onStart,
  onStop,
  isRecording,
  fontSize,
  setFontSize,
  marginPercent,
  setMarginPercent,
  mirror,
  setMirror,
  lineasZona,
  setLineasZona,
  anclajeZona,
  setAnclajeZona,
  verTranscripcion,
  setVerTranscripcion,
  onToggleFullscreen
}: ControlsBarProps) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
      <button onClick={onStart} disabled={isRecording} style={{ padding: '6px 16px', fontWeight: 'bold' }}>
        Iniciar
      </button>
      <button onClick={onStop} disabled={!isRecording} style={{ padding: '6px 16px' }}>
        Detener
      </button>

      <label style={{ marginLeft: 8 }}>
        Letra ({fontSize}px):
        <input
          type="range"
          min={16}
          max={96}
          step={2}
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          style={{ marginLeft: 6 }}
        />
      </label>

      <label style={{ marginLeft: 8 }}>
        Margen ({marginPercent}%):
        <input
          type="range"
          min={0}
          max={40}
          step={2}
          value={marginPercent}
          onChange={(e) => setMarginPercent(Number(e.target.value))}
          style={{ marginLeft: 6 }}
        />
      </label>

      <label style={{ marginLeft: 8 }}>
        <input
          type="checkbox"
          checked={mirror}
          onChange={(e) => setMirror(e.target.checked)}
        /> Espejo
      </label>

      {setVerTranscripcion !== undefined && (
        <label style={{ marginLeft: 8 }}>
          <input
            type="checkbox"
            checked={!!verTranscripcion}
            onChange={(e) => setVerTranscripcion(e.target.checked)}
          /> Ver transcripción en vivo
        </label>
      )}

      {setLineasZona && lineasZona !== undefined && (
        <label style={{ marginLeft: 8 }}>
          Líneas Zona ({lineasZona}):
          <input
            type="range"
            min={1}
            max={7}
            step={1}
            value={lineasZona}
            onChange={(e) => setLineasZona(Number(e.target.value))}
            style={{ marginLeft: 6 }}
          />
        </label>
      )}

      {setAnclajeZona && anclajeZona !== undefined && (
        <label style={{ marginLeft: 8 }}>
          Anclaje:
          <select
            value={anclajeZona}
            onChange={(e) => setAnclajeZona(e.target.value as 'arriba' | 'medio' | 'abajo')}
            style={{ marginLeft: 6 }}
          >
            <option value="arriba">Arriba</option>
            <option value="medio">Medio</option>
            <option value="abajo">Abajo</option>
          </select>
        </label>
      )}

      {onToggleFullscreen && (
        <button onClick={onToggleFullscreen} style={{ marginLeft: 'auto', padding: '6px 12px' }}>
          Pantalla Completa
        </button>
      )}
    </div>
  )
}
