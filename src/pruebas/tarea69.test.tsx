import React from 'react'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import 'fake-indexeddb/auto'
import App from '../App'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { MotorFake } from '../motor/MotorFake'

vi.mock('@capgo/camera-preview', () => ({
  CameraPreview: {
    start: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 }),
    stop: vi.fn().mockResolvedValue(undefined),
    setOpacity: vi.fn().mockResolvedValue(undefined),
    setPreviewSize: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 })
  }
}))

describe('Pruebas TAREA 69 - EN LEER: EL ENGRANAJE SUBE A LA ESQUINA, EMPEZAR PASA A SER UN ICONO', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  test('1. Entrar por btn-leer-tarjeta (conCamara false): el icono de empezar no tiene texto y el engranaje esta arriba a la derecha con position absolute', async () => {
    const repo = new RepositorioMemoria()
    await repo.guardar({
      id: 'g-t69-leer',
      titulo: 'Guion Leer T69',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      archivado: false,
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto de prueba para Leer en Tarea 69' }]
    })

    const motorFake = new MotorFake()
    render(<App repoOverride={repo} motor={motorFake} />)

    const btnLeerTarjeta = await screen.findByTestId('btn-leer-tarjeta')
    fireEvent.click(btnLeerTarjeta)

    const btnEmpezar = await screen.findByTestId('btn-empezar-toma')
    expect(btnEmpezar.textContent).not.toContain('Empezar')
    expect(btnEmpezar.querySelector('svg')).not.toBeNull()
    // 24-09-2026: en Leer el circulo lleva el estandar de Leer, crema.
    expect(btnEmpezar.classList.contains('btn-empezar-leer')).toBe(true)

    const btnEngranaje = screen.getByTestId('btn-engranaje-toma')
    expect(btnEngranaje.getAttribute('aria-label')).toBe('Ajustes de la escena')
    expect(btnEngranaje.style.position).toBe('absolute')
    expect(btnEngranaje.style.top).toContain('8px')
    expect(btnEngranaje.style.right).toContain('8px')
  })

  // La Tarea 70 dio vuelta lo que la 69 fijaba aqui: en Grabar el boton de empezar TAMPOCO
  // tiene el texto "Empezar" y lleva un svg adentro, igual que en Leer.
  test('2. Entrar por btn-grabar-tarjeta (conCamara true): el boton empezar tampoco tiene texto y lleva el punto rojo de grabar', async () => {
    const repo = new RepositorioMemoria()
    await repo.guardar({
      id: 'g-t69-grabar',
      titulo: 'Guion Grabar T69',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      archivado: false,
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto de prueba para Grabar en Tarea 69' }]
    })

    const motorFake = new MotorFake()
    render(<App repoOverride={repo} motor={motorFake} />)

    const btnGrabarTarjeta = await screen.findByTestId('btn-grabar-tarjeta')
    fireEvent.click(btnGrabarTarjeta)

    const btnEmpezar = await screen.findByTestId('btn-empezar-toma')
    expect(btnEmpezar.textContent).not.toContain('Empezar')
    // 24-09-2026: en Grabar el circulo lleva el punto rojo, el estandar de los
    // botones que graban, y no el triangulo.
    expect(btnEmpezar.querySelector('.punto-grabar')).not.toBeNull()
    expect(btnEmpezar.classList.contains('btn-empezar-grabar')).toBe(true)
  })
})
