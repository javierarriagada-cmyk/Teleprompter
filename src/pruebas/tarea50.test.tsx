import React from 'react'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import fs from 'fs'
import path from 'path'
import 'fake-indexeddb/auto'
import App from '../App'
import BibliotecaView, { resetearPrimerMontajeBiblioteca } from '../components/BibliotecaView'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { Guion } from '../datos/modelo'

describe('Pruebas TAREA 50 - Un Solo Mundo (T240-T252)', () => {
  const rootDir = process.cwd()
  const pathMarcaArranque = path.join(rootDir, 'android/app/src/main/res/drawable/marca_arranque.xml')
  const pathMarcaAnimada = path.join(rootDir, 'android/app/src/main/res/drawable/marca_arranque_animada.xml')
  const pathForeground = path.join(rootDir, 'android/app/src/main/res/drawable/ic_launcher_foreground.xml')
  const pathMarcaIcono = path.join(rootDir, 'android/app/src/main/res/drawable/ic_marca.xml')
  const pathAnimatorDir = path.join(rootDir, 'android/app/src/main/res/animator')
  const pathMainActivity = path.join(rootDir, 'android/app/src/main/java/com/teleprompter/app/MainActivity.java')
  const pathStylesXml = path.join(rootDir, 'android/app/src/main/res/values/styles.xml')
  const pathColorsXml = path.join(rootDir, 'android/app/src/main/res/values/colors.xml')
  const pathColorsNightXml = path.join(rootDir, 'android/app/src/main/res/values-night/colors.xml')

  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-tema')
    resetearPrimerMontajeBiblioteca()
  })

  test('T240 - OSCURO AL ABRIR.', () => {
    localStorage.clear()
    render(<App />)
    expect(document.documentElement.getAttribute('data-tema')).toBe('oscuro')
  })

  test('T241 - :root define tokens oscuros.', () => {
    const cssPath = path.resolve(rootDir, 'src/styles.css')
    const css = fs.readFileSync(cssPath, 'utf8')

    const rootBlockMatch = css.match(/:root\s*\{([^}]+)\}/)
    expect(rootBlockMatch).not.toBeNull()

    const rootContent = rootBlockMatch![1]
    expect(rootContent).toContain('--bg-suelo: #151312')
    expect(rootContent).toContain('--color-acento: #E7E1DE')
    expect(rootContent).not.toContain('#F3F1ED')
    expect(rootContent).not.toContain('#0F8377')
  })

  test('T242 - Ningun fillAlpha por debajo de 0.60 en iconos.', () => {
    const checkFile = (filePath: string) => {
      const xml = fs.readFileSync(filePath, 'utf8')
      const matches = xml.matchAll(/fillAlpha="([^"]+)"/g)
      for (const match of matches) {
        const val = parseFloat(match[1])
        expect(val, `fillAlpha ${val} en ${filePath} debe ser >= 0.60`).toBeGreaterThanOrEqual(0.60)
      }
    }
    checkFile(pathForeground)
    checkFile(pathMarcaIcono)
  })

  test('T243 - Path del punto con fill #E11D2E en iconos y splash.', () => {
    const xmlFg = fs.readFileSync(pathForeground, 'utf8')
    const xmlMarca = fs.readFileSync(pathMarcaIcono, 'utf8')
    const xmlSplash = fs.readFileSync(pathMarcaArranque, 'utf8')

    expect(xmlFg).toContain('fillColor="#E11D2E"')
    expect(xmlMarca).toContain('fillColor="#E11D2E"')
    expect(xmlSplash).toContain('@color/marca_punto')
  })

  test('T244 - Punto a la derecha del centro en marca_arranque.xml.', () => {
    const xml = fs.readFileSync(pathMarcaArranque, 'utf8')
    const puntoMatch = /<path[\s\S]*?name="punto"[\s\S]*?pathData="M(\d+),(\d+)/.exec(xml)
    expect(puntoMatch).not.toBeNull()

    const px = parseFloat(puntoMatch![1])
    expect(px, 'Centro X del punto debe ser mayor que 216').toBeGreaterThan(216)
  })

  test('T245 - EL DIBUJO ESTA ADENTRO DEL CIRCULO.', () => {
    const xml = fs.readFileSync(pathMarcaArranque, 'utf8')
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

    expect(count).toBe(5)

    const puntoRegex = /<path[\s\S]*?name="punto"[\s\S]*?pathData="M(\d+),(\d+)\s+m-(\d+),0\s+a(\d+),\4\s+0\s+1,0\s+\d+,0\s+a\4,\4\s+0\s+1,0\s+-\d+,0"/
    const puntoMatch = puntoRegex.exec(xml)
    expect(puntoMatch).not.toBeNull()

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

  test('T246 - NADIE QUEDA INVISIBLE EN LA SPLASH.', () => {
    const xml = fs.readFileSync(pathMarcaArranque, 'utf-8')
    const pathRegex = /<path[\s\S]*?name="([^"]+)"[\s\S]*?\/>/g
    let match: RegExpExecArray | null

    while ((match = pathRegex.exec(xml)) !== null) {
      const pathBlock = match[0]
      const name = match[1]

      if (name.startsWith('linea')) {
        expect(pathBlock, `${name} no debe contener strokeAlpha < 1`).not.toMatch(/strokeAlpha="0\.\d+"/)
      } else if (name === 'punto') {
        expect(pathBlock, 'punto debe arrancar con fillAlpha="0"').toContain('fillAlpha="0"')
      }
    }
  })

  test('T247 - LA ANIMACION Y EL ATRIBUTO NO SE CONTRADICEN.', () => {
    const stylesXml = fs.readFileSync(pathStylesXml, 'utf8')
    expect(stylesXml).toContain('name="windowSplashScreenAnimationDuration">1000')

    const escribir5Xml = fs.readFileSync(path.join(pathAnimatorDir, 'escribir_5.xml'), 'utf-8')
    const m5 = /startOffset="(\d+)"[\s\S]*?duration="(\d+)"/.exec(escribir5Xml) || /duration="(\d+)"[\s\S]*?startOffset="(\d+)"/.exec(escribir5Xml)
    expect(m5).not.toBeNull()

    const finUltimoTrazo = parseInt(m5![1], 10) + parseInt(m5![2], 10)

    const puntoLateXml = fs.readFileSync(path.join(pathAnimatorDir, 'punto_late.xml'), 'utf-8')
    const firstPuntoMatch = /<objectAnimator[\s\S]*?startOffset="(\d+)"/.exec(puntoLateXml)
    expect(firstPuntoMatch).not.toBeNull()

    const startPunto = parseInt(firstPuntoMatch![1], 10)
    expect(startPunto, 'Retardo del primer animador del punto debe ser mayor que el fin del ultimo trazo').toBeGreaterThan(finUltimoTrazo)
  })

  test('T248 - EL TALLY TERMINA ENCENDIDO.', () => {
    const puntoLateXml = fs.readFileSync(path.join(pathAnimatorDir, 'punto_late.xml'), 'utf-8')
    const animators = puntoLateXml.match(/<objectAnimator[\s\S]*?\/>/g)
    expect(animators).not.toBeNull()
    const lastAnimator = animators![animators!.length - 1]
    expect(lastAnimator).toContain('valueTo="1"')
  })

  test('T249 - LA RETENCION ESPERA LAS DOS COSAS.', () => {
    const javaCode = fs.readFileSync(pathMainActivity, 'utf-8')
    expect(javaCode).toContain('setKeepOnScreenCondition')
    expect(javaCode).toContain('listoParaMostrar')
    expect(javaCode).toContain('DURACION_MARCA_MS')
    expect(javaCode).toMatch(/postDelayed\([\s\S]*?2500\)/)
  })

  test('T250 - DURANTE LA CUENTA NO HAY CARTEL DE ESTADO.', async () => {
    vi.useFakeTimers()
    try {
      const repo = new RepositorioMemoria()
      const guion = {
        id: 'g-t250',
        titulo: 'Guion T250',
        idioma: 'es',
        creado: Date.now(),
        modificado: Date.now(),
        bloques: [{ id: 'b1', nombre: '', texto: 'Texto de prueba T250' }]
      }
      await repo.guardar(guion)

      let container: HTMLElement
      await act(async () => {
        const res = render(<App repoOverride={repo} />)
        container = res.container
        await vi.advanceTimersByTimeAsync(600)
      })

      const fila = container!.querySelector('[data-testid^="fila-guion"]') as HTMLElement
      await act(async () => {
        fireEvent.click(fila)
        await vi.advanceTimersByTimeAsync(100)
      })

      const btnLeer = container!.querySelector('[data-testid="btn-leer-guion-fijo"]') as HTMLElement
      await act(async () => {
        fireEvent.click(btnLeer)
        await vi.advanceTimersByTimeAsync(500)
      })

      expect(container!.querySelector('[data-testid="cuenta-regresiva"]')).not.toBeNull()

      // LA VERSION ANTERIOR DE ESTA PRUEBA NO COMPROBABA NADA. Solo miraba que
      // [data-testid="indicador-estado-lector"] no estuviera en el documento, y a los
      // 500 ms de apretar Leer el motor todavia no puso ningun texto, asi que ese nodo
      // NO EXISTE TODAVIA por su cuenta. La prueba pasaba en verde sin que nada lo
      // escondiera: se comprobo dejando el codigo sin el velo y quedaba verde igual.
      //
      // Lo que de verdad resuelve la parte 4 es un velo opaco por encima, asi que eso
      // es lo que se comprueba: que existe mientras corre la cuenta, que es opaco, y
      // que su zIndex cae entre el del cartel -5- y el de la cuenta -10-, que es la
      // unica franja que tapa el cartel sin tapar el numero.
      const velo = container!.querySelector('[data-testid="velo-cuenta-regresiva"]') as HTMLElement
      expect(velo, 'no hay velo tapando el guion durante la cuenta').not.toBeNull()
      expect(velo.style.backgroundColor).not.toBe('')
      const capa = parseInt(velo.style.zIndex, 10)
      expect(capa).toBeGreaterThan(5)
      expect(capa).toBeLessThan(10)

      // Y cuando la cuenta termina, el velo se va: no puede quedar tapando la lectura.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(4000)
      })
      expect(container!.querySelector('[data-testid="velo-cuenta-regresiva"]')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  test('T251 - LA FILA SIN TITULO DICE "Sin título".', async () => {
    const repo = new RepositorioMemoria()

    const now = Date.now()
    const guionPortada: Guion = {
      id: 'g-portada',
      titulo: 'Guion Portada',
      idioma: 'es',
      creado: now + 5000,
      modificado: now + 5000,
      bloques: [{ id: 'bp', nombre: '', texto: 'Texto portada' }]
    }

    const guionSinTitulo2: Guion = {
      id: 'g-sin-titulo-2',
      titulo: '',
      idioma: 'es',
      creado: now,
      modificado: now,
      bloques: [{ id: 'b2', nombre: '', texto: 'Cuerpo del segundo guion sin titulo' }]
    }

    await repo.guardar(guionSinTitulo2)
    await repo.guardar(guionPortada)

    const buscarSpy = vi.spyOn(repo, 'abrir')

    let container: HTMLElement
    await act(async () => {
      const res = render(<App repoOverride={repo} />)
      container = res.container
      await new Promise((r) => setTimeout(r, 600))
    })

    const fila = container!.querySelector('[data-testid="fila-guion-g-sin-titulo-2"]') as HTMLElement
    expect(fila).not.toBeNull()
    expect(fila.textContent).toContain('Sin título')
    expect(buscarSpy).not.toHaveBeenCalledWith('g-sin-titulo-2')
  })

  // T253 - APRETAR "+" Y VOLVER SIN ESCRIBIR NO DEJA UN GUION.
  //
  // handleCrearNuevoGuion guarda el guion en el repositorio antes de abrir el editor,
  // asi que entrar y salir sin escribir dejaba un "Sin título" en la biblioteca.
  // Javier abrio la suya el 16 de septiembre de 2026 y tenia cuatro seguidos.
  //
  // Van las dos mitades: que salir de verdad no lo deje, y que los DOS caminos de
  // vuelta -el boton y el gesto de atras de Android- pasen por la misma funcion. La
  // parte estatica existe porque el gesto no se puede disparar desde aca sin fingir
  // el plugin, y arreglar un solo camino deja el fantasma entrando por el otro.
  test('T253 - UN GUION QUE NO SE ESCRIBIO NO SE QUEDA.', async () => {
    const repo = new RepositorioMemoria()
    render(<App repoOverride={repo} />)

    const btnCrear = await screen.findByTestId('btn-crear-guion-flotante')
    await act(async () => {
      fireEvent.click(btnCrear)
      await new Promise((r) => setTimeout(r, 50))
    })

    // PRIMERO SE COMPRUEBA QUE EXISTE. Sin esto la prueba pasa sola: si el guion
    // nunca llego a crearse, al final hay cero igual y no se comprueba nada. Se vio
    // desactivando el descarte y quedando verde.
    const reciencreado = await repo.listar()
    expect(reciencreado.length, 'el guion no se llego a crear').toBe(1)

    // Estamos en el editor, sin escribir nada
    expect(screen.getByRole('button', { name: /Guiones/ })).not.toBeNull()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Guiones/ }))
      await new Promise((r) => setTimeout(r, 50))
    })

    const guardados = await repo.listar()
    expect(guardados.length, 'quedo un guion fantasma en el repositorio').toBe(0)

    // Y los dos caminos de vuelta usan la misma salida
    const fuenteApp = fs.readFileSync(path.join(rootDir, 'src/App.tsx'), 'utf8')
    expect(fuenteApp).toContain('onVolverBiblioteca={() => { salirDelEditor() }}')
    expect(fuenteApp).toMatch(/vista === 'editor'\)\s*\{\s*await salirDelEditor\(\)/)
  })

  test('T252 - LOS DOS COLORS.XML DEFINEN LOS MISMOS CUATRO NOMBRES Y VALORES.', () => {
    const xmlDay = fs.readFileSync(pathColorsXml, 'utf8')
    const xmlNight = fs.readFileSync(pathColorsNightXml, 'utf8')

    expect(xmlDay).toBe(xmlNight)
    expect(xmlDay).toContain('name="fondo_arranque">#151312')
    expect(xmlDay).toContain('name="marca_trazo">#E7E1DE')
    expect(xmlDay).toContain('name="marca_trazo_apagado">#8A837C')
    expect(xmlDay).toContain('name="marca_punto">#E11D2E')
  })
})
