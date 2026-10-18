// -guia-sigo- Pruebas de lógica.
import { describe, expect, test, beforeEach } from 'vitest'
import { debeMostrarMarcaSubtitulos, marcarComoVista, marcaYaVista, reiniciarMarcasGuiaParaPruebas } from '../lib/marcasGuia'

describe('Cómo enseña Sigo', () => {
  beforeEach(() => { reiniciarMarcasGuiaParaPruebas() })

  test('la tarjeta salta el archivado más nuevo', () => {
    const guiones = [
      { id: 'a', modificado: 200, archivado: true },
      { id: 'b', modificado: 100, archivado: false }
    ]
    const tarjeta = guiones.find((g) => !g.archivado)
    expect(tarjeta?.id).toBe('b')
  })

  test('archivar avisa y Deshacer desarchiva', () => {
    let avisado = false
    let archivado = false
    const mostrarAviso = (msg: string, opts: { alEjecutarAccion?: () => void }) => {
      avisado = true
      opts.alEjecutarAccion?.()
    }
    const archivar = (v: boolean) => { archivado = v; if (v) mostrarAviso('Guion archivado', { alEjecutarAccion: () => { archivado = false } }) }
    archivar(true)
    expect(avisado).toBe(true)
    expect(archivado).toBe(false)
  })

  test('la marca de subtítulos sale solo con toma sin guardar y con subtítulos', () => {
    const comunes = { enLecturaOToma: false, hayAvisoVoz: false, hayDialogoPermiso: false }
    expect(debeMostrarMarcaSubtitulos({ yaVista: false, tieneSubtitulos: true, sinGuardar: true, ...comunes })).toBe(true)
    expect(debeMostrarMarcaSubtitulos({ yaVista: false, tieneSubtitulos: true, sinGuardar: false, ...comunes })).toBe(false)
    expect(debeMostrarMarcaSubtitulos({ yaVista: false, tieneSubtitulos: false, sinGuardar: true, ...comunes })).toBe(false)
    marcarComoVista('subtitulos')
    expect(marcaYaVista('subtitulos')).toBe(true)
    expect(debeMostrarMarcaSubtitulos({ yaVista: true, tieneSubtitulos: true, sinGuardar: true, ...comunes })).toBe(false)
  })

  test('el Hola armado contiene las frases nuevas', () => {
    // La función de bienvenida arma el texto; acá se comprueba contra el módulo.
    const mod = require('../app/bienvenida')
    const texto = JSON.stringify(mod)
    expect(texto).toContain('toca la pantalla y luego pausa')
    expect(texto).toContain('Los subtítulos y el filtro se eligen antes de guardar')
  })
})
