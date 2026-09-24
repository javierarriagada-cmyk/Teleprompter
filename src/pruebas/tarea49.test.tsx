import { describe, test, expect } from 'vitest'
import fs from 'fs'
import {
  RUTA_MARCA_ANIMADA, RUTA_MAIN_ACTIVITY, CENTRO, RADIO_VISIBLE,
  leerMarca, leerAnimaciones, finDeLaAnimacion, puntosDelTrazo
} from './marcaArranque'

// La Tarea 49 armo el arranque nativo con los cinco renglones que se escribian
// y el punto que latia. El 24-09-2026 la marca paso a ser "Sig" y la bola roja
// -trazoMarca.ts-, con la bola recorriendo un circulo antes de ocupar su lugar.
// Las guardianas son las mismas seis; lo que miran cambio con el dibujo. La
// lectura del XML vive en marcaArranque.ts.
describe('Pruebas TAREA 49 - La Entrada: La Marca (T226-T231)', () => {
  test('T226 - EL DIBUJO ESTA ADENTRO DEL CIRCULO. El nombre, la bola en su lugar, la linea y la bola durante todo su recorrido caben en el circulo de radio 144 que Android deja ver.', () => {
    const marca = leerMarca()
    const dentro = (x: number, y: number) => Math.hypot(x - CENTRO, y - CENTRO) <= RADIO_VISIBLE

    for (const [x, y] of puntosDelTrazo(marca.trazoNombre)) {
      expect(dentro(x, y), `el nombre se sale en ${x},${y}`).toBe(true)
    }
    // El lema sube 8 unidades mientras aparece: se mide desde donde arranca.
    for (const [x, y] of puntosDelTrazo(marca.trazoLema)) {
      expect(dentro(x, y + 8), `TELEPROMPTER se sale en ${x},${y}`).toBe(true)
    }
    const p = marca.punto
    expect(Math.hypot(p.cx - CENTRO, p.cy - CENTRO) + p.r, 'la bola en su lugar se sale').toBeLessThanOrEqual(RADIO_VISIBLE)
    expect(marca.radioLinea + marca.anchoLinea / 2, 'la linea se sale').toBeLessThanOrEqual(RADIO_VISIBLE)
    // La bola anda SOBRE la linea: su borde de afuera es el radio de la linea mas
    // el suyo. Con la linea en 144 se veia media bola.
    expect(marca.radioLinea + p.r, 'la bola se sale mientras recorre el circulo').toBeLessThanOrEqual(RADIO_VISIBLE)
  })

  test('T227 - NADIE QUEDA INVISIBLE. Todo lo que arranca transparente tiene un animador que lo enciende.', () => {
    const marca = leerMarca()
    const anim = leerAnimaciones()
    const encendido = (target: string, propiedad: string) =>
      (anim[target] || []).some((a) => a.propiedad === propiedad && a.valorFinal === '1')

    expect(marca.alfaNombre).toBe('0')
    expect(encendido('nombre', 'fillAlpha'), 'el nombre nunca se enciende').toBe(true)
    expect(marca.alfaPunto).toBe('0')
    expect(encendido('punto', 'fillAlpha'), 'la bola nunca se enciende').toBe(true)
    expect(marca.alfaLinea).toBe('0')
    expect(encendido('linea', 'strokeAlpha'), 'la linea nunca se enciende').toBe(true)
    expect(marca.alfaLema).toBe('0')
    expect(encendido('lema', 'fillAlpha'), 'TELEPROMPTER nunca se enciende').toBe(true)
  })

  test('T228 - LA ANIMACION EXISTE Y ENTRA EN EL TOPE. Seis targets -linea, bola, punto, nombre, lema y su grupo- y todo termina a los 1250 ms.', () => {
    const xmlAnim = fs.readFileSync(RUTA_MARCA_ANIMADA, 'utf-8')
    expect(xmlAnim).toContain('<animated-vector')
    expect(xmlAnim).toContain('android:drawable="@drawable/marca_arranque"')
    expect(Object.keys(leerAnimaciones()).sort()).toEqual(['bola', 'lema', 'lema_grupo', 'linea', 'nombre', 'punto'])
    expect(finDeLaAnimacion()).toBe(1250)
  })

  test('T229 - EL NOMBRE VA DESPUES. "Sig" aparece cuando la bola ya dio la vuelta, y la linea termina de borrarse antes de que la bola llegue.', () => {
    const anim = leerAnimaciones()
    const bola = anim.bola[0]
    const nombre = anim.nombre[0]
    const borrado = anim.linea.find((a) => a.propiedad === 'trimPathStart')!
    expect(nombre.desde).toBeGreaterThan(bola.desde)
    expect(borrado.hasta).toBeLessThanOrEqual(bola.hasta)
    expect(nombre.desde, 'el nombre aparece cuando todavia queda mucha linea').toBeGreaterThanOrEqual(borrado.hasta - 100)
  })

  test('T230 - LA RETENCION TIENE TOPE', () => {
    expect(fs.existsSync(RUTA_MAIN_ACTIVITY)).toBe(true)
    const javaCode = fs.readFileSync(RUTA_MAIN_ACTIVITY, 'utf-8')

    expect(javaCode).toContain('SplashScreen.installSplashScreen(this)')
    expect(javaCode).toContain('setKeepOnScreenCondition')
    expect(javaCode).toMatch(/postDelayed\([\s\S]*?2500\)/)
  })

  test('T231 - LA BOLA TERMINA EN SU LUGAR Y ENCENDIDA. Su recorrido acaba en 0,0 -donde la dibuja el XML- y su ultimo animador de alfa la deja en 1.', () => {
    const anim = leerAnimaciones()
    const recorrido = anim.bola[0].trayecto || ''
    expect(recorrido.trim().endsWith('0,0'), 'el recorrido no termina en el lugar de la bola').toBe(true)
    const alfas = anim.punto.filter((a) => a.propiedad === 'fillAlpha')
    expect(alfas[alfas.length - 1].valorFinal).toBe('1')
  })
})
