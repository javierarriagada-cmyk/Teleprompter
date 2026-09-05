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

      {onToggleFullscreen && (
        <button onClick={onToggleFullscreen} style={{ marginLeft: 'auto', padding: '6px 12px' }}>
          Pantalla Completa
        </button>
      )}
    </div>
  )
}
