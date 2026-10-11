import React from 'react'
import { describe, expect, test } from 'vitest'
// Antes: import { render, cleanup } from '@testing-library/react'
// -segunda vuelta- act, para escribir y pegar en el editor.
import { render, cleanup, act } from '@testing-library/react'
import type { Editor } from '@tiptap/react'
import TeleprompterView from '../components/TeleprompterView'
import { EditorGuion } from '../components/EditorGuion'
import { PASOS_LETRA, columnaLectura, rellenoLecturaDePie } from '../components/estiloLectura'
// Antes: import { cortarRenglones, ModoEspacios, SANGRIA_PRIMERA_LINEA_PX, ESPACIOS_LECTURA, ESPACIOS_EDITOR } from '../lib/cortesDeRenglon'
// -segunda vuelta- también el margen de las acotaciones y las ligaduras.
import { cortarRenglones, ModoEspacios, SANGRIA_PRIMERA_LINEA_PX, ESPACIOS_LECTURA, ESPACIOS_EDITOR, MARGEN_ACOTACION_PX, LIGADURAS_TEXTO } from '../lib/cortesDeRenglon'
import { Guion } from '../datos/modelo'

// EL EDITOR CORTA LOS RENGLONES EN LA MISMA PALABRA QUE LA LECTURA -editor-ancho-texto, 11-10-2026-.
//
// Con la columna ya igual -editorAnchoTexto.test.tsx-, Aa 42 «Ancho» y Aa 32 «Medio» seguían cortando
// distinto: el editor traía white-space: break-spaces -el espacio del final del renglón ocupa lugar- y
// no tenía la sangría de 14 de la primera línea. jsdom no dibuja, así que esto es lógica: las reglas
// que ponen de verdad los dos componentes -cómo tratan los espacios y cuánto entra la primera línea-
// se leen de lo que dibujan, y con ellas cortarRenglones arma los renglones con una medida de letras
// fija. No se mide ninguna posición.

const PANTALLA = 392
const TEXTO = 'Hoy les quiero contar por qué empecé a grabar mis propios videos y lo que aprendí en el camino.\n\nAl principio leía todo desde el papel y se notaba que miraba hacia abajo cada pocos segundos.'

// Una medida de letras fija, en em: angostas, anchas, mayúsculas y el espacio.
function medir(trozo: string, letra: number): number {
  let em = 0
  for (const c of trozo) {
    if (c === ' ') em += 0.25
    else if ('iíjlrtf.,'.includes(c)) em += 0.3
    else if ('mw'.includes(c)) em += 0.8
    else if (c !== c.toLowerCase()) em += 0.65
    else em += 0.52
  }
  return em * letra
}

// El ancho de la columna de pie, con las mismas funciones que usan los dos lados. La angosta -22ch-
// se pasa a px con el ancho del 0 de esta medida -0,52 em-.
function anchoColumna(marginPercent: number, columnaAngosta: boolean, letra: number): number {
  const r = rellenoLecturaDePie(marginPercent)
  const adentro = PANTALLA * (1 - parseFloat(r.paddingLeft) / 100 - parseFloat(r.paddingRight) / 100)
  const tope = columnaLectura(columnaAngosta).maxWidth
  return tope.endsWith('%') ? (parseFloat(tope) / 100) * adentro : Math.min(parseFloat(tope) * 0.52 * letra, adentro)
}

function guion(texto: string): Guion {
  return { id: 'g-cortes', titulo: 'Cortes', idioma: 'es', creado: 0, modificado: 0, bloques: [{ id: 'b-1', nombre: '', texto }] }
}

// Las reglas de la lectura, como las dibuja: el white-space de sus renglones -sin estilo propio es
// normal- y el text-indent de la primera línea.
function reglasLectura(letra: number): { espacios: ModoEspacios; sangria: number } {
  const v = render(<TeleprompterView script={guion(TEXTO)} currentLineIndex={0} currentWordIndex={0} fontSize={letra} marginPercent={5} columnaAngosta={false} />)
  const lineas = v.container.querySelectorAll<HTMLElement>('.line')
  const espacios = (lineas[0].style.whiteSpace || 'normal') as ModoEspacios
  const sangria = parseFloat(lineas[0].style.textIndent || '0')
  // Solo la primera línea entra.
  expect(lineas[1].style.textIndent).toBe('')
  cleanup()
  return { espacios, sangria }
}

