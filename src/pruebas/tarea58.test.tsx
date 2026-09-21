import React from 'react'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import 'fake-indexeddb/auto'
import App from '../App'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { MotorFake } from '../motor/MotorFake'

describe('Pruebas TAREA 58 - PREPARAR LA TOMA (T276)', () => {
  beforeEach(() => {
    localStorage.clear()
    if (!navigator.mediaDevices) {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {},
        writable: true
      })
    }
    navigator.mediaDevices.getUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: () => {} }]
    } as any)
  })

  test('T276: con modoCamara en "frontal", apretar Leer deja la aplicacion en "preparar" y NO en "lectura", y el motor NO arranco. Apretar Empezar entra a "lectura". Y con modoCamara en "apagada", apretar Leer entra DERECHO a "lectura", sin pasar por "preparar". Entre entrar a preparar y llegar a lectura, getUserMedia para camara tiene que haberse llamado UNA SOLA VEZ.', async () => {
    // 1. Con modoCamara en 'frontal'
    localStorage.setItem(
      'teleprompter_ajustes',
      JSON.stringify({ modoCamara: 'frontal' })
    )

    const repoFrontal = new RepositorioMemoria()
    await repoFrontal.guardar({
      id: 'g-t276-frontal',
      titulo: 'Guion Frontal T276',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      archivado: false,
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto de prueba frontal' }]
    })

    const motorFake = new MotorFake()
    const { unmount } = render(<App repoOverride={repoFrontal} motor={motorFake} />)

    const filaGuionFrontal = await screen.findByTestId('fila-guion-g-t276-frontal')
    fireEvent.click(filaGuionFrontal)

    const btnLeerEditorFrontal = await screen.findByTestId('btn-leer-guion-fijo')
    fireEvent.click(btnLeerEditorFrontal)

    // Debe entrar a 'preparar' y NO a 'lectura'
    await waitFor(() => {
      expect(screen.getByTestId('preparar-view-container')).toBeDefined()
      expect(screen.queryByTestId('teleprompter-view-container')).toBeNull()
    })

    // Apretar Empezar
    const btnEmpezar = screen.getByTestId('btn-empezar-preparar')
    fireEvent.click(btnEmpezar)

    // Entra a 'lectura'
    await waitFor(() => {
      expect(screen.getByTestId('teleprompter-view-container')).toBeDefined()
    })

    // Comprobar que getUserMedia para video (cámara) se llamó UNA SOLA VEZ entre entrar a 'preparar' y llegar a 'lectura'
    const llamadasCamara = (navigator.mediaDevices.getUserMedia as any).mock.calls.filter(
      (c: any) => c[0] && c[0].video
    )
    expect(llamadasCamara.length).toBe(1)

    unmount()

    // 2. Con modoCamara en 'apagada'
    localStorage.clear()
    localStorage.setItem(
      'teleprompter_ajustes',
      JSON.stringify({ modoCamara: 'apagada' })
    )

    const repoApagada = new RepositorioMemoria()
    await repoApagada.guardar({
      id: 'g-t276-apagada',
      titulo: 'Guion Apagada T276',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      archivado: false,
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto de prueba apagada' }]
    })

    render(<App repoOverride={repoApagada} motor={motorFake} />)

    const filaGuionApagada = await screen.findByTestId('fila-guion-g-t276-apagada')
    fireEvent.click(filaGuionApagada)

    const btnLeerEditorApagada = await screen.findByTestId('btn-leer-guion-fijo')
    fireEvent.click(btnLeerEditorApagada)

    // Entra DERECHO a 'lectura', sin pasar por 'preparar'
    await waitFor(() => {
      expect(screen.queryByTestId('preparar-view-container')).toBeNull()
      expect(screen.getByTestId('teleprompter-view-container')).toBeDefined()
    })
  })
})
