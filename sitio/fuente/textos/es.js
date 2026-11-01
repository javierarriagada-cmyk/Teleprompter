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
  // Portada aprobada del PR #165: las claves anteriores se conservan para no perder historia.
  nuevaPortada: {
    "rotuloComun": "Un teleprompter<br>común",
    "como": "Cómo funciona",
    "hablas": "Tú hablas. Sigo te sigue.",
    "esperaTitulo": "Sigo te espera.",
    "esperaTexto": "El texto avanza contigo y te espera cuando haces una&nbsp;pausa.",
    "subtitulosEscena": "Los subtítulos se crean con las palabras de tu guion y el tiempo de tu&nbsp;voz.",
    "videoKicker": "El video",
    "videoTitulo": "Del guion al video.",
    "videoTexto": "Los subtítulos se crean con las palabras de tu guion y el tiempo de tu voz.",
    "videoReproducir": "Reproducir video de Sigo",
    "videoPoster": "Vista previa del video de Sigo",
    "paraKicker": "Para qué",
    "paraTitulo": "Para tus videos, clases, charlas y&nbsp;presentaciones.",
    "paraTexto": "Lee tu guion a tu ritmo mientras grabas un video, preparas una clase o ensayas una presentación.",
    "videosTitulo": "Videos",
    "videosTexto": "Graba con la cámara frontal o trasera, en vertical o en horizontal. Elige ver tu imagen detrás del texto, en un recuadro que puedes mover, u ocultarla mientras grabas.",
    "videosAlt": "Guion con la cámara en un recuadro mientras grabas",
    "clasesTitulo": "Clases",
    "clasesTexto": "Prepara el guion de tu clase y léelo a tu ritmo. Si haces una pausa, el texto te espera.",
    "clasesAlt": "Guion de una clase sobre el ciclo del agua en la pantalla de lectura de Sigo",
    "presentacionesTitulo": "Presentaciones",
    "presentacionesTexto": "Ensaya tu presentación sin grabar. Lee el guion a tu ritmo, con el texto siguiendo tu voz.",
    "presentacionesAlt": "Guion de una presentación de resultados del trimestre en la pantalla de lectura de Sigo",
    "ensayosTitulo": "Ensayos",
    "ensayosTexto": "También puedes leer sin grabar, a velocidad fija, hasta que el texto te salga natural.",
    "ensayosAlt": "Lectura a velocidad fija, sin grabar",
    "appKicker": "La app de verdad",
    "appTitulo": "Lee, graba y exporta.",
    "appTexto": "Ajusta el tamaño de letra, la tipografía, el ancho y los colores. Usa negrita, colores y destacados en tu guion.",
    "galeriaEtiqueta": "Capturas de Sigo",
    "galeriaPosicion": "Posición del carrusel",
    "galeriaCaptura": "Captura {n} de {total}",
    "galeriaAlt1": "Sigo preparado para leer un guion con seguimiento de voz",
    "galeriaAlt2": "Guion con la vista de cámara en un recuadro",
    "galeriaAlt3": "Video con subtítulos y selector de estilo",
    "galeriaAlt4": "Editor de guion con los botones Leer y Grabar",
    "galeriaAlt5": "Ajustes con el modo Con la voz y la vista previa",
    "galeriaAlt6": "Ajustes de lectura a velocidad fija",
    "horizontalAlt": "Grabación en horizontal con el guion sobre la cámara",
    "horizontalTexto": "Graba de pie o de lado.",
    "guionesKicker": "Tus guiones a salvo",
    "guionesTitulo": "Tus guiones, contigo.",
    "guionesTexto": "Escribe, pega texto o importa archivos .txt, .md y .docx. Puedes usar Sigo sin iniciar sesión.",
    "guionesRespaldo": "Si quieres respaldar tus guiones y recuperarlos en otro teléfono, entra con Google.",
    "guionesAlt": "Ajustes con cuenta Google y respaldo de guiones",
    "cierreDisponible": "Pronto en Google Play",
    "cierreInvita": "Prueba Sigo antes que nadie. Escríbenos con el correo de tu cuenta de Google y te enviamos la invitación.",
    "cerrar": "Cerrar",
    "muestra": "Aa",
    "contadorInicio": "1",
    "contadorTotal": "/ 6",
    "marca": "Sigo",
    "copyright": "© Sigo",
    "playAlt": "Descargar en Google Play",
    "playAviso": "Google Play y el logotipo de Google Play son marcas de Google LLC.",
    "metaPublicada": "Sigo es el teleprompter que sigue tu voz: lees en voz alta y el texto avanza contigo. Si te detienes, te espera.",
    "ogPublicada": "El teleprompter que sigue tu voz.",
    "activos": "/activos/es"
},
  // Una ruta vacía omite el video: no se ofrece audio español en otro idioma.
  video: { archivo: "/activos/video/sigo-version-google-play-es.mp4" },
  idioma: 'es',
  // og:locale y hreflang
  locale: 'es_ES',
  // Donde vive cada pagina en este idioma. armar.mjs las escribe con cleanUrls: /privacidad
  // se sirve de privacidad.html.
  // -sitio-cuenta, 20-10-2026- Suma la página para borrar la cuenta. Antes:
  // rutas: { portada: '/', privacidad: '/privacidad', soporte: '/soporte', ayuda: '/ayuda' },
  rutas: { portada: '/', privacidad: '/privacidad', terminos: '/terminos', soporte: '/soporte', ayuda: '/ayuda', borrarCuenta: '/borrar-cuenta' },

  meta: {
    titulo: 'Sigo — Teleprompter de voz',
    descripcion: 'Sigo es el teleprompter que sigue tu voz: lees en voz alta y el texto avanza contigo. Si te detienes, te espera. Pronto en Google Play.',
    ogDescripcion: 'El teleprompter que sigue tu voz. Pronto en Google Play.',
    privacidadTitulo: 'Privacidad — Sigo',
    terminosTitulo: 'Términos de uso — Sigo',
    terminosDescripcion: 'Qué incluye Sigo gratis y Sigo+, cómo se cobra y cómo cancelar.',
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
  pie: { privacidad: 'Privacidad', terminos: 'Términos', soporte: 'Soporte', ayuda: 'Ayuda', borrarCuenta: 'Borrar cuenta' },

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
      // Antes: 'Sigo no envía estadísticas de uso.'
      // Antes: 'Sigo no usa Firebase Analytics ni Firebase Remote Config. Firebase se usa para iniciar sesión y guardar la copia de tus guiones; esos servicios transmiten los datos técnicos necesarios para funcionar.'
      'Sigo no usa Firebase Analytics. Usa Firebase Remote Config para recibir los límites de tiempo de la versión gratis.<small>Firebase recibe un ID de instalación (FID) para elegir qué valores de configuración devuelve a Sigo. Ese ID distingue una instalación y, por sí solo, no identifica a una persona ni a un dispositivo físico. <a href="https://firebase.google.com/support/privacy">Más información sobre privacidad en Firebase</a>.</small>',
      // -sitio-cuenta, 20-10-2026- Ya no es cierto: hay cuenta, opcional. Antes: 'Sigo no tiene cuentas.',
      'Iniciar sesión con Google es opcional.<small>Sigo funciona completo sin cuenta.</small>',
      // -sitio-cuenta, 20-10-2026- El inicio de sesión y la copia de seguridad -órdenes A y B-.
      'Si inicias sesión con Google, Sigo recibe tu correo, tu nombre y un identificador de cuenta.<small>Firebase guarda también el enlace a tu foto de perfil de Google, que Sigo no usa ni muestra.</small>',
      'La copia de seguridad de tus guiones se guarda en Firebase, de Google, en la región de Santiago de Chile.<small>Tus guiones viajan cifrados, y ninguna otra cuenta puede leerlos.</small>',
      'Firebase registra la dirección IP para frenar abusos.',
      'Si compras Sigo+, Google Play procesa el pago. Sigo no recibe ni ve los datos de tu tarjeta.',
      'RevenueCat comprueba si Sigo+ está activa.<small>Para hacerlo, procesa el historial de compras y el identificador que usa la app: el UID de Firebase si iniciaste sesión, o un identificador anónimo de RevenueCat si no. Sigo no le envía tu nombre ni tu correo. RevenueCat puede recibir datos de moneda y configuración regional para mostrar la oferta. <a href="https://www.revenuecat.com/privacy-policy">Lee la política de privacidad de RevenueCat</a>.</small>',
      'Los videos nunca salen del teléfono.',
      'Para borrar tu cuenta y la copia de seguridad de tus guiones: <a href="/borrar-cuenta">sigoteleprompter.com/borrar-cuenta</a>.',
      'Este sitio no usa cookies de seguimiento ni analítica.'
    ],
    contacto: 'Si tienes una pregunta, escríbenos.'
  },

  terminos: {
    titulo: 'Términos de uso',
    // -publicado el 26-10-2026, con el sí de Javier- Antes: vigencia: 'Vigentes desde el &#123;&#123;FECHA&#125;&#125;',
    vigencia: 'Vigentes desde el 26 de octubre de 2026',
    secciones: [
      { titulo: 'Quién ofrece Sigo', parrafos: ['Sigo es un teleprompter para Android que sigue tu voz. Sigo Teleprompter es un servicio de J. Arriagada, desarrollador independiente en Chile.', 'Contacto: <a href="mailto:hola@sigoteleprompter.com">hola@sigoteleprompter.com</a>.'] },
      { titulo: 'Usar Sigo gratis', parrafos: ['La versión gratis limita el tiempo de lectura por voz y grabación. Sus videos llevan marca de agua. <small>En la app ves los límites vigentes; pueden cambiar.</small>'] },
      { titulo: 'Sigo+', parrafos: ['Sigo+ permite leer y grabar sin límites de tiempo y guardar videos sin marca de agua. Hay planes mensual y anual. Pagas el precio e impuestos que Google Play muestra para tu país.'] },
      { titulo: 'El cobro', parrafos: ['Google Play cobra en tu cuenta de Google; Sigo no recibe ni ve los datos de tu tarjeta. La suscripción se renueva automáticamente hasta cancelar: cada mes o año, según el plan.'] },
      { titulo: 'Prueba gratis de 7 días', parrafos: ['Google Play ofrece 7 días gratis en ambos planes a clientes nuevos sin esa suscripción, según su verificación de elegibilidad. Pide un medio de pago. Si cancelas antes de terminar los 7 días, no pagas; si no, empieza el cobro recurrente al precio y frecuencia mostrados al comprar.'] },
      { titulo: 'Cancelar', parrafos: ['Cancela en Google Play → Suscripciones o en Sigo: Ajustes → «Sigo+ activo · Administrar». Evitas la renovación y mantienes Sigo+ hasta terminar lo pagado, salvo indicación de Google Play. Desinstalar no cancela.'] },
      { titulo: 'Reembolsos', parrafos: ['Solicita reembolso a Google Play según sus políticas, que dependen del país, fecha y compra. <a href="https://support.google.com/googleplay/answer/15574908">Consulta las políticas</a>. Si falla el cobro o Sigo+ no se activa, escribe a <a href="mailto:hola@sigoteleprompter.com">hola@sigoteleprompter.com</a>.'] },
      { titulo: 'Cambios de precio', parrafos: ['Google Play gestiona avisos y consentimiento según las reglas de tu país. Si no aceptas un aumento cuando te lo solicite, puedes cancelar. <a href="https://support.google.com/googleplay/android-developer/answer/12154973">Reglas de cambios de precio</a>.'] },
      { titulo: 'Tus guiones y videos', parrafos: ['Tus guiones y videos son tuyos. Sigo no los reclama ni reutiliza. Tú respondes por lo que lees, grabas y publicas y por tener los derechos necesarios.'] },
      { titulo: 'Uso correcto', parrafos: ['No uses Sigo para fines ilegales, dañar a otros ni evadir o romper el cobro.'] },
      { titulo: 'Sin garantías', parrafos: ['El reconocimiento de voz puede equivocarse. Al leer en vivo, ten el texto a mano. Esto no limita tus derechos legales.'] },
      { titulo: 'Responsabilidad', parrafos: ['Respondemos hasta donde lo permita la ley. Estos términos no limitan ni excluyen tus derechos obligatorios como consumidor.'] },
      { titulo: 'Privacidad y cuenta', parrafos: ['Lee la <a href="/privacidad">Política de privacidad</a>. Para borrar tu cuenta y la copia de seguridad, visita <a href="/borrar-cuenta">Borrar cuenta</a>.'] },
      { titulo: 'Cambios a estos términos', parrafos: ['Publicaremos aquí cada cambio con fecha. Avisaremos en la app sobre cambios importantes. La vigencia aparece al inicio.'] },
      { titulo: 'Ley aplicable', parrafos: ['Rige la ley de Chile, sin quitarte los derechos de protección al consumidor de tu país.'] }
    ]
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
      // -portugues-sitio, 2026-10-24- Desde el #149 el botón del idioma del guion abre un menú de tres idiomas -ES, EN y
      // PT-, y «ES/EN» lo explicaba mal. Antes:
      // { titulo: 'Tus guiones', parrafos: ['Toca + para crear uno. Pega texto o abre un archivo .txt, .md o .docx. En el editor, selecciona texto para negrita, colores y destacado. Lo que escribes entre corchetes es una nota: se ve, pero no se lee. ES/EN es el idioma en que Sigo escucha.'], captura: '[CAPTURA: editor con texto seleccionado y la barra de formato]', imagen: 'tus-guiones.webp', alt: 'El editor con texto seleccionado y la barra de formato arriba' },
      { titulo: 'Tus guiones', parrafos: ['Toca + para crear uno. Pega texto o abre un archivo .txt, .md o .docx. En el editor, selecciona texto para negrita, colores y destacado. Lo que escribes entre corchetes es una nota: se ve, pero no se lee. El botón del idioma -ES, EN o PT- es el idioma en que Sigo te escucha. Tócalo para elegir otro.'], captura: '[CAPTURA: editor con texto seleccionado y la barra de formato]', imagen: 'tus-guiones.webp', alt: 'El editor con texto seleccionado y la barra de formato arriba' },
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
    queSeBorra: 'Qué se borra: tu cuenta de Sigo (tu correo, tu nombre, el enlace a tu foto de perfil y el identificador de la cuenta) y toda la copia de seguridad de tus guiones. No guardamos copias.',
    // -borrar-cuenta-suscripcion, 31-10-2026- Google Play enlazado. Antes: (clave inexistente).
    // Motivo: borrar la cuenta no cancela Sigo+; hay que decirlo en el sitio también.
    avisoSuscripcion: 'Si tienes Sigo+, borrar tu cuenta no cancela la suscripción. Cancélala en <a href="https://play.google.com/store/account/subscriptions">Google Play</a> para dejar de pagar. También borramos tu registro de compras en RevenueCat; Google conserva el suyo.'
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
