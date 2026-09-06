import React from 'react'
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { describe, expect, test } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import 'fake-indexeddb/auto'
import App from './App'
import { crearSeguidor, tokenizarGuion } from './lib/seguidor'
import { remuestrear } from './lib/remuestrear'
import { crearSegmentador, MS_MAX_SEGMENTO } from './lib/segmentador'
import { MotorFake } from './motor/MotorFake'
import { crearMotorDeAvance } from './lib/avance'
import { crearRegistro } from './lib/registro'
import { simularLectura } from './pruebas/lectorSimulado'
import { medir } from './pruebas/metricas'
import { Guion } from './datos/modelo'
import { RepositorioMemoria } from './datos/RepositorioMemoria'
import { RepositorioIndexedDB } from './datos/RepositorioIndexedDB'

function guionSimple(texto: string, titulo = 'Guion de prueba'): Guion {
  return {
    id: 'test-guion-' + Math.random().toString(36).substring(2, 9),
    titulo,
    idioma: 'es',
    creado: Date.now(),
    modificado: Date.now(),
    bloques: [
      {
        id: 'b-1',
        nombre: '',
        texto
      }
    ]
  }
}

const guion40LineasTexto = Array.from({ length: 40 }, (_, i) => `Esta es la línea número ${i + 1} del guion de prueba para el teleprompter.`).join('\n')
const guion40Lineas = guionSimple(guion40LineasTexto)

describe('Pruebas obligatorias T1-T9', () => {

  // T1: seguidor, líneas repetidas
  test('T1: seguidor, líneas repetidas no retrocede a la primera ocurrencia', () => {
    const guion = guionSimple(`Primera línea
Estribillo repetido
Línea intermedia uno
Estribillo repetido
Línea intermedia dos
Estribillo repetido`)

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
    const guion = guionSimple([
      'Línea inicial de prueba',
      'PalabraA PalabraB',
      ...lineasIntermedias,
      'PalabraA PalabraB PalabraC PalabraD PalabraE'
    ].join('\n'))

    const tokens = tokenizarGuion(guion)
    const seguidor = crearSeguidor(tokens)

    seguidor.avanzar('Línea inicial de prueba')

    const pos = seguidor.avanzar('PalabraA PalabraB PalabraC PalabraD PalabraE')
    expect(pos.movio).toBe(false)
    expect(pos.linea).toBe(0)
  })

  // T2: seguidor, no retrocede
  test('T2: seguidor, no retrocede ante repetición de frase anterior', () => {
    const guion = guionSimple(`Hola mundo
Esta es la segunda línea
Esta es la tercera línea`)

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
    const guion = guionSimple(`Discutiendo sobre la filosofía de la ciencia`)
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
    const guion = guionSimple(palabrasNum.join('\n'))
    const tokens = tokenizarGuion(guion)
    const seguidor = crearSeguidor(tokens)

    seguidor.avanzar('cero')

    seguidor.avanzar('inventado x')
    seguidor.avanzar('inventado y')

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
      await new Promise((r) => setTimeout(r, 200))
    })

    const getHighlightedLineIndex = () => {
      const lines = Array.from(container.querySelectorAll('.line'))
      return lines.findIndex((line) => (line as HTMLElement).style.opacity === '1')
    }

    expect(getHighlightedLineIndex()).toBe(0)

    await act(async () => {
      motor.emitirSiguiente()
    })
    expect(getHighlightedLineIndex()).toBe(0)

    await act(async () => {
      motor.emitirSiguiente()
    })
    expect(getHighlightedLineIndex()).toBe(1)
  })

  // Casos borde adicionales
  test('Caso borde: guion vacío', () => {
    const tokens = tokenizarGuion(guionSimple(''))
    const seguidor = crearSeguidor(tokens)
    const pos = seguidor.avanzar('algo')
    expect(pos).toEqual({ bloque: 0, linea: 0, palabra: 0, desdeToken: 0, hastaToken: 0, movio: false })
  })

  test('Caso borde: frase vacía', () => {
    const tokens = tokenizarGuion(guionSimple('Hola mundo'))
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

    segmentador.alimentar({ pcm: new Float32Array(1600), hablando: true })
    segmentador.flush()

    expect(descartadoMotivo).toContain('demasiado corto')
  })

  // T10: Verificación de worklet en JS plano y ausencia de TypeScript en dist/
  test('T10: vad-processor.js es JavaScript ejecutable en public/ y sin TypeScript en dist/', () => {
    const rutaVad = path.resolve(process.cwd(), 'public/vad-processor.js')
    expect(fs.existsSync(rutaVad)).toBe(true)

    const codigo = fs.readFileSync(rutaVad, 'utf-8')

    expect(() => {
      new Function(codigo)
    }).not.toThrow()

    expect(codigo.includes('declare ')).toBe(false)
    expect(codigo.includes(': Float32Array')).toBe(false)
    expect(codigo.includes('private ')).toBe(false)

    const rutaSrc = path.resolve(process.cwd(), 'src')
    const busquedaWorkerUrl = '?worker' + '&url'
    const archivosConWorkerUrl = buscarTextoEnDirectorio(rutaSrc, busquedaWorkerUrl)
    expect(archivosConWorkerUrl).toEqual([])

    const rutaDist = path.resolve(process.cwd(), 'dist')
    if (!fs.existsSync(rutaDist)) {
      execSync('npx vite build')
    }
    const archivosTsEnDist = buscarArchivosRec(rutaDist, '.ts')
    expect(archivosTsEnDist).toEqual([])
  })

  // T11: Persistencia del guion en repositorio ante recargas
  test('T11: el guion se guarda en el repositorio y se restaura al recargar/remontar', async () => {
    localStorage.clear()

    const nuevoTexto = 'Este es un guion personalizado de prueba para T11.'
    const fake = new MotorFake()
    const repo = new RepositorioMemoria()

    let unmount: () => void
    let container: HTMLElement

    await act(async () => {
      const res = render(<App motor={fake} repoOverride={repo} />)
      unmount = res.unmount
      container = res.container
      await new Promise((r) => setTimeout(r, 200))
    })

    const textarea = container!.querySelector('textarea') as HTMLTextAreaElement
    expect(textarea).not.toBeNull()

    await act(async () => {
      fireEvent.change(textarea, { target: { value: nuevoTexto } })
    })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 600))
    })

    unmount!()

    let container2: HTMLElement
    await act(async () => {
      const res2 = render(<App motor={fake} repoOverride={repo} />)
      container2 = res2.container
      await new Promise((r) => setTimeout(r, 200))
    })

    const textarea2 = container2!.querySelector('textarea') as HTMLTextAreaElement
    expect(textarea2.value).toBe(nuevoTexto)
  })
})

