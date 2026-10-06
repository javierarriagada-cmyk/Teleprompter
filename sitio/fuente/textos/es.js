// LOS TEXTOS DEL SITIO EN ESPANOL. 27-09-2026.
//
// UNA SOLA FUENTE: armar.mjs arma las paginas de cada idioma con las mismas plantillas
// -sitio/fuente/*.html- y este archivo o textos/en.js. En las plantillas cada texto es una
// marca {{clave}}; aca esta lo que dice. Un texto nuevo va en los DOS archivos: si falta en
// uno, el armado se para y dice cual.
//
// Pueden llevar HTML -&nbsp; para que no quede una palabra sola, <span class="acento">-.
// En pantalla: espanol neutro, con tuteo y con tildes.

export default {
  idioma: 'es',
  // og:locale y hreflang
  locale: 'es_ES',
  // Donde vive cada pagina en este idioma. armar.mjs las escribe con cleanUrls: /privacidad
  // se sirve de privacidad.html.
  rutas: { portada: '/', privacidad: '/privacidad', soporte: '/soporte' },

  meta: {
    titulo: 'Sigo — Teleprompter de voz',
    descripcion: 'Sigo es el teleprompter que sigue tu voz: lees en voz alta y el texto avanza contigo. Si te detienes, te espera. Pronto en Google Play.',
    ogDescripcion: 'El teleprompter que sigue tu voz. Pronto en Google Play.',
    privacidadTitulo: 'Privacidad — Sigo',
    privacidadDescripcion: 'Cómo trata Sigo tus guiones, tus tomas y tu voz: todo queda en tu teléfono.',
    soporteTitulo: 'Soporte — Sigo',
    soporteDescripcion: 'Cómo avisar un problema con Sigo, el teleprompter que sigue tu voz.'
  },

  selector: { etiqueta: 'Idioma' },
  escenario: 'Sigo, escena por escena',
  capitulosEtiqueta: 'Capítulos',
  inicio: 'Sigo, inicio',

  entrada: { titular: 'El teleprompter que sigue&nbsp;tu&nbsp;voz.' },

  e1: { capitulo: 'Leer', titular: 'Sigue tu voz.', bajada: 'Hablas y el texto avanza contigo. Sin tocar nada.' },
  e2: { capitulo: 'Te espera', titular: 'Los demás corren. <span class="acento">Sigo te espera.</span>', bajada: 'Si te detienes a pensar, el texto espera. Cuando vuelves a hablar, sigue contigo.' },
  e3: { capitulo: 'Tu guion', titular: 'Tu guion, con intención.', bajada: 'Marca lo que quieres decir con fuerza. Pinta los cambios de tono. Destaca lo que no se te puede pasar.' },
  e4: { capitulo: 'Grabar', titular: 'Mirando al lente.', bajada: 'El texto queda bajo la cámara: miras al lente, no a la pantalla. Pausa cuando quieras y la pausa no queda en el video. Lejos del teléfono, pausa con la palma.' },
  e5: { capitulo: 'Tu video', titular: 'Subtítulos, al ritmo de tu voz.', bajada: 'Al terminar, tu video lleva subtítulos al ritmo de tu voz y el filtro que elijas. Lo que ves es lo que se guarda.' },
  // -tarea 104- Desde la tarea 104 ninguna voz viene con la instalación: se baja sola, una vez, al abrir
  // Sigo. La bajada lo dice. Antes: bajada: 'Funciona sin internet. Tu voz no sale del teléfono.'
  e6: { capitulo: 'Sin internet', titular: 'Sin internet.', bajada: 'La voz de tu idioma se baja sola la primera vez que abres Sigo. Después funciona sin internet, y tu voz no sale del teléfono.' },

  // Los tres estilos de subtitulos de la aplicacion. La pagina los usa tambien en la etiqueta
  // que va sobre el video -escenas.js, por el JSON-.
  estilos: { amarillo: 'Amarillo', rojo: 'Rojo', formal: 'Formal' },

  tarjetas: {
    espera: 'Te detuviste: el texto espera',
    corre: 'El otro sigue corriendo',
    negrita: 'Negrita',
    ambar: 'Ámbar',
    celeste: 'Celeste',
    salvia: 'Verde',
    destacado: 'Destacado',
    lente: 'El renglón queda bajo el lente',
    camara: 'La cámara, detrás del texto',
    avion: 'Modo avión. El texto sigue.'
  },

  // Lo que se lee dentro de los telefonos.
  telefono: {
    sigo: 'Sigo',
    comun: 'Un teleprompter común',
    espera: 'Te espera',
    escapa: 'Se te escapó',
    avion: 'Modo avión'
  },

  cierre: { frase: 'El teleprompter que sigue tu&nbsp;voz.', disponible: 'Pronto en Google Play.' },

  pie: { privacidad: 'Privacidad', soporte: 'Soporte' },

  privacidad: {
    titulo: 'Privacidad',
    puntos: [
      'Tus guiones viven en tu teléfono.',
      'Tus tomas también.<small>Si guardas una en la galería, queda ahí.</small>',
      'Sigo usa el micrófono para seguir tu voz.<small>El reconocimiento de voz corre en el teléfono. El audio no se manda a ningún servidor.</small>',
      'Sigo usa la cámara cuando la enciendes para grabarte.<small>El video se guarda en tu teléfono y no sale de ahí.</small>',
      'Los gestos se reconocen en el teléfono.<small>Ninguna imagen sale de él.</small>',
      'Sigo no envía estadísticas de uso.',
      'Sigo no tiene cuentas.',
      'Este sitio no usa cookies de seguimiento ni analítica.'
    ],
    contacto: 'Si tienes una pregunta, escríbenos.'
  },

  soporte: {
    titulo: 'Soporte',
    queEs: 'Sigo es un teleprompter que sigue tu voz: lees en voz alta y el texto avanza contigo. Hoy es para teléfonos Android.',
    avisa: 'Si algo no funciona, escríbenos y cuéntanos:',
    puntos: ['Qué teléfono usas.', 'Qué versión de Android tiene.', 'Qué estabas haciendo cuando pasó.']
  },

  // EL GUION DEL TELEFONO -sitio/fuente/lectura.js-. Con los formatos del editor: **negrita**,
  // {ambar}...{/}, {celeste}...{/}, {salvia}...{/} -el verde- y ==destacado==. Un parrafo por
  // elemento.
  lectura: {
    guion: [
      'Hoy quiero contarte algo **importante**. Al grabar un video, corto o largo, leer de un papel siempre se nota. Ahora leo, hablo y {salvia}el texto me sigue{/}. {ambar}Sin apuro.{/} {celeste}Sin perder el hilo.{/} Y lo que no se me puede pasar, ==lo marco en amarillo==.',
      'Si me detengo a pensar, el texto me espera. Cuando vuelvo a hablar, sigue conmigo. Miro al lente, no a la pantalla, y quien me ve siente que le hablo directamente.',
      'Si pauso, ese tramo no queda. Al terminar, el video ya lleva sus subtítulos. Lo comparto así, tal como salió.'
    ],
    // Cuantos parrafos se leen. El ultimo no: esta para que debajo del renglon vivo siempre
    // haya guion, y para que el teleprompter comun de E2 tenga por donde correr.
    parrafosLeidos: 2,
    // La pausa de pensar de E2 va despues de esta palabra, tal como esta escrita en el guion.
    pausaDespuesDe: 'pensar,',
    // La toma real de este texto, con su registro <id>.motor.txt, cuando exista. null: la voz
    // estimada a 150 palabras por minuto. Ver lectura.js, "LA LECTURA DEFINITIVA".
    toma: null
  }
}
