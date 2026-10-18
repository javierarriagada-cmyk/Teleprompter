// -guia-sigo- Pruebas de lógica.
// -guia-sigo, corrección- Las de la tarjeta, el aviso y el Hola llaman ahora al código de la app
// -lib/portada.ts y app/bienvenida.ts-. Antes copiaban la lógica dentro de la prueba y no podían fallar.
import { describe, expect, test, beforeEach } from 'vitest'
import { debeMostrarMarcaSubtitulos, marcarComoVista, marcaYaVista, reiniciarMarcasGuiaParaPruebas } from '../lib/marcasGuia'
import { guionDeLaTarjeta, avisoAlArchivar } from '../lib/portada'
import { bloqueDeBienvenida } from '../app/bienvenida'

describe('Cómo enseña Sigo', () => {
  beforeEach(() => { reiniciarMarcasGuiaParaPruebas() })

  test('la tarjeta salta el archivado más nuevo', () => {
    // La lista llega ordenada por modificado, como la entrega el repositorio: archivar pone modificado = ahora.
    const guiones = [
      { id: 'a', modificado: 200, archivado: true },
      { id: 'b', modificado: 100, archivado: false }
    ]
    expect(guionDeLaTarjeta(guiones)?.id).toBe('b')
    expect(guionDeLaTarjeta([{ id: 'a', archivado: true }])).toBeUndefined()
    expect(guionDeLaTarjeta([])).toBeUndefined()
  })

  test('archivar avisa y Deshacer desarchiva; desarchivar no avisa', () => {
    let desarchivado = false
    const aviso = avisoAlArchivar(false, true, () => { desarchivado = true })
    expect(aviso?.texto).toBe('guionArchivado')
    expect(aviso?.accionTexto).toBe('deshacer')
    aviso!.alEjecutarAccion()
    expect(desarchivado).toBe(true)
    expect(avisoAlArchivar(true, false, () => {})).toBeNull()
    expect(avisoAlArchivar(true, true, () => {})).toBeNull()
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

  test('el Hola armado contiene las frases nuevas, en español y en inglés', () => {
    const es = JSON.stringify(bloqueDeBienvenida('es'))
    const en = JSON.stringify(bloqueDeBienvenida('en'))
    expect(es).toContain('toca la pantalla y luego pausa')
    expect(es).toContain('Los subtítulos y el filtro se eligen antes de guardar')
    expect(es).toContain('toca + en tus guiones')
    expect(en).toContain('tap the screen and then pause')
    expect(en).toContain('Captions and the filter are chosen before you save')
    expect(en).toContain('tap + in your scripts')
  })
})