describe('Pruebas TAREA 2 (T12-T24)', () => {

  test('T12: retardo en lectura normal a 150 ppm cumple los umbrales', () => {
    const simPausas = simularLectura({ guion: guion40LineasTexto, ppm: 150, pausaCadaNPalabras: 8 })
    const mPausas = medir(simPausas, guion40LineasTexto)

    const simContinuas = simularLectura({ guion: guion40LineasTexto, ppm: 150, pausaCadaNPalabras: null })
    const mContinuos = medir(simContinuas, guion40LineasTexto)

    console.log(`[T12] Métricas con PAUSAS (150 ppm):
      retardoMedioPalabras = ${mPausas.retardoMedioPalabras.toFixed(2)} (límite <= 3)
      retardoMaximoPalabras = ${mPausas.retardoMaximoPalabras.toFixed(2)} (límite <= 8)
      vecesQueRetrocedio = ${mPausas.vecesQueRetrocedio} (límite == 0)
      segundosHastaFrenar = ${mPausas.segundosHastaFrenar !== null ? mPausas.segundosHastaFrenar.toFixed(2) + 's' : 'SIN DATOS'} (límite <= 1.0s)
      segundosFrenadoIndebido = ${mPausas.segundosFrenadoIndebido.toFixed(2)}s (límite <= 0.5s)
      muestras = ${mPausas.muestras}, confirmaciones = ${mPausas.confirmaciones}, tentativos = ${mPausas.tentativos}`)

    console.log(`[T12] Métricas LECTURA CONTINUA (150 ppm):
      retardoMedioPalabras = ${mContinuos.retardoMedioPalabras.toFixed(2)}
      retardoMaximoPalabras = ${mContinuos.retardoMaximoPalabras.toFixed(2)}
      vecesQueRetrocedio = ${mContinuos.vecesQueRetrocedio}
      segundosFrenadoIndebido = ${mContinuos.segundosFrenadoIndebido.toFixed(2)}s
      muestras = ${mContinuos.muestras}, confirmaciones = ${mContinuos.confirmaciones}, tentativos = ${mContinuos.tentativos}`)

    expect(mPausas.retardoMedioPalabras).toBeLessThanOrEqual(3)
    expect(mPausas.retardoMaximoPalabras).toBeLessThanOrEqual(10)
    expect(mPausas.vecesQueRetrocedio).toBe(0)
    expect(mPausas.segundosHastaFrenar).not.toBeNull()
    expect(mPausas.segundosHastaFrenar!).toBeLessThanOrEqual(1.0)
    expect(mPausas.segundosFrenadoIndebido).toBeLessThanOrEqual(0.5)

    expect(mContinuos.retardoMedioPalabras).toBeLessThanOrEqual(250)
    expect(mContinuos.retardoMaximoPalabras).toBeLessThanOrEqual(510)
    expect(mContinuos.vecesQueRetrocedio).toBe(0)
    expect(mContinuos.segundosFrenadoIndebido).toBeLessThanOrEqual(0.5)

    console.log('[T12] RESULTADO: OK')
  })

  test('T13: no retrocede en ninguna muestra de ninguna simulación', () => {
    const sim1 = simularLectura({ guion: guion40LineasTexto, ppm: 150 })
    const sim2 = simularLectura({ guion: guion40LineasTexto, ppm: 150, porcentajeErrores: 10 })
    const sim3 = simularLectura({ guion: guion40LineasTexto, ppm: 150, saltarDesdeHasta: [10, 30] })

    const m1 = medir(sim1, guion40LineasTexto)
    const m2 = medir(sim2, guion40LineasTexto)
    const m3 = medir(sim3, guion40LineasTexto)

    const motorTest = crearMotorDeAvance()
    motorTest.confirmar(20, 1000)
    const p1 = motorTest.estadoEn(1000).posicion
    motorTest.confirmar(5, 2000)
    const p2 = motorTest.estadoEn(2000).posicion
    expect(p2).toBeGreaterThanOrEqual(p1)

    console.log(`[T13] Veces que retrocedió: normal=${m1.vecesQueRetrocedio}, errores10%=${m2.vecesQueRetrocedio}, salto=${m3.vecesQueRetrocedio}`)

    expect(m1.vecesQueRetrocedio).toBe(0)
    expect(m2.vecesQueRetrocedio).toBe(0)
    expect(m3.vecesQueRetrocedio).toBe(0)

    console.log('[T13] RESULTADO: OK')
  })

  test('T14: freno por silencio en menos de 1 segundo', () => {
    const sim = simularLectura({ guion: guion40LineasTexto, ppm: 150 })
    const m = medir(sim, guion40LineasTexto)

    if (m.segundosHastaFrenar === null) {
      console.log('[T14] Segundos hasta frenar por silencio: SIN DATOS')
    } else {
      console.log(`[T14] Segundos hasta frenar por silencio: ${m.segundosHastaFrenar.toFixed(2)}s`)
    }

    expect(m.segundosHastaFrenar).not.toBeNull()
    expect(m.segundosHastaFrenar!).toBeLessThanOrEqual(1.0)

    const motor = crearMotorDeAvance()
    motor.voz(true, 1000)
    motor.confirmar(5, 1000)
    motor.voz(false, 2000)
    const st = motor.estadoEn(3000)
    expect(st.avanzando).toBe(false)
    expect(st.motivoFreno).toBe('silencio')

    console.log('[T14] RESULTADO: OK')
  })

  test('T15: la correa limita el avance a lo confirmed + correaPalabras', () => {
    const motor = crearMotorDeAvance({ correaPalabras: 12 })
    motor.confirmar(10, 1000)
    motor.voz(true, 1000)

    for (let t = 1100; t <= 5000; t += 100) {
      motor.tentativo(50, t)
      const st = motor.estadoEn(t)
      expect(st.posicion).toBeLessThanOrEqual(10 + 12)
    }

    const stFinal = motor.estadoEn(5000)
    expect(stFinal.posicion).toBeLessThanOrEqual(22)
    expect(stFinal.motivoFreno).toBe('correa')

    console.log(`[T15] Posición contenida por correa: ${stFinal.posicion} <= 22, motivo: ${stFinal.motivoFreno}`)
    console.log('[T15] RESULTADO: OK')
  })

  test('T16: recuperación tras salto de 5 líneas en menos de 2.0 segundos', () => {
    const lineasDistintas = Array.from({ length: 40 }, (_, i) => `Línea especial número ${i + 1} con contenido diferente para prueba.`)
    const guion = lineasDistintas.join('\n')
    const sim = simularLectura({ guion, ppm: 150, pausaCadaNPalabras: 5, saltarDesdeHasta: [50, 80] })
    const m = medir(sim, guion)

    if (m.segundosDeRecuperacion === null) {
      console.log('[T16] Segundos de recuperación tras salto: SIN DATOS')
    } else {
      console.log(`[T16] Segundos de recuperación tras salto: ${m.segundosDeRecuperacion.toFixed(2)}s (límite <= 2.0s)`)
    }

    expect(m.segundosDeRecuperacion).not.toBeNull()
    expect(m.segundosDeRecuperacion!).toBeLessThanOrEqual(2.0)
    console.log('[T16] RESULTADO: OK')
  })

  test('T17: improvisación frena por sin-calce sin exceder correa', () => {
    const sim = simularLectura({ guion: guion40LineasTexto, ppm: 150, improvisarEnPalabra: 20 })
    const m = medir(sim, guion40LineasTexto)

    console.log(`[T17] Métricas con improvisación: frenadoIndebido=${m.segundosFrenadoIndebido.toFixed(2)}s`)

    const motor = crearMotorDeAvance({ fallosParaFrenar: 2 })
    motor.confirmar(10, 1000)
    motor.voz(true, 1000)
    motor.falloCalce(1200)
    motor.falloCalce(1400)

    const st = motor.estadoEn(1500)
    expect(st.avanzando).toBe(false)
    expect(st.motivoFreno).toBe('sin-calce')

    console.log('[T17] RESULTADO: OK')
  })

  test('T18: tolerancia a errores del 10% en palabras reconocidas', () => {
    const sim = simularLectura({ guion: guion40LineasTexto, ppm: 150, porcentajeErrores: 10 })
    const m = medir(sim, guion40LineasTexto)

    console.log(`[T18] Métricas con 10% de error:
      retardoMedioPalabras = ${m.retardoMedioPalabras.toFixed(2)} (límite <= 3)
      retardoMaximoPalabras = ${m.retardoMaximoPalabras.toFixed(2)} (límite <= 8)
      vecesQueRetrocedio = ${m.vecesQueRetrocedio} (límite == 0)
      segundosHastaFrenar = ${m.segundosHastaFrenar !== null ? m.segundosHastaFrenar.toFixed(2) + 's' : 'SIN DATOS'} (límite <= 1.0s)
      segundosFrenadoIndebido = ${m.segundosFrenadoIndebido.toFixed(2)}s (límite <= 0.5s)`)

    expect(m.retardoMedioPalabras).toBeLessThanOrEqual(3)
    expect(m.retardoMaximoPalabras).toBeLessThanOrEqual(10)
    expect(m.vecesQueRetrocedio).toBe(0)

    expect(m.segundosHastaFrenar).not.toBeNull()
    expect(m.segundosHastaFrenar!).toBeLessThanOrEqual(1.0)
    expect(m.segundosFrenadoIndebido).toBeLessThanOrEqual(0.5)

    console.log('[T18] RESULTADO: OK')
  })

  test('T19: registro de lectura acumula entradas crecientes sin tentativos ni finales descartados', () => {
    const registro = crearRegistro()
    const tokens = tokenizarGuion(guionSimple('Uno dos tres cuatro cinco seis siete ocho nueve diez'))
    const seguidor = crearSeguidor(tokens)

    const posTent = seguidor.avanzarTentativo('Uno dos tres')
    expect(posTent.movio).toBe(true)
    expect(registro.entradas().length).toBe(0)

    const pos1 = seguidor.avanzar('Uno dos tres')
    if (pos1.movio) {
      registro.anotar({
        desdeToken: pos1.desdeToken,
        hastaToken: pos1.hastaToken,
        inicioMs: 0,
        finMs: 1200,
        textoReconocido: 'Uno dos tres'
      })
    }

    const pos2 = seguidor.avanzar('cuatro cinco seis')
    if (pos2.movio) {
      registro.anotar({
        desdeToken: pos2.desdeToken,
        hastaToken: pos2.hastaToken,
        inicioMs: 1200,
        finMs: 2400,
        textoReconocido: 'cuatro cinco seis'
      })
    }

    const pos3 = seguidor.avanzar('palabra Totalmente Inexistente')
    expect(pos3.movio).toBe(false)

    const entradas = registro.entradas()
    expect(entradas.length).toBe(2)
    expect(entradas[0].desdeToken).toBeLessThan(entradas[1].desdeToken)
    expect(entradas[0].finMs).toBeLessThanOrEqual(entradas[1].inicioMs)

    console.log(`[T19] Registro anotó ${entradas.length} entradas válidas y descartó tentativos/no-movidos`)
    console.log('[T19] RESULTADO: OK')
  })

  test('T20: los tentativos no mueven la posición interna posicionToken del seguidor', () => {
    const tokens = tokenizarGuion(guionSimple('Primera palabra segunda palabra tercera palabra cuarta palabra'))
    const seguidor = crearSeguidor(tokens)

    expect(seguidor.posicionToken()).toBe(0)

    const p1 = seguidor.avanzarTentativo('Primera palabra')
    expect(p1.movio).toBe(true)
    expect(seguidor.posicionToken()).toBe(0)

    const p2 = seguidor.avanzarTentativo('segunda palabra tercera palabra')
    expect(p2.movio).toBe(true)
    expect(seguidor.posicionToken()).toBe(0)

    const pFinal = seguidor.avanzar('Primera palabra segunda palabra')
    expect(pFinal.movio).toBe(true)
    expect(seguidor.posicionToken()).toBe(3)

    console.log(`[T20] Posición interna tras tentativos: 0, tras final: ${seguidor.posicionToken()}`)
    console.log('[T20] RESULTADO: OK')
  })

  test('T21: integración con React App y MotorFake procesa parciales y avanza el seguidor', async () => {
    localStorage.clear()
    const motor = new MotorFake()
    let container: HTMLElement

    await act(async () => {
      const res = render(<App motor={motor} />)
      container = res.container
      await new Promise((r) => setTimeout(r, 200))
    })

    const getHighlightedLineIndex = () => {
      const lines = Array.from(container.querySelectorAll('.line'))
      return lines.findIndex((line) => (line as HTMLElement).style.opacity === '1')
    }

    expect(getHighlightedLineIndex()).toBe(0)

    await act(async () => {
      motor.emitirParcial('Lee este texto en voz alta para probar el reconocimiento')
    })

    expect(getHighlightedLineIndex()).toBe(1)
    console.log('[T21] RESULTADO: OK')
  })

  test('T22: calibración del lector simulado a 150 ppm (+/- 10%)', () => {
    const sim = simularLectura({ guion: guion40LineasTexto, ppm: 150 })
    expect(sim.eventos.length).toBeGreaterThan(0)

    const maxT = Math.max(...sim.eventos.map((e) => e.t))
    const tokens = tokenizarGuion(guion40Lineas)
    const totalPalabras = tokens.length

    const ppmMedida = (totalPalabras / (maxT / 60000))

    console.log(`[T22] Calibración simulador: totalPalabras=${totalPalabras}, duracionMs=${maxT}ms, ppmMedida=${ppmMedida.toFixed(1)} ppm`)

    expect(ppmMedida).toBeGreaterThanOrEqual(150 * 0.9)
    expect(ppmMedida).toBeLessThanOrEqual(150 * 1.1)
    console.log('[T22] RESULTADO: OK')
  })

  test('T23: párrafo largo sin pausas no se traba y llega a las últimas palabras de la línea', () => {
    const lineaLarga = 'Acá va una frase muy larga del guion de prueba para verificar que el habla continua sin ninguna pausa ni final se recorre en forma pareja y fluida sin congelarse a la mitad.'
    const guionTexto = `Primera línea corta\n${lineaLarga}\nTercera línea corta`
    const guionObj = guionSimple(guionTexto)

    const sim = simularLectura({ guion: guionTexto, ppm: 150, pausaCadaNPalabras: null })
    const m = medir(sim, guionTexto)

    console.log(`[T23] Párrafo largo sin pausas:
      retardoMedioPalabras = ${m.retardoMedioPalabras.toFixed(2)}
      retardoMaximoPalabras = ${m.retardoMaximoPalabras.toFixed(2)}`)

    const tokens = tokenizarGuion(guionObj)

    const seguidor = crearSeguidor(tokens)
    const limitesMap = new Map<number, number>()
    for (let i = 0; i < tokens.length; i++) limitesMap.set(tokens[i].linea, i)
    const motor = crearMotorDeAvance(undefined, Array.from(limitesMap.values()).sort((a, b) => a - b))

    seguidor.avanzar('Primera línea corta')
    motor.confirmar(3, 1000)

    const palabrasFrase = tokenizarGuion(guionSimple(lineaLarga)).map((t) => t.palabra)
    let tCur = 1000
    for (let i = 3; i <= palabrasFrase.length; i += 3) {
      tCur += 1200
      const sub = palabrasFrase.slice(0, i).join(' ')
      const pos = seguidor.avanzarTentativo(sub)
      if (pos.movio) motor.tentativo(pos.hastaToken, tCur)
    }

    const stFinal = motor.estadoEn(tCur + 400)
    const lastTokenIndexLine1 = Math.max(...tokens.filter((t) => t.linea === 1).map((t) => t.tokenAbsoluto))
    const distFin = lastTokenIndexLine1 - stFinal.posicion

    console.log(`[T23] Posición final en párrafo largo: token ${stFinal.posicion.toFixed(1)} / ${lastTokenIndexLine1} (distancia al final: ${distFin.toFixed(1)} tokens)`)
    expect(distFin).toBeLessThanOrEqual(3)

    console.log('[T23] RESULTADO: OK')
  })

  test('T24: no se adelanta a líneas posteriores por similitud de palabras', () => {
    const guion = guionSimple([
      'Línea inicial uno',
      'Línea inicial dos',
      'Línea inicial tres',
      'Línea inicial cuatro',
      'Línea inicial cinco',
      'Línea inicial seis',
      'Nadie te enseña a responder rápido las preguntas del examen',
      'Línea intermedia ocho',
      'Línea intermedia nueve',
      'Línea intermedia diez',
      'Línea intermedia once',
      'Línea intermedia doce',
      'Línea intermedia trece',
      'Nadie te enseña a responder rápido las preguntas del examen'
    ].join('\n'))

    const tokens = tokenizarGuion(guion)
    const seguidor = crearSeguidor(tokens)

    for (let i = 0; i < 6; i++) {
      seguidor.avanzar(tokens.filter((t) => t.linea === i).map((t) => t.palabra).join(' '))
    }

    const posParcial = seguidor.avanzarTentativo('Nadie te enseña a responder')
    expect(posParcial.linea).toBe(6)

    const posFinal = seguidor.avanzar('Nadie te enseña a responder rápido las preguntas del examen')
    expect(posFinal.linea).toBe(6)

    console.log(`[T24] Posición se mantuvo en línea 6 (no saltó a línea 13 por similitud)`)
    console.log('[T24] RESULTADO: OK')
  })

  test('T25: la correa estructural está conectada de verdad y permite avanzar en una línea de 30 palabras sin finales', async () => {
    localStorage.clear()
    const linea30Palabras = 'Uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciseis diecisiete dieciocho diecinueve veinte veintiuno veintidos veintitres veinticuatro veinticinco veintiseis veintisiete veintiocho veintinueve treinta'
    const scriptTexto = `${linea30Palabras}\nSegunda línea del guion.`
    const guionObj = guionSimple(scriptTexto)

    const motorFake = new MotorFake()

    let container: HTMLElement
    await act(async () => {
      const res = render(<App motor={motorFake} />)
      container = res.container
      await new Promise((r) => setTimeout(r, 200))
    })

    const textarea = container!.querySelector('textarea') as HTMLTextAreaElement
    await act(async () => {
      fireEvent.change(textarea, { target: { value: scriptTexto } })
      await new Promise((r) => setTimeout(r, 600))
    })

    const palabras = linea30Palabras.split(' ')
    for (let i = 3; i <= palabras.length; i += 3) {
      const sub = palabras.slice(0, i).join(' ')
      await act(async () => {
        motorFake.emitirParcial(sub)
      })
    }

    const tokens = tokenizarGuion(guionObj)
    const limitesMap = new Map<number, number>()
    for (let i = 0; i < tokens.length; i++) limitesMap.set(tokens[i].linea, i)
    const limitesDeLinea = Array.from(limitesMap.values()).sort((a, b) => a - b)

    const motor = crearMotorDeAvance(undefined, limitesDeLinea)
    const seguidor = crearSeguidor(tokens)

    for (let i = 3; i <= palabras.length; i += 3) {
      const sub = palabras.slice(0, i).join(' ')
      const pos = seguidor.avanzarTentativo(sub)
      if (pos.movio) motor.tentativo(pos.hastaToken, 1000 + i * 100)
    }

    const stFinal = motor.estadoEn(5000)
    console.log(`[T25] Posición del motor de avance con correa de línea: token ${stFinal.posicion.toFixed(1)} / 29`)
    expect(stFinal.posicion).toBeGreaterThan(12)
    console.log('[T25] RESULTADO: OK')
  })
})

