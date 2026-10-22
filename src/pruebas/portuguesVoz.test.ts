// EL PORTUGUÉS DE BRASIL -portugues-voz, 2026-10-22-. Solo lógica: el idioma de la voz, el detector, las letras y
// los subtítulos.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, test, vi } from 'vitest'
import { idiomaDeVoz, LANG_MOTOR } from '../lib/vozAPedido'

// El código sin comentarios: los «Antes:» guardan los ternarios viejos y no cuentan.
function sinComentarios(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/.*$/gm, '')
}
function leer(relativo: string): string {
  return sinComentarios(fs.readFileSync(path.resolve(__dirname, '..', '..', relativo), 'utf8'))
}

describe('Portugués 2 - Una sola regla para el idioma de la voz', () => {
  test('pt y pt-BR van a pt; es y en como siempre', () => {
    expect(idiomaDeVoz('pt')).toBe('pt')
    expect(idiomaDeVoz('pt-BR')).toBe('pt')
    expect(idiomaDeVoz('es-ES')).toBe('es')
    expect(idiomaDeVoz('en-US')).toBe('en')
    expect(LANG_MOTOR).toEqual({ es: 'es-ES', en: 'en-US', pt: 'pt-BR' })
  })

  test("'fr' se escucha en español y avisa una sola vez", () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(idiomaDeVoz('fr')).toBe('es')
    expect(idiomaDeVoz('fr')).toBe('es')
    expect(aviso).toHaveBeenCalledTimes(1)
    expect(aviso).toHaveBeenCalledWith('[voz] idioma desconocido, se escucha en español:', 'fr')
    aviso.mockRestore()
  })

  test('no vuelven los ternarios de dos idiomas', () => {
    const motor = leer('src/motor/MotorNativo.ts')
    const voz = leer('src/lib/vozAPedido.ts')
    const app = leer('src/App.tsx')
    const java = leer('android/app/src/main/java/com/sigoteleprompter/app/VoskNativoPlugin.java')
    const startsWithEn = /startsWith\(\s*['"]en['"]\s*\)\s*\?/
    for (const codigo of [motor, voz, app]) {
      expect(codigo).not.toMatch(startsWithEn)
      expect(codigo).not.toMatch(/'es'\s*\|\s*'en'\s*[;=>)]/)
      expect(codigo).not.toMatch(/===\s*'en'\s*\?\s*'en-US'/)
    }
    expect(java).not.toMatch(/"en"\.equals\([^)]*\)\s*\?/)
    expect(java).toMatch(/static String idiomaDeVoz\(/)
    expect(motor.match(/idiomaDeVoz\(/g)?.length).toBe(3)
  })
})
