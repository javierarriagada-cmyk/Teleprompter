import { beforeEach, describe, expect, test } from 'vitest'
import { PALABRAS_MINIMAS_PARA_DETECTAR } from '../lib/detectarIdioma'
import {
  abrirMarcaSiCorresponde,
  debeMostrarMarcaIdioma,
  debeMostrarMarcaPalma,
  debeMostrarMarcaRecuadro,
  esGuionHola,
  hayMarcaEnSesion,
  liberarMarcaEnSesion,
  marcaYaVista,
  marcarComoVista,
  reiniciarMarcasGuiaParaPruebas
} from '../lib/marcasGuia'

// Tarea 105 PASO 2: solo lógica de las marcas de guía. Nada de posiciones.
describe('marcasGuia', () => {
  beforeEach(() => {
    reiniciarMarcasGuiaParaPruebas()
  })

  test('el Hola se reconoce por id bienvenida- y por el molde b-bienvenida-1', () => {
    expect(esGuionHola('bienvenida-123')).toBe(true)
    expect(esGuionHola('bienvenida-')).toBe(true)
    // El id de bloque solo, pasado como id de guion, no alcanza.
    expect(esGuionHola('b-bienvenida-1')).toBe(false)
    // El molde en los bloques sí identifica al Hola.
    expect(esGuionHola('g-copiado', ['b-bienvenida-1'])).toBe(true)
    expect(esGuionHola('g-otro', ['b-otro'])).toBe(false)
    expect(esGuionHola(null)).toBe(false)
  })

  test('cada marca sale una vez y no vuelve tras Entendido', () => {
    const comunes = {
      idGuion: 'g-1',
      enLecturaOToma: false,
      hayAvisoVoz: false,
      hayDialogoPermiso: false
    }
    expect(
      debeMostrarMarcaIdioma({
        yaVista: false,
        disparo: 'pegar',
        palabras: 3,
        umbralPalabras: PALABRAS_MINIMAS_PARA_DETECTAR,
        ...comunes
      })
    ).toBe(true)
    expect(abrirMarcaSiCorresponde('idioma', true)).toBe(true)
    expect(marcaYaVista('idioma')).toBe(false)
    expect(hayMarcaEnSesion()).toBe(true)
    marcarComoVista('idioma')
    expect(marcaYaVista('idioma')).toBe(true)
    expect(
      debeMostrarMarcaIdioma({
        yaVista: marcaYaVista('idioma'),
        disparo: 'pegar',
        palabras: 20,
        umbralPalabras: PALABRAS_MINIMAS_PARA_DETECTAR,
        ...comunes
      })
    ).toBe(false)
    expect(abrirMarcaSiCorresponde('idioma', true)).toBe(false)
  })

  test('desmontar con la marca a la vista no la marca como vista ni gasta la sesión', () => {
    expect(abrirMarcaSiCorresponde('idioma', true)).toBe(true)
    expect(marcaYaVista('idioma')).toBe(false)
    expect(hayMarcaEnSesion()).toBe(true)
    liberarMarcaEnSesion()
    expect(marcaYaVista('idioma')).toBe(false)
    expect(hayMarcaEnSesion()).toBe(false)
    expect(abrirMarcaSiCorresponde('idioma', true)).toBe(true)
  })

  test('tocar afuera no la marca como vista', () => {
    expect(abrirMarcaSiCorresponde('idioma', true)).toBe(true)
    expect(marcaYaVista('idioma')).toBe(false)
    // Simula onCerrar('afuera'): libera sesión sin marcar vista.
    liberarMarcaEnSesion()
    expect(marcaYaVista('idioma')).toBe(false)
    expect(hayMarcaEnSesion()).toBe(false)
    // Vuelve la próxima vez que se haga la acción.
    expect(abrirMarcaSiCorresponde('idioma', true)).toBe(true)
  })

  test('Entendido y el control sí la marcan como vista', () => {
    expect(abrirMarcaSiCorresponde('recuadro', true)).toBe(true)
    expect(marcaYaVista('recuadro')).toBe(false)
    marcarComoVista('recuadro')
    expect(marcaYaVista('recuadro')).toBe(true)
    expect(abrirMarcaSiCorresponde('recuadro', true)).toBe(false)

    reiniciarMarcasGuiaParaPruebas()
    // Usar el control sin haber abierto: también gasta.
    marcarComoVista('idioma')
    expect(marcaYaVista('idioma')).toBe(true)
    expect(abrirMarcaSiCorresponde('idioma', true)).toBe(false)
  })

  test('una sola marca por sesión: la segunda espera', () => {
    const comunes = {
      idGuion: 'g-1',
      enLecturaOToma: false,
      hayAvisoVoz: false,
      hayDialogoPermiso: false
    }
    expect(abrirMarcaSiCorresponde('idioma', true)).toBe(true)
    expect(
      debeMostrarMarcaRecuadro({
        yaVista: false,
        fondoEsRecuadro: true,
        estadoListo: true,
        yaArrastro: false,
        ...comunes
      })
    ).toBe(false)
    expect(abrirMarcaSiCorresponde('recuadro', true)).toBe(false)
  })

  test('no sale sobre el Hola', () => {
    const base = {
      yaVista: false,
      enLecturaOToma: false,
      hayAvisoVoz: false,
      hayDialogoPermiso: false
    }
    expect(
      debeMostrarMarcaIdioma({
        ...base,
        idGuion: 'bienvenida-99',
        disparo: 'pegar',
        palabras: 20,
        umbralPalabras: PALABRAS_MINIMAS_PARA_DETECTAR
      })
    ).toBe(false)
    expect(
      debeMostrarMarcaIdioma({
        ...base,
        idGuion: 'g-copiado',
        idsBloques: ['b-bienvenida-1'],
        disparo: 'pegar',
        palabras: 20,
        umbralPalabras: PALABRAS_MINIMAS_PARA_DETECTAR
      })
    ).toBe(false)
    expect(
      debeMostrarMarcaRecuadro({
        ...base,
        idGuion: 'bienvenida-1',
        fondoEsRecuadro: true,
        estadoListo: true,
        yaArrastro: false
      })
    ).toBe(false)
    expect(
      debeMostrarMarcaPalma({
        ...base,
        idGuion: 'g-x',
        idsBloques: ['b-bienvenida-1'],
        gestosEncendidos: true,
        motivoSinGestos: null,
        modeloBajando: false,
        pidiendoGestos: false
      })
    ).toBe(false)
  })

  test('pegado vacío no saca la marca de idioma', () => {
    const comunes = {
      yaVista: false,
      idGuion: 'g-1',
      enLecturaOToma: false,
      hayAvisoVoz: false,
      hayDialogoPermiso: false,
      umbralPalabras: PALABRAS_MINIMAS_PARA_DETECTAR
    }
    expect(debeMostrarMarcaIdioma({ ...comunes, disparo: 'pegar', palabras: 0 })).toBe(false)
    expect(debeMostrarMarcaIdioma({ ...comunes, disparo: 'pegar', palabras: 1 })).toBe(true)
  })

  test('no sale si ya eligió idioma a mano -marca vista sin abrir-', () => {
    marcarComoVista('idioma')
    expect(
      debeMostrarMarcaIdioma({
        yaVista: marcaYaVista('idioma'),
        disparo: 'blur',
        palabras: 20,
        umbralPalabras: PALABRAS_MINIMAS_PARA_DETECTAR,
        idGuion: 'g-1',
        enLecturaOToma: false,
        hayAvisoVoz: false,
        hayDialogoPermiso: false
      })
    ).toBe(false)
  })

  test('idioma en blur exige el umbral de 12 palabras; pegar con texto sí', () => {
    const comunes = {
      yaVista: false,
      idGuion: 'g-1',
      enLecturaOToma: false,
      hayAvisoVoz: false,
      hayDialogoPermiso: false,
      umbralPalabras: PALABRAS_MINIMAS_PARA_DETECTAR
    }
    expect(PALABRAS_MINIMAS_PARA_DETECTAR).toBe(12)
    expect(debeMostrarMarcaIdioma({ ...comunes, disparo: 'blur', palabras: 11 })).toBe(false)
    expect(debeMostrarMarcaIdioma({ ...comunes, disparo: 'blur', palabras: 12 })).toBe(true)
    expect(debeMostrarMarcaIdioma({ ...comunes, disparo: 'pegar', palabras: 2 })).toBe(true)
  })

  test('no sale con motivoSinGestos ni mientras el modelo baja ni pidiendoGestos', () => {
    const base = {
      yaVista: false,
      idGuion: 'g-1',
      enLecturaOToma: false,
      hayAvisoVoz: false,
      hayDialogoPermiso: false,
      gestosEncendidos: true,
      modeloBajando: false,
      pidiendoGestos: false,
      motivoSinGestos: null as 'soloFrontal' | 'noDisponible' | null
    }
    expect(debeMostrarMarcaPalma(base)).toBe(true)
    expect(debeMostrarMarcaPalma({ ...base, motivoSinGestos: 'soloFrontal' })).toBe(false)
    expect(debeMostrarMarcaPalma({ ...base, motivoSinGestos: 'noDisponible' })).toBe(false)
    expect(debeMostrarMarcaPalma({ ...base, modeloBajando: true })).toBe(false)
    expect(debeMostrarMarcaPalma({ ...base, pidiendoGestos: true })).toBe(false)
  })

  test('no sale durante toma ni con aviso de voz ni diálogo de permiso', () => {
    const base = {
      yaVista: false,
      idGuion: 'g-1',
      enLecturaOToma: false,
      hayAvisoVoz: false,
      hayDialogoPermiso: false,
      fondoEsRecuadro: true,
      estadoListo: true,
      yaArrastro: false
    }
    expect(debeMostrarMarcaRecuadro(base)).toBe(true)
    expect(debeMostrarMarcaRecuadro({ ...base, enLecturaOToma: true })).toBe(false)
    expect(debeMostrarMarcaRecuadro({ ...base, estadoListo: false })).toBe(false)
    expect(debeMostrarMarcaRecuadro({ ...base, hayAvisoVoz: true })).toBe(false)
    expect(debeMostrarMarcaRecuadro({ ...base, hayDialogoPermiso: true })).toBe(false)
  })

  test('se apaga al tocar el control señalado: marcarComoVista deja de mostrar', () => {
    for (const id of ['idioma', 'recuadro', 'palma'] as const) {
      reiniciarMarcasGuiaParaPruebas()
      marcarComoVista(id)
      expect(marcaYaVista(id)).toBe(true)
      expect(abrirMarcaSiCorresponde(id, true)).toBe(false)
    }
  })

  test('si ya arrastró el recuadro, no sale', () => {
    expect(
      debeMostrarMarcaRecuadro({
        yaVista: false,
        fondoEsRecuadro: true,
        estadoListo: true,
        yaArrastro: true,
        idGuion: 'g-1',
        enLecturaOToma: false,
        hayAvisoVoz: false,
        hayDialogoPermiso: false
      })
    ).toBe(false)
  })
})
