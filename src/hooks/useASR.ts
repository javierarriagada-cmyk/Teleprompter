import { useEffect, useRef, useState } from 'react'
import { elegirMotor } from '../motor/elegirMotor'
import { IdMotor, MotorDeVoz } from '../motor/MotorDeVoz'

export default function useASR(options: { engine?: IdMotor; lang?: string; motor?: MotorDeVoz } = {}) {
  const { engine = 'whisper-local', lang = 'es-ES', motor: motorInyectado } = options
  const motorRef = useRef<MotorDeVoz | null>(null)

  const [isRecording, setIsRecording] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [transcripcionParcial, setTranscripcionParcial] = useState('')
  const [ready, setReady] = useState(false)
  const [dispositivoComputo, setDispositivoComputo] = useState<string>('cargando')
  const [progresoDescarga, setProgresoDescarga] = useState<number>(0)
  const [ultimoError, setUltimoError] = useState<string | null>(null)

  const listenerFinalCbRef = useRef<((texto: string) => void) | null>(null)

  useEffect(() => {
    let unsubs: Array<() => void> = []

    async function initMotor() {
      try {
        setReady(false)
        setIsStarting(false)
        setUltimoError(null)
        setProgresoDescarga(0)
        setDispositivoComputo('cargando')
        if (motorRef.current) {
          await motorRef.current.detener()
        }

        const m = motorInyectado || (await elegirMotor(engine))
        motorRef.current = m

        unsubs.push(
          m.onParcial((e) => {
            setTranscripcionParcial(e.texto)
          })
        )

        unsubs.push(
          m.onFinal((e) => {
            setTranscripcionParcial('')
            setTranscript((prev) => (prev + '\n' + e.texto).trim())
            if (listenerFinalCbRef.current) {
              listenerFinalCbRef.current(e.texto)
            }
          })
        )

        if (m.onProgreso) {
          unsubs.push(
            m.onProgreso((pct) => {
              setProgresoDescarga(pct)
            })
          )
        }

        unsubs.push(
          m.onError((err) => {
            console.error('[useASR] Error de motor:', err)
            setUltimoError(err.message)
          })
        )
      } catch (err: any) {
        console.error('[useASR] Error al inicializar motor:', err)
        setUltimoError(err.message || String(err))
        setReady(false)
      }
    }

    initMotor()

    return () => {
      unsubs.forEach((u) => u())
      if (motorRef.current) {
        motorRef.current.detener()
      }
    }
  }, [engine, motorInyectado])

  async function start() {
    if (!motorRef.current) return
    try {
      setUltimoError(null)
      setIsStarting(true)
      await motorRef.current.iniciar({ lang })
      setIsStarting(false)
      setReady(true)
      setIsRecording(true)

      if (motorRef.current.id === 'whisper-local') {
        const m = motorRef.current as any
        setDispositivoComputo(m.dispositivoComputo || 'webgpu')
      }
    } catch (err: any) {
      console.error('[useASR] Error al iniciar grabación:', err)
      setUltimoError(err.message || String(err))
      setIsStarting(false)
      setIsRecording(false)
    }
  }

  async function stop() {
    if (motorRef.current) {
      try {
        await motorRef.current.detener()
      } catch (e) {}
    }
    setIsRecording(false)
  }

  function clear() {
    setTranscript('')
    setTranscripcionParcial('')
    setUltimoError(null)
  }

  function alRecibirFraseFinal(cb: (texto: string) => void) {
    listenerFinalCbRef.current = cb
  }

  let estadoMotor = 'sin iniciar'
  if (ultimoError) {
    estadoMotor = 'error'
  } else if (isRecording) {
    estadoMotor = 'escuchando'
  } else if (ready) {
    estadoMotor = 'listo'
  } else if (isStarting || progresoDescarga > 0) {
    const pct = Math.round(progresoDescarga * 100)
    estadoMotor = `descargando modelo ${pct}%`
  } else {
    estadoMotor = 'sin iniciar'
  }

  return {
    start,
    stop,
    clear,
    isRecording,
    transcript: (transcript + (transcripcionParcial ? '\n' + transcripcionParcial : '')).trim(),
    ready,
    estadoMotor,
    dispositivoComputo,
    progresoDescarga,
    ultimoError,
    alRecibirFraseFinal,
    motorActivo: motorRef.current?.nombre || engine
  }
}
