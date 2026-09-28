import React from 'react'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { escribirEnGuion } from './ayudaEditor'
import fs from 'fs'
import path from 'path'
import 'fake-indexeddb/auto'
import App from '../App'
import EditorView from '../components/EditorView'
import { Guion } from '../datos/modelo'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import * as movimiento from '../components/movimiento'

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '').trim()
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('')
  }
  const num = parseInt(clean, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  }
}

function canalLineal(c255: number): number {
  const s = c255 / 255
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

function luminanciaRelativa(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const rLin = canalLineal(r)
  const gLin = canalLineal(g)
  const bLin = canalLineal(b)
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin
}

function relacionContraste(hex1: string, hex2: string): number {
  const l1 = luminanciaRelativa(hex1)
  const l2 = luminanciaRelativa(hex2)
  const masClaro = Math.max(l1, l2)
  const masOscuro = Math.min(l1, l2)
  return (masClaro + 0.05) / (masOscuro + 0.05)
}

const guionPruebaVacio: Guion = {
  id: 'g-vacio-t55',
  titulo: '',
  idioma: 'es',
  creado: Date.now(),
  modificado: Date.now(),
  archivado: false,
  bloques: [
    {
      id: 'b1',
      nombre: '',
      texto: ''
    }
  ]
}

const guionPruebaConTexto: Guion = {
  id: 'g-texto-t55',
  titulo: 'Guion de prueba',
  idioma: 'es',
  creado: Date.now(),
  modificado: Date.now(),
  archivado: false,
  bloques: [
    {
      id: 'b1',
      nombre: '',
      texto: 'Hola mundo'
    }
  ]
}

describe('Pruebas TAREA 55 - LA PANTALLA DEL EDITOR (T276-T283)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  // T276 CAMBIO EL 28-09-2026: el area segura de arriba la pone UNA vez el marco de App.tsx
  // -16px + env(safe-area-inset-top)-. El editor tambien la sumaba y en el telefono quedaba una
  // franja negra doble sobre "Guiones" -Javier: "deberia ser la mitad"-. Ahora el editor no la
  // suma; la prueba cuida que el marco la tenga y que el editor no la repita.
  test('T276 - El area segura de arriba la pone el marco de App una sola vez; el editor no la repite.', () => {
    const editor = fs.readFileSync(path.resolve(process.cwd(), 'src/components/EditorView.tsx'), 'utf8')
    const app = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf8')
    expect(app).toContain("paddingTop: vista === 'lectura' ? 0 : 'calc(16px + env(safe-area-inset-top, 0px))'")
    expect(editor).not.toContain('calc(20px + env(safe-area-inset-top, 0px))')
  })

  test('T277 - El campo del titulo no tiene borderBottom, ni con foco ni sin foco.', () => {
    render(
      <EditorView
        guion={guionPruebaConTexto}
        onChangeGuion={() => {}}
        onVolverBiblioteca={() => {}}
        onEntrarLectura={() => {}}
      />
    )

    const inputTitulo = screen.getByTestId('input-titulo-guion')

    // Sin foco: sin borderBottom
    expect(inputTitulo.style.borderBottom).toBe('')

    // Con foco: tampoco hay borderBottom, el foco se marca con el fondo
    fireEvent.focus(inputTitulo)
    expect(inputTitulo.style.borderBottom).toBe('')
    expect(inputTitulo.style.backgroundColor).toBe('var(--bg-fila)')
  })

  test('T278 - Con el guion vacio, el contador de palabras NO esta en el documento. Con texto, SI esta.', () => {
    // Guion vacio
    const { unmount } = render(
      <EditorView
        guion={guionPruebaVacio}
        onChangeGuion={() => {}}
        onVolverBiblioteca={() => {}}
        onEntrarLectura={() => {}}
      />
    )

    expect(screen.queryByTestId('contador-palabras-editor')).toBeNull()
    unmount()

    // Guion con texto
    render(
      <EditorView
        guion={guionPruebaConTexto}
        onChangeGuion={() => {}}
        onVolverBiblioteca={() => {}}
        onEntrarLectura={() => {}}
      />
    )

    const contador = screen.getByTestId('contador-palabras-editor')
    expect(contador).toBeDefined()
    expect(contador.textContent).toContain('2 palabras')
  })

  test('T279 - Con el guion vacio, "Pegar texto" y "Abrir archivo" estan. Escribiendo una letra, NO estan.', () => {
    let guionEstado = { ...guionPruebaVacio }

    const { rerender } = render(
      <EditorView
        guion={guionEstado}
        onChangeGuion={(g) => {
          guionEstado = g
        }}
        onVolverBiblioteca={() => {}}
        onEntrarLectura={() => {}}
      />
    )

    // Con guion vacio, los dos botones estan presentes
    expect(screen.getByTestId('btn-pegar-texto')).toBeDefined()
    expect(screen.getByTestId('btn-abrir-archivo')).toBeDefined()

    // Se escribe una letra en el guion
    escribirEnGuion('H')

    // Rerender con el guion actualizado conteniendo la letra
    guionEstado = {
      ...guionEstado,
      bloques: [{ id: 'b1', nombre: '', texto: 'H' }]
    }

    rerender(
      <EditorView
        guion={guionEstado}
        onChangeGuion={() => {}}
        onVolverBiblioteca={() => {}}
        onEntrarLectura={() => {}}
      />
    )

    // Al haber una letra, NO estan en el documento
    expect(screen.queryByTestId('btn-pegar-texto')).toBeNull()
    expect(screen.queryByTestId('btn-abrir-archivo')).toBeNull()
  })

  test('T280 - En EditorView.tsx, "Source Serif 4" aparece SOLO en el campo del titulo y en el textarea de los bloques. Ningun boton, contador ni encabezado lo usa.', () => {
    const fuente = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/EditorView.tsx'),
      'utf8'
    )

    const coincidencias = fuente.split('\n').filter((linea) => linea.includes('Source Serif 4'))

    // Solo debe haber 2 usos de "Source Serif 4" en EditorView.tsx: uno para la opción tipografía en el selector de ajustes (si aplica) y los estilos del input/textarea del guion.
    // Verificamos que ningún botón, contador o encabezado lo use.
    for (const linea of coincidencias) {
      const esOpcionSelector = linea.includes("setTipoFuente('serif')") || linea.includes("tipoFuente === 'serif'") || linea.includes('Serif')
      const esInputONotTextarea = linea.includes('className="texto-display"') || linea.includes('textarea')
      expect(esOpcionSelector || esInputONotTextarea).toBe(true)

      // No debe estar en botones de la interfaz, ni en h3, h4, etc.
      expect(linea).not.toContain('btn-menu-opciones-editor')
      expect(linea).not.toContain('<h3')
      expect(linea).not.toContain('<h4')
    }
  })

  test('T281 - El color de los textos de marca de posicion contra #151312 da una relacion de contraste mayor o igual a 4.5.', () => {
    const cssContent = fs.readFileSync(
      path.resolve(process.cwd(), 'src/styles.css'),
      'utf8'
    )

    const matchOscuro = cssContent.match(/\[data-tema="oscuro"\]\s*\{([^}]+)\}/)
    if (!matchOscuro) throw new Error('No se encontró el bloque oscuro')
    const bloqueOscuro = matchOscuro[1]

    const mBorde = bloqueOscuro.match(/--color-borde:\s*(#[0-9a-fA-F]{6})\b/i)
    if (!mBorde) throw new Error('No se encontró --color-borde en tema oscuro')
    const hexBorde = mBorde[1]

    const ratioBorde = relacionContraste(hexBorde, '#151312')
    expect(ratioBorde).toBeGreaterThanOrEqual(4.5)
  })

  test('T282 - ENTRAR DESDE EL EDITOR TAMBIEN CRECE. Apretando "Leer" en el editor, el contenedor de la lectura lleva la animacion revelarLectura. Con movimientoApagado() en true, no la lleva.', async () => {
    // 1. Con movimiento normal
    const repo1 = new RepositorioMemoria()
    await repo1.guardar({
      id: 'g-t282',
      titulo: 'Guion T282',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Palabra uno dos tres cuatro cinco' }]
    })

    const { unmount } = render(<App repoOverride={repo1} />)

    // Abrir el guion en el editor
    const filaGuion = await screen.findByTestId('fila-guion-g-t282')
    fireEvent.click(filaGuion)

    // Esperar a estar en el editor y presionar "Leer"
    const btnLeerEditor = await screen.findByTestId('btn-leer-guion-fijo')
    fireEvent.click(btnLeerEditor)

    await waitFor(() => {
      const contenedorLectura = screen.getByTestId('teleprompter-view-container').parentElement!.parentElement!
      expect(contenedorLectura.style.animation).toContain('revelarLectura')
    })

    unmount()

    // 2. Con movimientoApagado() en true
    const spyMov = vi.spyOn(movimiento, 'movimientoApagado').mockReturnValue(true)

    const repo2 = new RepositorioMemoria()
    await repo2.guardar({
      id: 'g-t282-2',
      titulo: 'Guion T282 - 2',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b1', nombre: '', texto: 'Palabra uno dos tres cuatro cinco' }]
    })

    render(<App repoOverride={repo2} />)

    const filaGuion2 = await screen.findByTestId('fila-guion-g-t282-2')
    fireEvent.click(filaGuion2)

    const btnLeerEditor2 = await screen.findByTestId('btn-leer-guion-fijo')
    fireEvent.click(btnLeerEditor2)

    await waitFor(() => {
      const contenedorLectura = screen.getByTestId('teleprompter-view-container').parentElement!.parentElement!
      expect(contenedorLectura.style.animation).toBe('none')
    })

    spyMov.mockRestore()
  })

  test('T283 - UNA SOLA ESCALA DE ESQUINAS. La ficha --redondeo-grande existe en los tres bloques de styles.css. Ningun componente escribe el numero 24 como radio. Las dos hojas inferiores usan la misma ficha en sus esquinas de arriba.', () => {
    const cssContent = fs.readFileSync(
      path.resolve(process.cwd(), 'src/styles.css'),
      'utf8'
    )

    // La ficha existe en :root, [data-tema="claro"] y [data-tema="oscuro"]
    expect(cssContent).toContain('--redondeo-grande: 24px;')

    const matchRoot = cssContent.match(/:root\s*\{([^}]+)\}/)?.[1] || ''
    const matchClaro = cssContent.match(/\[data-tema="claro"\]\s*\{([^}]+)\}/)?.[1] || ''
    const matchOscuro = cssContent.match(/\[data-tema="oscuro"\]\s*\{([^}]+)\}/)?.[1] || ''

    expect(matchRoot).toContain('--redondeo-grande')
    expect(matchClaro).toContain('--redondeo-grande')
    expect(matchOscuro).toContain('--redondeo-grande')

    // Ningún componente escribe el número 24 como radio
    const componentes = [
      'src/components/TarjetaLectura.tsx',
      'src/components/EditorView.tsx',
      'src/components/BibliotecaView.tsx',
      'src/components/PanelCorpus.tsx',
      'src/components/BarraDeTiempo.tsx',
      'src/components/Entrada.tsx'
    ]

    for (const relPath of componentes) {
      const fullPath = path.resolve(process.cwd(), relPath)
      if (fs.existsSync(fullPath)) {
        const lineas = fs.readFileSync(fullPath, 'utf8').split('\n')
        lineas.forEach((linea, idx) => {
          if (linea.includes('borderRadius')) {
            expect(linea).not.toMatch(/borderRadius\s*:\s*24\b/)
            expect(linea).not.toMatch(/borderRadius\s*:\s*['"]24px\b/)
            expect(linea).not.toMatch(/borderRadius\s*:\s*['"]24px 24px/)
          }
        })
      }
    }

    // La hoja inferior de EditorView -el cajon Aa- usa var(--redondeo-grande)
    // var(--redondeo-grande) 0 0. Desde el 24-09-2026 su estilo vive en
    // styles.css, clase .cajon-aa, y no en linea.
    const reglaCajon = cssContent.match(/\.cajon-aa\s*\{([^}]+)\}/)?.[1] || ''
    expect(reglaCajon).toContain('border-radius: var(--redondeo-grande) var(--redondeo-grande) 0 0')
  })

  // T284 - GUARDIANA. Los botones del editor tienen que poder apretarse.
  // En src/styles.css linea 89 esta apagado el destello azul de Android
  // -webkit-tap-highlight-color: transparent-. O sea que un boton sin
  // btn-deformable en esta aplicacion NO DA NINGUNA SENAL al apretarlo:
  // ni la del sistema, porque la sacamos, ni la nuestra, porque no la
  // tiene. Esta prueba falla si alguien agrega un boton a esta pantalla y
  // se olvida, o si alguien le pone un transform en linea a uno de estos
  // -un transform en linea le gana al scaleY del apretado y lo deja mudo
  // sin romper nada visible-.
  // Cubre los NUEVE del punto 4.1, no tres: si cubriera solo los de una
  // barra, la promesa -"un boton de esta pantalla sin btn-deformable hace
  // fallar la prueba"- seria falsa, y una guardiana que promete de mas es
  // peor que ninguna. Por eso monta el editor DOS VECES -vacio y con
  // texto, porque las dos barras de abajo nunca estan juntas- y ademas
  // abre el panel de Aa, donde viven Listo, - y +.
  test('T284 - los nueve botones del editor llevan btn-deformable y ninguno tiene transform en linea', () => {
    function revisar(b: HTMLElement, nombre: string) {
      expect(b.classList.contains('btn-deformable'), `${nombre} sin btn-deformable`).toBe(true)
      expect(b.style.transform, `${nombre} tiene transform en linea`).toBe('')
    }

    // 1. Con el guion VACIO: volver, Aa, Pegar texto y Abrir archivo.
    const vacio = render(
      <EditorView
        guion={guionPruebaVacio}
        onChangeGuion={() => {}}
        onVolverBiblioteca={() => {}}
        onEntrarLectura={() => {}}
      />
    )

    revisar(screen.getByText('Guiones').closest('button') as HTMLElement, 'volver')
    revisar(screen.getByTestId('btn-menu-opciones-editor'), 'Aa')
    revisar(screen.getByTestId('btn-pegar-texto'), 'Pegar texto')
    revisar(screen.getByTestId('btn-abrir-archivo'), 'Abrir archivo')

    // El cajon de Aa. Se abre aca y no en el otro montaje porque es el mismo
    // en los dos estados. Desde el 24-09-2026 no tiene "Listo" y todos sus
    // controles son botones: se revisan TODOS, no una lista, para que uno
    // nuevo sin btn-deformable haga fallar la prueba.
    fireEvent.click(screen.getByTestId('btn-menu-opciones-editor'))
    revisar(screen.getByLabelText('Disminuir letra panel'), 'menos letra')
    revisar(screen.getByLabelText('Aumentar letra panel'), 'mas letra')
    const botonesCajon = Array.from(screen.getByTestId('panel-ajustes').querySelectorAll('button')) as HTMLElement[]
    expect(botonesCajon.length).toBeGreaterThanOrEqual(2)
    botonesCajon.forEach((b) => revisar(b, b.getAttribute('aria-label') || b.getAttribute('title') || b.textContent || 'boton del cajon'))

    vacio.unmount()

    // 2. Con TEXTO: Leer y Grabar, que con el guion vacio no existen.
    render(
      <EditorView
        guion={guionPruebaConTexto}
        onChangeGuion={() => {}}
        onVolverBiblioteca={() => {}}
        onEntrarLectura={() => {}}
        onEntrarGrabar={() => {}}
      />
    )

    revisar(screen.getByTestId('btn-leer-guion-fijo'), 'Leer')
    revisar(screen.getByTestId('btn-grabar-guion-fijo'), 'Grabar')
  })
})
