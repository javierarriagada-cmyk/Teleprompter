import React from 'react'
import { describe, expect, test } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import TeleprompterView from '../components/TeleprompterView'
import { EditorGuion } from '../components/EditorGuion'
import { PASOS_LETRA } from '../components/estiloLectura'
import { Guion } from '../datos/modelo'

// EL EDITOR CORTA LOS RENGLONES COMO LA LECTURA -editor-ancho-texto, 11-10-2026-.
//
// Medido en el Redmi -392 dp, Aa 32, «Ancho»-: la columna del editor iba de 63 a 330 dp y la de la
// lectura de 32 a 361. Con el mismo ajuste de ancho y la misma pantalla, el ancho de la columna del
// editor tiene que ser igual al de la lectura.
//
// No se mide el layout de jsdom -no dibuja-: se toman los estilos que ponen los dos componentes
// -el relleno de la caja de la pantalla y el ancho máximo de la columna, que salen de
// rellenoLecturaDePie y columnaLectura- y se resuelven con la misma cuenta para una pantalla de
// 392 dp. Si alguno de los dos deja de usar la fuente común, los valores se separan y esto falla.

const PANTALLA = 392

function guion(texto: string): Guion {
  return { id: 'g-ancho', titulo: 'Ancho', idioma: 'es', creado: 0, modificado: 0, bloques: [{ id: 'b-1', nombre: '', texto }] }
}

// Un porcentaje de relleno se toma del ancho de la caja que contiene: en las dos, la pantalla.
function pct(valor: string, base: number): number {
  expect(valor, `relleno sin porcentaje: "${valor}"`).toMatch(/^[0-9.]+%$/)
  return (parseFloat(valor) / 100) * base
}

// El ancho y el borde izquierdo de la columna, con la misma cuenta para las dos pantallas. Los ch
// se pasan a px con un ancho de letra cualquiera, el mismo para las dos: lo que se compara es que
// salgan del mismo estilo.
function columna(relleno: { izq: string; der: string }, col: HTMLElement) {
  const izq = pct(relleno.izq, PANTALLA)
  const adentro = PANTALLA - izq - pct(relleno.der, PANTALLA)
  const tope = col.style.maxWidth
  // Antes: const ancho = tope.endsWith('%')
  // Antes:   ? (parseFloat(tope) / 100) * adentro
  // Antes:   : Math.min(parseFloat(tope) * parseFloat(col.style.fontSize) * 0.5, adentro)
  let ancho: number
  if (tope.endsWith('%')) {
    ancho = (parseFloat(tope) / 100) * adentro
  } else if (tope.startsWith('min(')) {
    const font = parseFloat(col.style.fontSize)
    const ch14_5 = 14.5 * 0.5 * font
    const ch22 = 22 * 0.5 * font
    const pct61 = 0.61 * adentro
    const pct78_5 = 0.785 * adentro
    const clampVal = Math.min(ch22, Math.max(ch14_5, pct61))
    ancho = Math.min(pct78_5, clampVal)
  } else {
    ancho = Math.min(parseFloat(tope) * parseFloat(col.style.fontSize) * 0.5, adentro)
  }
  expect(col.style.margin).toBe('0px auto')
  return { izq: izq + (adentro - ancho) / 2, ancho, textAlign: col.style.textAlign, fontSize: col.style.fontSize }
}

const ANCHOS = [
  { nombre: 'Ancho', columnaAngosta: false, marginPercent: 5 },
  { nombre: 'Medio', columnaAngosta: false, marginPercent: 12 },
  { nombre: 'Angosto', columnaAngosta: true, marginPercent: 5 }
]

describe('editor-ancho-texto: la columna del editor es la de la lectura', () => {
  for (const a of ANCHOS) {
    for (const fontSize of PASOS_LETRA) {
      test(`ancho «${a.nombre}», Aa ${fontSize}: misma pantalla, mismo ancho de columna en el editor y en la lectura`, () => {
        const lectura = render(
          <TeleprompterView script={guion('Hoy les quiero contar por qué empecé a grabar.')} currentLineIndex={0} currentWordIndex={0}
            fontSize={fontSize} marginPercent={a.marginPercent} columnaAngosta={a.columnaAngosta} />
        )
        const cont = lectura.container.querySelector('[data-testid="contenedor-lectura"]') as HTMLElement
        const colLectura = lectura.container.querySelector('[data-testid="columna-texto"]') as HTMLElement
        const enLectura = columna({ izq: cont.style.paddingLeft, der: cont.style.paddingRight }, colLectura)
        cleanup()

        const editor = render(
          <EditorGuion texto="Hoy les quiero contar por qué empecé a grabar." tramos={[]} onCambio={() => {}} onSeleccion={() => {}}
            editorRef={{ current: null }} placeholder="" fontSize={fontSize} tipoFuente="sans" colorFondo="#000000" colorLetra="#FFFFFF"
            columnaAngosta={a.columnaAngosta} marginPercent={a.marginPercent} />
        )
        const hoja = editor.getByTestId('hoja-editor')
        const cajaPantalla = hoja.firstElementChild as HTMLElement
        const cajaRelleno = cajaPantalla.firstElementChild as HTMLElement
        const colEditor = cajaRelleno.firstElementChild as HTMLElement
        // El relleno se toma de la caja que lo contiene: en el editor, una caja del ancho de la
        // pantalla, como la capa fija de la lectura.
        expect(cajaPantalla.style.width).toBe('100vw')
        expect(cajaPantalla.style.marginLeft).toBe('calc(50% - 50vw)')
        expect(hoja.className).toContain('hoja-editor-de-pie')
        const enEditor = columna({ izq: cajaRelleno.style.paddingLeft, der: cajaRelleno.style.paddingRight }, colEditor)
        cleanup()

        expect(enEditor.ancho).toBeCloseTo(enLectura.ancho, 6)
        expect(enEditor.izq).toBeCloseTo(enLectura.izq, 6)
        expect(enEditor.textAlign).toBe(enLectura.textAlign)
        expect(enEditor.fontSize).toBe(enLectura.fontSize)
        // El caso medido: «Ancho» en 392 da la columna de la lectura, de 32 a 361 dp.
        if (a.nombre === 'Ancho') {
          expect(Math.round(enEditor.izq)).toBe(32)
          expect(Math.round(enEditor.izq + enEditor.ancho)).toBe(360)
        }
      })
    }
  }
})
