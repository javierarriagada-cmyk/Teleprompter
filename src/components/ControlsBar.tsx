import React from 'react'

interface ControlsBarProps {
  onStart: () => void
  onStop: () => void
  isRecording: boolean
  speed: number
  setSpeed: (speed: number) => void
  mirror: boolean
  setMirror: (mirror: boolean) => void
  preloadOnWifi: boolean
  setPreloadOnWifi: (preload: boolean) => void
}

export default function ControlsBar({ onStart, onStop, isRecording, speed, setSpeed, mirror, setMirror, preloadOnWifi, setPreloadOnWifi }: ControlsBarProps) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
      <button onClick={onStart} disabled={isRecording}>Iniciar</button>
      <button onClick={onStop} disabled={!isRecording}>Detener</button>
      <label style={{ marginLeft: 8 }}>
        Velocidad:
        <input type="range" min={0.5} max={2.0} step={0.1} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
      </label>
      <label>
        <input type="checkbox" checked={mirror} onChange={(e) => setMirror(e.target.checked)} /> Mirror
      </label>
      <label>
        <input type="checkbox" checked={preloadOnWifi} onChange={(e) => setPreloadOnWifi(e.target.checked)} /> Preload Wi‑Fi
      </label>
    </div>
  )
}
