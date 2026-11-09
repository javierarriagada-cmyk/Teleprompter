// PROTOTIPO DE LA VENTANA FLOTANTE, 09-11-2026: el arrastre de la banda lo mide lo nativo. Esta rama no va a main ni a Play.

// LO QUE LA PÁGINA MANDA AL ARRASTRAR. El asa avisa una sola vez -'moverInicio'- al apoyar el dedo y moverlo no manda
// 'mover': la posición la sigue VentanaDePrueba con el dedo en la pantalla -ArrastreVentana, probada en la JVM-. La
// esquina sigue mandando 'tamano' en cada paso. Solo mensajes: nada de posiciones dibujadas.
import React from 'react'
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import { PaginaFlotante } from '../flotante/PaginaFlotante'
import { t } from '../textos'

const esperar = (ms = 30) => act(async () => { await new Promise((r) => setTimeout(r, ms)) })

function aLaPagina(m: Record<string, unknown>) {
  act(() => { window.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(m) })) })
}

describe('el arrastre por el asa', () => {
  const enviados: Record<string, unknown>[] = []
  beforeEach(async () => {
    enviados.length = 0
    ;(window as any).sigo = { postMessage: (d: string) => enviados.push(JSON.parse(d)) }
    // jsdom no tiene PointerEvent ni captura de puntero: sin esto clientX llega vacío.
    if (!(window as any).PointerEvent) {
      class PointerEventDePrueba extends MouseEvent {
        pointerId: number
        isPrimary: boolean
        constructor(tipo: string, init: PointerEventInit = {}) {
          super(tipo, init)
          this.pointerId = init.pointerId ?? 1
          this.isPrimary = init.isPrimary ?? true
        }
      }
      ;(window as any).PointerEvent = PointerEventDePrueba
    }
    ;(HTMLElement.prototype as any).setPointerCapture = () => {}
    render(<PaginaFlotante />)
    aLaPagina({
      tipo: 'contrato', sesion: 7, guion: { id: 'g', titulo: 'A', idioma: 'es', creado: 0, modificado: 0, archivado: false, bloques: [{ id: 'b', nombre: '', texto: 'hola lee esto' }] },
      idioma: 'es-ES', fontSize: 24, tipoFuente: 'sans', colorFondo: '#000000', colorLetra: '#FFFFFF', marginPercent: 5,
      columnaAngosta: false, lineasZona: 3, anclajeZona: 'medio', transparencia: 16, tokenInicial: 0, mostrarTiempo: true, idiomaApp: 'es'
    })
    aLaPagina({ tipo: 'geometria', sesion: 7, x: 16, y: 104, w: 358, h: 224, seguro: { l: 0, t: 32, r: 390, b: 825 } })
    await esperar()
    enviados.length = 0
  })
  afterEach(() => {
    cleanup()
    delete (window as any).sigo
  })

  test('apoyar en el asa manda un solo moverInicio y moverlo no manda mover', async () => {
    const asa = screen.getByRole('button', { name: t('moverVentana') })
    fireEvent.pointerDown(asa, { pointerId: 1, clientX: 200, clientY: 20, isPrimary: true })
    // Un segundo dedo en el asa no vuelve a avisar.
    fireEvent.pointerDown(asa, { pointerId: 3, clientX: 230, clientY: 24, isPrimary: false })
    for (let i = 1; i <= 20; i++) fireEvent.pointerMove(asa, { pointerId: 1, clientX: 200 + i * 3, clientY: 20 + i * 7 })
    fireEvent.pointerUp(asa, { pointerId: 1, clientX: 260, clientY: 160 })
    await esperar()
    expect(enviados.filter((m) => m.tipo === 'moverInicio')).toEqual([{ tipo: 'moverInicio', sesion: 7 }])
    expect(enviados.filter((m) => m.tipo === 'mover')).toEqual([])
  })

  test('la esquina sigue mandando tamano en cada paso', async () => {
    const esquina = screen.getByRole('button', { name: t('cambiarTamano') })
    fireEvent.pointerDown(esquina, { pointerId: 2, clientX: 340, clientY: 210, isPrimary: true })
    fireEvent.pointerMove(esquina, { pointerId: 2, clientX: 350, clientY: 215 })
    fireEvent.pointerMove(esquina, { pointerId: 2, clientX: 356, clientY: 230 })
    fireEvent.pointerUp(esquina, { pointerId: 2 })
    await esperar()
    const tamanos = enviados.filter((m) => m.tipo === 'tamano')
    expect(tamanos.length).toBe(2)
    expect(tamanos[0]).toMatchObject({ tipo: 'tamano', sesion: 7, dw: 10, dh: 5, dx: 0, dy: 0 })
    expect(enviados.filter((m) => m.tipo === 'moverInicio' || m.tipo === 'mover')).toEqual([])
  })
})
