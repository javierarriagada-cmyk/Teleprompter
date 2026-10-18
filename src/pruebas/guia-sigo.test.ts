// -guia-sigo- Pruebas de lógica de cómo enseña Sigo.
import { describe, expect, test } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('Cómo enseña Sigo', () => {
  test('el Hola trae las tres frases nuevas en español e inglés', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../app/bienvenida.ts'), 'utf8')
    expect(src).toContain('toca la pantalla y luego pausa')
    expect(src).toContain('tap the screen and then pause')
    expect(src).toContain('Los subtítulos y el filtro se eligen antes de guardar')
    expect(src).toContain('Captions and the filter are chosen before you save')
    expect(src).toContain('toca + en tus guiones')
    expect(src).toContain('tap + in your scripts')
  })

  test('la tarjeta y el acceso saltan los archivados', () => {
    const app = fs.readFileSync(path.resolve(__dirname, '../App.tsx'), 'utf8')
    const biblio = fs.readFileSync(path.resolve(__dirname, '../components/BibliotecaView.tsx'), 'utf8')
    expect(app).toContain('!g.archivado')
    expect(biblio).toContain('guiones.find((g) => !g.archivado)')
  })

  test('archivar muestra el aviso', () => {
    const app = fs.readFileSync(path.resolve(__dirname, '../App.tsx'), 'utf8')
    expect(app).toContain("mostrarAviso(t('guionArchivado')")
  })

  test('el menú del editor borra y archiva', () => {
    const cab = fs.readFileSync(path.resolve(__dirname, '../components/EditorCabecera.tsx'), 'utf8')
    expect(cab).toContain('onBorrar')
    expect(cab).toContain('onArchivar')
    expect(cab).toContain('btn-mas-acciones-editor')
  })

  test('la marca de subtítulos existe', () => {
    const marcas = fs.readFileSync(path.resolve(__dirname, '../lib/marcasGuia.ts'), 'utf8')
    expect(marcas).toContain("'subtitulos'")
    expect(marcas).toContain('teleprompter_marca_subtitulos')
  })
})
