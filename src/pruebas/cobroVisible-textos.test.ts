// -orden 2, punto 10/11- Las claves nuevas existen en es, en y pt con el texto pedido.
import { describe, it, expect } from 'vitest'
import { es } from '../textos/es'
import { en } from '../textos/en'
import { pt } from '../textos/pt'

const CLAVES = [
  'avisoQuedaMinutoVoz', 'textoQuedaConVoz', 'limiteLectura',
  'avisoQuedaMinutoGrabacion', 'limiteGrabacion',
  'tarjetaSigoTitulo', 'tarjetaSigoTexto', 'tarjetaSigoTextoSinPrueba', 'tarjetaSigoBoton',
  'restaurarCompras', 'restaurarListo', 'restaurarNada', 'sigoActivo',
  'avisoGuardarSinMarca', 'avisoFinPrueba', 'sinConexionVerificar'
] as const

describe('cobro-visible textos -orden 2-', () => {
  it('las claves nuevas existen en es, en y pt', () => {
    for (const c of CLAVES) {
      expect(es[c], c + ' es').toBeTruthy()
      expect(en[c], c + ' en').toBeTruthy()
      expect(pt[c], c + ' pt').toBeTruthy()
    }
  })
  it('textos exactos del encargo', () => {
    expect(es.avisoQuedaMinutoVoz).toBe('Te queda 1 minuto con voz.')
    expect(en.avisoQuedaMinutoVoz).toBe('1 minute left with voice.')
    expect(pt.avisoQuedaMinutoVoz).toBe('Falta 1 minuto com voz.')
    expect(es.textoQuedaConVoz).toBe('{t} con voz')
    expect(en.textoQuedaConVoz).toBe('{t} with voice')
    expect(pt.textoQuedaConVoz).toBe('{t} com voz')
    expect(es.limiteLectura).toBe('Con Sigo+, Sigo te sigue hasta el final.')
    expect(en.limiteLectura).toBe('With Sigo+, Sigo follows you to the end.')
    expect(pt.limiteLectura).toBe('Com o Sigo+, o Sigo acompanha você até o fim.')
    expect(es.avisoQuedaMinutoGrabacion).toBe('Te queda 1 minuto de grabación.')
    expect(en.avisoQuedaMinutoGrabacion).toBe('1 minute of recording left.')
    expect(pt.avisoQuedaMinutoGrabacion).toBe('Falta 1 minuto de gravação.')
    expect(es.limiteGrabacion).toBe('Con Sigo+, graba tomas completas, sin cortes.')
    expect(en.limiteGrabacion).toBe('With Sigo+, record full takes, without cuts.')
    expect(pt.limiteGrabacion).toBe('Com o Sigo+, grave tomadas completas, sem cortes.')
    expect(es.tarjetaSigoTexto).toBe('Lee y graba sin cortes. 7 días gratis.')
    expect(en.tarjetaSigoTexto).toBe('Read and record without cuts. 7 days free.')
    expect(pt.tarjetaSigoTexto).toBe('Leia e grave sem cortes. 7 dias grátis.')
    expect(es.tarjetaSigoTextoSinPrueba).toBe('Lee y graba sin cortes.')
    expect(en.tarjetaSigoTextoSinPrueba).toBe('Read and record without cuts.')
    expect(pt.tarjetaSigoTextoSinPrueba).toBe('Leia e grave sem cortes.')
    expect(es.tarjetaSigoBoton).toBe('Ver Sigo+')
    expect(en.tarjetaSigoBoton).toBe('See Sigo+')
    expect(pt.tarjetaSigoBoton).toBe('Ver o Sigo+')
    expect(es.restaurarCompras).toBe('Restaurar compras')
    expect(en.restaurarCompras).toBe('Restore purchases')
    expect(pt.restaurarCompras).toBe('Restaurar compras')
    expect(es.restaurarListo).toBe('Sigo+ está activo.')
    expect(en.restaurarListo).toBe('Sigo+ is active.')
    expect(pt.restaurarListo).toBe('O Sigo+ está ativo.')
    expect(es.restaurarNada).toBe('No encontramos compras de Sigo+ en esta cuenta de Google.')
    expect(en.restaurarNada).toBe("We couldn't find Sigo+ purchases on this Google account.")
    expect(pt.restaurarNada).toBe('Não encontramos compras do Sigo+ nesta conta do Google.')
    expect(es.sigoActivo).toBe('Sigo+ activo · Administrar')
    expect(en.sigoActivo).toBe('Sigo+ active · Manage')
    expect(pt.sigoActivo).toBe('Sigo+ ativo · Gerenciar')
    expect(es.avisoGuardarSinMarca).toBe('Con Sigo+, tus videos sin marca de agua.')
    expect(en.avisoGuardarSinMarca).toBe('With Sigo+, your videos without a watermark.')
    expect(pt.avisoGuardarSinMarca).toBe("Com o Sigo+, seus vídeos sem marca d'água.")
    expect(es.avisoFinPrueba).toBe('Tu prueba termina el {fecha}.')
    expect(en.avisoFinPrueba).toBe('Your trial ends on {fecha}.')
    expect(pt.avisoFinPrueba).toBe('Seu teste termina em {fecha}.')
    expect(es.sinConexionVerificar).toBe('Conéctate un momento para verificar Sigo+.')
    expect(en.sinConexionVerificar).toBe('Connect for a moment to verify Sigo+.')
    expect(pt.sinConexionVerificar).toBe('Conecte-se por um momento para verificar o Sigo+.')
    for (const lang of [es, en, pt]) {
      for (const c of CLAVES) {
        expect(String(lang[c]).toLowerCase()).not.toContain('tope')
      }
    }
  })
})
