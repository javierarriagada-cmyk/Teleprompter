import { describe, expect, test } from 'vitest'
import { crearMotorDeAvance, MotorDeAvance } from '../lib/avance'

// -motor-suelta, 17-10-2026-: la suelta del ancla no tira atrás un texto que iba junto a la voz. Solo
// lógica, con el motor solo. Ver docs/mediciones/motor-suelta/INFORME.txt: en la toma de 34 min los
// parciales llevaron el ancla con la voz 45 palabras más allá del último final que calzó y el segundo
// final seguido sin calce la soltó: el texto saltó 42,6 palabras atrás.

// Corre el motor cuadro a cuadro -16 ms- hasta tMs y devuelve la mayor bajada de la posición entre dos
// cuadros seguidos.
function cuadros(m: MotorDeAvance, desde: number, hasta: number): number {
  let bajada = 0
  let antes = m.estadoEn(desde).posicion
  for (let t = desde + 16; t <= hasta; t += 16) {
    const p = m.estadoEn(t).posicion
    bajada = Math.max(bajada, antes - p)
    antes = p
  }
  return bajada
}

// Un final calza en 3 y arranca el texto. Devuelve la hora.
function arrancar(m: MotorDeAvance): number {
  m.tentativo(1, 300)
  m.tentativo(2, 700)
  m.confirmar(3, 1100)
  cuadros(m, 1100, 1500)
  return 1500
}

describe('motor-suelta: la suelta del ancla', () => {
  test('varios parciales seguidos que avanzan con la voz más de 40 palabras sobre lo confirmado, con dos finales seguidos sin calce, no tiran la posición atrás', () => {
    const m = crearMotorDeAvance()
    let t = arrancar(m)
    let bajada = 0
    // Diez hablas de cinco palabras: cada parcial calza una palabra más, a 150 por minuto, y el final de
    // cada una no calza -una acotación leída, palabras mal oídas-. El habla siguiente empieza donde
    // quedó la anterior.
    let token = 3
    for (let habla = 0; habla < 10; habla++) {
      for (let k = 0; k < 5; k++) {
        token++
        m.tentativo(token, t)
        bajada = Math.max(bajada, cuadros(m, t, t + 400))
        t += 400
      }
      m.falloCalce(t)
      bajada = Math.max(bajada, cuadros(m, t, t + 300))
      t += 300
    }
    expect(token).toBe(53)
    expect(token - 3).toBeGreaterThan(40)
    const antes = m.estadoEn(t)
    expect(antes.ultimoCalce).toBe(53)
    // El final de la décima habla ya no calzó; ahora un segundo final seguido, sin un parcial entre los dos.
    m.falloCalce(t)
    bajada = Math.max(bajada, cuadros(m, t, t + 2000))
    t += 2000
    expect(m.estadoEn(t).ultimoCalce).toBe(53)
    expect(m.estadoEn(t).posicion).toBeGreaterThanOrEqual(antes.posicion)
    // En ningún cuadro de toda la lectura bajó la posición.
    expect(bajada).toBe(0)
  })

  test('un parcial que se adelanta solo, sin que los siguientes lo acompañen, se sigue soltando como en motorParentesis B', () => {
    const m = crearMotorDeAvance()
    let t = arrancar(m)
    // Lee con parciales de 4 a 14, sin finales.
    for (let token = 4; token <= 14; token++) { m.tentativo(token, t); cuadros(m, t, t + 400); t += 400 }
    // Un parcial calza solo en la repetición, 46 más abajo, y crece ahí unas palabras -el mismo parcial-.
    for (let token = 60; token <= 63; token++) { m.tentativo(token, t); cuadros(m, t, t + 250); t += 250 }
    expect(m.estadoEn(t).ultimoCalce).toBe(63)
    // Dos finales seguidos que no calzan: nada de lo dicho después continúa 63.
    m.falloCalce(t)
    cuadros(m, t, t + 1500)
    t += 1500
    m.falloCalce(t)
    cuadros(m, t, t + 300)
    t += 300
    // Se suelta a lo confirmado, como en motorParentesis B.
    expect(m.estadoEn(t).ultimoCalce).toBe(3)
  })

  test('si el habla siguiente empieza lejos del ancla de su final, no la continúa: se suelta', () => {
    const m = crearMotorDeAvance()
    let t = arrancar(m)
    // Un parcial salta solo a 50 y su final no calza.
    m.tentativo(50, t); cuadros(m, t, t + 300); t += 300
    m.falloCalce(t); cuadros(m, t, t + 300); t += 300
    // El habla siguiente calza en 6 -donde va la voz, muy detrás de 50- y su final tampoco calza.
    m.tentativo(6, t); cuadros(m, t, t + 300); t += 300
    m.falloCalce(t); cuadros(m, t, t + 300); t += 300
    // Otro final seguido sin calce: el ancla de 50 nadie la continuó.
    m.falloCalce(t); cuadros(m, t, t + 300); t += 300
    expect(m.estadoEn(t).ultimoCalce).toBe(3)
  })
})
