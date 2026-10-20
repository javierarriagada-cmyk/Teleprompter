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
  // -sitio-cuenta, 20-10-2026- Suma la página para borrar la cuenta. Antes:
  // rutas: { portada: '/en', privacidad: '/en/privacy', soporte: '/en/support', ayuda: '/en/help' },
  rutas: { portada: '/en', privacidad: '/en/privacy', soporte: '/en/support', ayuda: '/en/help', borrarCuenta: '/en/delete-account' },

  meta: {
    titulo: 'Sigo — The teleprompter that follows your voice',
    descripcion: 'Sigo is the teleprompter that follows your voice: read out loud and the text keeps pace with you. Pause, and it waits. Coming soon to Google Play.',
    ogDescripcion: 'The teleprompter that follows your voice. Coming soon to Google Play.',
    privacidadTitulo: 'Privacy — Sigo',
    // -sitio-cuenta, 20-10-2026- Ya no todo queda en el teléfono: con sesión, los guiones tienen copia en la nube.
    // Antes: privacidadDescripcion: 'How Sigo handles your scripts, your takes and your voice: everything stays on your phone.',
    privacidadDescripcion: 'How Sigo handles your scripts, your takes, your voice and your account.',
    soporteTitulo: 'Support — Sigo',
    soporteDescripcion: 'How to report a problem with Sigo, the teleprompter that follows your voice.',
    ayudaTitulo: 'Help — Sigo',
    ayudaDescripcion: 'How to use Sigo: read, record, pause, captions and more.',
    borrarCuentaTitulo: 'Delete account — Sigo',
    borrarCuentaDescripcion: 'How to delete your Sigo account and the backup of your scripts, from the app or without it.'
  },

  selector: { etiqueta: 'Language' },
  escenario: 'Sigo, scene by scene',
  capitulosEtiqueta: 'Chapters',
  inicio: 'Sigo, home',

  entrada: { titular: 'The teleprompter that follows your&nbsp;voice.' },

  e1: { capitulo: 'Read', titular: 'You talk. It&nbsp;follows.', bajada: 'Speak, and the text moves with you. No hands, no scrolling.' },
  e2: { capitulo: 'It waits', titular: 'Others keep scrolling. <span class="acento">Sigo waits.</span>', bajada: 'Stop to think, and the text waits for you. Start talking again, and it picks up right where you are.' },
  e3: { capitulo: 'Your script', titular: 'Mark what matters.', bajada: 'Bold the lines you want to land. Color the shifts in tone. Highlight what you can’t afford to miss.' },
  e4: { capitulo: 'Record', titular: 'Eyes on the lens.', bajada: 'The text sits under the camera: you look at the lens, not the screen. Pause whenever you like, and the pause stays out of the video. Away from the phone, pause with your palm.' },
  e5: { capitulo: 'Your video', titular: 'Captions that keep time.', bajada: 'When you’re done, your video has captions in time with your voice and the filter you choose. What you see is what gets saved.' },
  // -tarea 104- No voice comes with the install anymore: it downloads once, on its own, when Sigo first
  // opens. Antes: bajada: 'Works without internet. Your voice never leaves your phone.'
  e6: { capitulo: 'Offline', titular: 'No signal? No problem.', bajada: 'The voice for your language downloads on its own the first time you open Sigo. After that it works offline, and your voice never leaves your phone.' },

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

  // -sitio-cuenta, 20-10-2026- Suma Borrar cuenta. Antes:
  // pie: { privacidad: 'Privacy', soporte: 'Support', ayuda: 'Help' },
  pie: { privacidad: 'Privacy', soporte: 'Support', ayuda: 'Help', borrarCuenta: 'Delete account' },

  // EL CORREO DE CONTACTO en ingles -Javier, 07-10-2026-: hello@. Antes las paginas en ingles
  // decian hola@, el de espanol. Los dos reciben.
  correo: 'hello@sigoteleprompter.com',

  // LA INVITACION A PROBAR SIGO -ver textos/es.js, prueba-.
  prueba: {
    franja: 'Sigo is in testing.',
    franjaAccion: 'Be one of the first to use it&nbsp;→',
    cerrar: 'Close notice',
    titulo: 'Try Sigo before anyone else',
    antesDelCorreo: 'We’re inviting a small group to use Sigo on Android before launch. Write to',
    despuesDelCorreo: 'with your Google account email and we’ll send you the invitation.'
  },

  privacidad: {
    titulo: 'Privacy',
    puntos: [
      // -sitio-cuenta, 20-10-2026- Con sesión hay copia en la nube. Antes: 'Your scripts live on your phone.',
      'Your scripts live on your phone.<small>If you sign in, there is also a backup in the cloud: see below.</small>',
      'So do your takes.<small>If you save one to your gallery, that’s where it stays.</small>',
      'Sigo uses the microphone to follow your voice.<small>Speech recognition runs on the phone. Your audio is never sent to any server.</small>',
      'Sigo uses the camera when you turn it on to record yourself.<small>The video is saved on your phone and stays there.</small>',
      'Gestures are recognized on the phone.<small>No image leaves it.</small>',
      'Sigo does not send usage statistics.',
      // -sitio-cuenta, 20-10-2026- Ya no es cierto: hay cuenta, opcional. Antes: 'Sigo has no accounts.',
      'Signing in with Google is optional.<small>Sigo works fully without an account.</small>',
      // -sitio-cuenta, 20-10-2026- El inicio de sesión y la copia de seguridad -órdenes A y B-.
      'If you sign in with Google, Sigo receives your email, your name and an account identifier.<small>Firebase also stores the link to your Google profile photo, which Sigo doesn’t use or show.</small>',
      'The backup of your scripts is stored in Firebase, by Google, in the Santiago de Chile region.<small>Your scripts travel encrypted, and no other account can read them.</small>',
      'Firebase records the IP address to prevent abuse.',
      'Videos never leave the phone.',
      'To delete your account and the backup of your scripts: <a href="/en/delete-account">sigoteleprompter.com/en/delete-account</a>.',
      'This site uses no tracking cookies and no analytics.'
    ],
    contacto: 'Questions? Write to us.'
  },


  ayuda: {
    titulo: 'Help',
    intro: 'Sigo follows your voice. You read out loud and the text keeps pace with you. Pause, and it waits.',
    escribirnos: 'How to write to us',
    secciones: [
      { titulo: 'Read and record', parrafos: ['Open a script and tap Read or Record. On the screen, tap the circle to start. It counts down 3 seconds and begins.'], captura: '[CAPTURA: Grabar LISTO screen, with the red circle and the 3-second countdown]' },
      { titulo: 'Pause and stop', parrafos: ['While reading or recording, Pause and Stop are hidden. Tap the text and they appear. With voice they hide on their own after a few seconds.', 'What happens during the pause stays out of the video. While paused, the trash icon discards the take. The Android back gesture stops the take and saves it.'], captura: '[CAPTURA: reading, with controls visible after tapping the text]' },
      { titulo: 'If the text gets ahead', parrafos: ['If you skip a part, drag the text with your finger to where you are. Continue from there. Before starting, you can also drag to choose where it begins.'], captura: '[CAPTURA: LISTO, with the text scrolled down]' },
      // -18-10-2026- The mode is chosen mainly on the chip of the screen before starting; Settings on the home
      // screen has it too -btn-modo-voz, btn-modo-fija-. Before:
      // { titulo: 'With voice or fixed speed', parrafos: ['In Settings, choose With voice or Fixed speed. With voice, the text follows what you say. With Fixed speed, it scrolls on its own, at the pace you choose.'], captura: '[CAPTURA: Settings panel, With voice / Fixed speed selector]' },
      { titulo: 'With your voice or fixed speed', parrafos: ['Before you start, tap the chip that says With your voice and choose With your voice or Fixed speed. You can also change it in Settings. With your voice, the text follows what you say. With Fixed speed, it scrolls on its own, at the pace you choose.'], captura: '[CAPTURA: LISTO, mode chip open with With your voice / Fixed speed]' },
      { titulo: 'The camera', parrafos: ['In Record you can see yourself Behind the text, in a Frame, or with the camera Hidden. The frame can be dragged. Flip switches cameras. Quality and Stabilize are in the take Settings panel.'], captura: '[CAPTURA: Grabar LISTO, camera panel open with Behind, Frame and Hidden]' },
      { titulo: 'Gesture control', parrafos: ['In the camera panel, turn on Gesture control. It only works with the front camera. The palm pauses or resumes. To resume, lower your hand and show it again: it counts down 3 seconds. While paused, the V ends the take.'], captura: '[CAPTURA: camera panel, Gesture control row turned on]' },
      { titulo: 'Captions and filter', parrafos: ['They are chosen in the viewer, when the take ends, before saving. Each take starts with no captions. Once saved, they cannot be added. What you see is what gets saved.'], captura: '[CAPTURA: viewer of an unsaved take, with Captions and Filter visible]' },
      { titulo: 'Save and share', parrafos: ['Save puts it in the gallery, in Movies. Save and share opens the share menu. Repeat records again. Delete asks for confirmation.'], captura: '[CAPTURA: viewer, row with Save, Save and share, Repeat and Delete]' },
      { titulo: 'Your scripts', parrafos: ['Tap + to create one. Paste text or open a .txt, .md or .docx file. In the editor, select text for bold, colors and highlight. What you write in brackets is a note: it shows, but it is not read. ES/EN is the language Sigo listens in.'], captura: '[CAPTURA: editor with text selected and the format bar]' },
      { titulo: 'Delete and archive a script', parrafos: ['Swipe the row, hold it, or use the editor menu. Deleting shows Undo. Archived scripts are in Archived.'], captura: '[CAPTURA: script list, row menu with Archive and Delete]' },
      { titulo: 'Shortcuts', parrafos: ['Hold the Sigo icon on your phone. New script with what was copied creates a script and pastes whatever is there. Record opens Record directly with the most recent script.'], captura: '[CAPTURA: Android launcher, Sigo icon menu with the two shortcuts]' },
      { titulo: 'Settings', parrafos: ['In Settings you change the letter size, typeface, width, colors, mirror and show time. From the home screen you also change the theme and the app language.'], captura: '[CAPTURA: Settings panel from home, Reading and Appearance sections]' },
      { titulo: 'Offline', parrafos: ['The voice for your language and the gestures download once. After that they work without internet. If there is no connection the first time, Sigo says so and offers to retry.'] , captura: '[CAPTURA: offline notice when trying to read without the voice downloaded]' },
      // -sitio-cuenta, 20-10-2026- The account and the backup of the scripts -orders A and B-.
      { titulo: 'Your account and backup', parrafos: ['With your Google account, Sigo backs up your scripts and you have them on all your devices. It’s optional: without an account, Sigo works the same.', 'To sign in, open Settings from the home screen and tap Continue with Google. To sign out, tap your account at the top of Settings and choose Sign out. Your scripts stay on the phone.', 'To delete it, tap your account and choose Delete account. Your account and the cloud backup are deleted; the scripts on the phone aren’t affected.'], captura: '[CAPTURE: Settings from the home screen, with the account card at the top: signed out, Never lose a script and Continue with Google; signed in, the email and Backup complete]' },
    ]
  },
  soporte: {
    titulo: 'Support',
    queEs: 'Sigo is a teleprompter that follows your voice: you read out loud and the text keeps pace with you. Today it’s for Android phones.',
    avisa: 'If something isn’t working, write to us and tell us:',
    puntos: ['Which phone you’re using.', 'Which version of Android it runs.', 'What you were doing when it happened.']
  },

  // -sitio-cuenta, 20-10-2026- LA PÁGINA PARA BORRAR LA CUENTA SIN LA APP, que pide Google Play: cómo se hace,
  // qué se borra, que no se deshace y cuánto demora. sitio/fuente/borrar-cuenta.html, con el molde de soporte.
  borrarCuenta: {
    titulo: 'Delete your Sigo account',
    desdeLaApp: 'From the app: open Sigo, tap your account at the top of Settings, choose Delete account and confirm. Your account and the backup of your scripts in the cloud are deleted right away. This can\'t be undone. The scripts on your phone aren\'t affected.',
    sinLaApp: 'Without the app: write to us at <a href="mailto:hello@sigoteleprompter.com">hello@sigoteleprompter.com</a> from the email of your Google account, with the subject "Delete my Sigo account". We delete your account and the backup of your scripts as soon as possible, within 7 days at most, and let you know when it\'s done.',
    queSeBorra: 'What gets deleted: your Sigo account (your email, your name, the link to your profile photo and the account identifier) and the whole backup of your scripts. We don\'t keep copies.'
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
