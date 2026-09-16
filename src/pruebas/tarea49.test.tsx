import { describe, test, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Pruebas TAREA 49 - La Entrada: La Marca se Escribe (T226-T231)', () => {
  const rootDir = process.cwd()
  const pathMarcaArranque = path.join(rootDir, 'android/app/src/main/res/drawable/marca_arranque.xml')
  const pathMarcaAnimada = path.join(rootDir, 'android/app/src/main/res/drawable/marca_arranque_animada.xml')
  const pathAnimatorDir = path.join(rootDir, 'android/app/src/main/res/animator')
  const pathMainActivity = path.join(rootDir, 'android/app/src/main/java/com/teleprompter/app/MainActivity.java')

  test('T226 - EL DIBUJO ESTA ADENTRO DEL CIRCULO', () => {
    expect(fs.existsSync(pathMarcaArranque)).toBe(true)
    const xml = fs.readFileSync(pathMarcaArranque, 'utf-8')

    const centerX = 216
    const centerY = 216
    const maxRadius = 144
    const maxDistSq = maxRadius * maxRadius

    const strokeRegex = /<path[\s\S]*?name="(linea\d)"[\s\S]*?strokeWidth="(\d+)"[\s\S]*?pathData="M(\d+),(\d+)\s+L(\d+),(\d+)"/g
    let match: RegExpExecArray | null
    let count = 0

    while ((match = strokeRegex.exec(xml)) !== null) {
      count++
      const name = match[1]
      const strokeWidth = parseFloat(match[2])
      const capRadius = strokeWidth / 2
      const x1 = parseFloat(match[3])
      const y1 = parseFloat(match[4])
      const x2 = parseFloat(match[5])
      const y2 = parseFloat(match[6])

      const distStartLeftSq = Math.pow(x1 - capRadius - centerX, 2) + Math.pow(y1 - centerY, 2)
      const distStartRightSq = Math.pow(x1 + capRadius - centerX, 2) + Math.pow(y1 - centerY, 2)
      expect(distStartLeftSq, `${name} inicio cap izq fuera del circulo`).toBeLessThanOrEqual(maxDistSq)
      expect(distStartRightSq, `${name} inicio cap der fuera del circulo`).toBeLessThanOrEqual(maxDistSq)

      const distEndLeftSq = Math.pow(x2 - capRadius - centerX, 2) + Math.pow(y2 - centerY, 2)
      const distEndRightSq = Math.pow(x2 + capRadius - centerX, 2) + Math.pow(y2 - centerY, 2)
      expect(distEndLeftSq, `${name} fin cap izq fuera del circulo`).toBeLessThanOrEqual(maxDistSq)
      expect(distEndRightSq, `${name} fin cap der fuera del circulo`).toBeLessThanOrEqual(maxDistSq)
    }

    expect(count, 'Se esperaban 5 lineas de trazo').toBe(5)

    const puntoRegex = /<path[\s\S]*?name="punto"[\s\S]*?pathData="M(\d+),(\d+)\s+m-(\d+),0\s+a(\d+),\4\s+0\s+1,0\s+\d+,0\s+a\4,\4\s+0\s+1,0\s+-\d+,0"/
    const puntoMatch = puntoRegex.exec(xml)
    expect(puntoMatch, 'No se encontro el pathData del punto').not.toBeNull()

    if (puntoMatch) {
      const px = parseFloat(puntoMatch[1])
      const py = parseFloat(puntoMatch[2])
      const pr = parseFloat(puntoMatch[3])

      const extremes = [
        { x: px - pr, y: py },
        { x: px + pr, y: py },
        { x: px, y: py - pr },
        { x: px, y: py + pr }
      ]

      for (const pt of extremes) {
        const distSq = Math.pow(pt.x - centerX, 2) + Math.pow(pt.y - centerY, 2)
        expect(distSq, `Extremo del punto (${pt.x}, ${pt.y}) fuera del circulo`).toBeLessThanOrEqual(maxDistSq)
      }
    }
  })

  test('T227 - NADIE QUEDA INVISIBLE', () => {
    const xml = fs.readFileSync(pathMarcaArranque, 'utf-8')
    const pathRegex = /<path[\s\S]*?name="([^"]+)"[\s\S]*?\/>/g
    let match: RegExpExecArray | null

    while ((match = pathRegex.exec(xml)) !== null) {
      const pathBlock = match[0]
      const name = match[1]

      if (name.startsWith('linea')) {
        expect(pathBlock, `${name} no debe contener strokeAlpha o fillAlpha < 1`).not.toMatch(/(strokeAlpha|fillAlpha)="0\.\d+"/)
      } else if (name === 'punto') {
        expect(pathBlock, 'punto debe arrancar con fillAlpha="0"').toContain('fillAlpha="0"')
      }
    }
  })

  test('T228 - LA ANIMACION EXISTE Y ENTRA EN EL TOPE', () => {
    expect(fs.existsSync(pathMarcaAnimada)).toBe(true)
    const xmlAnim = fs.readFileSync(pathMarcaAnimada, 'utf-8')
    expect(xmlAnim).toContain('<animated-vector')
    expect(xmlAnim).toContain('android:drawable="@drawable/marca_arranque"')

    const targetRegex = /<target[\s\S]*?android:name="([^"]+)"[\s\S]*?android:animation="@animator\/([^"]+)"/g
    let match: RegExpExecArray | null
    let targetsFound = 0
    let maxEndTime = 0

    while ((match = targetRegex.exec(xmlAnim)) !== null) {
      targetsFound++
      const animName = match[2]
      const animFile = path.join(pathAnimatorDir, `${animName}.xml`)
      expect(fs.existsSync(animFile), `No existe el animador ${animName}.xml`).toBe(true)

      const animXml = fs.readFileSync(animFile, 'utf-8')
      const animRegex = /<objectAnimator[\s\S]*?duration="(\d+)"[\s\S]*?startOffset="(\d+)"/g
      let animMatch: RegExpExecArray | null

      while ((animMatch = animRegex.exec(animXml)) !== null) {
        const duration = parseInt(animMatch[1], 10)
        const startOffset = parseInt(animMatch[2], 10)
        const endTime = startOffset + duration
        if (endTime > maxEndTime) {
          maxEndTime = endTime
        }
      }
    }

    expect(targetsFound, 'Se esperaban 6 targets animados').toBe(6)
    expect(maxEndTime, 'Duracion total retardo+duracion debe ser <= 1000 ms').toBeLessThanOrEqual(1000)
    expect(maxEndTime, 'Duracion max esperada es 980 ms').toBe(980)
  })

  test('T229 - EL PUNTO VA DESPUES', () => {
    const escribir5Xml = fs.readFileSync(path.join(pathAnimatorDir, 'escribir_5.xml'), 'utf-8')

    let durLine5 = 0
    let startLine5 = 0

    if (escribir5Xml.indexOf('duration') < escribir5Xml.indexOf('startOffset')) {
      const m = /duration="(\d+)"[\s\S]*?startOffset="(\d+)"/.exec(escribir5Xml)
      if (m) {
        durLine5 = parseInt(m[1], 10)
        startLine5 = parseInt(m[2], 10)
      }
    } else {
      const m = /startOffset="(\d+)"[\s\S]*?duration="(\d+)"/.exec(escribir5Xml)
      if (m) {
        startLine5 = parseInt(m[1], 10)
        durLine5 = parseInt(m[2], 10)
      }
    }

    const endLine5 = startLine5 + durLine5
    expect(endLine5).toBe(540)

    const puntoLateXml = fs.readFileSync(path.join(pathAnimatorDir, 'punto_late.xml'), 'utf-8')
    const firstPuntoMatch = /<objectAnimator[\s\S]*?startOffset="(\d+)"/.exec(puntoLateXml)
    expect(firstPuntoMatch).not.toBeNull()

    const startPunto = parseInt(firstPuntoMatch![1], 10)
    expect(startPunto, 'Retardo del punto debe ser mayor que el fin del ultimo trazo').toBeGreaterThan(endLine5)
    expect(startPunto).toBe(560)
  })

  test('T230 - LA RETENCION TIENE TOPE', () => {
    expect(fs.existsSync(pathMainActivity)).toBe(true)
    const javaCode = fs.readFileSync(pathMainActivity, 'utf-8')

    expect(javaCode).toContain('SplashScreen.installSplashScreen(this)')
    expect(javaCode).toContain('setKeepOnScreenCondition')
    expect(javaCode).toMatch(/postDelayed\([\s\S]*?2500\)/)
  })

  test('T231 - EL TALLY TERMINA ENCENDIDO', () => {
    const puntoLateXml = fs.readFileSync(path.join(pathAnimatorDir, 'punto_late.xml'), 'utf-8')
    const animators = puntoLateXml.match(/<objectAnimator[\s\S]*?\/>/g)
    expect(animators, 'Se esperaban animadores de punto').not.toBeNull()
    expect(animators!.length).toBe(6)

    const lastAnimator = animators![animators!.length - 1]
    expect(lastAnimator).toContain('valueTo="1"')
    expect(lastAnimator).not.toContain('valueTo="0"')
  })
})
