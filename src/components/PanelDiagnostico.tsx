// Salio de App.tsx el 29-09-2026, tarea 81: la franja de estado para nosotros -motor, errores,
// transcripcion, panel de medicion-. Esta aparte porque se saca de la app antes de subir a
// Play: aislada, sacarla es borrar este archivo y una linea de App. La condicion
// mostrarDiagnostico queda en App.
import React from 'react'
import type { FondoToma } from '../App'
import { IdMotor } from '../motor/MotorDeVoz'
import { hapticaToqueSuave } from '../haptica'

interface PanelDiagnosticoProps {
  ultimoError: string | null
  errorRepositorio: string | null
  camaraActiva: boolean
  fondoToma: FondoToma
  vista: string
  estadoMotor: string
  modoManual: boolean
  motorActivo: string
  wakeLockActivo: boolean
  textoFreno: string
  usandoMemoriaFallback: boolean
  engine: IdMotor
  setEngine: (engine: IdMotor) => void
  verTranscripcion: boolean
  setVerTranscripcion: (ver: boolean) => void
  setMostrarPanelCorpus: (mostrar: boolean) => void
}

export function PanelDiagnostico({
  ultimoError,
  errorRepositorio,
  camaraActiva,
  fondoToma,
  vista,
  estadoMotor,
  modoManual,
  motorActivo,
  wakeLockActivo,
  textoFreno,
  usandoMemoriaFallback,
  engine,
  setEngine,
  verTranscripcion,
  setVerTranscripcion,
  setMostrarPanelCorpus
}: PanelDiagnosticoProps) {
  return (
    /* Franja de estado escondida por omision - se activa mediante toque largo en el resumen de la biblioteca */
    <div
      data-testid="franja-de-estado-diagnostico"
      style={{
        background: (ultimoError || errorRepositorio) ? 'var(--bg-suelo)' : 'var(--bg-superficie)',
        color: (ultimoError || errorRepositorio) ? 'var(--color-grabando)' : 'var(--color-texto)',
        padding: 'var(--aire-2) var(--aire-3)',
        borderRadius: 'var(--redondeo)',
        marginBottom: 'var(--aire-4)',
        fontSize: 'var(--texto-meta)',
        border: '1px solid var(--color-borde)',
        display: (camaraActiva && (fondoToma === 'detras' || fondoToma === 'recuadro') && vista === 'lectura') ? 'none' : 'block'
      }}
    >
      <strong>Franja de Estado:</strong>
      <div style={{ marginTop: 'var(--aire-1)' }}>
        <span>Estado del Motor: <strong>{estadoMotor}</strong></span>
        {modoManual && <span style={{ marginLeft: 'var(--aire-4)', color: 'var(--color-acento)', fontWeight: 600 }}>MODO MANUAL: mandas tú</span>}
        <span style={{ marginLeft: 'var(--aire-4)' }}>Motor Activo: <strong>{motorActivo}</strong></span>
        <span style={{ marginLeft: 'var(--aire-4)' }}>Bloqueo Pantalla: <strong>{wakeLockActivo ? 'Sí' : 'No'}</strong></span>
        {textoFreno && (
          <span style={{ marginLeft: 'var(--aire-4)', color: 'var(--color-grabando)', fontWeight: 'bold' }}>
            Estado Avance: {textoFreno}
          </span>
        )}
        {usandoMemoriaFallback && (
          <span style={{ marginLeft: 'var(--aire-4)', color: 'var(--color-grabando)', fontWeight: 'bold' }}>
            ⚠️ Almacenamiento: En Memoria (IndexedDB no disponible)
          </span>
        )}
      </div>
      {ultimoError && (
        <div style={{ marginTop: 'var(--aire-2)', fontWeight: 'bold' }}>
          Último Error Motor: {ultimoError}
        </div>
      )}
      {errorRepositorio && (
        <div style={{ marginTop: 'var(--aire-2)', fontWeight: 'bold', color: 'var(--color-grabando)' }}>
          Aviso Repositorio: {errorRepositorio}
        </div>
      )}
      {/* Lo nuestro: motor, transcripcion y medicion. No van en el
          menu de la portada. Esta franja es la unica puerta. */}
      <div data-testid="apartado-nuestro" style={{ marginTop: 'var(--aire-3)', paddingTop: 'var(--aire-2)', borderTop: '1px solid var(--color-separador)' }}>
        <div className="texto-meta" style={{ color: 'var(--color-apagado)', fontWeight: 600, marginBottom: 'var(--aire-2)' }}>
          Motor de voz y transcripción
        </div>
        <label className="texto-meta" style={{ display: 'block', color: 'var(--color-apagado)', marginBottom: 'var(--aire-2)' }}>
          Motor de voz:
          <select
            aria-label="Motor de Voz"
            value={engine}
            onChange={(e) => setEngine(e.target.value as IdMotor)}
            style={{
              width: '100%',
              marginTop: 'var(--aire-1)',
              padding: 'var(--aire-1) var(--aire-2)',
              fontSize: 'var(--texto-meta)',
              borderRadius: 'var(--redondeo)',
              border: '1px solid var(--color-borde)',
              backgroundColor: 'var(--bg-suelo)',
              color: 'var(--color-texto)'
            }}
          >
            <option value="vosk">Vosk (Offline)</option>
            <option value="nativo">Nativo</option>
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: 'var(--texto-meta)', color: 'var(--color-texto)', marginBottom: 'var(--aire-2)' }}>
          <span>Ver transcripción en vivo</span>
          <input
            type="checkbox"
            checked={verTranscripcion}
            onChange={(e) => {
              hapticaToqueSuave()
              setVerTranscripcion(e.target.checked)
            }}
            style={{ width: 16, height: 16, accentColor: 'var(--color-acento)' }}
          />
        </label>
        <button
          type="button"
          data-testid="btn-abrir-corpus"
          onClick={() => setMostrarPanelCorpus(true)}
          style={{
            padding: 'var(--aire-2) 0',
            textAlign: 'left',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-texto)',
            fontSize: 'var(--texto-cuerpo)',
            cursor: 'pointer'
          }}
        >
          Medición / Panel Corpus
        </button>
      </div>
    </div>
  )
}
