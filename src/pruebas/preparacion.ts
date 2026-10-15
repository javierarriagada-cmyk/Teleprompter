import { beforeEach } from 'vitest'
import { fijarIdioma } from '../lib/idioma'

// LA PREPARACION DE VITEST -tarea 75, 27-09-2026-. jsdom dice navigator.language 'en-US', y la
// app sigue al telefono: sin esto, todas las pruebas correrian con la app en ingles. Las
// pruebas que ya habia buscan textos en espanol -"Leer", "Guardado"-, asi que el idioma se
// fija en 'es' antes de cada prueba y siguen valiendo sin tocarlas una por una.
//
// Tambien al cargar el archivo, no solo en beforeEach: una prueba que arma algo al nivel del
// describe -fuera de un test- ya tiene que ver el espanol.
//
// Las pruebas del ingles -tarea75.test.tsx- lo cambian ellas mismas con fijarIdioma('en') en
// su propio beforeEach, que corre despues de este.
fijarIdioma('es')
beforeEach(() => {
  fijarIdioma('es')
})

// LAS MEDIDAS DE UN RANGO DE TEXTO -15-10-2026-. jsdom no trae Range.getClientRects ni
// getBoundingClientRect, y el editor -ProseMirror- las pide al llevar la seleccion a la vista despues
// de un focus. En src/pruebas/accesibilidadEstudio3.test.tsx eso pasaba en un temporizador DESPUES de
// terminar la prueba: «target.getClientRects is not a function», un error no capturado que dejaba la
// suite entera con codigo 1 aunque las 901 pruebas pasaran -el CI en rojo-. Aca devuelven medidas en
// cero: ninguna prueba mide posiciones -regla de Javier-, solo hace falta que no revienten.
if (typeof Range !== 'undefined') {
  const vacio = () => ({ x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) }) as DOMRect
  if (!Range.prototype.getBoundingClientRect) Range.prototype.getBoundingClientRect = vacio
  if (!Range.prototype.getClientRects) {
    Range.prototype.getClientRects = () => {
      const lista: DOMRect[] = []
      return Object.assign(lista, { item: (i: number) => lista[i] ?? null }) as unknown as DOMRectList
    }
  }
}
