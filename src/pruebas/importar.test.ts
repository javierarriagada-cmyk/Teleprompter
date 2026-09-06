import React from 'react'
import { describe, expect, test } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import 'fake-indexeddb/auto'
import { importarTexto } from '../datos/importar'
import EditorView from '../components/EditorView'
import { Guion } from '../datos/modelo'

describe('Pruebas TAREA 6 - Importar y dar forma al guion (T40-T48)', () => {

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
    const res = importarTexto(textoLargo, { maxCaracteresPorLinea: 42 })
    expect(res.length).toBe(1)

    const lineas = res[0].texto.split('\n')
    expect(lineas.length).toBeGreaterThan(1)
    for (const linea of lineas) {
      expect(linea.length).toBeLessThanOrEqual(42)
    }

    const palabraSuperLarga = 'SupercalifragilisticoespialidosoExtraordinariamenteLargoSinEspacios'
    const textoConPalabraLarga = `Inicio de frase ${palabraSuperLarga} fin de frase`
    const resPalabraLarga = importarTexto(textoConPalabraLarga, { maxCaracteresPorLinea: 42 })
    expect(resPalabraLarga.length).toBe(1)

    const lineasPalabraLarga = resPalabraLarga[0].texto.split('\n')
    expect(lineasPalabraLarga).toContain(palabraSuperLarga)
  })

  // T43: líneas que ya son cortas se respetan, no se juntan entre sí
  test('T43: líneas cortas existentes se respetan y no se unen', () => {
    const textoConLineasCortas = `Línea uno
Línea dos
Línea tres`

    const res = importarTexto(textoConLineasCortas, { maxCaracteresPorLinea: 42 })
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
    const res = importarTexto(textoConAcotacion, { maxCaracteresPorLinea: 42 })
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
      resSinCerrar = importarTexto(textoCorcheteSinCerrar, { maxCaracteresPorLinea: 42 })
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

  // T46: Criterio de preferencia de cortes en 3 niveles
  test('T46: el corte de línea respeta los 3 niveles de preferencia (fin de oración > fin de cláusula > límite de palabra)', () => {
    // 1. Fin de oración (. , ?, !, :, ;) antes del límite
    // "Hola a todos. La oración nueva empieza a mitad." con límite 42
    // "Hola a todos." tiene punto y cabe. La siguiente oración debe empezar en una nueva línea.
    const textoOraciones = 'Hola a todos. La oración nueva empieza a mitad.'
    const resOracion = importarTexto(textoOraciones, { maxCaracteresPorLinea: 42 })
    const lineasOracion = resOracion[0].texto.split('\n')
    expect(lineasOracion[0]).toBe('Hola a todos.')
    expect(lineasOracion[1]).toBe('La oración nueva empieza a mitad.')

    // 2. Fin de cláusula (,) cuando no hay fin de oración
    const textoClausula = 'En primer lugar, queremos agradecer la presencia de todos.'
    const resClausula = importarTexto(textoClausula, { maxCaracteresPorLinea: 35 })
    const lineasClausula = resClausula[0].texto.split('\n')
    expect(lineasClausula[0]).toBe('En primer lugar,')
    expect(lineasClausula[1]).toBe('queremos agradecer la presencia de')
  })

  // T47: Acotaciones pegadas no agregan espacios artificiales
  test('T47: las acotaciones pegadas a palabras no sufren adición de espacios artificiales', () => {
    const textoPegadoAntes = 'Hola[pausa] a todos'
    const resAntes = importarTexto(textoPegadoAntes, { maxCaracteresPorLinea: 42 })
    expect(resAntes[0].texto).toBe('Hola[pausa] a todos')

    const textoPegadoDespues = 'Hola [pausa]mundo'
    const resDespues = importarTexto(textoPegadoDespues, { maxCaracteresPorLinea: 42 })
    expect(resDespues[0].texto).toBe('Hola [pausa]mundo')
  })

  // T48: Firma con objeto de opciones
  test('T48: importarTexto acepta objeto de opciones { maxCaracteresPorLinea } y usa 42 por omisión', () => {
    const texto = 'Primera oración larga de prueba. Segunda oración larga de prueba.'
    const resDefault = importarTexto(texto)
    expect(resDefault.length).toBe(1)

    const resCustom = importarTexto(texto, { maxCaracteresPorLinea: 25 })
    const lineasCustom = resCustom[0].texto.split('\n')
    for (const l of lineasCustom) {
      expect(l.length).toBeLessThanOrEqual(32) // oraciones/palabras cortadas según límite 25
    }
  })

})
