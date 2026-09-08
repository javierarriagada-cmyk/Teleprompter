import React, { useCallback, useEffect, useRef, useState } from 'react'
import useASR from './hooks/useASR'
import { useSeguidor } from './hooks/useSeguidor'
import { useWakeLock } from './hooks/useWakeLock'
import { usePrecargaModelo } from './hooks/usePrecargaModelo'
import TeleprompterView from './components/TeleprompterView'
import BarraDeTiempo from './components/BarraDeTiempo'
import ControlsBar from './components/ControlsBar'
import BibliotecaView from './components/BibliotecaView'
import EditorView from './components/EditorView'
import CuentaRegresiva from './components/CuentaRegresiva'
import { IdMotor, MotorDeVoz } from './motor/MotorDeVoz'
import { Guion, ResumenGuion, guionNuevo } from './datos/modelo'
import { RepositorioGuiones } from './datos/RepositorioGuiones'
import { RepositorioIndexedDB } from './datos/RepositorioIndexedDB'
import { RepositorioMemoria } from './datos/RepositorioMemoria'
import { importarArchivo } from './datos/importarArchivo'

// Cuanto se quedan los controles a la vista despues de un toque, mientras se lee.
const MS_CONTROLES_A_LA_VISTA = 4000

interface AppProps {
  motor?: MotorDeVoz
  repoOverride?: RepositorioGuiones
}

type Vista = 'biblioteca' | 'editor' | 'lectura'

const GUION_VACIO: Guion = {
  id: 'vacio',
  titulo: '',
  idioma: 'es',
  creado: 0,
  modificado: 0,
  archivado: false,
  bloques: []
}

const PASOS_LETRA = [14, 18, 24, 32, 42]

function cargarAjustesGuardados() {
  try {
    const raw = localStorage.getItem('teleprompter_ajustes')
    if (raw) {
      return JSON.parse(raw)
    }
  } catch (e) {
  }
  return null
}

function ajustarFuenteValida(val: any): number {
  const num = Number(val)
  if (isNaN(num)) return 24
  if (PASOS_LETRA.includes(num)) return num
  const masCercano = PASOS_LETRA.reduce((prev, curr) =>
    Math.abs(curr - num) < Math.abs(prev - num) ? curr : prev
  )
  return masCercano
}

