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
  // -sitio-cuenta, 20-10-2026- Suma la página para borrar la cuenta. Antes:
  // rutas: { portada: '/', privacidad: '/privacidad', soporte: '/soporte', ayuda: '/ayuda' },
  rutas: { portada: '/', privacidad: '/privacidad', soporte: '/soporte', ayuda: '/ayuda', borrarCuenta: '/borrar-cuenta' },

  meta: {
    titulo: 'Sigo — Teleprompter de voz',
    descripcion: 'Sigo es el teleprompter que sigue tu voz: lees en voz alta y el texto avanza contigo. Si te detienes, te espera. Pronto en Google Play.',
    ogDescripcion: 'El teleprompter que sigue tu voz. Pronto en Google Play.',
    privacidadTitulo: 'Privacidad — Sigo',
    // -sitio-cuenta, 20-10-2026- Ya no todo queda en el teléfono: con sesión, los guiones tienen copia en la nube.
    // Antes: privacidadDescripcion: 'Cómo trata Sigo tus guiones, tus tomas y tu voz: todo queda en tu teléfono.',
    privacidadDescripcion: 'Cómo trata Sigo tus guiones, tus tomas, tu voz y tu cuenta.',
    soporteTitulo: 'Soporte — Sigo',
    soporteDescripcion: 'Cómo avisar un problema con Sigo, el teleprompter que sigue tu voz.',
    ayudaTitulo: 'Ayuda — Sigo',
    ayudaDescripcion: 'Cómo se usa Sigo: leer, grabar, pausar, subtítulos y más.',
    borrarCuentaTitulo: 'Borrar cuenta — Sigo',
    borrarCuentaDescripcion: 'Cómo borrar tu cuenta de Sigo y la copia de seguridad de tus guiones, desde la app o sin ella.'
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

  // -sitio-cuenta, 20-10-2026- Suma Borrar cuenta. Antes:
  // pie: { privacidad: 'Privacidad', soporte: 'Soporte', ayuda: 'Ayuda' },
  pie: { privacidad: 'Privacidad', soporte: 'Soporte', ayuda: 'Ayuda', borrarCuenta: 'Borrar cuenta' },

  // EL CORREO DE CONTACTO de cada idioma -Javier, 07-10-2026-: en espanol hola@, en ingles
  // hello@. Los dos reciben. Lo usan el pie, privacidad, soporte y la invitacion a probar.
  correo: 'hola@sigoteleprompter.com',

  // LA INVITACION A PROBAR SIGO -franja de arriba y seccion #prueba de la portada, Javier,
  // 07-10-2026-. La regla de la tarea 98 que no dejaba hablar de prueba, testers ni
  // lanzamiento queda sin efecto SOLO para esta franja y esta seccion; el resto del sitio la
  // sigue. El correo va entre antesDelCorreo y despuesDelCorreo, como enlace: sale de correo.
  prueba: {
    franja: 'Sigo está en prueba.',
    franjaAccion: 'Sé de los primeros en usarlo&nbsp;→',
    cerrar: 'Cerrar aviso',
    titulo: 'Prueba Sigo antes que nadie',
    antesDelCorreo: 'Estamos invitando a un grupo pequeño a usar Sigo en Android antes del lanzamiento. Escríbenos a',
    despuesDelCorreo: 'con el correo de tu cuenta de Google y te enviamos la invitación.'
  },

  privacidad: {
    titulo: 'Privacidad',
    puntos: [
      // -sitio-cuenta, 20-10-2026- Con sesión hay copia en la nube. Antes: 'Tus guiones viven en tu teléfono.',
      'Tus guiones viven en tu teléfono.<small>Si inicias sesión, también hay una copia de seguridad en la nube: ver más abajo.</small>',
      'Tus tomas también.<small>Si guardas una en la galería, queda ahí.</small>',
      'Sigo usa el micrófono para seguir tu voz.<small>El reconocimiento de voz corre en el teléfono. El audio no se manda a ningún servidor.</small>',
      'Sigo usa la cámara cuando la enciendes para grabarte.<small>El video se guarda en tu teléfono y no sale de ahí.</small>',
      'Los gestos se reconocen en el teléfono.<small>Ninguna imagen sale de él.</small>',
      'Sigo no envía estadísticas de uso.',
      // -sitio-cuenta, 20-10-2026- Ya no es cierto: hay cuenta, opcional. Antes: 'Sigo no tiene cuentas.',
      'Iniciar sesión con Google es opcional.<small>Sigo funciona completo sin cuenta.</small>',
      // -sitio-cuenta, 20-10-2026- El inicio de sesión y la copia de seguridad -órdenes A y B-.
      'Si inicias sesión con Google, Sigo recibe tu correo, tu nombre y un identificador de cuenta.<small>Firebase guarda también el enlace a tu foto de perfil de Google, que Sigo no usa ni muestra.</small>',
      'La copia de seguridad de tus guiones se guarda en Firebase, de Google, en la región de Santiago de Chile.<small>Tus guiones viajan cifrados, y ninguna otra cuenta puede leerlos.</small>',
      'Firebase registra la dirección IP para frenar abusos.',
      'Los videos nunca salen del teléfono.',
      'Para borrar tu cuenta y la copia de seguridad de tus guiones: <a href="/borrar-cuenta">sigoteleprompter.com/borrar-cuenta</a>.',
      'Este sitio no usa cookies de seguimiento ni analítica.'
    ],
    contacto: 'Si tienes una pregunta, escríbenos.'
  },


  ayuda: {
    titulo: 'Ayuda',
    intro: 'Sigo sigue tu voz. Lees en voz alta y el texto avanza contigo. Si te detienes, te espera.',
    escribirnos: 'Cómo escribirnos',
    secciones: [
      { titulo: 'Leer y grabar', parrafos: ['Abre un guion y toca Leer o Grabar. En la pantalla, toca el círculo para empezar. Cuenta 3 segundos y empieza.'], captura: '[CAPTURA: pantalla LISTO de Grabar, con el círculo rojo y la cuenta de 3]', imagen: 'leer-y-grabar.webp', alt: 'Grabar, antes de empezar: el guion, los controles y el círculo rojo' },
      { titulo: 'Pausar y parar', parrafos: ['Al leer o grabar, Pausa y Parar están ocultos. Toca el texto y aparecen. Con la voz se ocultan solos a los pocos segundos.', 'Lo que pasa durante la pausa no queda en el video. En pausa, el tacho descarta la toma. El gesto de atrás de Android detiene la toma y la guarda.'], captura: '[CAPTURA: leyendo, con los controles a la vista después de tocar el texto]', imagen: 'pausar-y-parar.webp', alt: 'Leyendo, con Pausa y Parar a la vista después de tocar el texto' },
      { titulo: 'Si el texto se adelanta', parrafos: ['Si te saltas una parte, arrastra el texto con el dedo hasta donde vas. Sigue desde ahí. Antes de empezar, también se arrastra para elegir desde dónde parte.'], captura: '[CAPTURA: LISTO, con el texto desplazado hacia abajo]', imagen: 'si-el-texto-se-adelanta.webp', alt: 'El texto arrastrado con el dedo para empezar más adelante' },
      // -18-10-2026- El modo se elige sobre todo en la ficha de la pantalla de antes de empezar; Ajustes de la
      // portada también lo trae -btn-modo-voz, btn-modo-fija-. Antes:
      // { titulo: 'Con la voz o con velocidad fija', parrafos: ['En Ajustes, elige Con la voz o Velocidad fija. Con la voz, el texto sigue lo que dices. Con Velocidad fija, sube solo, al ritmo que eliges.'], captura: '[CAPTURA: panel de Ajustes, selector Con la voz / Velocidad fija]' },
      { titulo: 'Con la voz o con velocidad fija', parrafos: ['Antes de empezar, toca la ficha que dice Con la voz y elige Con la voz o Velocidad fija. También se cambia en Ajustes. Con la voz, el texto sigue lo que dices. Con Velocidad fija, sube solo, al ritmo que eliges.'], captura: '[CAPTURA: LISTO, ficha del modo abierta con Con la voz / Velocidad fija]', imagen: 'con-la-voz-o-velocidad-fija.webp', alt: 'La ficha del modo abierta, con Con la voz y Velocidad fija' },
      { titulo: 'La cámara', parrafos: ['En Grabar puedes verte Detrás del texto, en un Recuadro, o con la cámara Oculta. El recuadro se arrastra. Voltear cambia de cámara. Calidad y Estabilizar están en el panel de Ajustes de la toma.'], captura: '[CAPTURA: LISTO de Grabar, panel de cámara abierto con Detrás, Recuadro y Oculta]', imagen: 'la-camara.webp', alt: 'El panel de la cámara, con Detrás, Recuadro y Oculta' },
      { titulo: 'Control por gestos', parrafos: ['En el panel de la cámara, enciende Control por gestos. Solo funciona con la cámara frontal. La palma pausa o sigue. Para seguir, baja la mano y muéstrala de nuevo: cuenta 3 segundos. En pausa, la V termina la toma.'], captura: '[CAPTURA: panel de cámara, fila Control por gestos encendida]' },
      { titulo: 'Subtítulos y filtro', parrafos: ['Se eligen en el visor, al terminar la toma, antes de guardar. Cada toma parte sin subtítulos. Una vez guardada, ya no se pueden poner. Lo que ves es lo que se guarda.'], captura: '[CAPTURA: visor de una toma sin guardar, con Subtítulos y Filtro a la vista]' },
      { titulo: 'Guardar y compartir', parrafos: ['Guardar la deja en la galería, en Películas. Guardar y compartir abre el menú de compartir. Repetir vuelve a grabar. Borrar pide confirmación.'], captura: '[CAPTURA: visor, fila con Guardar, Guardar y compartir, Repetir y Borrar]' },
      { titulo: 'Tus guiones', parrafos: ['Toca + para crear uno. Pega texto o abre un archivo .txt, .md o .docx. En el editor, selecciona texto para negrita, colores y destacado. Lo que escribes entre corchetes es una nota: se ve, pero no se lee. ES/EN es el idioma en que Sigo escucha.'], captura: '[CAPTURA: editor con texto seleccionado y la barra de formato]', imagen: 'tus-guiones.webp', alt: 'El editor con texto seleccionado y la barra de formato arriba' },
      { titulo: 'Borrar y archivar un guion', parrafos: ['Desliza la fila, mantenla apretada, o usa el menú del editor. Al borrar sale Deshacer. Los archivados se ven en Archivados.'], captura: '[CAPTURA: lista de guiones, menú de una fila con Archivar y Borrar]', imagen: 'borrar-y-archivar.webp', alt: 'El menú de un guion, con Archivar y Borrar' },
      { titulo: 'Accesos directos', parrafos: ['Mantén apretado el ícono de Sigo en el teléfono. Nuevo guion con lo copiado crea un guion y pega lo que haya. Grabar abre directo en Grabar el guion más reciente.'], captura: '[CAPTURA: lanzador de Android, menú del ícono de Sigo con los dos accesos]' },
      { titulo: 'Ajustes', parrafos: ['En Ajustes cambias la letra, la tipografía, el ancho, los colores, el espejo y mostrar tiempo. Desde la portada también cambias el tema y el idioma de la app.'], captura: '[CAPTURA: panel de Ajustes desde la portada, secciones Lectura y Apariencia]', imagen: 'ajustes.webp', alt: 'Ajustes desde la portada: lectura, pantalla y apariencia' },
      { titulo: 'Sin conexión', parrafos: ['La voz de tu idioma y los gestos se bajan una vez. Después funcionan sin internet. Si no hay conexión la primera vez, Sigo lo avisa y ofrece reintentar.'] , captura: '[CAPTURA: aviso de sin conexión al intentar leer sin la voz bajada]' },
      // -sitio-cuenta, 20-10-2026- La cuenta y la copia de seguridad de los guiones -órdenes A y B-.
      { titulo: 'Tu cuenta y la copia de seguridad', parrafos: ['Con tu cuenta de Google, Sigo hace una copia de seguridad de tus guiones y los tienes en todos tus dispositivos. Es opcional: sin cuenta, Sigo funciona igual.', 'Para entrar, abre Ajustes desde la portada y toca Continuar con Google. Para salir, toca tu cuenta arriba de Ajustes y elige Cerrar sesión. Tus guiones siguen en el teléfono.', 'Para borrarla, toca tu cuenta y elige Borrar cuenta. Se borran tu cuenta y la copia de seguridad en la nube; los guiones del teléfono no se tocan.'], captura: '[CAPTURA: Ajustes desde la portada, con la tarjeta de la cuenta arriba: sin sesión, Nunca pierdas un guion y Continuar con Google; con sesión, el correo y Copia de seguridad completa]' },
    ]
  },
  soporte: {
    titulo: 'Soporte',
    queEs: 'Sigo es un teleprompter que sigue tu voz: lees en voz alta y el texto avanza contigo. Hoy es para teléfonos Android.',
    avisa: 'Si algo no funciona, escríbenos y cuéntanos:',
    puntos: ['Qué teléfono usas.', 'Qué versión de Android tiene.', 'Qué estabas haciendo cuando pasó.']
  },

  // -sitio-cuenta, 20-10-2026- LA PÁGINA PARA BORRAR LA CUENTA SIN LA APP, que pide Google Play: cómo se hace,
  // qué se borra, que no se deshace y cuánto demora. sitio/fuente/borrar-cuenta.html, con el molde de soporte.
  borrarCuenta: {
    titulo: 'Borrar tu cuenta de Sigo',
    desdeLaApp: 'Desde la app: abre Sigo, toca tu cuenta arriba de Ajustes, elige Borrar cuenta y confirma. Se borran al instante tu cuenta y la copia de seguridad de tus guiones en la nube. No se puede deshacer. Los guiones de tu teléfono no se tocan.',
    sinLaApp: 'Sin la app: escríbenos a <a href="mailto:hola@sigoteleprompter.com">hola@sigoteleprompter.com</a> desde el correo de tu cuenta de Google, con el asunto «Borrar mi cuenta de Sigo». Borramos tu cuenta y la copia de seguridad de tus guiones lo antes posible, y como máximo en 7 días, y te avisamos cuando esté hecho.',
    queSeBorra: 'Qué se borra: tu cuenta de Sigo (tu correo, tu nombre, el enlace a tu foto de perfil y el identificador de la cuenta) y toda la copia de seguridad de tus guiones. No guardamos copias.'
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
