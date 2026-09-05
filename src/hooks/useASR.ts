import { useEffect, useRef, useState } from 'react'
import { elegirMotor } from '../motor/elegirMotor'
import { IdMotor, MotorDeVoz } from '../motor/MotorDeVoz'

export default function useASR(options: { engine?: IdMotor; lang?: string } = {}) {
  const { engine = 'whisper-local', lang = 'es-ES' } = options
  const motorRef = useRef<MotorDeVoz | null>(null)

  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
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
        setUltimoError(null)
        if (motorRef.current) {
          await motorRef.current.detener()
        }

        const m = await elegirMotor(engine)
        motorRef.current = m

        unsubs.push(
          m.onFinal((e) => {
            setTranscript((prev) => (prev + '\n' + e.texto).trim())
            if (listenerFinalCbRef.current) {
              listenerFinalCbRef.current(e.texto)
            }
          })
        )

        unsubs.push(
          m.onError((err) => {
            console.error('[useASR] Error de motor:', err)
            setUltimoError(err.message)
          })
        )

        setReady(true)
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
  }, [engine])

  async function start() {
    if (!motorRef.current) return
    try {
      setUltimoError(null)
      await motorRef.current.iniciar({ lang })
      setIsRecording(true)

      if (motorRef.current.id === 'whisper-local') {
        const m = motorRef.current as any
        setDispositivoComputo(m.dispositivoComputo || 'webgpu')
      }
    } catch (err: any) {
      console.error('[useASR] Error al iniciar grabación:', err)
      setUltimoError(err.message || String(err))
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
    setUltimoError(null)
  }

  function alRecibirFraseFinal(cb: (texto: string) => void) {
    listenerFinalCbRef.current = cb
  }

  return {
    start,
    stop,
    clear,
    isRecording,
    transcript,
    ready,
    dispositivoComputo,
    progresoDescarga,
    ultimoError,
    alRecibirFraseFinal,
    motorActivo: motorRef.current?.nombre || engine
  }
}
