import React, { useCallback, useEffect, useRef, useState } from 'react'
import useASR from './hooks/useASR'
import { useSeguidor } from './hooks/useSeguidor'
import { useWakeLock } from './hooks/useWakeLock'
import TeleprompterView from './components/TeleprompterView'
import ControlsBar from './components/ControlsBar'
import { IdMotor, MotorDeVoz } from './motor/MotorDeVoz'
import { Guion, guionNuevo } from './datos/modelo'
import { RepositorioGuiones } from './datos/RepositorioGuiones'
import { RepositorioIndexedDB } from './datos/RepositorioIndexedDB'
import { RepositorioMemoria } from './datos/RepositorioMemoria'

interface AppProps {
  motor?: MotorDeVoz
  repoOverride?: RepositorioGuiones
}

const DEFAULT_SCRIPT_TEXT = `Bienvenido al teleprompter.\nLee este texto en voz alta para probar el reconocimiento.`

export default function App({ motor, repoOverride }: AppProps) {
  const repoRef = useRef<RepositorioGuiones>(repoOverride || new RepositorioIndexedDB())
  const [usandoMemoriaFallback, setUsandoMemoriaFallback] = useState<boolean>(false)
  const [errorRepositorio, setErrorRepositorio] = useState<string | null>(null)

  const [guionActual, setGuionActual] = useState<Guion>(() => {
    const g = guionNuevo('es')
    g.titulo = 'Guion principal'
    g.bloques = [{ id: 'b-1', nombre: '', texto: DEFAULT_SCRIPT_TEXT }]
    return g
  })

  const [cargado, setCargado] = useState<boolean>(false)

  // Cargar/Migrar al arrancar
  useEffect(() => {
    let repo = repoRef.current

    async function inicializar() {
      let textoViejo: string | null = null
      try {
        textoViejo = localStorage.getItem('teleprompter_script')
      } catch (e) {
      }

      // 1. Si existe clave en localStorage, migrar al repositorio
      if (textoViejo && textoViejo.trim()) {
        const gMigrado: Guion = {
          id: 'migrado-' + Date.now(),
          titulo: 'Guion importado',
          idioma: 'es',
          creado: Date.now(),
          modificado: Date.now(),
          bloques: [
            {
              id: 'b-migrado',
              nombre: '',
              texto: textoViejo
            }
          ]
        }

        try {
          await repo.guardar(gMigrado)
          try {
            localStorage.removeItem('teleprompter_script')
          } catch (e) {}
          setGuionActual(gMigrado)
          setCargado(true)
          return
        } catch (e) {
          console.warn('[App] Error al migrar guion desde localStorage:', e)
          setErrorRepositorio('Falló la migración del guion desde localStorage.')
        }
      }

      // 2. Abrir el guión más reciente o fallback a RepositorioMemoria
      let guionCargado: Guion | null = null

      try {
        const lista = await repo.listar()
        if (lista.length > 0) {
          guionCargado = await repo.abrir(lista[0].id)
        }
      } catch (e) {
        console.warn('[App] Error al acceder a RepositorioIndexedDB, cayendo a RepositorioMemoria:', e)
        repo = new RepositorioMemoria()
        repoRef.current = repo
        setUsandoMemoriaFallback(true)
        setErrorRepositorio('IndexedDB no está disponible; se está usando almacenamiento en memoria.')
      }

      if (guionCargado) {
        setGuionActual(guionCargado)
      } else {
        const gInicial = guionNuevo('es')
        gInicial.titulo = 'Guion principal'
        gInicial.bloques = [{ id: 'b-1', nombre: '', texto: DEFAULT_SCRIPT_TEXT }]
        try {
          await repo.guardar(gInicial)
          setGuionActual(gInicial)
        } catch (e) {
          console.warn('[App] Error al guardar guion inicial:', e)
        }
      }

      setCargado(true)
    }

    inicializar()
  }, [])

  // Auto-guardado al modificar el texto del bloque
  useEffect(() => {
    if (!cargado) return
    const timer = setTimeout(async () => {
      try {
        await repoRef.current.guardar(guionActual)
      } catch (e) {
        console.warn('[App] Error al guardar guion en repositorio:', e)
        setErrorRepositorio('Error al guardar cambios en el repositorio.')
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [guionActual, cargado])

  const [engine, setEngine] = useState<IdMotor>('whisper-local')
  const [fontSize, setFontSize] = useState<number>(32)
  const [marginPercent, setMarginPercent] = useState<number>(10)
  const [mirror, setMirror] = useState<boolean>(false)
  const [esPantallaCompleta, setEsPantallaCompleta] = useState<boolean>(false)

  const [motivoFreno, setMotivoFreno] = useState<'silencio' | 'sin-calce' | 'correa' | 'fin-de-linea' | 'fin-de-bloque' | null>(null)
  const [avanzando, setAvanzando] = useState<boolean>(false)

  const prompterContainerRef = useRef<HTMLDivElement | null>(null)

  const {
    bloqueActual,
    lineaActual,
    palabraActual,
    alRecibirParcial: seguidorParcial,
    alRecibirFinal: seguidorFinal,
    alNotificarVoz: seguidorVoz,
    reiniciar,
    motorAvance
  } = useSeguidor(guionActual)

  const {
    start,
    stop,
    clear,
    isRecording,
    transcript,
    ready,
    estadoMotor,
    dispositivoComputo,
    progresoDescarga,
    ultimoError,
    motorActivo
  } = useASR({
    engine,
    lang: 'es-ES',
    motor,
    alRecibirParcial: seguidorParcial,
    alRecibirFraseFinal: seguidorFinal,
    alNotificarVoz: seguidorVoz
  })

  const { activo: wakeLockActivo, solicitar: solicitarWakeLock, soltar: soltarWakeLock } = useWakeLock()

  const handleEstadoAvanceChange = useCallback((motivo: 'silencio' | 'sin-calce' | 'correa' | 'fin-de-linea' | 'fin-de-bloque' | null, isAvanzando: boolean) => {
    setMotivoFreno(motivo)
    setAvanzando(isAvanzando)
  }, [])

  async function handleStart() {
    await solicitarWakeLock()
    await start()
  }

  async function handleStop() {
    await stop()
    await soltarWakeLock()
  }

  function handleClear() {
    clear()
    reiniciar()
  }

  function toggleFullscreen() {
    if (!prompterContainerRef.current) return
    if (!document.fullscreenElement) {
      prompterContainerRef.current.requestFullscreen().then(() => {
        setEsPantallaCompleta(true)
      }).catch((err) => {
        console.warn('Error al activar pantalla completa:', err)
      })
    } else {
      document.exitFullscreen().then(() => {
        setEsPantallaCompleta(false)
      }).catch(() => {})
    }
  }

  useEffect(() => {
    const handleFSChange = () => {
      setEsPantallaCompleta(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFSChange)
    return () => document.removeEventListener('fullscreenchange', handleFSChange)
  }, [])

  const primerTexto = guionActual.bloques && guionActual.bloques[0] ? guionActual.bloques[0].texto : ''

  function handleTextChange(nuevoTexto: string) {
    setGuionActual((prev) => {
      const copiaBloques = prev.bloques && prev.bloques.length > 0 ? [...prev.bloques] : [{ id: 'b-1', nombre: '', texto: '' }]
      copiaBloques[0] = { ...copiaBloques[0], texto: nuevoTexto }
      return {
        ...prev,
        bloques: copiaBloques,
        modificado: Date.now()
      }
    })
  }

  let textoFreno = ''
  if (!avanzando && motivoFreno) {
    if (motivoFreno === 'silencio') textoFreno = 'esperando voz'
    else if (motivoFreno === 'sin-calce') textoFreno = 'no reconozco lo que lees'
    else if (motivoFreno === 'correa') textoFreno = 'adelantado, espero'
    else if (motivoFreno === 'fin-de-linea') textoFreno = 'fin de línea, espero'
    else if (motivoFreno === 'fin-de-bloque') textoFreno = 'fin de bloque, espero'
  }

  const tituloMostrar = (guionActual.titulo && guionActual.titulo.trim()) ? guionActual.titulo : 'Sin título'

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif', maxWidth: 1200, margin: '0 auto' }}>
      <h1>Teleprompter MVP</h1>
      <h3 style={{ color: '#555', marginTop: -10 }}>{tituloMostrar}</h3>

      {/* Franja de estado visible */}
      <div
        style={{
          background: (ultimoError || errorRepositorio) ? '#ffebee' : '#e8f5e9',
          color: (ultimoError || errorRepositorio) ? '#c62828' : '#2e7d32',
          padding: '10px 14px',
          borderRadius: 6,
          marginBottom: 16,
          fontSize: 14,
          border: `1px solid ${(ultimoError || errorRepositorio) ? '#ef9a9a' : '#a5d6a7'}`
        }}
      >
        <strong>Franja de Estado:</strong>
        <div style={{ marginTop: 4 }}>
          <span>Estado del Motor: <strong>{estadoMotor}</strong></span>
          <span style={{ marginLeft: 16 }}>Motor Activo: <strong>{motorActivo}</strong></span>
          {engine === 'whisper-local' && (
            <span style={{ marginLeft: 16 }}>Dispositivo: <strong>{dispositivoComputo}</strong></span>
          )}
          <span style={{ marginLeft: 16 }}>Bloqueo Pantalla: <strong>{wakeLockActivo ? 'Sí 🔒' : 'No'}</strong></span>
          {textoFreno && (
            <span style={{ marginLeft: 16, color: '#d84315', fontWeight: 'bold' }}>
              Estado Avance: 🛑 {textoFreno}
            </span>
          )}
          {usandoMemoriaFallback && (
            <span style={{ marginLeft: 16, color: '#b71c1c', fontWeight: 'bold' }}>
              ⚠️ Almacenamiento: En Memoria (IndexedDB no disponible)
            </span>
          )}
        </div>
        {ultimoError && (
          <div style={{ marginTop: 6, fontWeight: 'bold' }}>
            Último Error Motor: {ultimoError}
          </div>
        )}
        {errorRepositorio && (
          <div style={{ marginTop: 6, fontWeight: 'bold', color: '#b71c1c' }}>
            Aviso Repositorio: {errorRepositorio}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {!esPantallaCompleta && (
          <div style={{ flex: 1, minWidth: 320 }}>
            <label>
              <strong>Guion:</strong>
              <textarea
                value={primerTexto}
                onChange={(e) => handleTextChange(e.target.value)}
                rows={12}
                style={{ width: '100%', marginTop: 8, fontFamily: 'inherit', fontSize: 16, padding: 8 }}
              />
            </label>

            <div style={{ marginTop: 12 }}>
              <label>
                <strong>Motor ASR: </strong>
                <select
                  value={engine}
                  onChange={(e) => setEngine(e.target.value as IdMotor)}
                  style={{ marginLeft: 8, padding: 4 }}
                >
                  <option value="whisper-local">Whisper Local (On-Device WebGPU/WASM)</option>
                  <option value="webspeech">Web Speech API (Navegador)</option>
                  <option value="nativo">Nativo (Android - Tarea 2)</option>
                </select>
              </label>
            </div>

            <ControlsBar
              onStart={handleStart}
              onStop={handleStop}
              isRecording={isRecording}
              fontSize={fontSize}
              setFontSize={setFontSize}
              marginPercent={marginPercent}
              setMarginPercent={setMarginPercent}
              mirror={mirror}
              setMirror={setMirror}
              onToggleFullscreen={toggleFullscreen}
            />

            <div style={{ marginTop: 12 }}>
              <button onClick={handleClear} style={{ padding: '6px 12px' }}>
                Limpiar Transcripción y Reiniciar Seguidor
              </button>
            </div>

            <div style={{ marginTop: 12 }}>
              <strong>Estado del Motor:</strong> {estadoMotor}
            </div>

            <div style={{ marginTop: 12 }}>
              <strong>Transcripción (en vivo):</strong>
              <div
                style={{
                  minHeight: 100,
                  border: '1px solid #ddd',
                  padding: 8,
                  marginTop: 6,
                  whiteSpace: 'pre-wrap',
                  background: '#f8f8f8',
                  borderRadius: 4,
                  fontSize: 14
                }}
              >
                {transcript || <em>— ninguna —</em>}
              </div>
            </div>
          </div>
        )}

        <div
          ref={prompterContainerRef}
          style={{
            flex: esPantallaCompleta ? '1 1 100%' : '1 1 420px',
            minWidth: 320,
            height: esPantallaCompleta ? '100vh' : 480,
            background: '#000',
            borderRadius: esPantallaCompleta ? 0 : 6,
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <TeleprompterView
            script={guionActual}
            currentBlockIndex={bloqueActual}
            currentLineIndex={lineaActual}
            currentWordIndex={palabraActual}
            fontSize={fontSize}
            marginPercent={marginPercent}
            mirror={mirror}
            motorAvance={motorAvance}
            onEstadoAvanceChange={handleEstadoAvanceChange}
          />
        </div>
      </div>
    </div>
  )
}
