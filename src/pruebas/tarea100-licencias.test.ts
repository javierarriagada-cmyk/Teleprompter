import { describe, expect, test } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const archivo = JSON.parse(readFileSync(resolve('public/licencias.json'), 'utf8'))
const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8'))
const gradle = readFileSync(resolve('android/app/build.gradle'), 'utf8')

describe('licencias', () => {
  test('cada dependencia de producción, salvo la herramienta de armado, tiene entrada', () => {
    const nombres = new Set(archivo.componentes.map((c: { nombre: string }) => c.nombre))
    for (const dep of Object.keys(pkg.dependencies)) {
      if (dep === '@capacitor/cli') continue
      expect(nombres.has(dep), dep).toBe(true)
    }
  })

  test('cada implementation de build.gradle tiene entrada', () => {
    const nombres = archivo.componentes.map((c: { nombre: string }) => c.nombre)
    const lineas = gradle.split(/\r?\n/).filter((l) => /^\s*implementation /.test(l) && !l.includes('fileTree'))
    for (const linea of lineas) {
      const m = linea.match(/['"]([^'"]+)['"]/)
      const coord = m ? m[1].split(':').slice(0, 2).join(':') : ''
      const presente = nombres.some((n: string) => n === coord || n.startsWith(coord) || linea.includes('project('))
      expect(presente, linea.trim()).toBe(true)
    }
  })

  test('ninguna entrada verificada queda sin texto', () => {
    for (const c of archivo.componentes) {
      if (c.licencia === 'sin verificar') continue
      const texto = c.licencia === 'Apache-2.0' ? archivo.apache : c.texto
      expect(texto && texto.length > 40, c.nombre).toBeTruthy()
    }
    expect(archivo.apache).toContain('Apache License')
  })

  test('las entradas a mano tienen fuente', () => {
    const extra = JSON.parse(readFileSync(resolve('docs/licencias-extra.json'), 'utf8'))
    for (const e of extra) expect(e.fuente, e.nombre).toMatch(/^https:\/\//)
  })
})
