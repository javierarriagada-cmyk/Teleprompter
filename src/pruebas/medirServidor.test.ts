// -medir-servidor-local, 16-10-2026- Lógica del lado del visor en la medición: en esta rama el salto al
// reproductor del sistema queda apagado, fuera del teléfono no hay dirección local, y el texto del error.
// El rango y la clave del servidor se prueban en Java -PedidoLocalTest-.
import { describe, expect, test } from 'vitest'
import { MEDIR_SERVIDOR_LOCAL, direccionLocal, textoDeErrorDeVideo } from '../lib/medirServidor'

describe('Medición del servidor local', () => {
  test('en esta rama la medición está prendida', () => {
    expect(MEDIR_SERVIDOR_LOCAL).toBe(true)
  })
  test('fuera del teléfono no hay dirección local: queda convertFileSrc', async () => {
    expect(await direccionLocal('content://media/external/video/media/9')).toBeNull()
  })
  test('el error del <video> lleva código, mensaje y segundo', () => {
    expect(textoDeErrorDeVideo({ code: 2, message: 'PIPELINE_ERROR_READ' }, 850.04)).toBe('error del <video> code=2 message=PIPELINE_ERROR_READ en t=850.0')
    expect(textoDeErrorDeVideo(null, 0)).toBe('error del <video> sin MediaError en t=0.0')
  })
})
