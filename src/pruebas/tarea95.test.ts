// TAREA 95 -05-10-2026-: LAS DOS PAREJAS DE LECTURA QUE FALTABAN.
//
// Javier aprobo el 07-09-2026 -decisiones-de-diseno.txt, A9- tres fondos y tres letras; en la
// tarea 44 quedaron tres parejas. Vuelven negro con verde fuerte y gris muy oscuro con hueso
// -modelo.ts, PAREJAS_COLOR, donde estan los hex y su contraste medido-.
//
// Solo logica, por la regla del 05-10-2026 -lo-que-hay-que-saber.txt-: que sanitizarColores
// deje pasar las dos parejas nuevas al leer los ajustes guardados, y que siga tirando las
// combinaciones que nadie ofrece. Sin las dos parejas en PAREJAS_COLOR, las dos primeras
// fallan: un ajuste guardado con verde o con hueso volveria a negro con blanco al abrir.
import { describe, test, expect } from 'vitest'
import { sanitizarColores } from '../app/ajustesIniciales'
import { PAREJAS_COLOR } from '../datos/modelo'

describe('Tarea 95 - sanitizarColores con las cinco parejas', () => {
  test('acepta negro con verde fuerte', () => {
    expect(sanitizarColores('#000000', '#4ADE80')).toEqual({ colorFondo: '#000000', colorLetra: '#4ADE80' })
  })

  test('acepta gris muy oscuro con hueso, sin importar mayusculas', () => {
    expect(sanitizarColores('#121212', '#ede6d6')).toEqual({ colorFondo: '#121212', colorLetra: '#EDE6D6' })
  })

  test('las tres de antes siguen pasando', () => {
    expect(sanitizarColores('#000000', '#FFFFFF')).toEqual({ colorFondo: '#000000', colorLetra: '#FFFFFF' })
    expect(sanitizarColores('#000000', '#F5C24B')).toEqual({ colorFondo: '#000000', colorLetra: '#F5C24B' })
    expect(sanitizarColores('#FFFFFF', '#000000')).toEqual({ colorFondo: '#FFFFFF', colorLetra: '#000000' })
  })

  test('las combinaciones inventadas caen en la de omision', () => {
    const omision = { colorFondo: PAREJAS_COLOR[0].fondo, colorLetra: PAREJAS_COLOR[0].letra }
    // Los colores nuevos cruzados con el fondo que no es el suyo.
    expect(sanitizarColores('#121212', '#4ADE80')).toEqual(omision)
    expect(sanitizarColores('#000000', '#EDE6D6')).toEqual(omision)
    expect(sanitizarColores('#121212', '#FFFFFF')).toEqual(omision)
    // Fondo y letra iguales, y la letra sobre fondo claro que A9 no ofrece.
    expect(sanitizarColores('#FFFFFF', '#FFFFFF')).toEqual(omision)
    expect(sanitizarColores('#FFFFFF', '#4ADE80')).toEqual(omision)
    // Valores que no son texto.
    expect(sanitizarColores(undefined, '#4ADE80')).toEqual(omision)
    expect(sanitizarColores('#000000', 7)).toEqual(omision)
    // La de omision sigue siendo negro con blanco.
    expect(omision).toEqual({ colorFondo: '#000000', colorLetra: '#FFFFFF' })
  })
})
