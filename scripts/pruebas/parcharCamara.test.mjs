import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parchar } from '../parcharCamara.mjs'

const ancla = '    Recorder recorder = recorderBuilder.build();'
const parche = (n) => `    recorderBuilder.setTargetVideoEncodingBitRate(${n}); // Sigo: scripts/parcharCamara.mjs`

test('migra el parche anterior sin dejar dos órdenes y conserva los saltos de Windows', () => {
  const original = [parche(14_000_000), ancla, ''].join('\r\n')
  const resultado = parchar(original)
  assert.equal(resultado.cambio, true)
  assert.equal(resultado.texto, [parche(12_000_000), ancla, ''].join('\r\n'))
  assert.deepEqual(parchar(resultado.texto), { texto: resultado.texto, cambio: false })
})

test('aplica el parche también a una instalación limpia del plugin', () => {
  assert.equal(parchar(ancla).texto, `${parche(12_000_000)}\n${ancla}`)
})

test('detiene el parche si el plugin cambió o ya tiene órdenes duplicadas', () => {
  assert.throws(() => parchar('otra forma de armar Recorder'), /esperaba una vez/)
  assert.throws(() => parchar([parche(14_000_000), parche(12_000_000), ancla].join('\n')), /hay 2 parches/)
})
