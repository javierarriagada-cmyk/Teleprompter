import { describe, test, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

// EL ALTO DE LA PANTALLA CON RESPALDO -28-09-2026-. En un Galaxy A03s -navegador anterior a
// Chrome 108- la pantalla de lectura no mostraba Empezar ni la barra de tiempo: 100dvh escrito en
// linea se ignoraba entero y el lienzo quedaba tan alto como el guion. La regla: dvh solo en una
// clase de styles.css, siempre despues de un 100vh.
describe('El alto de pantalla funciona en navegadores sin dvh', () => {
  const leer = (p: string) => fs.readFileSync(path.resolve(process.cwd(), p), 'utf8')

  test('A1 Ningun componente escribe dvh en linea', () => {
    const archivos = ['src/App.tsx', ...fs.readdirSync(path.resolve(process.cwd(), 'src/components'))
      .filter((f) => f.endsWith('.tsx'))
      .map((f) => `src/components/${f}`)]
    for (const a of archivos) {
      const codigo = leer(a).split('\n').filter((l) => !l.trim().startsWith('//') && !l.includes('{/*'))
      expect(codigo.some((l) => /['"`]\d+dvh['"`]/.test(l)), a).toBe(false)
    }
  })

  test('A2 .alto-pantalla da primero 100vh y despues 100dvh', () => {
    const css = leer('src/styles.css')
    const bloque = css.slice(css.indexOf('.alto-pantalla {'), css.indexOf('}', css.indexOf('.alto-pantalla {')))
    expect(bloque.indexOf('height: 100vh')).toBeGreaterThan(-1)
    expect(bloque.indexOf('height: 100dvh')).toBeGreaterThan(bloque.indexOf('height: 100vh'))
  })

  test('A3 El lienzo de lectura usa la clase', () => {
    expect((leer('src/App.tsx').match(/className="alto-pantalla"/g) || []).length).toBeGreaterThanOrEqual(2)
  })
})
