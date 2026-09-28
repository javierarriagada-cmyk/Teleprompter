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
import { CENTRO, RADIO_VISIBLE, leerMarca, leerAnimaciones, finDeLaAnimacion, puntosDelTrazo } from './marcaArranque'

describe('Pruebas TAREA 50 - Un Solo Mundo (T240-T252)', () => {
  const rootDir = process.cwd()
  const pathMarcaArranque = path.join(rootDir, 'android/app/src/main/res/drawable/marca_arranque.xml')
  const pathMarcaAnimada = path.join(rootDir, 'android/app/src/main/res/drawable/marca_arranque_animada.xml')
  const pathForeground = path.join(rootDir, 'android/app/src/main/res/drawable/ic_launcher_foreground.xml')
  const pathMarcaIcono = path.join(rootDir, 'android/app/src/main/res/drawable/ic_marca.xml')
  const pathAnimatorDir = path.join(rootDir, 'android/app/src/main/res/animator')
  const pathMainActivity = path.join(rootDir, 'android/app/src/main/java/com/sigoteleprompter/app/MainActivity.java')
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

  // T244-T248 miraban los cinco renglones y el punto que latia. Desde el
  // 24-09-2026 la marca es "Sig" y la bola -trazoMarca.ts-; las guardianas
  // cuidan lo mismo sobre el dibujo nuevo, leido con marcaArranque.ts.
  test('T244 - La bola va a la derecha del centro en marca_arranque.xml.', () => {
    expect(leerMarca().punto.cx, 'Centro X de la bola debe ser mayor que 216').toBeGreaterThan(216)
  })

  test('T245 - EL DIBUJO ESTA ADENTRO DEL CIRCULO.', () => {
    const marca = leerMarca()
    for (const [x, y] of puntosDelTrazo(marca.trazoNombre)) {
      expect(Math.hypot(x - CENTRO, y - CENTRO), `el nombre se sale en ${x},${y}`).toBeLessThanOrEqual(RADIO_VISIBLE)
    }
    const p = marca.punto
    expect(Math.hypot(p.cx - CENTRO, p.cy - CENTRO) + p.r).toBeLessThanOrEqual(RADIO_VISIBLE)
    expect(marca.radioLinea + p.r).toBeLessThanOrEqual(RADIO_VISIBLE)
  })

  test('T246 - NADIE QUEDA INVISIBLE EN LA SPLASH.', () => {
    const anim = leerAnimaciones()
    const marca = leerMarca()
    for (const [target, propiedad, alfa] of [
      ['nombre', 'fillAlpha', marca.alfaNombre],
      ['punto', 'fillAlpha', marca.alfaPunto],
      ['linea', 'strokeAlpha', marca.alfaLinea]
    ] as const) {
      if (alfa === '0') {
        expect((anim[target] || []).some((a) => a.propiedad === propiedad && a.valorFinal === '1'), `${target} queda invisible`).toBe(true)
      }
    }
  })

  test('T247 - LA ANIMACION Y EL ATRIBUTO NO SE CONTRADICEN. La duracion declarada sigue en 1000, y MainActivity sostiene la marca hasta que la animacion termina.', () => {
    const stylesXml = fs.readFileSync(pathStylesXml, 'utf8')
    expect(stylesXml).toContain('name="windowSplashScreenAnimationDuration">1000')
    const java = fs.readFileSync(pathMainActivity, 'utf8')
    const m = /DURACION_MARCA_MS = (\d+) \+ (\d+);/.exec(java)
    expect(m, 'DURACION_MARCA_MS no es fin + sostenido').not.toBeNull()
    expect(Number(m![1]), 'MainActivity suelta antes de que termine la animacion').toBe(finDeLaAnimacion())
  })

  test('T248 - LA BOLA TERMINA ENCENDIDA.', () => {
    const alfas = leerAnimaciones().punto.filter((a) => a.propiedad === 'fillAlpha')
    expect(alfas[alfas.length - 1].valorFinal).toBe('1')
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
        await vi.advanceTimersByTimeAsync(100)
      })
      await act(async () => {
        fireEvent.click(screen.getByTestId('btn-empezar-toma'))
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

  // T251 CAMBIO EL 28-09-2026: la fila sin titulo muestra las primeras palabras del texto, no
  // "Sin título" -Javier, tras el agente de pruebas de Firebase-. Sigue sin abrir el guion entero.
  test('T251 - LA FILA SIN TITULO MUESTRA SUS PRIMERAS PALABRAS, sin abrir el guion.', async () => {
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
    expect(fila.textContent).toContain('Cuerpo del segundo guion sin titulo')
    expect(fila.textContent).not.toContain('Sin título')
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

    const btnCrear = await screen.findByTestId('btn-crear-guion')
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