export default function App({ motor, repoOverride }: AppProps) {
  const repoRef = useRef<RepositorioGuiones>(repoOverride || new RepositorioIndexedDB())
  const [usandoMemoriaFallback, setUsandoMemoriaFallback] = useState<boolean>(false)
  const [errorRepositorio, setErrorRepositorio] = useState<string | null>(null)

  const { estado: estadoPrecarga, progreso: progresoPrecarga, error: errorPrecarga, reintentar: reintentarPrecarga } = usePrecargaModelo()

  const [vista, setVista] = useState<Vista>('biblioteca')
  const [guionesResumen, setGuionesResumen] = useState<ResumenGuion[]>([])
  const [guionActual, setGuionActual] = useState<Guion | null>(null)
  const [cargado, setCargado] = useState<boolean>(false)

  // Ajustes persistentes
  const ajustesPrevios = cargarAjustesGuardados() || {}

  const [engine, setEngine] = useState<IdMotor>(ajustesPrevios.engine || 'webspeech')
  const [verTranscripcion, setVerTranscripcion] = useState<boolean>(Boolean(ajustesPrevios.verTranscripcion))
  const [mostrarTiempo, setMostrarTiempo] = useState<boolean>(ajustesPrevios.mostrarTiempo !== undefined ? Boolean(ajustesPrevios.mostrarTiempo) : true)
  const [fontSize, setFontSize] = useState<number>(ajustarFuenteValida(ajustesPrevios.fontSize))
  const [marginPercent, setMarginPercent] = useState<number>(ajustesPrevios.marginPercent !== undefined ? Number(ajustesPrevios.marginPercent) : 10)
  const [mirror, setMirror] = useState<boolean>(Boolean(ajustesPrevios.mirror))
  const [lineasZona, setLineasZona] = useState<number>(ajustesPrevios.lineasZona !== undefined ? Number(ajustesPrevios.lineasZona) : 3)
  const [anclajeZona, setAnclajeZona] = useState<'arriba' | 'medio' | 'abajo'>(ajustesPrevios.anclajeZona || 'arriba')
  const [tema, setTema] = useState<'claro' | 'oscuro'>(ajustesPrevios.tema || 'claro')

  const [modoManual, setModoManual] = useState<boolean>(false)
  const [esPantallaCompleta, setEsPantallaCompleta] = useState<boolean>(false)

  // Sincronizar tema con documentElement
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
  }, [tema])

  // Guardar ajustes en localStorage ante cambios
  useEffect(() => {
    try {
      const objetoAjustes = {
        fontSize,
        marginPercent,
        mirror,
        lineasZona,
        anclajeZona,
        mostrarTiempo,
        verTranscripcion,
        tema,
        engine
      }
      localStorage.setItem('teleprompter_ajustes', JSON.stringify(objetoAjustes))
    } catch (e) {
    }
  }, [fontSize, marginPercent, mirror, lineasZona, anclajeZona, mostrarTiempo, verTranscripcion, tema, engine])

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

      if (textoViejo && textoViejo.trim()) {
        const gMigrado: Guion = {
          id: 'migrado-' + Date.now(),
          titulo: 'Guion importado',
          idioma: 'es',
          creado: Date.now(),
          modificado: Date.now(),
          archivado: false,
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

  async function handleImportarArchivo(file: File) {
    try {
      const res = await importarArchivo(file)
      const nuevo: Guion = {
        id: 'g-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        titulo: res.titulo,
        idioma: 'es',
        creado: Date.now(),
        modificado: Date.now(),
        archivado: false,
        bloques: res.bloques
      }
      await repoRef.current.guardar(nuevo)
      setGuionActual(nuevo)
      await cargarBiblioteca()
      setVista('editor')
    } catch (e) {
      console.warn('[App] Error al importar archivo:', e)
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

  async function handleArchivarGuion(id: string, archivado: boolean) {
    try {
      const g = await repoRef.current.abrir(id)
      if (g) {
        g.archivado = archivado
        await repoRef.current.guardar(g)
        if (guionActual && guionActual.id === id) {
          setGuionActual({ ...g })
        }
        await cargarBiblioteca()
      }
    } catch (e) {
      console.warn('[App] Error al archivar/desarchivar guion:', e)
    }
  }

  const [columnaAngosta, setColumnaAngosta] = useState<boolean>(true)
  const [colorFondo, setColorFondo] = useState<string>('#000000')
  const [colorLetra, setColorLetra] = useState<string>('#FFFFFF')
  const [tipoFuente, setTipoFuente] = useState<'sans' | 'serif'>('sans')
  const [controlesVisibles, setControlesVisibles] = useState<boolean>(true)
  const timerControlesRef = useRef<number | null>(null)

  const [motivoFreno, setMotivoFreno] = useState<'silencio' | 'sin-calce' | 'correa' | 'fin-de-linea' | 'fin-de-bloque' | null>(null)
  const [avanzando, setAvanzando] = useState<boolean>(false)
  const [tInicioLecturaMs, setTInicioLecturaMs] = useState<number | null>(null)
  const [cuentaRegresiva, setCuentaRegresiva] = useState<number | null>(null)

  const timerCuentaRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prompterContainerRef = useRef<HTMLDivElement | null>(null)

  const cancelarCuentaRegresiva = useCallback(() => {
    if (timerCuentaRef.current !== null) {
      clearInterval(timerCuentaRef.current)
      timerCuentaRef.current = null
    }
    setCuentaRegresiva(null)
  }, [])

  useEffect(() => {
    return () => {
      cancelarCuentaRegresiva()
    }
  }, [cancelarCuentaRegresiva])

  useEffect(() => {
    if (vista !== 'lectura') {
      cancelarCuentaRegresiva()
    }
  }, [vista, cancelarCuentaRegresiva])

  const guionParaSeguidor = guionActual || GUION_VACIO

  const {
    bloqueActual,
    lineaActual,
    palabraActual,
    totalTokens,
    alRecibirParcial: seguidorParcial,
    alRecibirFinal: seguidorFinal,
    alNotificarVoz: seguidorVoz,
    reiniciar,
    irAToken,
    motorAvance
  } = useSeguidor(guionParaSeguidor)

  const {
    start,
    stop,
    clear,
    isRecording,
    transcript,
    estadoMotor,
    dispositivoComputo,
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

  // Los controles vuelven a irse solos. Un toque los trae, y si el que lee no aprieta nada
  // se van otra vez: si se quedaran encendidos hasta el siguiente toque, bastaria con
  // olvidarse una vez para tenerlos en pantalla el resto de la toma, que es exactamente lo
  // que se quiso evitar al hacer que desaparecieran.
  useEffect(() => {
    const leyendo = isRecording || cuentaRegresiva !== null
    if (!leyendo || !controlesVisibles) return

    timerControlesRef.current = window.setTimeout(() => {
      timerControlesRef.current = null
      setControlesVisibles(false)
    }, MS_CONTROLES_A_LA_VISTA)

    return () => {
      if (timerControlesRef.current !== null) {
        window.clearTimeout(timerControlesRef.current)
        timerControlesRef.current = null
      }
    }
  }, [controlesVisibles, isRecording, cuentaRegresiva])

  const { activo: wakeLockActivo, solicitar: solicitarWakeLock, soltar: soltarWakeLock } = useWakeLock()

  const handleEstadoAvanceChange = useCallback((motivo: 'silencio' | 'sin-calce' | 'correa' | 'fin-de-linea' | 'fin-de-bloque' | null, isAvanzando: boolean) => {
    setMotivoFreno(motivo)
    setAvanzando(isAvanzando)
  }, [])

  async function handleStart() {
    if (cuentaRegresiva !== null || isRecording) return
    await solicitarWakeLock()

    setControlesVisibles(false)
    setCuentaRegresiva(3)

    let c = 3
    timerCuentaRef.current = setInterval(() => {
      c -= 1
      if (c > 0) {
        setCuentaRegresiva(c)
      } else {
        if (timerCuentaRef.current !== null) {
          clearInterval(timerCuentaRef.current)
          timerCuentaRef.current = null
        }
        setCuentaRegresiva(null)
        setTInicioLecturaMs(performance.now())
        start()
      }
    }, 1000)
  }

  async function handleStop() {
    cancelarCuentaRegresiva()
    setTInicioLecturaMs(null)
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
      <header style={{ borderBottom: '1px solid var(--color-borde)', paddingBottom: 12, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, cursor: 'pointer', color: 'var(--color-texto)' }} onClick={() => setVista('biblioteca')}>Teleprompter MVP</h1>
          {vista !== 'biblioteca' && (
            <h3 style={{ color: 'var(--color-apagado)', margin: '4px 0 0 0', fontSize: 16 }}>{tituloMostrar}</h3>
          )}
        </div>
        {vista !== 'biblioteca' && (
          <button
            onClick={() => setVista('biblioteca')}
            style={{ padding: '6px 12px', cursor: 'pointer', backgroundColor: 'var(--bg-superficie)', border: '1px solid var(--color-borde)', borderRadius: 6, color: 'var(--color-texto)' }}
          >
            Ver Biblioteca
          </button>
        )}
      </header>

      {/* Indicador de precarga de modelo Vosk */}
      {(estadoPrecarga === 'descargando' || estadoPrecarga === 'error') && (
        <div
          style={{
            background: estadoPrecarga === 'error' ? '#fff3cd' : '#e3f2fd',
            color: estadoPrecarga === 'error' ? '#856404' : '#0d47a1',
            padding: '8px 12px',
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 13,
            border: `1px solid ${estadoPrecarga === 'error' ? '#ffeeba' : '#bbdefb'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          {estadoPrecarga === 'descargando' && (
            <span>
              ⏬ Descargando modelo de voz para uso offline: <strong>{Math.round(progresoPrecarga * 100)}%</strong>
            </span>
          )}
          {estadoPrecarga === 'error' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', justifyContent: 'space-between' }}>
              <span>
                ⚠️ Error descargando modelo de voz Vosk: {errorPrecarga || 'Desconocido'}.
              </span>
              <button
                onClick={reintentarPrecarga}
                style={{ padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}
              >
                Reintentar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Franja de estado visible */}
      <div
        style={{
          background: (ultimoError || errorRepositorio) ? '#ffebee' : 'var(--bg-superficie)',
          color: (ultimoError || errorRepositorio) ? '#c62828' : 'var(--color-texto)',
          padding: '10px 14px',
          borderRadius: 6,
          marginBottom: 16,
          fontSize: 14,
          border: `1px solid ${(ultimoError || errorRepositorio) ? '#ef9a9a' : 'var(--color-borde)'}`
        }}
      >
        <strong>Franja de Estado:</strong>
        <div style={{ marginTop: 4 }}>
          <span>Estado del Motor: <strong>{estadoMotor}</strong></span>
          {modoManual && <span style={{ marginLeft: 16, color: 'var(--color-acento)', fontWeight: 600 }}>MODO MANUAL: mandas tú</span>}
          <span style={{ marginLeft: 16 }}>Motor Activo: <strong>{motorActivo}</strong></span>
          {engine === 'whisper-local' && (
            <span style={{ marginLeft: 16 }}>Dispositivo: <strong>{dispositivoComputo}</strong></span>
          )}
          <span style={{ marginLeft: 16 }}>Bloqueo Pantalla: <strong>{wakeLockActivo ? 'Sí' : 'No'}</strong></span>
          {textoFreno && (
            <span style={{ marginLeft: 16, color: '#d84315', fontWeight: 'bold' }}>
              Estado Avance: {textoFreno}
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
          onImportarArchivo={handleImportarArchivo}
          onRenombrar={handleRenombrarGuion}
          onBorrar={handleBorrarGuion}
          onArchivar={handleArchivarGuion}
          onBuscarGuionCompleto={(id) => repoRef.current.abrir(id)}
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
              style={{ padding: '6px 14px', cursor: 'pointer', backgroundColor: 'var(--bg-superficie)', border: '1px solid var(--color-borde)', borderRadius: 6, color: 'var(--color-texto)' }}
            >
              ← Volver al Editor
            </button>
            <span style={{ color: 'var(--color-apagado)', fontSize: 14 }}>
              Modo Lectura - <strong>{tituloMostrar}</strong>
            </span>
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {!esPantallaCompleta && controlesVisibles && (
              <div data-testid="panel-controles-lectura" style={{ flex: 1, minWidth: 320 }}>

                <ControlsBar
                  onStart={handleStart}
                  onStop={handleStop}
                  isRecording={isRecording}
                  cuentaRegresiva={cuentaRegresiva}
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
                  mostrarTiempo={mostrarTiempo}
                  setMostrarTiempo={setMostrarTiempo}
                  columnaAngosta={columnaAngosta}
                  setColumnaAngosta={setColumnaAngosta}
                  colorFondo={colorFondo}
                  setColorFondo={setColorFondo}
                  colorLetra={colorLetra}
                  setColorLetra={setColorLetra}
                  tipoFuente={tipoFuente}
                  setTipoFuente={setTipoFuente}
                  tema={tema}
                  setTema={setTema}
                  engine={engine}
                  setEngine={setEngine}
                  onToggleFullscreen={toggleFullscreen}
                />

                <div style={{ marginTop: 12 }}>
                  <button onClick={handleClear} style={{ padding: '8px 16px', fontWeight: 600, backgroundColor: 'var(--bg-superficie)', border: '1px solid var(--color-borde)', borderRadius: 6, color: 'var(--color-texto)', cursor: 'pointer' }}>
                    Volver al inicio
                  </button>
                </div>

                <div style={{ marginTop: 12, color: 'var(--color-texto)' }}>
                  <strong>Estado del Motor:</strong> {estadoMotor}
                </div>

                {verTranscripcion && (
                  <>
                    <div style={{ marginTop: 12 }}>
                      <strong style={{ color: 'var(--color-texto)' }}>Transcripción (en vivo):</strong>
                      <div
                        style={{
                          minHeight: 100,
                          border: '1px solid var(--color-borde)',
                          padding: 8,
                          marginTop: 6,
                          whiteSpace: 'pre-wrap',
                          background: 'var(--bg-suelo)',
                          color: 'var(--color-texto)',
                          borderRadius: 6,
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
                flex: esPantallaCompleta || !controlesVisibles ? '1 1 100%' : '1 1 420px',
                minWidth: 320,
                height: esPantallaCompleta ? '100vh' : 480,
                background: colorFondo,
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
                diagnostico={verTranscripcion}
                columnaAngosta={columnaAngosta}
                colorFondo={colorFondo}
                colorLetra={colorLetra}
                tipoFuente={tipoFuente}
                isRecording={isRecording || cuentaRegresiva !== null}
                onToggleControles={() => setControlesVisibles((prev) => !prev)}
                onNavegacionManual={irAToken}
                onModoManualChange={setModoManual}
                onEstadoAvanceChange={handleEstadoAvanceChange}
              />
              <CuentaRegresiva valor={cuentaRegresiva} />
              {verTranscripcion && (
                <div
                  id="diag-prompter"
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 12,
                    background: '#111',
                    color: '#0f0',
                    padding: '4px 8px',
                    whiteSpace: 'nowrap',
                    overflowX: 'auto'
                  }}
                >
                  —
                </div>
              )}
            </div>
          </div>

          {mostrarTiempo && (
            <BarraDeTiempo
              motorAvance={motorAvance}
              totalTokens={totalTokens}
              tInicioLecturaMs={tInicioLecturaMs}
            />
          )}
        </div>
      )}
    </div>
  )
}
