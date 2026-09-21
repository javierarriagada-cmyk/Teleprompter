import React from 'react'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import 'fake-indexeddb/auto'
import App from '../App'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { MotorFake } from '../motor/MotorFake'

describe('Pruebas TAREA 59 - LOS OTROS DOS FONDOS (T277)', () => {
  let stopTrackFn: any

  beforeEach(() => {
    localStorage.clear()
    stopTrackFn = vi.fn()
    if (!navigator.mediaDevices) {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {},
        writable: true
      })
    }
    navigator.mediaDevices.getUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: stopTrackFn }]
    } as any)
  })

  test('T277: con la camara en frontal, en la pantalla de preparar: a) con fondoToma en "detras", el video a pantalla completa esta en el documento. b) al elegir "recuadro", el video a pantalla completa YA NO esta y el recuadro SI. c) al elegir "oculta", no esta ninguno de los dos, Y LA PISTA DE LA CAMARA NO SE APAGO: el stop() de la pista no fue llamado.', async () => {
    localStorage.setItem(
      'teleprompter_ajustes',
      JSON.stringify({ modoCamara: 'frontal', fondoToma: 'detras' })
    )

    const repo = new RepositorioMemoria()
    await repo.guardar({
      id: 'g-t277',
      titulo: 'Guion T277',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      archivado: false,
      bloques: [{ id: 'b1', nombre: '', texto: 'Texto de prueba T277' }]
    })

    const motorFake = new MotorFake()
    const { unmount } = render(<App repoOverride={repo} motor={motorFake} />)

    // Abrir guion
    const filaGuion = await screen.findByTestId('fila-guion-g-t277')
    fireEvent.click(filaGuion)

    // Apretar Leer para ir a 'preparar'
    const btnLeer = await screen.findByTestId('btn-leer-guion-fijo')
    fireEvent.click(btnLeer)

    await waitFor(() => {
      expect(screen.getByTestId('preparar-view-container')).toBeDefined()
    })

    // a. Con fondoToma en 'detras', el video a pantalla completa esta en el documento
    await waitFor(() => {
      expect(screen.getByTestId('video-camara-preparar')).toBeDefined()
    })
    expect(screen.queryByTestId('recuadro-camara')).toBeNull()

    // b. Al elegir 'recuadro', el video a pantalla completa YA NO esta y el recuadro SI
    const btnRecuadro = screen.getByTestId('btn-fondo-recuadro')
    fireEvent.click(btnRecuadro)

    await waitFor(() => {
      expect(screen.queryByTestId('video-camara-preparar')).toBeNull()
      expect(screen.getByTestId('recuadro-camara')).toBeDefined()
    })

    // c. Al elegir 'oculta', no esta ninguno de los dos, Y LA PISTA DE LA CAMARA NO SE APAGO: el stop() de la pista no fue llamado
    const btnOculta = screen.getByTestId('btn-fondo-oculta')
    fireEvent.click(btnOculta)

    await waitFor(() => {
      expect(screen.queryByTestId('video-camara-preparar')).toBeNull()
      expect(screen.queryByTestId('recuadro-camara')).toBeNull()
    })

    // El cartelito de aviso de camara encendida debe estar en el documento
    expect(screen.getByTestId('aviso-camara-encendida')).toBeDefined()

    // LA GUARDIANA DE VERDAD: stop() de la pista NO fue llamado al cambiar de fondo
    expect(stopTrackFn).not.toHaveBeenCalled()

    unmount()
  })
})
