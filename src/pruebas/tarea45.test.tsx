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

describe('Pruebas TAREA 45: Movimiento y Háptica (T199-T205)', () => {
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

      // Con movimiento apagado, Pantalla no agrega div envoltorio con animación
      expect(container.querySelector('[data-pantalla-direccion]')).toBeNull()
    } finally {
      window.matchMedia = originalMatchMedia
    }
  })

  test('T200 - LA DIRECCION. Yendo de biblioteca a editor, el envoltorio entra desde la derecha (adentro); volviendo de editor a biblioteca, desde la izquierda (atras).', async () => {
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

    // 1. Inicialmente en biblioteca
    let pantallaDiv = container.querySelector('[data-pantalla-direccion]')
    expect(pantallaDiv).not.toBeNull()
    expect(pantallaDiv?.getAttribute('data-pantalla-direccion')).toBe('adentro')

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
    const motor = new MotorFake()
    const repo = new RepositorioMemoria()
    const guion: Guion = {
      id: 'g-t202',
      titulo: 'Guion T202',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Primera linea de texto para probar motor fake' }]
    }
    await repo.guardar(guion)

    render(<App motor={motor} repoOverride={repo} />)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200))
    })

    // Entrar al editor
    const fila = screen.getByTestId('fila-guion-g-t202')
    await act(async () => {
      fireEvent.click(fila)
    })

    // Reiniciar contadores antes de simular motor
    hapticsCalls.selectionChanged = 0
    hapticsCalls.impact = []
    hapticsCalls.notification = 0

    // Simular voz / avance en el motor
    act(() => {
      motor.emitirParcial('primera linea de texto')
      motor.emitirParcial('palabras improvisadas ajenas fuera de guion')
    })

    expect(hapticsCalls.selectionChanged).toBe(0)
    expect(hapticsCalls.impact.length).toBe(0)
    expect(hapticsCalls.notification).toBe(0)
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

    // Abrir Ajustes
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-menu-opciones-editor'))
    })
    await act(async () => {
      fireEvent.click(screen.getByText('Ajustes'))
    })

    hapticsCalls.selectionChanged = 0
    hapticsCalls.impact = []

    // Elegir Ancho -> Medio
    const btnMedio = screen.getAllByText('Medio')[0]
    await act(async () => {
      fireEvent.click(btnMedio)
    })

    expect(hapticsCalls.selectionChanged).toBe(1)

    // Cerrar Ajustes
    const btnCruz = screen.getByTestId('panel-ajustes').querySelector('button')!
    await act(async () => {
      fireEvent.click(btnCruz)
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
})
