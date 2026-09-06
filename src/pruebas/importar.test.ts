import React from 'react'
import { describe, expect, test } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import 'fake-indexeddb/auto'
import { importarTexto } from '../datos/importar'
import EditorView from '../components/EditorView'
import { Guion } from '../datos/modelo'

describe('Pruebas TAREA 6 - Importar y dar forma al guion (T40-T45)', () => {

  // T40: texto vacío o solo espacios devuelve []
  test('T40: texto vacío o solo espacios devuelve []', () => {
    expect(importarTexto('')).toEqual([])
    expect(importarTexto('   ')).toEqual([])
    expect(importarTexto('\n\n  \t \n')).toEqual([])
  })

  // T41: separación por párrafos y tratamiento de 3+ líneas en blanco
  test('T41: un solo párrafo devuelve 1 bloque; 3+ líneas en blanco cuentan como 1 separador', () => {
    const unParrafo = 'Este es un único párrafo sin saltos de línea dobles.'
    const res1 = importarTexto(unParrafo)
    expect(res1.length).toBe(1)
    expect(res1[0].nombre).toBe('')

    const tresParrafosConMuchasLineas = `Primer párrafo de texto.


Segundo párrafo separado por dos saltos.




Tercer párrafo separado por cuatro saltos.`

    const res2 = importarTexto(tresParrafosConMuchasLineas)
    expect(res2.length).toBe(3)
    expect(res2[0].texto).toContain('Primer párrafo')
    expect(res2[1].texto).toContain('Segundo párrafo')
    expect(res2[2].texto).toContain('Tercer párrafo')
  })

  // T42: largo de líneas max 42 caracteres y palabras largas no se parten
  test('T42: líneas no superan el límite de caracteres salvo cuando una palabra es más larga que el límite', () => {
    const textoLargo = 'Esta es una frase bastante larga que definitivamente superará el límite de cuarenta y dos caracteres si no se divide en múltiples líneas de texto.'
    const res = importarTexto(textoLargo, 42)
    expect(res.length).toBe(1)

    const lineas = res[0].texto.split('\n')
    expect(lineas.length).toBeGreaterThan(1)
    for (const linea of lineas) {
      expect(linea.length).toBeLessThanOrEqual(42)
    }

    const palabraSuperLarga = 'SupercalifragilisticoespialidosoExtraordinariamenteLargoSinEspacios'
    const textoConPalabraLarga = `Inicio de frase ${palabraSuperLarga} fin de frase`
    const resPalabraLarga = importarTexto(textoConPalabraLarga, 42)
    expect(resPalabraLarga.length).toBe(1)

    const lineasPalabraLarga = resPalabraLarga[0].texto.split('\n')
    expect(lineasPalabraLarga).toContain(palabraSuperLarga)
  })

  // T43: líneas que ya son cortas se respetan, no se juntan entre sí
  test('T43: líneas cortas existentes se respetan y no se unen', () => {
    const textoConLineasCortas = `Línea uno
Línea dos
Línea tres`

    const res = importarTexto(textoConLineasCortas, 42)
    expect(res.length).toBe(1)
    const lineas = res[0].texto.split('\n')
    expect(lineas.length).toBe(3)
    expect(lineas[0]).toBe('Línea uno')
    expect(lineas[1]).toBe('Línea dos')
    expect(lineas[2]).toBe('Línea tres')
  })

  // T44: acotaciones entre corchetes no se parten; corchete abierto sin cerrar no lanza
  test('T44: acotación entre corchetes no se parte entre líneas y corchete sin cerrar no lanza', () => {
    const textoConAcotacion = 'Texto previo a la acotación que ocupa casi todo el ancho de línea [mirar a la camara de frente] y texto posterior.'
    const res = importarTexto(textoConAcotacion, 42)
    expect(res.length).toBe(1)

    const lineas = res[0].texto.split('\n')
    const lineaConAcotacion = lineas.find((l) => l.includes('[mirar a la camara de frente]'))
    expect(lineaConAcotacion).not.toBeUndefined()
    expect(lineaConAcotacion).toContain('[mirar a la camara de frente]')
    // Verificar que ninguna línea rompió los corchetes
    for (const l of lineas) {
      if (l.includes('[')) {
        expect(l).toContain(']')
      }
    }

    const textoCorcheteSinCerrar = 'Texto normal [acotacion abierta sin cerrar al final'
    let resSinCerrar: ReturnType<typeof importarTexto> = []
    expect(() => {
      resSinCerrar = importarTexto(textoCorcheteSinCerrar, 42)
    }).not.toThrow()
    expect(resSinCerrar.length).toBe(1)
    expect(resSinCerrar[0].texto).toContain('[acotacion')
  })

  // T45: Integración UI en EditorView con botón "Pegar texto" y acumulación de bloques
  test('T45: el botón Pegar texto en EditorView agrega los bloques al final sin reemplazar los existentes', async () => {
    let guionEstado: Guion = {
      id: 'g-t45',
      titulo: 'Guion T45',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [
        { id: 'b-existente', nombre: 'Bloque previo', texto: 'Contenido del bloque previo' }
      ]
    }

    const handleChangeGuion = (nuevoGuion: Guion) => {
      guionEstado = nuevoGuion
    }

    render(
      React.createElement(EditorView, {
        guion: guionEstado,
        onChangeGuion: handleChangeGuion,
        onVolverBiblioteca: () => {},
        onEntrarLectura: () => {}
      })
    )

    // Abrir la interfaz de pegar texto
    const btnPegar = Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'Pegar texto')
    expect(btnPegar).not.toBeUndefined()

    await act(async () => {
      fireEvent.click(btnPegar!)
    })

    // Intentar aceptar con texto vacío o solo espacios
    const btnAceptar = Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'Aceptar e importar')
    expect(btnAceptar).not.toBeUndefined()

    await act(async () => {
      fireEvent.click(btnAceptar!)
    })

    // Debe mostrar un aviso en pantalla y no modificar el guion
    expect(document.body.textContent).toContain('El texto pegado está vacío')
    expect(guionEstado.bloques.length).toBe(1)

    // Pegar texto válido con 2 párrafos
    const textarea = document.querySelector('textarea[placeholder="Pega aquí el texto completo..."]') as HTMLTextAreaElement
    expect(textarea).not.toBeNull()

    const textoParaPegar = `Primer párrafo importado.

Segundo párrafo importado.`

    await act(async () => {
      fireEvent.change(textarea, { target: { value: textoParaPegar } })
    })

    await act(async () => {
      fireEvent.click(btnAceptar!)
    })

    // Debe haber agregado los 2 bloques al bloque existente (total = 3 bloques)
    expect(guionEstado.bloques.length).toBe(3)
    expect(guionEstado.bloques[0].id).toBe('b-existente')
    expect(guionEstado.bloques[1].texto).toBe('Primer párrafo importado.')
    expect(guionEstado.bloques[2].texto).toBe('Segundo párrafo importado.')
  })

})
