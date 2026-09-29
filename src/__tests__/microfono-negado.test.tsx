import React from 'react'
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import { render, act, fireEvent, screen } from '@testing-library/react'
import 'fake-indexeddb/auto'
import App from '../App'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { Guion } from '../datos/modelo'
import { MotorDeVoz } from '../motor/MotorDeVoz'

// PRUEBA DE COMPORTAMIENTO DE MICROFONO NEGADO -28-09-2026-
// Verifica que si pedirMicrofono() devuelve false:
// 1. Apretar Empezar muestra el dialogo-microfono
// 2. La toma NO pasa a estado leyendo
// 3. "Ahora no" cierra el dialogo
// 4. "Abrir ajustes" llama a abrirAjustesDeLaApp
// 5. Con pedirMicrofono() devolviendo true, no aparece el dialogo y la lectura parte.

class MotorPruebaPermiso implements MotorDeVoz {
  readonly id = 'fake' as const
  readonly nombre = 'Motor Prueba Permiso'
  concedido = true
  abrirAjustesLlamado = false

  async disponible(): Promise<boolean> { return true }
  async listo(): Promise<boolean> { return true }
  async iniciar(): Promise<void> {}
  async detener(): Promise<void> {}

  async pedirMicrofono(): Promise<boolean> {
    return this.concedido
  }

  async abrirAjustesDeLaApp(): Promise<void> {
    this.abrirAjustesLlamado = true
  }

  onParcial(): () => void { return () => {} }
  onFinal(): () => void { return () => {} }
  onError(): () => void { return () => {} }
}

describe('Prueba: Si se niega el micrófono, Sigo lo explica y ofrece la salida', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('con pedirMicrofono devolviendo false, apretar Empezar muestra dialogo-microfono y la toma NO pasa a leyendo', async () => {
    const motor = new MotorPruebaPermiso()
    motor.concedido = false

    const repo = new RepositorioMemoria()
    const guion: Guion = {
      id: 'g-micro-negado',
      titulo: 'Guion Permiso Negado',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto de prueba de microfono negado.' }]
    }
    await repo.guardar(guion)

    render(<App motor={motor} repoOverride={repo} />)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    // 1. Abrir el guion
    const fila = screen.getByTestId('fila-guion-g-micro-negado')
    await act(async () => {
      fireEvent.click(fila)
      await new Promise((r) => setTimeout(r, 100))
    })

    // 2. Entrar a LISTO en lectura
    const btnLeer = screen.getByTestId('btn-leer-guion-fijo')
    await act(async () => {
      fireEvent.click(btnLeer)
      await new Promise((r) => setTimeout(r, 100))
    })

    const prompterContainer = screen.getByTestId('teleprompter-view-container')
    expect(prompterContainer.getAttribute('data-estado-toma')).toBe('listo')

    // 3. Apretar "Empezar" en LISTO
    const btnEmpezar = screen.getByTestId('btn-empezar-toma')
    await act(async () => {
      fireEvent.click(btnEmpezar)
      await new Promise((r) => setTimeout(r, 100))
    })

    // 4. Verificar que se muestra el diálogo y la toma NO pasó a leyendo
    expect(screen.getByTestId('dialogo-microfono')).not.toBeNull()
    expect(prompterContainer.getAttribute('data-estado-toma')).toBe('listo')

    // 5. Clic en "Abrir ajustes" llama a abrirAjustesDeLaApp y cierra el dialogo
    const btnAjustes = screen.getByTestId('btn-microfono-ajustes')
    await act(async () => {
      fireEvent.click(btnAjustes)
      await new Promise((r) => setTimeout(r, 100))
    })

    expect(motor.abrirAjustesLlamado).toBe(true)
    expect(screen.queryByTestId('dialogo-microfono')).toBeNull()

    // 6. Si se vuelve a intentar y "Ahora no" es presionado, el dialogo se cierra y no llama a abrirAjustes
    motor.abrirAjustesLlamado = false
    await act(async () => {
      fireEvent.click(btnEmpezar)
      await new Promise((r) => setTimeout(r, 100))
    })

    expect(screen.getByTestId('dialogo-microfono')).not.toBeNull()

    const btnAhoraNo = screen.getByTestId('btn-microfono-ahora-no')
    await act(async () => {
      fireEvent.click(btnAhoraNo)
      await new Promise((r) => setTimeout(r, 100))
    })

    expect(screen.queryByTestId('dialogo-microfono')).toBeNull()
    expect(motor.abrirAjustesLlamado).toBe(false)
    expect(prompterContainer.getAttribute('data-estado-toma')).toBe('listo')
  })

  test('con pedirMicrofono devolviendo true, no aparece el dialogo y la lectura parte', async () => {
    const motor = new MotorPruebaPermiso()
    motor.concedido = true

    const repo = new RepositorioMemoria()
    const guion: Guion = {
      id: 'g-micro-concedido',
      titulo: 'Guion Permiso Concedido',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto de prueba de microfono concedido.' }]
    }
    await repo.guardar(guion)

    render(<App motor={motor} repoOverride={repo} />)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    const fila = screen.getByTestId('fila-guion-g-micro-concedido')
    await act(async () => {
      fireEvent.click(fila)
      await new Promise((r) => setTimeout(r, 100))
    })

    const btnLeer = screen.getByTestId('btn-leer-guion-fijo')
    await act(async () => {
      fireEvent.click(btnLeer)
      await new Promise((r) => setTimeout(r, 100))
    })

    const prompterContainer = screen.getByTestId('teleprompter-view-container')
    expect(prompterContainer.getAttribute('data-estado-toma')).toBe('listo')

    const btnEmpezar = screen.getByTestId('btn-empezar-toma')
    await act(async () => {
      fireEvent.click(btnEmpezar)
      await new Promise((r) => setTimeout(r, 100))
    })

    // No aparece el diálogo
    expect(screen.queryByTestId('dialogo-microfono')).toBeNull()
    // La toma pasó a leyendo
    expect(prompterContainer.getAttribute('data-estado-toma')).toBe('leyendo')
  })
})
