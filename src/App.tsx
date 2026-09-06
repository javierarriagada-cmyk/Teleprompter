import React, { useCallback, useEffect, useRef, useState } from 'react'
import useASR from './hooks/useASR'
import { useSeguidor } from './hooks/useSeguidor'
import { useWakeLock } from './hooks/useWakeLock'
import TeleprompterView from './components/TeleprompterView'
import ControlsBar from './components/ControlsBar'
import BibliotecaView from './components/BibliotecaView'
import EditorView from './components/EditorView'
import { IdMotor, MotorDeVoz } from './motor/MotorDeVoz'
import { Guion, ResumenGuion, guionNuevo } from './datos/modelo'
import { RepositorioGuiones } from './datos/RepositorioGuiones'
import { RepositorioIndexedDB } from './datos/RepositorioIndexedDB'
import { RepositorioMemoria } from './datos/RepositorioMemoria'

interface AppProps {
  motor?: MotorDeVoz
  repoOverride?: RepositorioGuiones
}

type Vista = 'biblioteca' | 'editor' | 'lectura'

const DEFAULT_SCRIPT_TEXT = `Bienvenido al teleprompter.\nLee este texto en voz alta para probar el reconocimiento.`

// Guion vacio de identidad ESTABLE, para cuando no hay ninguno abierto. Tiene que vivir
// fuera del componente: si se crea dentro, es un objeto nuevo por renderizado y provoca un
// ciclo infinito en `useSeguidor`.
const GUION_VACIO: Guion = {
  id: 'vacio',
  titulo: '',
  idioma: 'es',
  creado: 0,
  modificado: 0,
  bloques: []
}

