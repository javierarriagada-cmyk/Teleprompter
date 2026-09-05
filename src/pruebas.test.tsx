import React from 'react'
import { describe, expect, test } from 'vitest'
import { render, act } from '@testing-library/react'
import App from './App'
import { crearSeguidor, tokenizarGuion } from './lib/seguidor'
import { remuestrear } from './lib/remuestrear'
import { crearSegmentador, MS_MAX_SEGMENTO } from './lib/segmentador'
import { MotorFake } from './motor/MotorFake'

describe('Pruebas obligatorias T1-T9', () => {

  // T1: seguidor, líneas repetidas
  test('T1: seguidor, líneas repetidas no retrocede a la primera ocurrencia', () => {
    const guion = `Primera línea
Estribillo repetido
Línea intermedia uno
Estribillo repetido
Línea intermedia dos
Estribillo repetido`

    const tokens = tokenizarGuion(guion)
    const seguidor = crearSeguidor(tokens)

    let pos = seguidor.avanzar('Primera línea')
    expect(pos.linea).toBe(0)

    pos = seguidor.avanzar('Estribillo repetido')
    expect(pos.linea).toBe(1)

    pos = seguidor.avanzar('Línea intermedia uno')
    expect(pos.linea).toBe(2)

    pos = seguidor.avanzar('Estribillo repetido')
    expect(pos.linea).toBe(3)

    pos = seguidor.avanzar('Línea intermedia dos')
    expect(pos.linea).toBe(4)

    pos = seguidor.avanzar('Estribillo repetido')
    expect(pos.linea).toBe(5)
  })

  // T1.b: seguidor acotado a ventana local (no salta a coincidencia lejana)
  test('T1.b: seguidor acotado a ventana local no salta a coincidencia lejana', () => {
    const lineasIntermedias = Array.from({ length: 44 }, (_, i) => `Línea intermedia ${i + 2}`)
    const guion = [
      'Línea inicial de prueba',
      'PalabraA PalabraB',
      ...lineasIntermedias,
      'PalabraA PalabraB PalabraC PalabraD PalabraE'
    ].join('\n')

    const tokens = tokenizarGuion(guion)
    const seguidor = crearSeguidor(tokens)

    // Posicionarse en la línea 0
    seguidor.avanzar('Línea inicial de prueba')

    // Al decir una frase cuyo detalle completo está en la línea 46 (> VENTANA_ADELANTE),
    // la ventana local sólo ve la línea 1 ("PalabraA PalabraB" = 2/5 coincidencia = 0.4 < 0.5).
    // Por ende la ventana local no debe saltar a la línea 46.
    const pos = seguidor.avanzar('PalabraA PalabraB PalabraC PalabraD PalabraE')
    expect(pos.movio).toBe(false)
    expect(pos.linea).toBe(0)
  })

  // T2: seguidor, no retrocede
  test('T2: seguidor, no retrocede ante repetición de frase anterior', () => {
    const guion = `Hola mundo
Esta es la segunda línea
Esta es la tercera línea`

    const tokens = tokenizarGuion(guion)
    const seguidor = crearSeguidor(tokens)

    seguidor.avanzar('Hola mundo')
    seguidor.avanzar('Esta es la segunda línea')
    const posAv = seguidor.avanzar('Esta es la tercera línea')

    const posRep = seguidor.avanzar('Hola mundo')
    expect(posRep.movio).toBe(false)
    expect(posRep.linea).toBe(posAv.linea)
  })

  // T3: seguidor, tolerancia a acentos y variaciones
  test('T3: seguidor, tolerancia a acentos y variaciones', () => {
    const guion = `Discutiendo sobre la filosofía de la ciencia`
    const tokens = tokenizarGuion(guion)
    const seguidor = crearSeguidor(tokens)

    const pos = seguidor.avanzar('filosofia de la ciencia')
    expect(pos.movio).toBe(true)
  })

  // T4: seguidor, recuperación tras MAX_FALLOS
  test('T4: seguidor, recuperación tras MAX_FALLOS', () => {
    const palabrasNum = [
      'cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
      'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciseis', 'diecisiete', 'dieciocho', 'diecinueve',
      'veinte', 'veintiuno', 'veintidos', 'veintitres', 'veinticuatro', 'veinticinco', 'veintiseis', 'veintisiete', 'veintiocho', 'veintinueve',
      'treinta', 'treintauno', 'treintados', 'treintatres', 'treintacuatro', 'treintacinco', 'treintaseis', 'treintasiete', 'treintaocho', 'treintanueve',
      'cuarenta', 'cuarentauno', 'cuarentados', 'cuarentatres', 'cuarentacuatro', 'cuarentacinco', 'cuarentaseis', 'cuarentasiete', 'cuarentaocho', 'cuarentanueve',
      'cincuenta', 'cincuentauno', 'cincuentados', 'cincuentatres', 'cincuentacuatro', 'cincuentacinco'
    ]
    const guion = palabrasNum.join('\n')
    const tokens = tokenizarGuion(guion)
    const seguidor = crearSeguidor(tokens)

    seguidor.avanzar('cero')

    // 2 frases que no coinciden con nada en la ventana cercana (fallos 1 y 2)
    seguidor.avanzar('inventado x')
    seguidor.avanzar('inventado y')

    // 3er fallo es la palabra de la línea 50 (fuera de la ventana local 0..40), dispara recuperación global
    const pos = seguidor.avanzar('cincuenta')
    expect(pos.movio).toBe(true)
    expect(pos.linea).toBe(50)
  })

  // T5: remuestrear
  test('T5: remuestrear seno de 440 Hz de 48000 Hz a 16000 Hz', () => {
    const deHz = 48000
    const aHz = 16000
    const duracionSec = 1
    const totalMuestrasOri = deHz * duracionSec

    const entrada = new Float32Array(totalMuestrasOri)
    for (let i = 0; i < totalMuestrasOri; i++) {
      const t = i / deHz
      entrada[i] = Math.sin(2 * Math.PI * 440 * t)
    }

    const salida = remuestrear(entrada, deHz, aHz)
    expect(Math.abs(salida.length - 16000)).toBeLessThanOrEqual(1)

    let cruces = 0
    for (let i = 1; i < salida.length; i++) {
      if ((salida[i - 1] >= 0 && salida[i] < 0) || (salida[i - 1] < 0 && salida[i] >= 0)) {
        cruces++
      }
    }
    const frecEst = cruces / 2
    const errorPct = Math.abs(frecEst - 440) / 440
    expect(errorPct).toBeLessThan(0.02)
  })

  // T6: segmentador, dos frases
  test('T6: segmentador, dos frases emiten exactamente 2 eventos final', async () => {
    const sampleRate = 16000
    const muestras100ms = 1600
    const finales: string[] = []

    const segmentador = crearSegmentador({
      sampleRate,
      transcribir: async (_pcm) => 'Texto transcrito',
      alFinal: (e) => finales.push(e.texto),
      alDescartar: () => {}
    })

    for (let i = 0; i < 10; i++) {
      segmentador.alimentar({ pcm: new Float32Array(muestras100ms), hablando: true })
    }
    for (let i = 0; i < 10; i++) {
      segmentador.alimentar({ pcm: new Float32Array(muestras100ms), hablando: false })
    }
    for (let i = 0; i < 10; i++) {
      segmentador.alimentar({ pcm: new Float32Array(muestras100ms), hablando: true })
    }
    for (let i = 0; i < 10; i++) {
      segmentador.alimentar({ pcm: new Float32Array(muestras100ms), hablando: false })
    }

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(finales.length).toBe(2)
  })

  // T7: segmentador, solo silencio
  test('T7: segmentador, solo silencio emite 0 eventos', async () => {
    const sampleRate = 16000
    const muestras100ms = 1600
    const finales: string[] = []

    const segmentador = crearSegmentador({
      sampleRate,
      transcribir: async () => 'Texto',
      alFinal: (e) => finales.push(e.texto),
      alDescartar: () => {}
    })

    for (let i = 0; i < 30; i++) {
      segmentador.alimentar({ pcm: new Float32Array(muestras100ms), hablando: false })
    }

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(finales.length).toBe(0)
  })

  // T8: segmentador, corte por duración
  test('T8: segmentador, corte por duración (20 s continuos)', async () => {
    const sampleRate = 16000
    const muestras100ms = 1600
    const finales: Array<{ inicioMs: number; finMs: number }> = []

    const segmentador = crearSegmentador({
      sampleRate,
      transcribir: async () => 'Texto largo',
      alFinal: (e) => finales.push({ inicioMs: e.inicioMs, finMs: e.finMs }),
      alDescartar: () => {}
    })

    for (let i = 0; i < 200; i++) {
      segmentador.alimentar({ pcm: new Float32Array(muestras100ms), hablando: true })
    }
    segmentador.flush()

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(finales.length).toBe(3)
    for (const f of finales) {
      expect(f.finMs - f.inicioMs).toBeLessThanOrEqual(MS_MAX_SEGMENTO + 50)
    }
  })

  // T9: integración con React App y MotorFake
  test('T9: integración con React App y MotorFake avanza la línea resaltada en el DOM 0 -> 1 -> 2', async () => {
    const frases = [
      'Bienvenido al teleprompter',
      'Lee este texto en voz alta para probar el reconocimiento',
      'Tercera linea de prueba'
    ]
    const motor = new MotorFake(frases)

    let container: HTMLElement

    await act(async () => {
      const res = render(<App motor={motor} />)
      container = res.container
    })

    // El guion por defecto de App es:
    // Line 0: "Bienvenido al teleprompter."
    // Line 1: "Lee este texto en voz alta para probar el reconocimiento."

    const getHighlightedLineIndex = () => {
      const lines = Array.from(container.querySelectorAll('.line'))
      return lines.findIndex((line) => (line as HTMLElement).style.opacity === '1')
    }

    // Estado inicial: línea 0
    expect(getHighlightedLineIndex()).toBe(0)

    // Emitir frase 1
    await act(async () => {
      motor.emitirSiguiente()
    })
    expect(getHighlightedLineIndex()).toBe(0)

    // Emitir frase 2
    await act(async () => {
      motor.emitirSiguiente()
    })
    expect(getHighlightedLineIndex()).toBe(1)
  })

  // Casos borde adicionales
  test('Caso borde: guion vacío', () => {
    const tokens = tokenizarGuion('')
    const seguidor = crearSeguidor(tokens)
    const pos = seguidor.avanzar('algo')
    expect(pos).toEqual({ linea: 0, palabra: 0, movio: false })
  })

  test('Caso borde: frase vacía', () => {
    const tokens = tokenizarGuion('Hola mundo')
    const seguidor = crearSeguidor(tokens)
    const pos = seguidor.avanzar('   ')
    expect(pos.movio).toBe(false)
  })

  test('Caso borde: segmento demasiado corto es descartado', () => {
    const sampleRate = 16000
    let descartadoMotivo = ''

    const segmentador = crearSegmentador({
      sampleRate,
      transcribir: async () => 'Texto',
      alFinal: () => {},
      alDescartar: (m) => { descartadoMotivo = m }
    })

    // 100 ms hablando
    segmentador.alimentar({ pcm: new Float32Array(1600), hablando: true })
    segmentador.flush()

    expect(descartadoMotivo).toContain('demasiado corto')
  })
})
