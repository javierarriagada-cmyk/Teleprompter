// TAREA 88 -04-10-2026-: LA MÁQUINA DE PAUSA -src/lib/pausaToma.ts, TypeScript pura-.
// Botón de pausa, tacho y gestos pasan por la MISMA máquina: docs/tarea88.txt, sección 3. Todas estas
// pruebas tienen lógica: se rompieron a propósito contra una máquina que no hacía nada antes de escribirla.
import { describe, test, expect } from 'vitest'
import { paso, MARGEN_MANO_MS, type EstadoPausa, type Entrada } from '../lib/pausaToma'

const grabando: EstadoPausa = { tipo: 'grabando' }
// Una secuencia de entradas desde un estado; devuelve el estado final y todas las acciones en orden.
function correr(e: EstadoPausa, entradas: Entrada[]) {
  const acciones: string[] = []
  let estado = e
  for (const en of entradas) {
    const r = paso(estado, en)
    estado = r.estado
    for (const a of r.acciones) acciones.push(a.tipo)
  }
  return { estado, acciones }
}
const palma = (tMs: number, vistoDesdeMs = tMs): Entrada => ({ tipo: 'gesto', gesto: 'palma', tMs, vistoDesdeMs })
const ninguno = (tMs: number): Entrada => ({ tipo: 'gesto', gesto: 'ninguno', tMs, vistoDesdeMs: tMs })
const victoria = (tMs: number): Entrada => ({ tipo: 'gesto', gesto: 'victoria', tMs, vistoDesdeMs: tMs })

describe('Tarea 88: la máquina de pausa', () => {
  test('botón pausa con desde = toque, sin margen', () => {
    const r = paso(grabando, { tipo: 'alternar', tMs: 10_000 })
    expect(r.estado).toEqual({ tipo: 'pausada', desdeMs: 10_000, origen: 'boton', manoBajada: true, contando: false })
    expect(r.acciones).toEqual([{ tipo: 'pausar', desdeMs: 10_000, origen: 'boton' }])
  })
  test('botón sigue con hasta = toque', () => {
    const p = paso(grabando, { tipo: 'alternar', tMs: 10_000 }).estado
    const r = paso(p, { tipo: 'alternar', tMs: 14_500 })
    expect(r.estado).toEqual({ tipo: 'grabando' })
    expect(r.acciones).toEqual([{ tipo: 'reanudar', hastaMs: 14_500 }])
  })
  test('palma grabando pausa 1 s antes de la primera vista', () => {
    expect(MARGEN_MANO_MS).toBe(1000)
    const r = paso(grabando, palma(21_000, 20_000))
    expect(r.estado).toEqual({ tipo: 'pausada', desdeMs: 19_000, origen: 'palma', manoBajada: false, contando: false })
    expect(r.acciones).toEqual([{ tipo: 'pausar', desdeMs: 19_000, origen: 'palma' }])
  })
  test('palma sostenida no reanuda', () => {
    const p = paso(grabando, palma(21_000, 20_000)).estado
    const r = correr(p, [palma(25_000), palma(30_000)])
    expect(r.estado.tipo).toBe('pausada')
    expect(r.acciones).toEqual([])
  })
  test('ninguno y palma empieza la cuenta, no reanuda', () => {
    const p = paso(grabando, palma(21_000, 20_000)).estado
    const r = correr(p, [ninguno(22_000), palma(23_000)])
    expect(r.estado).toMatchObject({ tipo: 'pausada', manoBajada: true, contando: true, desdeMs: 19_000 })
    expect(r.acciones).toEqual(['empezarCuenta'])
  })
  test('finCuenta reanuda con hasta = fin de la cuenta', () => {
    const p = correr(paso(grabando, palma(21_000, 20_000)).estado, [ninguno(22_000), palma(23_000)]).estado
    const r = paso(p, { tipo: 'finCuenta', tMs: 26_000 })
    expect(r.estado).toEqual({ tipo: 'grabando' })
    expect(r.acciones).toEqual([{ tipo: 'reanudar', hastaMs: 26_000 }])
  })
  test('Seguir durante la cuenta reanuda al tiro y la cancela', () => {
    const p = correr(paso(grabando, palma(21_000, 20_000)).estado, [ninguno(22_000), palma(23_000)]).estado
    const r = paso(p, { tipo: 'alternar', tMs: 24_000 })
    expect(r.estado).toEqual({ tipo: 'grabando' })
    expect(r.acciones).toEqual([{ tipo: 'cancelarCuenta' }, { tipo: 'reanudar', hastaMs: 24_000 }])
  })
  test('palma durante la cuenta no hace nada', () => {
    const p = correr(paso(grabando, palma(21_000, 20_000)).estado, [ninguno(22_000), palma(23_000)]).estado
    const r = paso(p, palma(24_000))
    expect(r.estado).toEqual(p)
    expect(r.acciones).toEqual([])
  })
  test('V grabando no hace nada', () => {
    const r = paso(grabando, victoria(5000))
    expect(r.estado).toEqual(grabando)
    expect(r.acciones).toEqual([])
  })
  test('V en pausa termina', () => {
    const p = paso(grabando, { tipo: 'alternar', tMs: 10_000 }).estado
    const r = paso(p, victoria(12_000))
    expect(r.acciones).toEqual([{ tipo: 'terminar' }])
    // Termina con la pausa abierta: sin reanudar, la toma acaba donde se pausó.
    expect(r.acciones.some((a) => a.tipo === 'reanudar')).toBe(false)
  })
  test('V durante la cuenta la cancela y termina', () => {
    const p = correr(paso(grabando, palma(21_000, 20_000)).estado, [ninguno(22_000), palma(23_000)]).estado
    const r = paso(p, victoria(24_000))
    expect(r.acciones).toEqual([{ tipo: 'cancelarCuenta' }, { tipo: 'terminar' }])
  })
  test('tacho durante la cuenta la cancela y pide confirmación', () => {
    const p = correr(paso(grabando, palma(21_000, 20_000)).estado, [ninguno(22_000), palma(23_000)]).estado
    const r = paso(p, { tipo: 'tacho' })
    expect(r.estado).toEqual({ tipo: 'confirmando', desdeMs: 19_000, origen: 'palma' })
    expect(r.acciones).toEqual([{ tipo: 'cancelarCuenta' }, { tipo: 'pedirConfirmacion' }])
  })
  test('tacho, tacho borra', () => {
    const p = paso(grabando, { tipo: 'alternar', tMs: 10_000 }).estado
    const r = correr(p, [{ tipo: 'tacho' }, { tipo: 'tacho' }])
    expect(r.acciones).toEqual(['pedirConfirmacion', 'borrar'])
  })
  test('alternar en confirmando reanuda', () => {
    const p = correr(paso(grabando, { tipo: 'alternar', tMs: 10_000 }).estado, [{ tipo: 'tacho' }]).estado
    const r = paso(p, { tipo: 'alternar', tMs: 13_000 })
    expect(r.estado).toEqual({ tipo: 'grabando' })
    expect(r.acciones).toEqual([{ tipo: 'reanudar', hastaMs: 13_000 }])
  })
  test('gestos en confirmando no hacen nada', () => {
    const p = correr(paso(grabando, { tipo: 'alternar', tMs: 10_000 }).estado, [{ tipo: 'tacho' }]).estado
    const r = correr(p, [palma(11_000), ninguno(12_000), palma(13_000), victoria(14_000)])
    expect(r.estado).toEqual(p)
    expect(r.acciones).toEqual([])
  })
})