export default function App({ motor, repoOverride }: AppProps) {
  const repoRef = useRef<RepositorioGuiones>(repoOverride || new RepositorioIndexedDB())
  const [usandoMemoriaFallback, setUsandoMemoriaFallback] = useState<boolean>(false)
  const [errorRepositorio, setErrorRepositorio] = useState<string | null>(null)

  const [vista, setVista] = useState<Vista>('biblioteca')
  const [guionesResumen, setGuionesResumen] = useState<ResumenGuion[]>([])
  const [guionActual, setGuionActual] = useState<Guion | null>(null)
  const [cargado, setCargado] = useState<boolean>(false)

  const cargarBiblioteca = useCallback(async () => {
    let repo = repoRef.current
    try {
      const lista = await repo.listar()
      setGuionesResumen(lista)
    } catch (e) {
      console.warn('[App] Error al acceder a RepositorioIndexedDB, cayendo a RepositorioMemoria:', e)
      repo = new RepositorioMemoria()
      repoRef.current = repo
      setUsandoMemoriaFallback(true)
      setErrorRepositorio('IndexedDB no está disponible; se está usando almacenamiento en memoria.')
      try {
        const lista = await repo.listar()
        setGuionesResumen(lista)
      } catch (err) {
        console.warn('[App] Error al listar de RepositorioMemoria:', err)
      }
    }
  }, [])

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
        } catch (e) {
          console.warn('[App] Error al migrar guion desde localStorage:', e)
          setErrorRepositorio('Falló la migración del guion desde localStorage.')
        }
      }

      await cargarBiblioteca()
      setCargado(true)
    }

    inicializar()
  }, [cargarBiblioteca])

  // Auto-guardado debounced (500ms) al modificar guionActual
  useEffect(() => {
    if (!cargado || !guionActual) return
    const timer = setTimeout(async () => {
      try {
        await repoRef.current.guardar(guionActual)
        await cargarBiblioteca()
      } catch (e) {
        console.warn('[App] Error al guardar guion en repositorio:', e)
        setErrorRepositorio('Error al guardar cambios en el repositorio.')
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [guionActual, cargado, cargarBiblioteca])

  // Manejadores de Biblioteca
  async function handleAbrirGuion(id: string) {
    try {
      const g = await repoRef.current.abrir(id)
      if (g) {
        setGuionActual(g)
        setVista('editor')
      } else {
        await cargarBiblioteca()
      }
    } catch (e) {
      console.warn('[App] Error al abrir guion:', e)
    }
  }

  async function handleCrearNuevoGuion() {
    const nuevo = guionNuevo('es')
    try {
      await repoRef.current.guardar(nuevo)
      setGuionActual(nuevo)
      await cargarBiblioteca()
      setVista('editor')
    } catch (e) {
      console.warn('[App] Error al crear nuevo guion:', e)
    }
  }

  async function handleRenombrarGuion(id: string, nuevoTitulo: string) {
    try {
      const g = await repoRef.current.abrir(id)
      if (g) {
        g.titulo = nuevoTitulo
        await repoRef.current.guardar(g)
        if (guionActual && guionActual.id === id) {
          setGuionActual({ ...g })
        }
        await cargarBiblioteca()
      }
    } catch (e) {
      console.warn('[App] Error al renombrar guion:', e)
    }
  }

  async function handleBorrarGuion(id: string) {
    try {
      await repoRef.current.borrar(id)
      if (guionActual && guionActual.id === id) {
        setGuionActual(null)
        setVista('biblioteca')
      }
      await cargarBiblioteca()
    } catch (e) {
      console.warn('[App] Error al borrar guion:', e)
    }
  }

  const [engine, setEngine] = useState<IdMotor>('webspeech')
  const [verTranscripcion, setVerTranscripcion] = useState<boolean>(false)
  const [fontSize, setFontSize] = useState<number>(32)
  const [marginPercent, setMarginPercent] = useState<number>(10)
  const [mirror, setMirror] = useState<boolean>(false)
  const [lineasZona, setLineasZona] = useState<number>(3)
  const [anclajeZona, setAnclajeZona] = useState<'arriba' | 'medio' | 'abajo'>('arriba')
  const [esPantallaCompleta, setEsPantallaCompleta] = useState<boolean>(false)

  const [motivoFreno, setMotivoFreno] = useState<'silencio' | 'sin-calce' | 'correa' | 'fin-de-linea' | 'fin-de-bloque' | null>(null)
  const [avanzando, setAvanzando] = useState<boolean>(false)

  const prompterContainerRef = useRef<HTMLDivElement | null>(null)

  // GUION_VACIO es una constante de modulo, NO `guionNuevo('es')`. Llamar a `guionNuevo`
  // aqui creaba un objeto distinto en cada renderizado -id y fechas nuevas-, y como
  // `useSeguidor` depende de esa identidad, el efecto se re-ejecutaba, cambiaba estado, y
  // volvia a renderizar: ciclo infinito. Solo ocurria sin ningun guion abierto, que es el
  // estado con el que arrancan las pruebas, y mataba el proceso de vitest sin dejar error.
  const guionParaSeguidor = guionActual || GUION_VACIO

  const {
    bloqueActual,
    lineaActual,
    palabraActual,
    alRecibirParcial: seguidorParcial,
    alRecibirFinal: seguidorFinal,
    alNotificarVoz: seguidorVoz,
    reiniciar,
    motorAvance
  } = useSeguidor(guionParaSeguidor)

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
    lang: guionActual && guionActual.idioma ? `${guionActual.idioma}-${guionActual.idioma.toUpperCase()}` : 'es-ES',
    motor,
    acumularTexto: verTranscripcion,
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

  let textoFreno = ''
  if (!avanzando && motivoFreno) {
    if (motivoFreno === 'silencio') textoFreno = 'esperando voz'
    else if (motivoFreno === 'sin-calce') textoFreno = 'no reconozco lo que lees'
    else if (motivoFreno === 'correa') textoFreno = 'adelantado, espero'
    else if (motivoFreno === 'fin-de-linea') textoFreno = 'fin de línea, espero'
    else if (motivoFreno === 'fin-de-bloque') textoFreno = 'fin de bloque, espero'
  }

  const tituloMostrar = (guionActual && guionActual.titulo && guionActual.titulo.trim()) ? guionActual.titulo : 'Sin título'

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif', maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ borderBottom: '1px solid #eee', paddingBottom: 12, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, cursor: 'pointer' }} onClick={() => setVista('biblioteca')}>Teleprompter MVP</h1>
          {vista !== 'biblioteca' && (
            <h3 style={{ color: '#555', margin: '4px 0 0 0', fontSize: 16 }}>{tituloMostrar}</h3>
          )}
        </div>
        {vista !== 'biblioteca' && (
          <button
            onClick={() => setVista('biblioteca')}
            style={{ padding: '6px 12px', cursor: 'pointer', backgroundColor: '#f0f0f0', border: '1px solid #ccc', borderRadius: 4 }}
          >
            📚 Ver Biblioteca
          </button>
        )}
      </header>

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

      {vista === 'biblioteca' && (
        <BibliotecaView
          guiones={guionesResumen}
          onAbrir={handleAbrirGuion}
          onCrearNuevo={handleCrearNuevoGuion}
          onRenombrar={handleRenombrarGuion}
          onBorrar={handleBorrarGuion}
        />
      )}

      {vista === 'editor' && guionActual && (
        <EditorView
          guion={guionActual}
          onChangeGuion={(nuevoG) => setGuionActual(nuevoG)}
          onVolverBiblioteca={() => setVista('biblioteca')}
          onEntrarLectura={() => setVista('lectura')}
        />
      )}

      {vista === 'lectura' && guionActual && (
        <div>
          <div style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              onClick={() => setVista('editor')}
              style={{ padding: '6px 14px', cursor: 'pointer', backgroundColor: '#f0f0f0', border: '1px solid #ccc', borderRadius: 4 }}
            >
              ← Volver al Editor
            </button>
            <span style={{ color: '#666', fontSize: 14 }}>
              Modo Lectura - <strong>{tituloMostrar}</strong>
            </span>
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {!esPantallaCompleta && (
              <div style={{ flex: 1, minWidth: 320 }}>
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
                  lineasZona={lineasZona}
                  setLineasZona={setLineasZona}
                  anclajeZona={anclajeZona}
                  setAnclajeZona={setAnclajeZona}
                  verTranscripcion={verTranscripcion}
                  setVerTranscripcion={setVerTranscripcion}
                  onToggleFullscreen={toggleFullscreen}
                />

                <div style={{ marginTop: 12 }}>
                  <strong>Estado del Motor:</strong> {estadoMotor}
                </div>

                {verTranscripcion && (
                  <>
                    <div style={{ marginTop: 12 }}>
                      <button onClick={handleClear} style={{ padding: '6px 12px' }}>
                        Limpiar Transcripción y Reiniciar Seguidor
                      </button>
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
                  </>
                )}
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
                lineasZona={lineasZona}
                anclajeZona={anclajeZona}
                motorAvance={motorAvance}
                onEstadoAvanceChange={handleEstadoAvanceChange}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