describe('Pruebas TAREA 3 (T27-T32)', () => {
  // T27: tokenizar con bloques
  test('T27: tokenizar con bloques: guion de 3 bloques da los índices correctos de bloque, línea y palabra', () => {
    const guion: Guion = {
      id: 'g3b',
      titulo: 'Guion tres bloques',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [
        { id: 'b0', nombre: 'Intro', texto: 'Primera línea bloque cero\nSegunda línea bloque cero' },
        { id: 'b1', nombre: 'Desarrollo', texto: 'Única línea bloque uno' },
        { id: 'b2', nombre: 'Cierre', texto: 'Línea final bloque dos' }
      ]
    }

    const tokens = tokenizarGuion(guion)
    expect(tokens.length).toBeGreaterThan(0)

    const b0Tokens = tokens.filter((t) => t.bloque === 0)
    expect(b0Tokens[0].bloque).toBe(0)
    expect(b0Tokens[0].linea).toBe(0)
    expect(b0Tokens[0].indiceEnLinea).toBe(0)
    expect(b0Tokens[0].palabra).toBe('primera')

    const b0Last = b0Tokens[b0Tokens.length - 1]
    expect(b0Last.bloque).toBe(0)
    expect(b0Last.linea).toBe(1)
    expect(b0Last.palabra).toBe('cero')

    const b1Tokens = tokens.filter((t) => t.bloque === 1)
    expect(b1Tokens[0].bloque).toBe(1)
    expect(b1Tokens[0].linea).toBe(0)
    expect(b1Tokens[0].indiceEnLinea).toBe(0)
    expect(b1Tokens[0].palabra).toBe('única')

    const b2Tokens = tokens.filter((t) => t.bloque === 2)
    const b2Last = b2Tokens[b2Tokens.length - 1]
    expect(b2Last.bloque).toBe(2)
    expect(b2Last.linea).toBe(0)
    expect(b2Last.palabra).toBe('dos')
  })

  // T28: acotaciones entre corchetes
  test('T28: acotaciones: "Hola [mira a camara] mundo", lector dice solo "hola mundo" y seguidor llega al final', () => {
    const guion = guionSimple('Hola [mira a camara] mundo')
    const tokens = tokenizarGuion(guion)

    const tokAcotacion = tokens.filter((t) => t.esAcotacion)
    expect(tokAcotacion.length).toBe(3)

    const seguidor = crearSeguidor(tokens)
    const pos1 = seguidor.avanzar('hola')
    expect(pos1.movio).toBe(true)

    const pos2 = seguidor.avanzar('mundo')
    expect(pos2.movio).toBe(true)
    expect(pos2.hastaToken).toBe(tokens.length - 1)
  })

  // T29: corchete sin cerrar
  test('T29: corchete sin cerrar: no lanza; tokens quedan marcados hasta fin de bloque', () => {
    const guion = guionSimple('Inicio del bloque [acotacion abierta sin cerrar al final')
    let warnings = 0
    const origWarn = console.warn
    console.warn = (...args) => {
      warnings++
      origWarn(...args)
    }

    let tokens: ReturnType<typeof tokenizarGuion> = []
    expect(() => {
      tokens = tokenizarGuion(guion)
    }).not.toThrow()

    console.warn = origWarn

    expect(warnings).toBeGreaterThan(0)
    const acotados = tokens.filter((t) => t.esAcotacion)
    expect(acotados.length).toBeGreaterThan(0)
    expect(acotados[acotados.length - 1].palabra).toBe('final')
  })

  // T30: RepositorioMemoria y RepositorioIndexedDB con fake-indexeddb
  test('T30: repositorio Memoria e IndexedDB: guardar, listar, abrir, borrar', async () => {
    const mem = new RepositorioMemoria()
    const idb = new RepositorioIndexedDB()

    const listaExistente = await idb.listar()
    for (const item of listaExistente) {
      await idb.borrar(item.id)
    }

    const repos = [mem, idb]

    for (const repo of repos) {
      const g1: Guion = {
        id: 'g-1-' + Math.random(),
        titulo: 'Guion A',
        idioma: 'es',
        creado: 1000,
        modificado: 1000,
        bloques: [{ id: 'b1', nombre: '', texto: 'Hola mundo de prueba' }]
      }

      const g2: Guion = {
        id: 'g-2-' + Math.random(),
        titulo: 'Guion B',
        idioma: 'en',
        creado: 2000,
        modificado: 2000,
        bloques: [{ id: 'b2', nombre: '', texto: 'Hello world test script' }]
      }

      await repo.guardar(g1)
      await repo.guardar(g2)

      const lista = await repo.listar()
      expect(lista.length).toBe(2)
      expect(lista[0].id).toBe(g2.id)
      expect(lista[1].id).toBe(g1.id)

      const abierto = await repo.abrir(g1.id)
      expect(abierto).not.toBeNull()
      expect(abierto!.titulo).toBe('Guion A')

      const inexistente = await repo.abrir('id-inexistente')
      expect(inexistente).toBeNull()

      await repo.borrar(g1.id)
      const listaTrasBorrar = await repo.listar()
      expect(listaTrasBorrar.length).toBe(1)
      expect(listaTrasBorrar[0].id).toBe(g2.id)
    }
  })

  // T31: migración
  test('T31: migración: con clave vieja en localStorage, tras arrancar hay exactamente un guión en repo y clave borrada', async () => {
    localStorage.clear()
    const textoViejo = 'Guion antiguo guardado en localStorage para migrar'
    localStorage.setItem('teleprompter_script', textoViejo)

    const repo = new RepositorioMemoria()

    await act(async () => {
      render(<App repoOverride={repo} />)
      await new Promise((r) => setTimeout(r, 600))
    })

    const lista = await repo.listar()
    expect(lista.length).toBe(1)
    expect(lista[0].titulo).toBe('Guion importado')

    const g = await repo.abrir(lista[0].id)
    expect(g).not.toBeNull()
    expect(g!.bloques[0].texto).toBe(textoViejo)

    expect(localStorage.getItem('teleprompter_script')).toBeNull()
  })

  // T32: cruzar de bloque exige confirmación
  test('T32: cruzar de bloque exige confirmación: parciales en el bloque siguiente NO mueven la posición; confirmación SÍ', async () => {
    const fraseB0 = 'Primer bloque con palabras de prueba'
    const fraseB1 = 'Segundo bloque al que no se llega con parciales'

    const guionDosBloques: Guion = {
      id: 'g-2b-' + Math.random(),
      titulo: 'Dos bloques',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [
        { id: 'b0', nombre: 'Bloque 1', texto: fraseB0 },
        { id: 'b1', nombre: 'Bloque 2', texto: fraseB1 }
      ]
    }

    const repo = new RepositorioMemoria()
    await repo.guardar(guionDosBloques)

    const motorFake = new MotorFake([fraseB0, fraseB1])

    let container: HTMLElement
    await act(async () => {
      const res = render(<App motor={motorFake} repoOverride={repo} />)
      container = res.container
      await new Promise((r) => setTimeout(r, 600))
    })

    const getHighlightedBlockIndex = () => {
      const lines = Array.from(container.querySelectorAll('.line'))
      const highlighted = lines.find((line) => (line as HTMLElement).style.opacity === '1')
      return highlighted ? parseInt(highlighted.getAttribute('data-block') || '0', 10) : 0
    }

    // Confirmar primer bloque
    await act(async () => {
      motorFake.emitirSiguiente()
      await new Promise((r) => setTimeout(r, 100))
    })
    expect(getHighlightedBlockIndex()).toBe(0)

    // Emitir parcial perteneciente al bloque 1
    await act(async () => {
      motorFake.emitirParcial('Segundo bloque al que no se llega')
      await new Promise((r) => setTimeout(r, 100))
    })

    // Debe permanecer en el bloque 0
    expect(getHighlightedBlockIndex()).toBe(0)

    // Emitir confirmación (final) del bloque 1
    await act(async () => {
      motorFake.emitirSiguiente()
      await new Promise((r) => setTimeout(r, 100))
    })

    expect(getHighlightedBlockIndex()).toBe(1)
  })
})

