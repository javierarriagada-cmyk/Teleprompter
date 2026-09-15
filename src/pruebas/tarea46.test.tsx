import React from 'react'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import fs from 'fs'
import path from 'path'
import 'fake-indexeddb/auto'
import App from '../App'
import BibliotecaView, { resetearPrimerMontajeBiblioteca } from '../components/BibliotecaView'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { Capacitor } from '@capacitor/core'

describe('Pruebas TAREA 46 (T209-T212)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetearPrimerMontajeBiblioteca()
  })

  test('T209 - GUARDIANA DEL SISTEMA. Ningun componente puede escribir un color, un tamano de letra, un espaciado o un radio a mano.', async () => {
    const archivosRevisar = [
      'src/App.tsx',
      'src/components/BibliotecaView.tsx',
      'src/components/EditorView.tsx',
      'src/components/PanelCorpus.tsx',
      'src/components/BarraDeTiempo.tsx'
    ]

    const regexHexColor = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g
    const regexRgbColor = /rgba?\([^)]+\)/g
    const regexFontSize = /fontSize\s*:\s*([0-9.]+)/g
    const regexBorderRadius = /borderRadius\s*:\s*([0-9.]+)/g
    const regexPaddingSpacing = /(?:padding|paddingTop|paddingBottom|paddingLeft|paddingRight)\s*:\s*([0-9.]+)/g
    const regexMarginSpacing = /(?:margin|marginTop|marginBottom|marginLeft|marginRight)\s*:\s*([0-9.]+)/g
    const regexGapSpacing = /\bgap\s*:\s*([0-9.]+)/g

    const tamanosPermitidos = [11, 13, 15, 18, 28]
    const radiosPermitidos = [10, 999]
    const espaciadosPermitidos = [0, 4, 8, 12, 20, 32]

    const infracciones: string[] = []

    for (const relPath of archivosRevisar) {
      const fullPath = path.resolve(process.cwd(), relPath)
      if (!fs.existsSync(fullPath)) {
        infracciones.push(`${relPath} - Archivo no encontrado`)
        continue
      }

      const lineas = fs.readFileSync(fullPath, 'utf8').split('\n')

      lineas.forEach((linea, idx) => {
        const numLinea = idx + 1

        // Excepciones permitidas: safe area calc(16px + env(...))
        if (linea.includes('env(safe-area-inset') || linea.includes('100dvh') || linea.includes('calc(')) {
          return
        }

        // Check colores hex
        const matchesHex = linea.match(regexHexColor)
        if (matchesHex) {
          matchesHex.forEach((hex) => {
            infracciones.push(`${relPath}:${numLinea} - Color hexadecimal no permitido: '${hex}' en "${linea.trim()}"`)
          })
        }

        // Check colores rgb/rgba
        const matchesRgb = linea.match(regexRgbColor)
        if (matchesRgb) {
          matchesRgb.forEach((rgb) => {
            infracciones.push(`${relPath}:${numLinea} - Color RGB/RGBA no permitido: '${rgb}' en "${linea.trim()}"`)
          })
        }

        // Check fontSize
        let matchFS
        while ((matchFS = regexFontSize.exec(linea)) !== null) {
          const val = parseFloat(matchFS[1])
          if (!tamanosPermitidos.includes(val)) {
            infracciones.push(`${relPath}:${numLinea} - Tamaño de letra no permitido: ${val} (permitidos: 11, 13, 15, 18, 28) en "${linea.trim()}"`)
          }
        }

        // Check borderRadius
        let matchBR
        while ((matchBR = regexBorderRadius.exec(linea)) !== null) {
          const val = parseFloat(matchBR[1])
          if (!radiosPermitidos.includes(val)) {
            infracciones.push(`${relPath}:${numLinea} - Radio de borde no permitido: ${val} (permitidos: 10, 999) en "${linea.trim()}"`)
          }
        }

        // Check paddings
        let matchPad
        while ((matchPad = regexPaddingSpacing.exec(linea)) !== null) {
          const val = parseFloat(matchPad[1])
          if (!espaciadosPermitidos.includes(val)) {
            infracciones.push(`${relPath}:${numLinea} - Padding no permitido: ${val} (permitidos: 0, 4, 8, 12, 20, 32) en "${linea.trim()}"`)
          }
        }

        // Check margins
        let matchMar
        while ((matchMar = regexMarginSpacing.exec(linea)) !== null) {
          const val = parseFloat(matchMar[1])
          if (!espaciadosPermitidos.includes(val)) {
            infracciones.push(`${relPath}:${numLinea} - Margin no permitido: ${val} (permitidos: 0, 4, 8, 12, 20, 32) en "${linea.trim()}"`)
          }
        }

        // Check gap
        let matchGap
        while ((matchGap = regexGapSpacing.exec(linea)) !== null) {
          const val = parseFloat(matchGap[1])
          if (!espaciadosPermitidos.includes(val)) {
            infracciones.push(`${relPath}:${numLinea} - Gap no permitido: ${val} (permitidos: 0, 4, 8, 12, 20, 32) en "${linea.trim()}"`)
          }
        }
      })
    }

    if (infracciones.length > 0) {
      throw new Error(`Infracciones del estándar visual detectadas (${infracciones.length}):\n  - ` + infracciones.join('\n  - '))
    }
  })

  test('T210 - LA DESCARGA NO ARRANCA CON EL MOTOR NATIVO.', async () => {
    const isNativeSpy = vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true)

    render(<App />)

    // Con motor nativo por omision, el indicador de precarga de Vosk NO se muestra
    expect(screen.queryByText(/Descargando modelo de voz/i)).toBeNull()

    isNativeSpy.mockRestore()
  })

  test('T211 - EL GUION DE BIENVENIDA SE PONE UNA VEZ.', async () => {
    // Render sin repoOverride y sin marca en localStorage: crea guion de bienvenida
    const { unmount } = render(<App />)

    await waitFor(async () => {
      expect(await screen.findByText('Bienvenida')).not.toBeNull()
    })

    expect(localStorage.getItem('teleprompter_bienvenida_puesta')).toBe('true')
    unmount()

    // Segunda apertura con marca puesta: no vuelve a crear ni duplica
    render(<App />)
    await waitFor(() => {
      const listaGuiones = screen.getAllByText('Bienvenida')
      expect(listaGuiones.length).toBe(1)
    })
  })

  test('T212 - EL ESCALONADO. En el primer montaje, el titulo, el subtitulo y la lista tienen retardos reales distintos y crecientes. Volviendo del editor, los tres tienen retardo cero.', async () => {
    resetearPrimerMontajeBiblioteca()

    render(<BibliotecaView guiones={[]} onAbrir={() => {}} onCrearNuevo={() => {}} onImportarArchivo={() => {}} onBorrar={() => {}} onArchivar={() => {}} />)

    const titulo = screen.getByTestId('titulo-biblioteca')
    const subtitulo = screen.getByTestId('resumen-encabezado-biblioteca')
    const lista = screen.getByTestId('lista-guiones-biblioteca')

    // Verificar estilo animationDelay real
    expect(titulo.style.animationDelay).toBe('0ms')
    expect(subtitulo.style.animationDelay).toBe('40ms')
    expect(lista.style.animationDelay).toBe('80ms')

    // Simular un segundo montaje (ej. volviendo del editor)
    render(<BibliotecaView guiones={[]} onAbrir={() => {}} onCrearNuevo={() => {}} onImportarArchivo={() => {}} onBorrar={() => {}} onArchivar={() => {}} />)

    const titulo2 = screen.getAllByTestId('titulo-biblioteca')[1]
    const subtitulo2 = screen.getAllByTestId('resumen-encabezado-biblioteca')[1]
    const lista2 = screen.getAllByTestId('lista-guiones-biblioteca')[1]

    expect(titulo2.style.animationDelay).toBe('')
    expect(subtitulo2.style.animationDelay).toBe('')
    expect(lista2.style.animationDelay).toBe('')
  })
})
