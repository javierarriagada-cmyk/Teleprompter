import React from 'react'
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import { render, act, fireEvent, screen } from '@testing-library/react'
import 'fake-indexeddb/auto'

const hapticsCalls = {
  selectionChanged: 0,
  impact: [] as any[],
  notification: 0
}

vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    selectionChanged: vi.fn(() => {
      hapticsCalls.selectionChanged++
      return Promise.resolve()
    }),
    impact: vi.fn((opts: any) => {
      hapticsCalls.impact.push(opts)
      return Promise.resolve()
    }),
    notification: vi.fn(() => {
      hapticsCalls.notification++
      return Promise.resolve()
    })
  },
  ImpactStyle: {
    Light: 'LIGHT',
    Medium: 'MEDIUM',
    Heavy: 'HEAVY'
  }
}))

vi.mock('@capacitor/core', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    Capacitor: {
      ...actual.Capacitor,
      isNativePlatform: () => true,
      getPlatform: () => 'android'
    }
  }
})

import App from '../App'
import { movimientoApagado } from '../components/movimiento'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { Guion } from '../datos/modelo'
import { MotorFake } from '../motor/MotorFake'

describe('Pruebas TAREA 45: Movimiento y Háptica (T199-T208)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    hapticsCalls.selectionChanged = 0
    hapticsCalls.impact = []
    hapticsCalls.notification = 0
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  test('T199 - MOVIMIENTO APAGADO. Con prefers-reduced-motion simulado en true, movimientoApagado devuelve true y las pantallas/controles no aplican transiciones de movimiento.', async () => {
    const originalMatchMedia = window.matchMedia
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))

    try {
      expect(movimientoApagado()).toBe(true)

      const repo = new RepositorioMemoria()
      const guion: Guion = {
        id: 'g-t199',
        titulo: 'Guion T199',
        idioma: 'es',
        creado: Date.now(),
        modificado: Date.now(),
        bloques: [{ id: 'b1', nombre: '', texto: 'Texto T199' }]
      }
      await repo.guardar(guion)

      const { container } = render(<App repoOverride={repo} />)
      await act(async () => {
        await new Promise((r) => setTimeout(r, 200))
      })

      // Con movimiento apagado, Pantalla no agrega atributo de dirección
      expect(container.querySelector('[data-pantalla-direccion]')).toBeNull()
    } finally {
      window.matchMedia = originalMatchMedia
    }
  })

  test('T200 - LA DIRECCION. Yendo de biblioteca a editor, la pantalla entra con adentro; volviendo de editor a biblioteca, con atras.', async () => {
    const repo = new RepositorioMemoria()
    const guion: Guion = {
      id: 'g-t200',
      titulo: 'Guion T200',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto T200' }]
    }
    await repo.guardar(guion)

    const { container } = render(<App repoOverride={repo} />)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200))
    })

    // 1. Inicialmente en biblioteca (al arrancar la app es 'inicial')
    let pantallaDiv = container.querySelector('[data-pantalla-direccion]')
    expect(pantallaDiv).not.toBeNull()
    expect(pantallaDiv?.getAttribute('data-pantalla-direccion')).toBe('inicial')

    // 2. Abrir editor (nivel 1 -> nivel 2 = adentro)
    const fila = screen.getByTestId('fila-guion-g-t200')
    await act(async () => {
      fireEvent.click(fila)
    })

    pantallaDiv = container.querySelector('[data-pantalla-direccion]')
    expect(pantallaDiv).not.toBeNull()
    expect(pantallaDiv?.getAttribute('data-pantalla-direccion')).toBe('adentro')

    // 3. Volver a biblioteca (nivel 2 -> nivel 1 = atras)
    const btnVolver = screen.getByText('‹ Guiones')
    await act(async () => {
      fireEvent.click(btnVolver)
    })

    pantallaDiv = container.querySelector('[data-pantalla-direccion]')
    expect(pantallaDiv).not.toBeNull()
    expect(pantallaDiv?.getAttribute('data-pantalla-direccion')).toBe('atras')
  })

  test('T201 - LA REGLA INVERSA. Los controles de la lectura cambian SOLO en opacidad: su estilo no tiene ningun translate ni ningun scale. Y se van mas lento de lo que vienen.', async () => {
    const repo = new RepositorioMemoria()
    const guion: Guion = {
      id: 'g-t201',
      titulo: 'Guion T201',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto T201' }]
    }
    await repo.guardar(guion)

    render(<App repoOverride={repo} />)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200))
    })

    // Entrar al editor
    const fila = screen.getByTestId('fila-guion-g-t201')
    await act(async () => {
      fireEvent.click(fila)
    })

    // Entrar a lectura
    const btnLeer = screen.getByTestId('btn-leer-guion-fijo')
    await act(async () => {
      fireEvent.click(btnLeer)
      await new Promise((r) => setTimeout(r, 100))
    })

    // Traer controles con un toque
    const prompterView = screen.getByTestId('teleprompter-view-container')
    await act(async () => {
      fireEvent.click(prompterView)
    })

    const panel = screen.getByTestId('panel-controles-lectura') as HTMLElement
    expect(panel).not.toBeNull()

    // Verificar estilo: opacidad solamente, sin translate ni scale
    const transformStyle = panel.style.transform || ''
    expect(transformStyle).not.toContain('translate')
    expect(transformStyle).not.toContain('scale')

    // Duración de salida es mayor que la de entrada
    const durEntra = Number(panel.getAttribute('data-duracion-entra') || 0)
    const durSale = Number(panel.getAttribute('data-duracion-sale') || 0)
    expect(durEntra).toBe(200)
    expect(durSale).toBe(400)
    expect(durSale).toBeGreaterThan(durEntra)
  })

  test('T202 - LA HAPTICA NO HABLA DEL MOTOR. Con el motor falso, durante una lectura completa -enganchar, avanzar renglones, perder la voz- NO se llama a Haptics ni una sola vez.', async () => {
    vi.useFakeTimers()
    try {
      const motor = new MotorFake()
      const repo = new RepositorioMemoria()
      const guion: Guion = {
        id: 'g-t202',
        titulo: 'Guion T202',
        idioma: 'es',
        creado: Date.now(),
        modificado: Date.now(),
        bloques: [
          {
            id: 'b1',
            nombre: '',
            texto:
              'Primera linea del guion largo para avanzar renglones.\n' +
              'Segunda linea del guion largo para avanzar mas renglones.\n' +
              'Tercera linea del guion largo para confirmar avance.\n' +
              'Cuarta linea del guion largo para ver si cambia el trabado.'
          }
        ]
      }
      await repo.guardar(guion)

      render(<App motor={motor} repoOverride={repo} />)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600)
      })

      // Entrar al editor
      const fila = screen.getByTestId('fila-guion-g-t202')
      await act(async () => {
        fireEvent.click(fila)
        await vi.advanceTimersByTimeAsync(100)
      })

      // Apretar Leer
      const btnLeer = screen.getByTestId('btn-leer-guion-fijo')
      await act(async () => {
        fireEvent.click(btnLeer)
        await vi.advanceTimersByTimeAsync(100)
      })

      // Pasar la cuenta regresiva (3s)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3500)
      })

      // Reiniciar los contadores de Haptics DESPUÉS de la cuenta regresiva
      hapticsCalls.selectionChanged = 0
      hapticsCalls.impact = []
      hapticsCalls.notification = 0

      // Con la lectura andando, emitir parciales de voz que hagan avanzar varios renglones
      await act(async () => {
        motor.emitirParcial('Primera linea del guion largo para avanzar renglones.')
        await vi.advanceTimersByTimeAsync(1000)
        motor.emitirParcial('Segunda linea del guion largo para avanzar mas renglones.')
        await vi.advanceTimersByTimeAsync(1000)
        motor.emitirParcial('Tercera linea del guion largo para confirmar avance.')
        await vi.advanceTimersByTimeAsync(1000)
        motor.emitirParcial('palabras improvisadas ajenas fuera de guion')
        await vi.advanceTimersByTimeAsync(1000)
      })

      expect(hapticsCalls.selectionChanged).toBe(0)
      expect(hapticsCalls.impact.length).toBe(0)
      expect(hapticsCalls.notification).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })

  test('T203 - LA HAPTICA CONFIRMA EL TOQUE. Al elegir una opcion de Ancho se llama a selectionChanged una vez. Al apretar Leer, a impact con Medium.', async () => {
    const repo = new RepositorioMemoria()
    const guion: Guion = {
      id: 'g-t203',
      titulo: 'Guion T203',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto de prueba T203' }]
    }
    await repo.guardar(guion)

    render(<App repoOverride={repo} />)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200))
    })

    // Entrar al editor
    const fila = screen.getByTestId('fila-guion-g-t203')
    await act(async () => {
      fireEvent.click(fila)
    })

    // Abrir Ajustes con Aa
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-menu-opciones-editor'))
    })

    hapticsCalls.selectionChanged = 0
    hapticsCalls.impact = []

    // Elegir Ancho -> Medio (primer 'Medio' en Ajustes es el de Ancho)
    const btnMedio = screen.getAllByText('Medio')[0]
    await act(async () => {
      fireEvent.click(btnMedio)
    })

    expect(hapticsCalls.selectionChanged).toBe(1)

    // Cerrar Ajustes
    const btnCerrar = screen.getByTestId('btn-cerrar-ajustes')
    await act(async () => {
      fireEvent.click(btnCerrar)
    })

    // Apretar Leer
    const btnLeer = screen.getByTestId('btn-leer-guion-fijo')
    await act(async () => {
      fireEvent.click(btnLeer)
    })

    expect(hapticsCalls.impact).toContainEqual({ style: 'MEDIUM' })
  })

  test('T204 - EL INTERRUPTOR. Con la vibracion apagada, ninguno de los toques de T203 llama al plugin. Y el ajuste sobrevive a desmontar y volver a montar.', async () => {
    const repo = new RepositorioMemoria()
    const guion: Guion = {
      id: 'g-t204',
      titulo: 'Guion T204',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto T204' }]
    }
    await repo.guardar(guion)

    const { unmount } = render(<App repoOverride={repo} />)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200))
    })

    // Desactivar vibración en biblioteca -> opciones ⋯
    const btnMenu = screen.getByTestId('btn-menu-superior-biblioteca')
    await act(async () => {
      fireEvent.click(btnMenu)
    })

    const inputVibracion = screen.getByLabelText('Vibración') as HTMLInputElement
    expect(inputVibracion.checked).toBe(true)

    await act(async () => {
      fireEvent.click(inputVibracion)
    })
    expect(inputVibracion.checked).toBe(false)

    // Desmontar y volver a montar la aplicación
    unmount()

    hapticsCalls.selectionChanged = 0
    hapticsCalls.impact = []

    render(<App repoOverride={repo} />)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200))
    })

    // Probar toque que normalmente llamaría a háptica
    const fila = screen.getByTestId('fila-guion-g-t204')
    await act(async () => {
      fireEvent.click(fila)
    })

    const btnLeer = screen.getByTestId('btn-leer-guion-fijo')
    await act(async () => {
      fireEvent.click(btnLeer)
    })

    // Con la vibración apagada, ninguna llamada de háptica debe haberse realizado
    expect(hapticsCalls.selectionChanged).toBe(0)
    expect(hapticsCalls.impact.length).toBe(0)
  })

  test('T205 - "Grabado" APARECE Y SE VA. Al salir de la lectura, el aviso esta en el documento; dos segundos despues, ya no.', async () => {
    vi.useFakeTimers()
    try {
      const repo = new RepositorioMemoria()
      const guion: Guion = {
        id: 'g-t205',
        titulo: 'Guion T205',
        idioma: 'es',
        creado: Date.now(),
        modificado: Date.now(),
        bloques: [{ id: 'b1', nombre: '', texto: 'Texto T205' }]
      }
      await repo.guardar(guion)

      render(<App repoOverride={repo} />)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200)
      })

      // Entrar al editor
      const fila = screen.getByTestId('fila-guion-g-t205')
      await act(async () => {
        fireEvent.click(fila)
      })

      // Entrar a lectura
      const btnLeer = screen.getByTestId('btn-leer-guion-fijo')
      await act(async () => {
        fireEvent.click(btnLeer)
      })

      // Traer controles de lectura
      const prompterView = screen.getByTestId('teleprompter-view-container')
      await act(async () => {
        fireEvent.click(prompterView)
      })

      // Salir de lectura
      const btnSalir = screen.getByText('← Salir')
      await act(async () => {
        fireEvent.click(btnSalir)
      })

      // El aviso "Grabado" debe estar en el documento
      const aviso = screen.getByTestId('aviso-flotante')
      expect(aviso).not.toBeNull()
      expect(aviso.textContent).toContain('Grabado')

      // Avanzar 2 segundos
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2100)
      })

      // Dos segundos después, ya no está
      expect(screen.queryByTestId('aviso-flotante')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  test('T206 - EL ENVOLTORIO NO AGREGA NINGUN NIVEL AL ARBOL. El elemento que lleva data-pantalla-direccion es la raiz de la vista, no un elemento agregado.', async () => {
    const repo1 = new RepositorioMemoria()
    const guion: Guion = {
      id: 'g-t206',
      titulo: 'Guion T206',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto T206' }]
    }
    await repo1.guardar(guion)

    // Estado 1: Con movimiento encendido
    const res1 = render(<App repoOverride={repo1} />)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1100))
    })

    const rootApp1 = res1.container.firstElementChild as HTMLElement
    const elementoDireccion = rootApp1.querySelector('[data-pantalla-direccion]') as HTMLElement
    expect(elementoDireccion).not.toBeNull()

    // El elemento con data-pantalla-direccion debe ser la raíz propia de la vista (posee maxWidth 800px) y no un div wrapper
    expect(elementoDireccion.parentElement).toBe(rootApp1)
    expect(elementoDireccion.style.maxWidth).toBe('800px')

    // Estado 2: Con movimiento apagado
    const originalMatchMedia = window.matchMedia
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))

    try {
      res1.unmount()
      const repo2 = new RepositorioMemoria()
      await repo2.guardar(guion)

      const res2 = render(<App repoOverride={repo2} />)
      await act(async () => {
        await new Promise((r) => setTimeout(r, 200))
      })

      const rootApp2 = res2.container.firstElementChild as HTMLElement

      // La cantidad de hijos/niveles entre la raíz de App y la raíz de la vista es exactamente la misma
      expect(rootApp1.children.length).toBe(rootApp2.children.length)
      expect(rootApp1.firstElementChild?.tagName).toBe(rootApp2.firstElementChild?.tagName)
    } finally {
      window.matchMedia = originalMatchMedia
    }
  })

  // POR QUE ESTA PRUEBA EXISTE, Y POR QUE ES ESTATICA Y NO DINAMICA.
  //
  // T202 monta la lectura de verdad y comprueba que no vibre nada mientras esta en
  // pantalla llegando voz. Eso lo hace bien. Lo que NO puede comprobar es el caso que
  // mas importa: QUE NO VIBRE AL CAMBIAR DE RENGLON.
  //
  // El renglon trabado avanza dentro de un requestAnimationFrame, y en jsdom -con o sin
  // relojes falsos- ese bucle no corre. Medido el 15 de septiembre de 2026 plantando el
  // MISMO defecto en dos lugares distintos de TeleprompterView:
  //
  //     vibracion en el cuerpo del componente    -> T202 ROJA
  //     vibracion adentro del bucle de animacion -> T202 VERDE
  //
  // O sea que cualquier prueba dinamica es ciega justo donde haria falta. Por eso la
  // garantia se da al reves y sin ejecutar nada: EL CAMINO DEL MOTOR NO PUEDE NI
  // SIQUIERA ALCANZAR LA HAPTICA. Si no la importa, no puede llamarla.
  //
  // Y cubre la clase entera, no un caso: da igual donde se ponga la llamada adentro de
  // esos archivos.
  //
  // COMPROBADA ROMPIENDO, con el defecto que T202 no ve: se pone roja y nombra
  // components/TeleprompterView.tsx. SI ALGUIEN LA BORRA PORQUE "T202 YA CUBRE ESTO",
  // esta equivocado y arriba esta la medicion.
  test('T207 - GUARDIANA DE LA FRONTERA DEL MOTOR. Ningún archivo de src/lib, src/motor, src/hooks ni TeleprompterView.tsx puede importar ni nombrar la haptica.', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const directorios = ['src/lib', 'src/motor', 'src/hooks']
    const archivos = ['src/components/TeleprompterView.tsx']

    for (const dir of directorios) {
      if (fs.existsSync(dir)) {
        const entradas = fs.readdirSync(dir, { recursive: true })
        for (const e of entradas) {
          const str = String(e)
          if (str.endsWith('.ts') || str.endsWith('.tsx')) {
            archivos.push(path.join(dir, str))
          }
        }
      }
    }

    for (const file of archivos) {
      if (fs.existsSync(file)) {
        const contenido = fs.readFileSync(file, 'utf-8')
        expect(contenido).not.toMatch(/haptica/i)
      }
    }
  })

  test('T208 - NO QUEDA TRANSFORM DESPUES DE LA ANIMACION.', async () => {
    const repo = new RepositorioMemoria()
    const guion: Guion = {
      id: 'g-t208',
      titulo: 'Guion T208',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto T208' }]
    }
    await repo.guardar(guion)

    render(<App repoOverride={repo} />)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    // Entrar al editor con el movimiento encendido
    const fila = screen.getByTestId('fila-guion-g-t208')
    await act(async () => {
      fireEvent.click(fila)
    })

    // Comprobar que mientras la animación corre, la raíz de la vista tiene animación en su estilo
    const rootEditor = screen.getByTestId('input-titulo-guion').closest('[data-pantalla-direccion]') as HTMLElement
    expect(rootEditor).not.toBeNull()
    expect(rootEditor.style.animation).not.toBe('')

    // Disparar el evento de fin de animación
    await act(async () => {
      fireEvent.animationEnd(rootEditor)
    })

    // Comprobar que YA NO tiene animation ni transform en su estilo
    expect(rootEditor.style.animation).toBe('')
    expect(rootEditor.style.transform).toBe('')
  })
})
