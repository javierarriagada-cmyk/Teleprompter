// LA MEZCLA DE MAIN -tarea 89- EN EL PASO 0 DE LA 87 -PR #64-, 04-10-2026.
//
// La 89 hizo que la capa del panel de corpus sumara los bordes seguros -la barra de tres botones la
// tapaba-. El panel de mediciones de la 87 copia ese mismo marco -«con el mismo marco que el de
// corpus»-, pero de antes de la 89: después de la mezcla, también suma los bordes. Al estilo de la
// prueba «los dos paneles de corpus respetan la barra» de tarea89.test.tsx.
import { describe, expect, test } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const fuente = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')

describe('Mezcla 87 paso 0 + 89: el panel de mediciones respeta la barra de tres botones', () => {
  test('la capa del panel de mediciones suma los cuatro bordes seguros', () => {
    const s = fuente('App.tsx')
    const i = s.indexOf('{HERRAMIENTAS && mostrarPanelMediciones && (')
    expect(i).toBeGreaterThan(-1)
    const bloque = s.slice(i, i + 1100)
    for (const lado of ['top', 'right', 'bottom', 'left']) expect(bloque).toContain(`env(safe-area-inset-${lado}`)
  })
})
