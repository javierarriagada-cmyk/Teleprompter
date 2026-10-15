// -pulido-1- Solo lógica: el aviso del guardado que falla, una vez por racha; los textos en los dos idiomas.
import { describe, expect, test } from 'vitest'
import { pasoRachaGuardado } from '../lib/rachaGuardado'
import { es } from '../textos/es'
import { en } from '../textos/en'

describe('pulido-1', () => {
  test('el guardado que falla avisa una vez por racha y vuelve a avisar tras uno bueno', () => {
    let avisado = false
    const avisos: boolean[] = []
    for (const ok of [false, false, false, true, false, false]) {
      const p = pasoRachaGuardado(avisado, ok)
      avisos.push(p.avisar)
      avisado = p.avisado
    }
    expect(avisos).toEqual([true, false, false, false, true, false])
  })
  test('es.ts y en.ts tienen las mismas claves, con el aviso nuevo', () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort())
    expect(es.avisoGuardadoFallo).toBe('No se pudo guardar. Tus cambios siguen en pantalla.')
    expect(en.avisoGuardadoFallo).toBe('Couldn’t save. Your changes are still on screen.')
  })
  test('resumenUnGuion va sin tilde', () => {
    expect(es.resumenUnGuion).toBe('1 guion')
  })
})