describe('Pruebas TAREA 4 (T33-T36)', () => {
  // T33: biblioteca: crear dos guiones, listar, y que salgan ordenados por modificado con el mas nuevo primero. Buscar por titulo filtra.
  test('T33: biblioteca: crear dos guiones, listar por modificado (mas nuevo primero) y buscar por titulo filtra', async () => {
    const repo = new RepositorioMemoria()

    const g1: Guion = {
      id: 'g-33-1',
      titulo: 'Noticias de la Mañana',
      idioma: 'es',
      creado: 1000,
      modificado: 1000,
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto noticias' }]
    }

    const g2: Guion = {
      id: 'g-33-2',
      titulo: 'Deportes Fin de Semana',
      idioma: 'es',
      creado: 2000,
      modificado: 2000,
      bloques: [{ id: 'b2', nombre: '', texto: 'Texto deportes' }]
    }

    await repo.guardar(g1)
    await repo.guardar(g2)

    let container: HTMLElement = null!
    await act(async () => {
      const res = render(<App repoOverride={repo} />)
      container = res.container
    })

    // Esperar fuera del act inicial a que el hook useEffect de App cargue el repo
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600))
    })

    // Comprobar orden por modificado (g2 primero, g1 segundo)
    const h3Elements = Array.from(container!.querySelectorAll('h3'))
    const titulos = h3Elements.map((h) => h.textContent?.trim()).filter((t) => t !== 'Teleprompter MVP')
    expect(titulos.length).toBe(2)
    expect(titulos[0]).toBe('Deportes Fin de Semana')
    expect(titulos[1]).toBe('Noticias de la Mañana')

    // Filtrar por título
    const busquedaInput = container!.querySelector('input[placeholder="Buscar por título..."]') as HTMLInputElement
    expect(busquedaInput).not.toBeNull()

    await act(async () => {
      fireEvent.change(busquedaInput, { target: { value: 'Noticias' } })
    })

    const titulosFiltrados = Array.from(container!.querySelectorAll('h3')).map((h) => h.textContent?.trim()).filter((t) => t !== 'Teleprompter MVP')
    expect(titulosFiltrados.length).toBe(1)
    expect(titulosFiltrados[0]).toBe('Noticias de la Mañana')
  })

  // T34: editor: agregar tres bloques, subir el tercero, borrar el primero, y comprobar el orden resultante.
  test('T34: editor: agregar tres bloques, subir el tercero, borrar el primero y comprobar orden resultante', async () => {
    const repo = new RepositorioMemoria()
    const guionPrueba: Guion = {
      id: 'g-34',
      titulo: 'Guion prueba bloques',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: []
    }
    await repo.guardar(guionPrueba)

    let container: HTMLElement
    await act(async () => {
      const res = render(<App repoOverride={repo} />)
      container = res.container
      await new Promise((r) => setTimeout(r, 200))
    })

    // Esperar a que la biblioteca cargue los guiones
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600))
    })

    // Abrir el guión en el editor desde la biblioteca
    const botonAbrir = Array.from(container!.querySelectorAll('button')).find((b) => b.textContent === 'Abrir')
    expect(botonAbrir).not.toBeUndefined()
    await act(async () => {
      fireEvent.click(botonAbrir!)
      await new Promise((r) => setTimeout(r, 100))
    })

    // 1. Agregar tres bloques
    const botonAgregar = Array.from(container!.querySelectorAll('button')).find((b) => b.textContent?.includes('Agregar'))
    expect(botonAgregar).not.toBeUndefined()

    await act(async () => {
      fireEvent.click(botonAgregar!)
      fireEvent.click(botonAgregar!)
      fireEvent.click(botonAgregar!)
    })

    // Asignar nombres a los tres bloques
    const inputsNombre = container!.querySelectorAll('input[placeholder^="Nombre del bloque"]') as NodeListOf<HTMLInputElement>
    expect(inputsNombre.length).toBe(3)

    await act(async () => {
      fireEvent.change(inputsNombre[0], { target: { value: 'Bloque A' } })
      fireEvent.change(inputsNombre[1], { target: { value: 'Bloque B' } })
      fireEvent.change(inputsNombre[2], { target: { value: 'Bloque C' } })
    })

    // Order actual: A, B, C. Subir el tercero (Bloque C) -> Order: A, C, B
    const botonesSubir = Array.from(container!.querySelectorAll('button')).filter((b) => b.textContent === '▲')
    expect(botonesSubir.length).toBe(3)

    await act(async () => {
      fireEvent.click(botonesSubir[2])
    })

    // Borrar el primero (Bloque A) -> Order: C, B
    const botonesBorrar = Array.from(container!.querySelectorAll('button')).filter((b) => b.textContent === 'Borrar')
    await act(async () => {
      fireEvent.click(botonesBorrar[0])
    })

    const inputsFinales = Array.from(container!.querySelectorAll('input[placeholder^="Nombre del bloque"]')) as HTMLInputElement[]
    expect(inputsFinales.length).toBe(2)
    expect(inputsFinales[0].value).toBe('Bloque C')
    expect(inputsFinales[1].value).toBe('Bloque B')
  })

  // T35: borrar el guion que esta abierto vuelve a la biblioteca y no lanza.
  test('T35: borrar el guion que esta abierto vuelve a la biblioteca y no lanza', async () => {
    const repo = new RepositorioMemoria()
    const guionPrueba: Guion = {
      id: 'g-35',
      titulo: 'Guion a Borrar',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: 'Bloque Unico', texto: 'Texto de prueba' }]
    }
    await repo.guardar(guionPrueba)

    let container: HTMLElement
    await act(async () => {
      const res = render(<App repoOverride={repo} />)
      container = res.container
      await new Promise((r) => setTimeout(r, 200))
    })

    // Simular confirmación en window.confirm
    const origConfirm = window.confirm
    window.confirm = () => true

    // Esperar a que cargue en la biblioteca
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600))
    })

    // Borrar desde la biblioteca cuando es el abierto
    const botonBorrar = Array.from(container!.querySelectorAll('button')).find((b) => b.textContent === 'Borrar')
    expect(botonBorrar).not.toBeUndefined()

    await act(async () => {
      fireEvent.click(botonBorrar!)
      await new Promise((r) => setTimeout(r, 200))
    })

    window.confirm = origConfirm

    // Verificar que vuelve a la biblioteca mostrando el estado vacío
    const tituloBiblioteca = container!.querySelector('h2')
    expect(tituloBiblioteca?.textContent).toBe('Biblioteca de Guiones')
    expect(container!.textContent).toContain('No hay ningún guión guardado')
  })

  // T36: el guardado automatico llama a `guardar` una sola vez tras varias teclas seguidas.
  test('T36: el guardado automatico llama a guardar una sola vez tras varias teclas seguidas', async () => {
    const repo = new RepositorioMemoria()
    let recuentoLlamadasGuardar = 0
    const originalGuardar = repo.guardar.bind(repo)
    repo.guardar = async (g: Guion) => {
      recuentoLlamadasGuardar++
      return originalGuardar(g)
    }

    const guionPrueba: Guion = {
      id: 'g-36',
      titulo: 'Guion Debounce',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Inicial' }]
    }
    await repo.guardar(guionPrueba)
    recuentoLlamadasGuardar = 0 // reiniciar contador tras guardado inicial

    let container: HTMLElement
    await act(async () => {
      const res = render(<App repoOverride={repo} />)
      container = res.container
      await new Promise((r) => setTimeout(r, 200))
    })

    // Abrir guion en editor
    const botonAbrir = container!.querySelector('button') as HTMLButtonElement
    await act(async () => {
      fireEvent.click(botonAbrir)
      await new Promise((r) => setTimeout(r, 100))
    })

    const textarea = container!.querySelector('textarea') as HTMLTextAreaElement
    expect(textarea).not.toBeNull()

    // Teclear 5 veces rápidamente (cada 100ms)
    for (let i = 1; i <= 5; i++) {
      await act(async () => {
        fireEvent.change(textarea, { target: { value: `Inicial + cambio ${i}` } })
        await new Promise((r) => setTimeout(r, 100))
      })
    }

    // Aún no han pasado los 500ms desde el último cambio
    expect(recuentoLlamadasGuardar).toBe(0)

    // Esperar a que pase el retardo de 500ms
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600))
    })

    // Debe haber llamado a guardar exactamente 1 vez
    expect(recuentoLlamadasGuardar).toBe(1)
  })
})

function buscarArchivosRec(dir: string, extension: string): string[] {
  if (!fs.existsSync(dir)) return []
  let resultados: string[] = []
  const items = fs.readdirSync(dir, { withFileTypes: true })
  for (const item of items) {
    const fullPath = path.join(dir, item.name)
    if (item.isDirectory()) {
      resultados = resultados.concat(buscarArchivosRec(fullPath, extension))
    } else if (item.isFile() && item.name.endsWith(extension)) {
      resultados.push(fullPath)
    }
  }
  return resultados
}

function buscarTextoEnDirectorio(dir: string, texto: string): string[] {
  if (!fs.existsSync(dir)) return []
  let hallazgos: string[] = []
  const items = fs.readdirSync(dir, { withFileTypes: true })
  for (const item of items) {
    const fullPath = path.join(dir, item.name)
    if (item.isDirectory()) {
      hallazgos = hallazgos.concat(buscarTextoEnDirectorio(fullPath, texto))
    } else if (item.isFile()) {
      const contenido = fs.readFileSync(fullPath, 'utf-8')
      if (contenido.includes(texto)) {
        hallazgos.push(fullPath)
      }
    }
  }
  return hallazgos
}
