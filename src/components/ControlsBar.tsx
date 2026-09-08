import React, { useState } from 'react'
import { IdMotor } from '../motor/MotorDeVoz'

export interface ControlsBarProps {
  onStart: () => void
  onStop: () => void
  isRecording: boolean
  cuentaRegresiva?: number | null
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
  mostrarTiempo?: boolean
  setMostrarTiempo?: (mostrar: boolean) => void
  columnaAngosta?: boolean
  setColumnaAngosta?: (val: boolean) => void
  colorFondo?: string
  setColorFondo?: (val: string) => void
  colorLetra?: string
  setColorLetra?: (val: string) => void
  tipoFuente?: 'sans' | 'serif'
  setTipoFuente?: (val: 'sans' | 'serif') => void
  tema?: 'claro' | 'oscuro'
  setTema?: (tema: 'claro' | 'oscuro') => void
  engine?: IdMotor
  setEngine?: (engine: IdMotor) => void
  onToggleFullscreen?: () => void
}

// Escalera cerrada el 7 de septiembre de 2026.
const PASOS_LETRA = [14, 18, 24, 32, 42]

export default function ControlsBar({
  onStart,
  onStop,
  isRecording,
  cuentaRegresiva,
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
  mostrarTiempo,
  setMostrarTiempo,
  columnaAngosta = true,
  setColumnaAngosta,
  colorFondo = '#000000',
  setColorFondo,
  colorLetra = '#FFFFFF',
  setColorLetra,
  tipoFuente = 'sans',
  setTipoFuente,
  tema,
  setTema,
  engine,
  setEngine,
  onToggleFullscreen
}: ControlsBarProps) {
  const [ajustesAbierto, setAjustesAbierto] = useState(false)

  const enConteoOCrabando = isRecording || (cuentaRegresiva !== null && cuentaRegresiva !== undefined)

  function handleLetraMenos() {
    const idx = PASOS_LETRA.indexOf(fontSize)
    if (idx > 0) {
      setFontSize(PASOS_LETRA[idx - 1])
    } else if (idx === -1) {
      const menor = PASOS_LETRA.slice().reverse().find((p) => p < fontSize)
      if (menor !== undefined) {
        setFontSize(menor)
      } else {
        setFontSize(PASOS_LETRA[0])
      }
    }
  }

  function handleLetraMas() {
    const idx = PASOS_LETRA.indexOf(fontSize)
    if (idx >= 0 && idx < PASOS_LETRA.length - 1) {
      setFontSize(PASOS_LETRA[idx + 1])
    } else if (idx === -1) {
      const mayor = PASOS_LETRA.find((p) => p > fontSize)
      if (mayor !== undefined) {
        setFontSize(mayor)
      } else {
        setFontSize(PASOS_LETRA[PASOS_LETRA.length - 1])
      }
    }
  }

  function handleMargenMenos() {
    setMarginPercent(Math.max(0, marginPercent - 5))
  }

  function handleMargenMas() {
    setMarginPercent(Math.min(40, marginPercent + 5))
  }

  const botonBaseStyle: React.CSSProperties = {
    minWidth: 44,
    minHeight: 44,
    width: 44,
    height: 44,
    fontSize: 18,
    fontWeight: 'bold',
    cursor: 'pointer',
    borderRadius: 6,
    border: '1px solid var(--color-borde)',
    backgroundColor: 'var(--bg-suelo)',
    color: 'var(--color-texto)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
      {/* Fila principal visible siempre */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={onStart}
          disabled={enConteoOCrabando}
          style={{
            padding: '8px 18px',
            minHeight: 44,
            fontWeight: 'bold',
            fontSize: 15,
            cursor: enConteoOCrabando ? 'not-allowed' : 'pointer',
            borderRadius: 6,
            border: 'none',
            backgroundColor: enConteoOCrabando ? 'var(--color-borde)' : 'var(--color-acento)',
            color: 'var(--color-texto-acento)'
          }}
        >
          Iniciar
        </button>

        <button
          onClick={onStop}
          disabled={!enConteoOCrabando}
          style={{
            padding: '8px 18px',
            minHeight: 44,
            fontWeight: 'bold',
            fontSize: 15,
            cursor: !enConteoOCrabando ? 'not-allowed' : 'pointer',
            borderRadius: 6,
            border: 'none',
            backgroundColor: !enConteoOCrabando ? 'var(--color-borde)' : '#c62828',
            color: '#fff'
          }}
        >
          Detener
        </button>

        {/* Control de Tamaño de Letra */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: 'var(--bg-suelo)', padding: '2px 8px', borderRadius: 8, border: '1px solid var(--color-borde)' }}>
          <span style={{ fontSize: 13, color: 'var(--color-apagado)', fontWeight: 600 }}>Letra:</span>
          <button
            onClick={handleLetraMenos}
            aria-label="Disminuir letra"
            style={botonBaseStyle}
          >
            -
          </button>
          <span data-testid="valor-letra" style={{ minWidth: 42, textAlign: 'center', fontWeight: 'bold', fontSize: 15, color: 'var(--color-texto)' }}>
            {fontSize}
          </span>
          <button
            onClick={handleLetraMas}
            aria-label="Aumentar letra"
            style={botonBaseStyle}
          >
            +
          </button>
        </div>

        {/* Botón de Ajustes */}
        <button
          onClick={() => setAjustesAbierto(!ajustesAbierto)}
          style={{
            minHeight: 44,
            padding: '8px 16px',
            fontWeight: 600,
            cursor: 'pointer',
            borderRadius: 6,
            border: '1px solid var(--color-borde)',
            backgroundColor: ajustesAbierto ? 'var(--color-borde)' : 'var(--bg-superficie)',
            color: 'var(--color-texto)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}
          aria-expanded={ajustesAbierto}
        >
          ⚙ Ajustes
        </button>
      </div>

      {/* Panel de Ajustes */}
      {ajustesAbierto && (
        <div
          data-testid="panel-ajustes"
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            flexWrap: 'wrap',
            padding: 12,
            backgroundColor: 'var(--bg-superficie)',
            borderRadius: 8,
            border: '1px solid var(--color-borde)'
          }}
        >
          {/* El margen bajo a ajustes el 7 de septiembre de 2026. Con la columna angosta
              medida en caracteres casi no hace nada: solo cambia algo en el modo de ancho
              completo. Un control que ya no controla no va en la fila principal. */}
          {/* Ancho de Columna */}
          {setColumnaAngosta && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, color: '#555', fontWeight: 600 }}>Columna:</span>
              <select
                aria-label="Ancho de columna"
                value={columnaAngosta ? 'angosta' : 'completa'}
                onChange={(e) => setColumnaAngosta(e.target.value === 'angosta')}
                style={{ padding: 4 }}
              >
                <option value="angosta">Angosta (22ch)</option>
                <option value="completa">Ancho completo</option>
              </select>
            </label>
          )}

          {/* Fondo */}
          {setColorFondo && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, color: '#555', fontWeight: 600 }}>Fondo:</span>
              <select
                aria-label="Color de fondo"
                value={colorFondo}
                onChange={(e) => setColorFondo(e.target.value)}
                style={{ padding: 4 }}
              >
                <option value="#000000">Negro</option>
                <option value="#16181A">Gris</option>
                <option value="#FFFFFF">Blanco</option>
              </select>
            </label>
          )}

          {/* Color de Letra */}
          {setColorLetra && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: colorFondo.toUpperCase() === '#FFFFFF' ? 0.5 : 1 }}>
              <span style={{ fontSize: 13, color: '#555', fontWeight: 600 }}>Color Letra:</span>
              <select
                aria-label="Color de letra"
                value={colorFondo.toUpperCase() === '#FFFFFF' ? '#000000' : colorLetra}
                disabled={colorFondo.toUpperCase() === '#FFFFFF'}
                onChange={(e) => setColorLetra(e.target.value)}
                style={{ padding: 4 }}
              >
                <option value="#FFFFFF">Blanco</option>
                <option value="#F0C070">Ámbar</option>
                <option value="#3FD173">Verde</option>
              </select>
            </label>
          )}

          {/* Tipografía */}
          {setTipoFuente && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, color: '#555', fontWeight: 600 }}>Tipografía:</span>
              <select
                aria-label="Tipografía"
                value={tipoFuente}
                onChange={(e) => setTipoFuente(e.target.value as 'sans' | 'serif')}
                style={{ padding: 4 }}
              >
                <option value="sans">Source Sans 3</option>
                <option value="serif">Source Serif 4</option>
              </select>
            </label>
          )}

        {/* Control de Margen */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: 'var(--bg-suelo)', padding: '2px 8px', borderRadius: 8, border: '1px solid var(--color-borde)' }}>
            <span style={{ fontSize: 13, color: 'var(--color-apagado)', fontWeight: 600 }}>Margen:</span>
            <button
              onClick={handleMargenMenos}
              aria-label="Disminuir margen"
              style={botonBaseStyle}
            >
              -
            </button>
            <span style={{ minWidth: 42, textAlign: 'center', fontWeight: 'bold', fontSize: 15, color: 'var(--color-texto)' }}>
              {marginPercent}%
            </span>
            <button
              onClick={handleMargenMas}
              aria-label="Aumentar margen"
              style={botonBaseStyle}
            >
              +
            </button>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--color-texto)' }}>
            <input
              type="checkbox"
              checked={mirror}
              onChange={(e) => setMirror(e.target.checked)}
            /> Espejo
          </label>

          {setTema && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-texto)' }}>
              Tema:
              <select
                value={tema || 'claro'}
                onChange={(e) => setTema(e.target.value as 'claro' | 'oscuro')}
                style={{ padding: 4, borderRadius: 4, border: '1px solid var(--color-borde)', backgroundColor: 'var(--bg-suelo)', color: 'var(--color-texto)' }}
              >
                <option value="claro">Claro</option>
                <option value="oscuro">Oscuro</option>
              </select>
            </label>
          )}

          {setLineasZona && lineasZona !== undefined && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-texto)' }}>
              Líneas Zona ({lineasZona}):
              <input
                type="range"
                min={1}
                max={7}
                step={1}
                value={lineasZona}
                onChange={(e) => setLineasZona(Number(e.target.value))}
              />
            </label>
          )}

          {setAnclajeZona && anclajeZona !== undefined && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-texto)' }}>
              Anclaje:
              <select
                value={anclajeZona}
                onChange={(e) => setAnclajeZona(e.target.value as 'arriba' | 'medio' | 'abajo')}
                style={{ padding: 4, borderRadius: 4, border: '1px solid var(--color-borde)', backgroundColor: 'var(--bg-suelo)', color: 'var(--color-texto)' }}
              >
                <option value="arriba">Arriba</option>
                <option value="medio">Medio</option>
                <option value="abajo">Abajo</option>
              </select>
            </label>
          )}

          {setEngine && engine && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-texto)' }}>
              Motor de Voz (Avanzado):
              <select
                value={engine}
                onChange={(e) => setEngine(e.target.value as IdMotor)}
                style={{ padding: 4, borderRadius: 4, border: '1px solid var(--color-borde)', backgroundColor: 'var(--bg-suelo)', color: 'var(--color-texto)' }}
              >
                <option value="vosk">Vosk (Offline)</option>
                <option value="webspeech">Web Speech API</option>
                <option value="whisper-local">Whisper Local</option>
                <option value="nativo">Nativo (Android)</option>
              </select>
            </label>
          )}

          {setVerTranscripcion !== undefined && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--color-texto)' }}>
              <input
                type="checkbox"
                checked={!!verTranscripcion}
                onChange={(e) => setVerTranscripcion(e.target.checked)}
              /> Ver transcripción en vivo
            </label>
          )}

          {setMostrarTiempo !== undefined && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--color-texto)' }}>
              <input
                type="checkbox"
                checked={mostrarTiempo !== false}
                onChange={(e) => setMostrarTiempo(e.target.checked)}
              /> Mostrar tiempo
            </label>
          )}

          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              style={{
                minHeight: 36,
                padding: '6px 12px',
                cursor: 'pointer',
                borderRadius: 4,
                border: '1px solid var(--color-borde)',
                backgroundColor: 'var(--bg-suelo)',
                color: 'var(--color-texto)'
              }}
            >
              Pantalla Completa
            </button>
          )}
        </div>
      )}
    </div>
  )
}
