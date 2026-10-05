// TAREA 87, PASO 0 -03-10-2026-: el formato de las líneas SigoExport y lo que guarda el panel de
// mediciones. Claude lee estas líneas: si el formato se mueve, se rompe la lectura.
import { describe, test, expect, beforeEach } from 'vitest'
import {
  lineaSigoExport,
  lineaDeEvento,
  leerLineaSigoExport,
  conEtiqueta,
  escaparValor,
  ENSAYOS,
  EVENTOS,
  asignarEnsayoPendiente,
  anotarCopiaDeMedicion,
  quitarCopiasDeMedicion,
  copiasDeMedicion,
  agregarAlRegistro,
  registroGuardado,
  MAX_LINEAS_REGISTRO
} from '../lib/medicionesExport'

describe('Tarea 87 - paso 0: las líneas SigoExport', () => {
  beforeEach(() => localStorage.clear())

  test('LINEA SIGOEXPORT: claves en orden, unidades en el nombre, sin espacios en los valores', () => {
    const l = lineaDeEvento('guardado_fin', {
      id: '008a7133', resultado: 'ok', msTransformer: 41200, msCopia: 900, msGuardado: 42350,
      bytes_salida: 90123456, cuadros: 1800, bitrate_salida_bps: 12000000, error: null
    }, 1790000000000)
    expect(l).toBe(
      'v=1 evento=guardado_fin t_ms=1790000000000 id=008a7133 resultado=ok msTransformer=41200 msCopia=900 ' +
      'msGuardado=42350 bytes_salida=90123456 cuadros=1800 bitrate_salida_bps=12000000 error=NA'
    )
    expect(conEtiqueta(l).startsWith('SigoExport v=1 evento=guardado_fin t_ms=')).toBe(true)
    // Cada campo es clave=valor y ninguna clave de forma lleva una unidad suelta: va en el nombre.
    for (const parte of l.split(' ')) expect(parte).toMatch(/^[A-Za-z_]+=[^ =]+$/)
    expect(EVENTOS.forma).toContain('ancho_px')
    expect(EVENTOS.forma).toContain('rot_grados')
    expect(EVENTOS.forma).toContain('bitrate_bps')
  })

  test('LINEA SIGOEXPORT: un texto con espacios o con = se escapa', () => {
    expect(escaparValor('No se pudo = nada')).toBe('No%20se%20pudo%20%3D%20nada')
    expect(escaparValor('100%')).toBe('100%25')
    const l = lineaSigoExport('guardado_fin', [['error', 'falló el codificador = sí']], 1)
    expect(l.split(' ').length).toBe(4)
    expect(leerLineaSigoExport(conEtiqueta(l)).error).toBe('falló el codificador = sí')
  })

  test('LINEA SIGOEXPORT: un dato que no se pudo leer es NA, y una clave que falta también', () => {
    const l = lineaDeEvento('forma', { id: 'abc', ancho_px: 1920, fps: Number.NaN }, 5)
    const d = leerLineaSigoExport(l)
    expect(d.ancho_px).toBe('1920')
    expect(d.fps).toBe('NA')
    expect(d.alto_px).toBe('NA')
    expect(Object.keys(d)).toEqual(['v', 'evento', 't_ms', ...EVENTOS.forma])
  })

  test('LOS DIEZ ENSAYOS del encargo, con sus nombres exactos', () => {
    expect([...ENSAYOS]).toEqual([
      'v1080-10s', 'v720-10s', 'v480-10s', 'h1080-10s', 'giro-30s',
      'acostado-10s', 'vista-4x3', 't1min', 't5min', 't20min'
    ])
  })

  test('ENSAYO PENDIENTE: lo lleva la primera toma creada después de elegirlo, y una sola', () => {
    const tomas = [
      { id: 'vieja', creado: 100 },
      { id: 'segunda', creado: 300 },
      { id: 'primera', creado: 200 }
    ]
    const r = asignarEnsayoPendiente(tomas, { pendiente: { ensayo: 't5min', desdeMs: 150 }, asignados: {} })
    expect(r.asignada).toEqual({ id: 'primera', ensayo: 't5min' })
    expect(r.estado.pendiente).toBeNull()
    // Ya no hay pendiente: la toma siguiente no se lleva nada.
    const r2 = asignarEnsayoPendiente(tomas, r.estado)
    expect(r2.asignada).toBeNull()
    expect(r2.estado.asignados).toEqual({ primera: 't5min' })
  })

  test('COPIAS DE MEDICIÓN: quitar deja en la lista solo las que no se borraron', () => {
    anotarCopiaDeMedicion({ uri: 'content://media/1', id: 'a', tMs: 1 })
    anotarCopiaDeMedicion({ uri: 'content://media/2', id: 'b', tMs: 2 })
    anotarCopiaDeMedicion({ uri: 'content://media/2', id: 'b', tMs: 3 })
    expect(copiasDeMedicion().length).toBe(2)
    expect(quitarCopiasDeMedicion(['content://media/1']).map((c) => c.uri)).toEqual(['content://media/2'])
  })

  test('EL REGISTRO queda entre aperturas y no crece sin fin', () => {
    for (let i = 0; i < MAX_LINEAS_REGISTRO + 3; i++) agregarAlRegistro(`SigoExport v=1 evento=ensayo t_ms=${i}`)
    const r = registroGuardado()
    expect(r.length).toBe(MAX_LINEAS_REGISTRO)
    expect(r[r.length - 1]).toBe(`SigoExport v=1 evento=ensayo t_ms=${MAX_LINEAS_REGISTRO + 2}`)
  })
})
