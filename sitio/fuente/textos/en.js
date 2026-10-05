// THE SITE'S TEXT IN ENGLISH -los textos del sitio en ingles-. 27-09-2026.
//
// Mismas claves que textos/es.js: armar.mjs arma /en, /en/privacy y /en/support con las
// mismas plantillas que la version en espanol. Si falta una clave, el armado se para.
//
// EL INGLES SE ESCRIBE, NO SE TRADUCE -Javier, 27-09-2026-: el mismo tono, frases que diria
// alguien que habla ingles, titulares cortos y con fuerza. La marca Sigo no se traduce.

export default {
  idioma: 'en',
  locale: 'en_US',
  rutas: { portada: '/en', privacidad: '/en/privacy', soporte: '/en/support' },

  meta: {
    titulo: 'Sigo — The teleprompter that follows your voice',
    descripcion: 'Sigo is the teleprompter that follows your voice: read out loud and the text keeps pace with you. Pause, and it waits. Coming soon to Google Play.',
    ogDescripcion: 'The teleprompter that follows your voice. Coming soon to Google Play.',
    privacidadTitulo: 'Privacy — Sigo',
    privacidadDescripcion: 'How Sigo handles your scripts, your takes and your voice: everything stays on your phone.',
    soporteTitulo: 'Support — Sigo',
    soporteDescripcion: 'How to report a problem with Sigo, the teleprompter that follows your voice.'
  },

  selector: { etiqueta: 'Language' },
  escenario: 'Sigo, scene by scene',
  capitulosEtiqueta: 'Chapters',
  inicio: 'Sigo, home',

  entrada: { titular: 'The teleprompter that follows your&nbsp;voice.' },

  e1: { capitulo: 'Read', titular: 'You talk. It&nbsp;follows.', bajada: 'Speak, and the text moves with you. No hands, no scrolling.' },
  e2: { capitulo: 'It waits', titular: 'Others keep scrolling. <span class="acento">Sigo waits.</span>', bajada: 'Stop to think, and the text waits for you. Start talking again, and it picks up right where you are.' },
  e3: { capitulo: 'Your script', titular: 'Mark what matters.', bajada: 'Bold the lines you want to land. Color the shifts in tone. Highlight what you can’t afford to miss.' },
  e4: { capitulo: 'Record', titular: 'Eyes on the lens.', bajada: 'The text sits right under the camera. You look into the lens, not down at the screen. Pause whenever you want: what happens during the pause stays out of the video. Away from the phone, your palm pauses or resumes, and while paused a V sign finishes. It starts off, and only works with the front camera.' },
  e5: { capitulo: 'Your video', titular: 'Captions that keep time.', bajada: 'When you’re done, your video comes with captions built from your script, in step with your voice. Pick a filter while you watch it: Natural, Warm, Cool, Vivid, Soft or black and white. What you see is what gets saved. Save it to your gallery or share it, portrait, landscape or on a tablet.' },
  e6: { capitulo: 'Offline', titular: 'No signal? No problem.', bajada: 'Works without internet. Your voice never leaves your phone.' },

  estilos: { amarillo: 'Yellow', rojo: 'Red', formal: 'Formal' },

  tarjetas: {
    espera: 'You paused: the text waits',
    corre: 'The other one keeps going',
    negrita: 'Bold',
    ambar: 'Amber',
    celeste: 'Sky blue',
    salvia: 'Green',
    destacado: 'Highlight',
    lente: 'Your line sits under the lens',
    camara: 'The camera, behind the text',
    avion: 'Airplane mode. Still reading.'
  },

  telefono: {
    sigo: 'Sigo',
    comun: 'A regular teleprompter',
    espera: 'Waiting for you',
    escapa: 'You missed it',
    avion: 'Airplane mode'
  },

  cierre: { frase: 'The teleprompter that follows your&nbsp;voice.', disponible: 'Coming soon to Google Play.' },

  pie: { privacidad: 'Privacy', soporte: 'Support' },

  privacidad: {
    titulo: 'Privacy',
    puntos: [
      'Your scripts live on your phone.',
      'So do your takes.<small>If you save one to your gallery, that’s where it stays.</small>',
      'Sigo uses the microphone to follow your voice.<small>Speech recognition runs on the phone. Your audio is never sent to any server.</small>',
      'Sigo uses the camera when you turn it on to record yourself.<small>The video is saved on your phone and stays there.</small>',
      'Gestures are recognized on the phone.<small>No image leaves it.</small>',
      'Sigo does not send usage statistics.',
      'Sigo has no accounts.',
      'This site uses no tracking cookies and no analytics.'
    ],
    contacto: 'Questions? Write to us.'
  },

  soporte: {
    titulo: 'Support',
    queEs: 'Sigo is a teleprompter that follows your voice: you read out loud and the text keeps pace with you. Today it’s for Android phones.',
    avisa: 'If something isn’t working, write to us and tell us:',
    puntos: ['Which phone you’re using.', 'Which version of Android it runs.', 'What you were doing when it happened.']
  },

  // THE SCRIPT ON THE PHONE. La misma idea que el de espanol y los mismos formatos. El
  // apostrofo va recto -I'm, can't-: es lo que escribe un teclado, y el guion es un guion.
  lectura: {
    guion: [
      'Today I want to tell you something **important**. In a short video or a long one, reading off a sheet of paper always shows. Now I read, I talk, and {salvia}the text follows me{/}. {ambar}No rushing.{/} {celeste}No losing my place.{/} And whatever I can\'t afford to miss, ==I mark in yellow==.',
      'If I stop to think, the text waits for me. When I start talking again, it keeps up with me. I look at the lens, not at the screen, and whoever is watching feels I\'m talking straight to them.',
      'If I pause, that stretch stays out. When I\'m done the video already has its captions. I share it just as it came out.'
    ],
    parrafosLeidos: 2,
    pausaDespuesDe: 'think,',
    // LA GRABACION REAL -la hara una traductora-: la ruta de su registro <id>.motor.txt desde
    // la carpeta Teleprompter. El registro tiene que traer este guion tal cual -el que la app
    // escribe en su cabecera-. Ver lectura.js, "LA LECTURA DEFINITIVA".
    toma: null
  }
}