// Las del editor, como las dibuja: el white-space en línea de .editor-guion, y la sangría que lleva
// el primer párrafo con texto -su clase y la variable de la columna-.
function reglasEditor(letra: number): { espacios: ModoEspacios; sangria: number } {
  const v = render(
    <EditorGuion texto={'\n' + TEXTO} tramos={[]} onCambio={() => {}} onSeleccion={() => {}} editorRef={{ current: null }} placeholder=""
      fontSize={letra} tipoFuente="sans" colorFondo="#000000" colorLetra="#FFFFFF" columnaAngosta={false} marginPercent={5} />
  )
  const pm = v.getByTestId('editor-guion')
  const espacios = pm.style.whiteSpace as ModoEspacios
  const parrafos = pm.querySelectorAll('p')
  // El párrafo vacío del comienzo no lleva sangría; el primero con texto sí, y ninguno más.
  expect(parrafos[0].classList.contains('primera-linea-guion')).toBe(false)
  expect(parrafos[1].classList.contains('primera-linea-guion')).toBe(true)
  expect(pm.querySelectorAll('.primera-linea-guion')).toHaveLength(1)
  const columna = pm.closest<HTMLElement>('[style*="--sangria-primera-linea"]')!
  const sangria = parseFloat(columna.style.getPropertyValue('--sangria-primera-linea'))
  cleanup()
  return { espacios, sangria }
}

const ANCHOS = [
  { nombre: 'Ancho', columnaAngosta: false, marginPercent: 5 },
  { nombre: 'Medio', columnaAngosta: false, marginPercent: 12 },
  { nombre: 'Angosto', columnaAngosta: true, marginPercent: 5 }
]

describe('editor-ancho-texto: el editor corta los renglones como la lectura', () => {
  test('las reglas: la lectura junta los espacios, el editor usa pre-wrap, y los dos entran 14 la primera línea', () => {
    const l = reglasLectura(32)
    const e = reglasEditor(32)
    expect(l).toEqual({ espacios: ESPACIOS_LECTURA, sangria: SANGRIA_PRIMERA_LINEA_PX })
    expect(e).toEqual({ espacios: ESPACIOS_EDITOR, sangria: SANGRIA_PRIMERA_LINEA_PX })
    expect(e.espacios).toBe('pre-wrap')
    expect(SANGRIA_PRIMERA_LINEA_PX).toBe(14)
  })

  test('cortarRenglones: el espacio del final no ocupa lugar, salvo con break-spaces, y la primera línea entra la sangría', () => {
    const letra = 10
    // «aa bb»: 0,52·2 + 0,25 + 0,52·2 = 2,33 em = 23,3 px. Cabe justo en 23,3 aunque siga un espacio.
    const o = { ancho: medir('aa bb', letra), letra, sangriaPrimeraLinea: 0, medir }
    expect(cortarRenglones('aa bb cc', { ...o, espacios: 'normal' })).toEqual(['aa bb', 'cc'])
    expect(cortarRenglones('aa bb cc', { ...o, espacios: 'pre-wrap' })).toEqual(['aa bb', 'cc'])
    expect(cortarRenglones('aa bb cc', { ...o, espacios: 'break-spaces' })).toEqual(['aa', 'bb cc'])
    // Con la sangría, «bb» ya no cabe en el primer renglón; en el segundo no hay sangría.
    expect(cortarRenglones('aa bb cc', { ...o, espacios: 'normal', sangriaPrimeraLinea: SANGRIA_PRIMERA_LINEA_PX })).toEqual(['aa', 'bb cc'])
    // La sangría va en la primera línea con texto, aunque antes haya una en blanco.
    expect(cortarRenglones('\naa bb cc', { ...o, espacios: 'pre-wrap', sangriaPrimeraLinea: SANGRIA_PRIMERA_LINEA_PX })).toEqual(['aa', 'bb cc'])
  })

  const lectura = new Map<number, { espacios: ModoEspacios; sangria: number }>()
  const editor = new Map<number, { espacios: ModoEspacios; sangria: number }>()
  for (const letra of PASOS_LETRA) {
    for (const a of ANCHOS) {
      test(`«${a.nombre}», Aa ${letra}: los mismos renglones en el editor y en la lectura`, () => {
        if (!lectura.has(letra)) lectura.set(letra, reglasLectura(letra))
        if (!editor.has(letra)) editor.set(letra, reglasEditor(letra))
        const l = lectura.get(letra)!
        const e = editor.get(letra)!
        const ancho = anchoColumna(a.marginPercent, a.columnaAngosta, letra)
        const enLectura = cortarRenglones(TEXTO, { ancho, letra, medir, espacios: l.espacios, sangriaPrimeraLinea: l.sangria })
        const enEditor = cortarRenglones(TEXTO, { ancho, letra, medir, espacios: e.espacios, sangriaPrimeraLinea: e.sangria })
        expect(enEditor).toEqual(enLectura)

        // Los dos casos que Javier vio distintos: con el white-space de antes del editor -break-spaces-
        // los cortes no coinciden, aunque la sangría sea la misma. Es el espacio del final.
        if ((a.nombre === 'Ancho' && letra === 42) || (a.nombre === 'Medio' && letra === 32)) {
          const antes = cortarRenglones(TEXTO, { ancho, letra, medir, espacios: 'break-spaces', sangriaPrimeraLinea: e.sangria })
          expect(antes).not.toEqual(enLectura)
        }
      })
    }
  }
})

