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

    // Caso de primer bloque vacío
    const guionBloque1Vacio: Guion = {
      id: 'g-t274-vacio',
      titulo: 'Guion con primer bloque vacio',
      idioma: 'es',
      creado: 1000,
      modificado: 1000,
      bloques: [
        {
          id: 'b1',
          nombre: '',
          texto: '   '
        },
        {
          id: 'b2',
          nombre: '',
          texto: 'Texto del segundo bloque.'
        }
      ]
    }

    const consolidadoVacio = consolidarGuion(guionBloque1Vacio)
    expect(consolidadoVacio.bloques.length).toBe(1)
    expect(consolidadoVacio.bloques[0].texto).toBe('Texto del segundo bloque.')

    // Caso de UN SOLO bloque cuyo texto empieza con dos saltos de linea
    const guionUnBloqueConSaltosPrevios: Guion = {
      id: 'g-t274-un-bloque-saltos',
      titulo: 'Guion con un solo bloque y saltos iniciales',
      idioma: 'es',
      creado: 1000,
      modificado: 1000,
      bloques: [
        {
          id: 'b1',
          nombre: '',
          texto: '\n\nINSERCIONES:\n\nPrimer párrafo.\n\nSegundo párrafo.\n\n'
        }
      ]
    }

    const consolidadoUnBloque = consolidarGuion(guionUnBloqueConSaltosPrevios)
    expect(consolidadoUnBloque.bloques.length).toBe(1)

    // Empieza en la primera palabra ("INSERCIONES:"), las líneas en blanco de adentro siguen estando
    const textoEsperadoUnBloque = 'INSERCIONES:\n\nPrimer párrafo.\n\nSegundo párrafo.'
    expect(consolidadoUnBloque.bloques[0].texto).toBe(textoEsperadoUnBloque)

    // Si no cambia nada, modificado se mantiene intacto y se devuelve el mismo objeto
    const guionLimpio: Guion = {
      id: 'g-t274-limpio',
      titulo: 'Guion ya limpio',
      idioma: 'es',
      creado: 1000,
      modificado: 1000,
      bloques: [
        {
          id: 'b1',
          nombre: '',
          texto: 'Texto ya limpio.'
        }
      ]
    }
    const consolidadoLimpio = consolidarGuion(guionLimpio)
    expect(consolidadoLimpio.modificado).toBe(1000)
    expect(consolidadoLimpio).toBe(guionLimpio)
  })
})
