import { describe, expect, test } from 'vitest'
import { join, resolve } from 'node:path'

// -2026-10-24, portugues-ficha- Las notas de la versión con pt-BR. Solo lógica: no lee la llave ni
// llama a Play. La ruta va en una variable, como en tarea99-play.test.ts, para que tsc no pida tipos.
const SCRIPTS = resolve(__dirname, '..', '..', 'scripts')
const { leerNotas, cuerpoDePista, IDIOMAS } = await import(/* @vite-ignore */ join(SCRIPTS, 'playApi.mjs'))

const TRES = '<es-419>\nhola\n</es-419>\n<en-US>\nhi\n</en-US>\n<pt-BR>\nolá\n</pt-BR>\n'

describe('notas de la versión en tres idiomas', () => {
  test('la lista única de idiomas trae pt-BR', () => {
    expect(IDIOMAS).toEqual(['es-419', 'en-US', 'pt-BR'])
  })

  test('con los tres bloques devuelve los tres, y la pista los sube', () => {
    const notas = leerNotas(TRES)
    expect(notas).toEqual({ 'es-419': 'hola', 'en-US': 'hi', 'pt-BR': 'olá' })
    expect(cuerpoDePista({ versionName: '0.10.0', notas, lanzar: false }).releases[0].releaseNotes).toEqual([
      { language: 'es-419', text: 'hola' },
      { language: 'en-US', text: 'hi' },
      { language: 'pt-BR', text: 'olá' }
    ])
  })

  test('sin <pt-BR> se para', () => {
    expect(() => leerNotas(TRES.replace(/<pt-BR>[\s\S]*<\/pt-BR>\n/, ''))).toThrow(/<pt-BR>/)
  })
})
