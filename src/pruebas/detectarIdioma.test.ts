import { describe, test, expect } from 'vitest'
import { detectarIdioma, PALABRAS_MINIMAS_PARA_DETECTAR } from '../lib/detectarIdioma'
import { bloqueDeBienvenida } from '../App'

// EL IDIOMA DE CADA GUION -D2, tarea 75, 27-09-2026-. Con textos reales de los dos idiomas,
// mezclados y cortos.
describe('detectarIdioma', () => {
  test('D1 Los dos guiones Hola, enteros y parrafo por parrafo, dan su idioma', () => {
    for (const idioma of ['es', 'en'] as const) {
      const texto = bloqueDeBienvenida(idioma).texto
      expect(detectarIdioma(texto)).toBe(idioma)
      const parrafos = texto.split('\n').filter((p) => p.trim().split(/\s+/).length >= 20)
      expect(parrafos.length).toBeGreaterThan(4)
      for (const p of parrafos) expect(detectarIdioma(p), p).toBe(idioma)
    }
  })

  test('D2 Textos reales de clase y de charla, en espanol y en ingles', () => {
    expect(detectarIdioma(
      'Hoy vamos a hablar de la fotosíntesis, que es el proceso por el cual las plantas convierten la luz del sol en energía. Es más simple de lo que parece.'
    )).toBe('es')
    expect(detectarIdioma(
      'Aqui existe la idea de que somos el peor testigo de nuestra propia vida, por estar demasiado cerca y por tener intereses.'
    )).toBe('es')
    expect(detectarIdioma(
      'Today we are going to talk about photosynthesis, which is the way plants turn sunlight into energy. It is simpler than it sounds.'
    )).toBe('en')
    expect(detectarIdioma(
      "Welcome back to the channel. In this video I'll show you what I learned from my first year of teaching online, and what I would do differently."
    )).toBe('en')
  })

  test('D3 Con menos de 12 palabras no decide', () => {
    expect(PALABRAS_MINIMAS_PARA_DETECTAR).toBe(12)
    expect(detectarIdioma('')).toBeNull()
    expect(detectarIdioma('Hola a todos, bienvenidos a la clase de hoy.')).toBeNull()
    expect(detectarIdioma('Hi everyone, and welcome to the first class of the term.')).toBeNull()
    // Once palabras bien espanolas: todavia no.
    expect(detectarIdioma('Quiero que el texto se mueva con la voz, de verdad')).toBeNull()
    // Doce: ahora si.
    expect(detectarIdioma('Quiero que el texto se mueva con la voz, de verdad, siempre')).toBe('es')
  })

  test('D4 Un texto mezclado mitad y mitad no decide', () => {
    expect(detectarIdioma(
      'Hoy quiero contarles una historia que me pasó en el trabajo. And then I realized that the whole plan was wrong from the start.'
    )).toBeNull()
  })

  test('D5 Un texto sin palabras frecuentes -una lista, nombres propios- no decide', () => {
    expect(detectarIdioma(
      'Manzanas, peras, naranjas, plátanos, uvas, kiwis, mangos, piñas, cerezas, ciruelas, duraznos, frutillas, arándanos.'
    )).toBeNull()
  })

  test('D6 Mayusculas, signos y acotaciones entre corchetes no lo confunden', () => {
    expect(detectarIdioma(
      '¡BIENVENIDOS! [Sonreír] ¿Qué es lo que hace que una clase se quede con nosotros? Es la historia, no los datos.'
    )).toBe('es')
    expect(detectarIdioma(
      "WELCOME! [smile] What is it that makes a class stay with us? It's the story, not the data, and that's all."
    )).toBe('en')
  })
})
