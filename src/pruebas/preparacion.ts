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
