import React from 'react'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import fs from 'fs'
import path from 'path'
import 'fake-indexeddb/auto'
import App from '../App'
import BibliotecaView, { resetearPrimerMontajeBiblioteca } from '../components/BibliotecaView'
import EditorView from '../components/EditorView'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { Guion } from '../datos/modelo'
import * as elegirMotorModule from '../motor/elegirMotor'

describe('Pruebas TAREA 48 (T219-T225)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetearPrimerMontajeBiblioteca()
    vi.restoreAllMocks()
  })

  test('T219 - LA TARJETA NO ENCIENDE EL MOTOR.', async () => {
    // a. Comprobación estática: TarjetaLectura.tsx NO debe importar componentes ni motores de avance/voz ni usar rAF
    const fullPath = path.resolve(process.cwd(), 'src/components/TarjetaLectura.tsx')
    const fuenteTarjeta = fs.readFileSync(fullPath, 'utf8')

    expect(fuenteTarjeta).not.toContain('TeleprompterView')
    expect(fuenteTarjeta).not.toContain("from '../lib/")
    expect(fuenteTarjeta).not.toContain("from '../motor/")
    expect(fuenteTarjeta).not.toContain("from '../hooks/")
    expect(fuenteTarjeta).not.toContain('requestAnimationFrame')

    // b. Comprobación de montaje: al montar BibliotecaView con un guion, NO debe existir ningún contenedor de TeleprompterView
    const guionesPrueba = [
      {
        id: 'g1',
        titulo: 'Guión Test',
        idioma: 'es',
        modificado: Date.now(),
        creado: Date.now(),
        palabras: 150
      }
    ]

    render(
      <BibliotecaView
        guiones={guionesPrueba}
        onAbrir={() => {}}
        onCrearNuevo={() => {}}
        onImportarArchivo={() => {}}
        onBorrar={() => {}}
        onArchivar={() => {}}
      />
    )

    expect(screen.getByTestId('tarjeta-lectura-portada')).not.toBeNull()
    expect(screen.queryByTestId('teleprompter-view-container')).toBeNull()
  })

  test('T220 - LA TARJETA MUESTRA EL GUION MAS RECIENTE con su titulo y time-code en formato m:ss.', async () => {
    const guionesPrueba = [
      {
        id: 'g1',
        titulo: 'Guión Más Reciente',
        idioma: 'es',
        modificado: Date.now(),
        creado: Date.now(),
        palabras: 300 // 300 palabras = 2 min (02:00)
      }
    ]

    let resolverGuionCompleto: (g: Guion) => void = () => {}
    const promesaGuion = new Promise<Guion>((resolve) => {
      resolverGuionCompleto = resolve
    })

    const onBuscarGuionCompleto = vi.fn().mockReturnValue(promesaGuion)

    render(
      <BibliotecaView
        guiones={guionesPrueba}
        onAbrir={() => {}}
        onCrearNuevo={() => {}}
        onImportarArchivo={() => {}}
        onBorrar={() => {}}
        onArchivar={() => {}}
        onBuscarGuionCompleto={onBuscarGuionCompleto}
      />
    )

    const tarjeta = screen.getByTestId('tarjeta-lectura-portada')

    // Mientras el texto completo no llegó, la tarjeta YA ESTÁ en el documento (sin hueco ni cartel de cargando)
    expect(tarjeta).not.toBeNull()
    expect(screen.queryByText(/cargando/i)).toBeNull()
    expect(within(tarjeta).getByText('Guión Más Reciente')).not.toBeNull()
    expect(screen.getByTestId('time-code-tarjeta').textContent).toBe('02:00')

    // Resolver la promesa del guión completo
    resolverGuionCompleto({
      id: 'g1',
      titulo: 'Guión Más Reciente',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Primer renglón del guión' }]
    })

    await waitFor(() => {
      expect(screen.getByText('Primer renglón del guión')).not.toBeNull()
    })
  })

  test('T221 - SIN GUIONES, LA TARJETA SIGUE.', async () => {
    const onCrearNuevo = vi.fn()

    render(
      <BibliotecaView
        guiones={[]}
        onAbrir={() => {}}
        onCrearNuevo={onCrearNuevo}
        onImportarArchivo={() => {}}
        onBorrar={() => {}}
        onArchivar={() => {}}
      />
    )

    // La tarjeta sigue en el documento
    expect(screen.getByTestId('tarjeta-lectura-portada')).not.toBeNull()
    expect(screen.getByText('Sin guiones')).not.toBeNull()

    const btnCrear = screen.getByRole('button', { name: /Escribe tu primer guion/i })
    expect(btnCrear).not.toBeNull()

    // No hay ninguna imagen/icono de estado vacío
    expect(screen.queryByRole('img')).toBeNull()

    fireEvent.click(btnCrear)
    expect(onCrearNuevo).toHaveBeenCalledTimes(1)
  })

  test('T222 - VUELVE DE DONDE VINO.', async () => {
    const repo = new RepositorioMemoria()
    await repo.guardar({
      id: 'g-test',
      titulo: 'Guión de Prueba',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Uno dos tres cuatro cinco seis siete ocho nueve diez' }]
    })

    render(<App repoOverride={repo} />)

    // Esperar a que cargue el guion en la biblioteca y aparezca el botón Leer de la tarjeta
    const btnLeerTarjeta = await screen.findByRole('button', { name: /▶ Leer/i })

    // CASO A: Entrar a leer directo desde la Tarjeta
    fireEvent.click(btnLeerTarjeta)

    // Se entra a la lectura
    await waitFor(() => {
      expect(screen.getByTestId('teleprompter-view-container')).not.toBeNull()
    })

    // Tocar para mostrar controles de lectura y hacer clic en Salir
    const container = screen.getByTestId('teleprompter-view-container')
    fireEvent.click(container)

    const btnSalir = await screen.findByRole('button', { name: /← Salir/i })
    fireEvent.click(btnSalir)

    // Debe volver a la BIBLIOTECA
    await waitFor(() => {
      expect(screen.getByTestId('tarjeta-lectura-portada')).not.toBeNull()
    })

    // CASO B: Entrar desde el EDITOR
    const filaGuion = await screen.findByTestId('fila-guion-g-test')
    fireEvent.click(filaGuion)

    // Estamos en el EDITOR
    await waitFor(() => {
      expect(screen.getByTestId('btn-leer-guion-fijo')).not.toBeNull()
    })

    const btnLeerEditor = screen.getByTestId('btn-leer-guion-fijo')
    fireEvent.click(btnLeerEditor)

    // Se entra a la lectura
    await waitFor(() => {
      expect(screen.getByTestId('teleprompter-view-container')).not.toBeNull()
    })

    // Tocar y salir
    const container2 = screen.getByTestId('teleprompter-view-container')
    fireEvent.click(container2)

    const btnSalir2 = await screen.findByRole('button', { name: /← Salir/i })
    fireEvent.click(btnSalir2)

    // Debe volver al EDITOR
    await waitFor(() => {
      expect(screen.getByTestId('btn-leer-guion-fijo')).not.toBeNull()
    })
  })

  test('T223 - UN SOLO TeleprompterView.', async () => {
    const repo = new RepositorioMemoria()
    await repo.guardar({
      id: 'g-test-223',
      titulo: 'Guión Test 223',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Hola mundo teleprompter' }]
    })

    render(<App repoOverride={repo} />)

    const btnLeerTarjeta = await screen.findByRole('button', { name: /▶ Leer/i })

    // Entrar a leer desde la tarjeta (Biblioteca sigue montada detrás)
    fireEvent.click(btnLeerTarjeta)

    // Esperar explícitamente a que aparezca la pantalla de lectura antes de contar
    await screen.findByTestId('teleprompter-view-container')

    // Contar cuántos TeleprompterView existen en el documento
    const views = screen.getAllByTestId('teleprompter-view-container')
    expect(views.length).toBe(1)
  })

  test('T224 - LA BARRA "Leer" SE ESCONDE AL DESPLAZAR Y VUELVE.', async () => {
    const guion: Guion = {
      id: 'g-largo',
      titulo: 'Guión Largo',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Palabra '.repeat(500) }]
    }

    render(
      <EditorView
        guion={guion}
        onChangeGuion={() => {}}
        onVolverBiblioteca={() => {}}
        onEntrarLectura={() => {}}
      />
    )

    const barraLeer = screen.getByTestId('btn-leer-guion-fijo')

    // Inicialmente visible con safe area calc en su contenedor padre
    expect(barraLeer.parentElement?.style.bottom).not.toBe('')
    expect(barraLeer.parentElement?.style.bottom).toContain('safe-area-inset-bottom')
    expect(barraLeer.style.transform).toBe('translateY(0)')

    // Simular scroll en window hacia abajo
    fireEvent.scroll(window, { target: { scrollY: 100 } })

    // Se esconde fuera de vista
    expect(barraLeer.style.transform).toBe('translateY(120px)')

    // Simular scroll en window hacia arriba
    fireEvent.scroll(window, { target: { scrollY: 40 } })

    // Vuelve a estar visible y conserva el bottom seguro en su contenedor
    expect(barraLeer.style.transform).toBe('translateY(0)')
    expect(barraLeer.parentElement?.style.bottom).toContain('safe-area-inset-bottom')
  })

  test('T225 - LA BARRITA DEL SCROLL SOLO SE APAGA EN LA LECTURA.', async () => {
    const fullPath = path.resolve(process.cwd(), 'src/styles.css')
    const cssContent = fs.readFileSync(fullPath, 'utf8')

    // La regla universal * { scrollbar-width: none } NO debe existir
    const regexUniversal = /^\s*\*\s*\{\s*scrollbar-width\s*:\s*none/m
    expect(regexUniversal.test(cssContent)).toBe(false)

    // La regla debe estar acotada a la superficie de lectura
    expect(cssContent.includes('[data-testid="teleprompter-view-container"]')).toBe(true)
  })
})
