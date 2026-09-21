import { describe, expect, test } from 'vitest'
import { consolidarGuion } from '../datos/consolidar'
import { Guion } from '../datos/modelo'

describe('Pruebas TAREA 57: Sin bloques en el editor (T274)', () => {
  test('T274: un guion con dos bloques, el segundo con una palabra en ambar, al juntarse queda con un solo bloque, el texto completo separado por una linea en blanco, y el tramo ambar cae sobre la misma palabra que antes', () => {
    const guionOriginal: Guion = {
      id: 'g-t274',
      titulo: 'Guion dos bloques',
      idioma: 'es',
      creado: 1000,
      modificado: 1000,
      bloques: [
        {
          id: 'b1',
          nombre: '',
          texto: 'Primer bloque de texto.'
        },
        {
          id: 'b2',
          nombre: '',
          texto: 'Segundo bloque con palabra ambar destacada.',
          tramos: [{ desde: 27, hasta: 32, color: 'ambar' }]
        }
      ]
    }

    const palabraEnB2 = guionOriginal.bloques[1].texto.substring(27, 32)
    expect(palabraEnB2).toBe('ambar')

    const consolidado = consolidarGuion(guionOriginal)

    expect(consolidado.bloques.length).toBe(1)

    const textoEsperado = 'Primer bloque de texto.\n\nSegundo bloque con palabra ambar destacada.'
    expect(consolidado.bloques[0].texto).toBe(textoEsperado)

    expect(consolidado.bloques[0].tramos?.length).toBe(1)
    const tramo = consolidado.bloques[0].tramos![0]
    expect(tramo.color).toBe('ambar')

    const palabraDestacada = consolidado.bloques[0].texto.substring(tramo.desde, tramo.hasta)
    expect(palabraDestacada).toBe('ambar')
  })
})
