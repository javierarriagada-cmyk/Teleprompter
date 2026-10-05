// LA MEZCLA DE MAIN -tarea 89- EN LA RAMA DE LA TABLETA -tarea 83, PR #62-, 04-10-2026.
//
// La 89 anota el diseño en el registro con «horizontal ? 'tel-h' : 'tel-v'» -App.tsx, la cabecera del
// registro del motor, y TeleprompterView.tsx, la línea 'pantalla'-. En la 83 «horizontal» también es
// la tableta de lado -tab-h-, y la tableta vertical -tab-v- no es horizontal: con esa cuenta una toma en
// tableta quedaría anotada como de teléfono. Después de la mezcla, las dos anotan el diseño de verdad
// -layout, 'tel-v' | 'tel-h' | 'tab-v' | 'tab-h'-. Al estilo de la prueba de la 89 -mira la fuente-.
import { describe, expect, test } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const fuente = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')

describe('Mezcla 83 + 89: el registro anota el diseño de la tableta', () => {
  test('la cabecera del registro del motor anota layout -tab-v / tab-h-, no solo tel-h / tel-v', () => {
    expect(fuente('App.tsx')).toMatch(/`# diseño: \$\{layout\}, ventana /)
  })
  test('la línea pantalla anota el diseño de la tableta', () => {
    expect(fuente('components/TeleprompterView.tsx')).toMatch(/tipo: 'pantalla', diseno: disenoRef\.current,/)
  })
})
