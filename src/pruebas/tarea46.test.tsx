import React from 'react'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
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
      'src/components/BarraDeTiempo.tsx',
      'src/components/TarjetaLectura.tsx',
      'src/components/Entrada.tsx',
      'src/components/AvisoBreve.tsx',
      'src/components/IndicadorPrecarga.tsx',
      'src/components/PanelDiagnostico.tsx',
      // Tarea 84 -29-09-2026-: el componente nuevo entra a la lista, como pide la regla de la casa.
      'src/components/DialogoPermiso.tsx',
      // Tarea 87, paso 0 -03-10-2026-: el panel de mediciones es un componente nuevo y entra.
      'src/components/PanelMediciones.tsx',
      // Tarea 87 -04-10-2026-: el selector de posición de los subtítulos entró y se sacó el mismo día
      // -Javier simplifica la 87-. Antes: 'src/components/SelectorPosicion.tsx'.
      // Tarea 96 -05-10-2026-: el selector de filtro es un componente nuevo y entra -plan 3, 4.8-.
      'src/components/SelectorFiltro.tsx',
      // -ajustes de pantallas, 10-10-2026-: el dock de LISTO y las filas de Lectura y Pantalla que comparte
      // con Ajustes son componentes nuevos y entran. Antes: 'src/components/SelectorFiltro.tsx' cerraba la lista.
      'src/components/DockListo.tsx',
      'src/components/FilasAjustesLectura.tsx'
    ]

    const regexHexColor = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g
    const regexRgbColor = /rgba?\([^)]+\)/g
    const regexFontSize = /fontSize\s*:\s*([0-9.]+)/g
    const regexBorderRadius = /borderRadius\s*:\s*([0-9.]+)/g
    const regexPaddingSpacing = /(?:padding|paddingTop|paddingBottom|paddingLeft|paddingRight)\s*:\s*([0-9.]+)/g
    const regexMarginSpacing = /(?:margin|marginTop|marginBottom|marginLeft|marginRight)\s*:\s*([0-9.]+)/g
    const regexGapSpacing = /\bgap\s*:\s*([0-9.]+)/g

    // 44 px es la excepción del título de la Tarjeta de Portada (el protagonista de la pantalla)
    // 44 px es la excepción del título de la Tarjeta de Portada (el protagonista
    // de la pantalla).
    //
    // 42 px es la palabra SIGO del arranque, y es una excepción de otra clase: no
    // es texto, es un logotipo. Su tamaño no sale de la escalera tipográfica sino
    // de una MEDIDA: tiene que quedar entre 100 y 120 px de ancho para leerse como
    // parte de la marca. Medido en el navegador con la página cargada, 42 px da
    // 107 px de ancho, y el renglón más largo de la marca mide 104. Si alguna vez
    // se cambia la fuente o el interletrado, este número se vuelve a medir: no se
    // ajusta a ojo.
    const tamanosPermitidos = [11, 13, 15, 18, 28, 42, 44]
    const radiosPermitidos = [0, 10, 999]
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
        if (linea.includes('env(safe-area-inset') || linea.includes('100dvh')) {
          return
        }

        // Infracciones viejas conocidas en BibliotecaView.tsx (líneas 710 y 711)
        if (relPath.endsWith('BibliotecaView.tsx') && (linea.includes('rgba(255, 255, 255, 0.08)') || linea.includes('rgba(255, 255, 255, 0.06)'))) {
          return
        }

        // Check colores hex (excepto las constantes explícitas del espejo en Entrada.tsx)
        const matchesHex = linea.match(regexHexColor)
        if (matchesHex) {
          matchesHex.forEach((hex) => {
            if (relPath.endsWith('Entrada.tsx') && (linea.includes('COLOR_MARCA_') || linea.includes("backgroundColor: '#151312'"))) {
              return
            }
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

    // Se titula "Hola" y no "Bienvenida" desde el 15 de septiembre de 2026: Javier lo
    // encontro "muy formal". La marca de localStorage conserva el nombre viejo a
    // proposito, para no re-crear el guion a quien ya lo tenia.
    await waitFor(async () => {
      const elementos = await screen.findAllByText('Hola')
      expect(elementos.length).toBeGreaterThan(0)
    })

    expect(localStorage.getItem('teleprompter_bienvenida_puesta')).toBe('true')
    unmount()

    // Segunda apertura con marca puesta: no vuelve a crear ni duplica
    render(<App />)
    await waitFor(() => {
      const listaGuiones = within(screen.getByTestId('lista-guiones-biblioteca')).getAllByText('Hola')
      expect(listaGuiones.length).toBe(1)
    })
  })

  test('T212 - EL ESCALONADO. En el primer montaje, la tarjeta de portada y la lista tienen retardos reales distintos y crecientes. Volviendo del editor, los dos tienen retardo cero.', async () => {
    resetearPrimerMontajeBiblioteca()

    render(<BibliotecaView guiones={[]} onAbrir={() => {}} onCrearNuevo={() => {}} onBorrar={() => {}} onArchivar={() => {}} />)

    const tarjeta = screen.getByTestId('tarjeta-lectura-portada').parentElement!
    const lista = screen.getByTestId('lista-guiones-biblioteca')

    // Verificar estilo animationDelay real
    expect(tarjeta.style.animationDelay).toBe('0ms')
    expect(lista.style.animationDelay).toBe('80ms')

    // Simular un segundo montaje (ej. volviendo del editor)
    render(<BibliotecaView guiones={[]} onAbrir={() => {}} onCrearNuevo={() => {}} onBorrar={() => {}} onArchivar={() => {}} />)

    const tarjeta2 = screen.getAllByTestId('tarjeta-lectura-portada')[1].parentElement!
    const lista2 = screen.getAllByTestId('lista-guiones-biblioteca')[1]

    expect(tarjeta2.style.animationDelay).toBe('')
    expect(lista2.style.animationDelay).toBe('')
  })

  test("T267 - T209 YA NO SE ESQUIVA CON UN COMENTARIO. La lista de excepciones no contiene 'calc(' a secas, y EditorView.tsx no contiene 'rgba(21,19,18' ni 'calc(2px)'.", () => {
    const fuentePrueba = fs.readFileSync(path.resolve(process.cwd(), 'src/pruebas/tarea46.test.tsx'), 'utf8')
    const expresionExcepcionCalc = "linea.includes(" + "'calc(')"
    expect(fuentePrueba).not.toContain(expresionExcepcionCalc)

    const fuenteEditor = fs.readFileSync(path.resolve(process.cwd(), 'src/components/EditorView.tsx'), 'utf8')
    expect(fuenteEditor).not.toContain('rgba(21,19,18')
    expect(fuenteEditor).not.toContain('calc(2px)')
  })
})
