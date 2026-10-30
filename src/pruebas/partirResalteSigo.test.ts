import { describe, expect, it } from 'vitest'
import { partirResalteSigo } from '../lib/partirResalteSigo'

describe('partirResalteSigo', () => {
  it('parte es / en / pt del aviso de marca', () => {
    expect(partirResalteSigo('Con Sigo+, tus videos sin marca de agua.')).toEqual({
      antes: 'Con ',
      resalte: 'Sigo+',
      despues: ', tus videos sin marca de agua.'
    })
    expect(partirResalteSigo('With Sigo+, your videos without a watermark.')).toEqual({
      antes: 'With ',
      resalte: 'Sigo+',
      despues: ', your videos without a watermark.'
    })
    expect(partirResalteSigo("Com o Sigo+, seus vídeos sem marca d'água.")).toEqual({
      antes: 'Com o ',
      resalte: 'Sigo+',
      despues: ", seus vídeos sem marca d'água."
    })
  })

  it('sin Sigo+ devuelve null', () => {
    expect(partirResalteSigo('Hola')).toBeNull()
  })
})
