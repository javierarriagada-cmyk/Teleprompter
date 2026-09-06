import { useEffect, useRef, useState } from 'react'
import { elegirMotor } from '../motor/elegirMotor'
import { EventoFinal, IdMotor, MotorDeVoz } from '../motor/MotorDeVoz'

export default function useASR(options: {
  engine?: IdMotor
  lang?: string
  motor?: MotorDeVoz
  acumularTexto?: boolean
  alRecibirParcial?: (texto: string) => void
  alRecibirFraseFinal?: (e: any) => void
  alNotificarVoz?: (hayVoz: boolean) => void
} = {}) {
  const { engine = 'webspeech', lang = 'es-ES', motor: motorInyectado, acumularTexto = false, alRecibirParcial: optionParcial, alRecibirFraseFinal: optionFinal, alNotificarVoz: optionVoz } = options
  const motorRef = useRef<MotorDeVoz | null>(null)
  const acumularTextoRef = useRef(acumularTexto)

  useEffect(() => {
    acumularTextoRef.current = acumularTexto
  }, [acumularTexto])

  const [isRecording, setIsRecording] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [transcripcionParcial, setTranscripcionParcial] = useState('')
  const [ready, setReady] = useState(false)
  const [dispositivoComputo, setDispositivoComputo] = useState<string>('cargando')
  const [progresoDescarga, setProgresoDescarga] = useState<number>(0)
  const [ultimoError, setUltimoError] = useState<string | null>(null)

  const listenerParcialCbRef = useRef<((texto: string) => void) | null>(null)
  const listenerFinalCbRef = useRef<((e: EventoFinal) => void) | null>(null)
  const listenerVozCbRef = useRef<((hayVoz: boolean) => void) | null>(null)

  useEffect(() => {
    if (optionParcial) listenerParcialCbRef.current = optionParcial
    if (optionFinal) listenerFinalCbRef.current = optionFinal
    if (optionVoz) listenerVozCbRef.current = optionVoz
  }, [optionParcial, optionFinal, optionVoz])

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
            if (acumularTextoRef.current) {
              setTranscripcionParcial(e.texto)
            }
            if (listenerVozCbRef.current) listenerVozCbRef.current(true)
            if (listenerParcialCbRef.current) listenerParcialCbRef.current(e.texto)
          })
        )

        unsubs.push(
          m.onFinal((e) => {
            if (acumularTextoRef.current) {
              setTranscripcionParcial('')
              setTranscript((prev) => (prev + '\n' + e.texto).trim())
            }
            if (listenerVozCbRef.current) listenerVozCbRef.current(true)
            if (listenerFinalCbRef.current) {
              listenerFinalCbRef.current(e)
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

  function alRecibirParcial(cb: (texto: string) => void) {
    listenerParcialCbRef.current = cb
  }

  function alRecibirFraseFinal(cb: ((texto: string) => void) | ((e: EventoFinal) => void)) {
    listenerFinalCbRef.current = (e: EventoFinal) => {
      if (cb.length === 1) {
        (cb as any)(e.texto !== undefined ? e.texto : e)
      } else {
        (cb as any)(e)
      }
    }
  }

  function alNotificarVoz(cb: (hayVoz: boolean) => void) {
    listenerVozCbRef.current = cb
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
    alRecibirParcial,
    alRecibirFraseFinal,
    alNotificarVoz,
    motorActivo: motorRef.current?.nombre || engine
  }
}