// SEGUNDA VUELTA -11-10-2026, aprobada por Javier-: las tres diferencias que quedaban. Las acotaciones
// con el mismo margen, las ligaduras apagadas en los dos y los espacios repetidos juntados en el editor.

function editorDePrueba(texto: string) {
  const guardado = { texto }
  const ref: { current: Editor | null } = { current: null }
  const v = render(
    <EditorGuion texto={texto} tramos={[]} onCambio={(t) => { guardado.texto = t }} onSeleccion={() => {}} editorRef={ref} placeholder=""
      fontSize={32} tipoFuente="sans" colorFondo="#000000" colorLetra="#FFFFFF" columnaAngosta={false} marginPercent={5} />
  )
  return { v, guardado, editor: ref.current! }
}

describe('editor-ancho-texto, segunda vuelta: acotaciones, ligaduras y espacios', () => {
  test('una acotación cerca del borde baja en los dos: el mismo margen a cada lado en el editor y en la lectura', () => {
    const texto = 'Hola (pausa) sigo'
    const lec = render(<TeleprompterView script={guion(texto)} currentLineIndex={0} currentWordIndex={0} fontSize={32} marginPercent={5} columnaAngosta={false} />)
    const span = lec.container.querySelector<HTMLElement>('.acotacion-lectura')!
    const margenLectura = parseFloat(span.style.marginLeft)
    expect(span.style.marginRight).toBe(span.style.marginLeft)
    cleanup()

    const { editor } = editorDePrueba(texto)
    const pm = editor.view.dom as HTMLElement
    const izq = pm.querySelector<HTMLElement>('[style*="margin-left"]')!
    const der = pm.querySelector<HTMLElement>('[style*="margin-right"]')!
    // El margen va en la primera y en la última letra de la acotación, no en cada corte de formato.
    expect(izq.textContent).toBe('(')
    expect(der.textContent).toBe(')')
    const margenEditor = parseFloat(izq.style.marginLeft)
    expect(parseFloat(der.style.marginRight)).toBe(margenEditor)
    cleanup()

    expect(margenLectura).toBe(MARGEN_ACOTACION_PX)
    expect(margenEditor).toBe(MARGEN_ACOTACION_PX)

    // «Hola (pausa)» cabe justo sin margen y no con los 2 + 2 px: la acotación baja.
    const letra = 32
    const o = { ancho: medir('Hola (pausa)', letra) + 2, letra, medir, sangriaPrimeraLinea: 0 }
    const enLectura = cortarRenglones(texto, { ...o, espacios: ESPACIOS_LECTURA, margenAcotacion: margenLectura })
    const enEditor = cortarRenglones(texto, { ...o, espacios: ESPACIOS_EDITOR, margenAcotacion: margenEditor })
    expect(enLectura).toEqual(['Hola', '(pausa) sigo'])
    expect(enEditor).toEqual(enLectura)
    // Antes, sin margen en el editor, la acotación se quedaba arriba.
    expect(cortarRenglones(texto, { ...o, espacios: ESPACIOS_EDITOR, margenAcotacion: 0 })).toEqual(['Hola (pausa)', 'sigo'])
  })

  test('las ligaduras: la misma propiedad y el mismo valor en la lectura y en el editor', () => {
    const lec = render(<TeleprompterView script={guion(TEXTO)} currentLineIndex={0} currentWordIndex={0} fontSize={32} marginPercent={5} columnaAngosta={false} />)
    const enLectura = lec.getByTestId('columna-texto').style.fontVariantLigatures
    cleanup()
    const { editor } = editorDePrueba(TEXTO)
    const enEditor = (editor.view.dom as HTMLElement).style.fontVariantLigatures
    cleanup()
    expect(enLectura).toBe(LIGADURAS_TEXTO)
    expect(enEditor).toBe(LIGADURAS_TEXTO)
    expect(LIGADURAS_TEXTO).toBe('none')
  })

  test('dos o más espacios seguidos quedan en uno al escribir y al pegar, sin tocar los párrafos, y cortan como la lectura', () => {
    const { editor, guardado } = editorDePrueba('Hola')
    const vista = editor.view
    // Escribir letra por letra, como el teclado: cada letra pasa por handleTextInput.
    const escribir = (t: string) => {
      for (const c of t) {
        act(() => {
          const { from, to } = vista.state.selection
          const deflt = () => vista.state.tr.insertText(c, from, to)
          const hecho = vista.someProp('handleTextInput', (f) => f(vista, from, to, c, deflt))
          if (!hecho) vista.dispatch(deflt())
        })
      }
    }
    act(() => { editor.commands.setTextSelection(vista.state.doc.content.size - 1) })
    escribir('  ,  hoy   les  quiero')
    expect(guardado.texto).toBe('Hola , hoy les quiero')

    // jsdom no tiene ClipboardEvent: va un evento de pegar común.
    // Pegar texto: los espacios repetidos se juntan, también contra el espacio que ya estaba, y los
    // saltos de línea quedan como párrafos -la línea en blanco también-.
    escribir(' ')
    act(() => { vista.pasteText('  contar   por qué\n\nempecé  a    grabar mis propios videos', new Event('paste') as ClipboardEvent) })
    expect(guardado.texto).toBe('Hola , hoy les quiero contar por qué\n\nempecé a grabar mis propios videos')
    expect(guardado.texto).not.toMatch(/ {2,}/)
    cleanup()

    // Lo guardado corta igual en el editor -pre-wrap- que en la lectura -normal-, con cualquier ancho.
    for (const a of ANCHOS) {
      for (const letra of PASOS_LETRA) {
        const ancho = anchoColumna(a.marginPercent, a.columnaAngosta, letra)
        const o = { ancho, letra, medir, sangriaPrimeraLinea: SANGRIA_PRIMERA_LINEA_PX, margenAcotacion: MARGEN_ACOTACION_PX }
        expect(cortarRenglones(guardado.texto, { ...o, espacios: ESPACIOS_EDITOR })).toEqual(cortarRenglones(guardado.texto, { ...o, espacios: ESPACIOS_LECTURA }))
      }
    }
  })
})
