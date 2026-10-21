// LOS TEXTOS DE LA APP EN ESPANOL -tarea 75, 27-09-2026-. Todo lo que el usuario ve o
// escucha -lo escrito, aria-label, title, placeholder, avisos- sale de aca o de en.ts, con
// las mismas claves. en.ts se declara con el tipo de este archivo: si falta una clave en
// ingles, tsc no compila.
//
// Espanol neutro: sin voseo, sin chilenismos. Las variables van entre llaves -{n}- y las
// reemplaza t() -textos/index.ts-.
//
// NO VIVEN ACA: el panel de diagnostico -la franja, "Ver transcripcion en vivo" y
// PanelCorpus-, que se elimina antes de publicar -P1f-; los mensajes de consola; el guion
// Hola, que es un texto largo con sus formatos y vive en App.tsx -bloqueDeBienvenida-.
export const es = {
  leer: 'Leer',
  grabar: 'Grabar',
  sinTitulo: 'Sin título',
  // Antes: seguro: '¿Seguro?',
  confirmarDescartar: '¿Descartar?',
  confirmarBorrar: '¿Borrar?',
  cerrar: 'Cerrar',
  borrar: 'Borrar',
  // "eliminar" se fue el 28-09-2026: el tacho dice lo mismo que "borrar" en toda la app.
  toma: 'Toma',
  volver: 'Volver',
  ajustesApp: 'Ajustes de la app',
  tema: 'Tema',
  temaClaro: 'Claro',
  temaOscuro: 'Oscuro',
  idiomaDeLaApp: 'Idioma de la app',
  buscar: 'Buscar',
  guiones: 'Guiones',
  archivados: 'Archivados',
  archivadosConteo: 'Archivados · {n}',
  // La lista plegada -tarea 76, 28-09-2026-: {n} es el total de guiones de la lista, sin
  // archivados.
  verTodosGuiones: 'Ver todos · {n}',
  verMenosGuiones: 'Ver menos',
  marcaArchivado: '(Archivado)',
  archivar: 'Archivar',
  desarchivar: 'Desarchivar',
  sinCoincidencias: 'No se encontraron guiones que coincidan con "{busqueda}".',
  sinArchivados: 'No hay guiones archivados.',
  listaVacia: 'No hay guiones en la lista principal.',
  volverATusGuiones: '‹ Volver a tus guiones',
  crearGuion: 'Crear nuevo guion',
  sinGuiones: 'Sin guiones',
  escribePrimerGuion: 'Escribe tu primer guion',
  resumenSinGuiones: '0 guiones',
  // -pulido-1- Sin tilde, como en el resto de la app. Antes: resumenUnGuion: '1 guión',
  resumenUnGuion: '1 guion',
  resumenGuiones: '{n} guiones',
  resumenUnMinuto: '1 minuto de lectura',
  resumenMinutos: '{n} minutos de lectura',
  hoy: 'hoy',
  ayer: 'ayer',
  haceDias: 'hace {n} días',
  haceUnaSemana: 'hace 1 semana',
  haceSemanas: 'hace {n} semanas',
  vacio: 'vacío',
  // -mejoras-claridad, 21-10-2026- La duración que es una estimación: «≈18 min», minutos redondeados.
  duracionAproximada: '≈{minutos} min',
  // -mejoras-claridad- La etiqueta chica arriba del título de la tarjeta grande y la palabra del «+».
  continuarConEsteGuion: 'Continuar con este guion',
  nuevoGuion: 'Nuevo guion',
  videos: 'Videos',
  videosVacio: 'Tus videos aparecerán aquí.',
  // Sin videos, con dibujo -tarea 76, 28-09-2026-. videosVacio se queda: es la línea del
  // 27-09 y la nombra el glosario de docs/ingles.txt.
  videosVacioTitulo: 'Aún no tienes videos',
  videosVacioLinea: 'Abre un guion y toca Grabar. Tus tomas aparecerán aquí.',
  // La banda de tomas del guion abierto -BandaTomas.tsx-. La miniatura no lleva más texto
  // que su duración: el lector de pantalla la nombra con tomaDuracion.
  tomasConteo: 'Tomas · {n}',
  tomaDuracion: 'Toma · {duracion}',
  incompleta: 'incompleta',
  sinAudio: 'sin audio',
  metaErrorMudo: 'el motor oyo y el archivo no tiene sonido',
  metaAvisoMudo: 'no se oye audio en este archivo',
  compartir: 'Compartir',
  // La palabra chica bajo la flecha de guardar -28-09-2026-; la frase larga queda para lectores de pantalla.
  guardar: 'Guardar',
  guardarEnGaleria: 'Guardar en galería',
  guardando: 'Guardando…',
  guardandoAvance: 'Guardando… {n}%',
  // -parar-largo- Mientras se guarda la toma al tocar Parar.
  guardandoToma: 'Guardando la toma…',
  repetir: 'Repetir',
  masAcciones: 'Más acciones',
  repetirToma: 'Repetir toma',
  // Los controles propios del reproductor -28-09-2026-.
  reproducir: 'Reproducir',
  avanceDelVideo: 'Avance del video',
  subtitulos: 'Subtítulos',
  subtitulosNo: 'No',
  subtitulosAmarillo: 'Amarillo',
  subtitulosRojo: 'Rojo',
  subtitulosFormal: 'Formal',
  // -tarea 96, 05-10-2026- Los filtros de la toma, en el visor. "Filtro" y no "Tono": Javier, es el
  // nombre más reconocido.
  filtro: 'Filtro',
  filtroNatural: 'Natural',
  filtroCalido: 'Cálido',
  filtroFrio: 'Frío',
  filtroVivo: 'Vivo',
  filtroSuave: 'Suave',
  filtroBN: 'B/N',
  // -tarea 87, 04-10-2026- Guardar y compartir -E1-. La posición de los subtítulos y el tiempo
  // estimado se sacaron el mismo día -Javier simplifica la 87-.
  guardarYCompartir: 'Guardar y compartir',
  compartirTrasGuardar: 'Quedó guardada, pero no se pudo compartir',
  avisoTomaRecuperada: 'Se recuperó una toma de una sesión interrumpida.',
  avisoTomasRecuperadas: 'Se recuperaron {n} tomas de una sesión interrumpida.',
  verla: 'Verla',
  guardado: 'Guardado',
  // -pulido-1- El auto-guardado falló: se avisa una vez por racha de fallos -App.tsx-.
  avisoGuardadoFallo: 'No se pudo guardar. Tus cambios siguen en pantalla.',
  guionBorrado: 'Guion borrado',
  guionArchivado: 'Guion archivado',
  sinSubtitulos: 'Esta toma no tiene subtítulos.',
  seccionAyuda: 'Ayuda',
  ayuda: 'Ayuda',
  enviarComentarios: 'Enviar comentarios',
  // -cuenta-google, orden A, 20-10-2026- La sección Cuenta de Ajustes: entrar con Google, salir y borrar la cuenta.
  seccionCuenta: 'Cuenta',
  continuarConGoogle: 'Continuar con Google',
  // -orden B, 20-10-2026- Texto nuevo. Antes: cuentaRespaldoLinea: 'Respalda tus guiones y tenlos en todos tus dispositivos.',
  cuentaRespaldoLinea: 'Inicia sesión y tus guiones quedan a salvo y en todos tus dispositivos.',
  cerrarSesion: 'Cerrar sesión',
  // -orden B, 20-10-2026- Texto nuevo. Antes: cuentaGuionesSeQuedan: 'Tus guiones se quedan en este teléfono.',
  cuentaGuionesSeQuedan: 'Cerraste sesión. Tus guiones siguen en este teléfono.',
  borrarCuenta: 'Borrar cuenta',
  borrarCuentaTitulo: '¿Borrar tu cuenta de Sigo?',
  // -orden B, 20-10-2026- Texto nuevo. Antes: borrarCuentaTexto: 'Se borran tu cuenta y la copia de tus guiones en la nube. Los guiones de este teléfono se quedan.',
  borrarCuentaTexto: 'Se borrarán tu cuenta y la copia de seguridad de tus guiones en la nube. No se puede deshacer.',
  cancelar: 'Cancelar',
  // -orden B, 20-10-2026- Texto nuevo. Antes: cuentaErrorSinCuenta: 'No hay una cuenta de Google en este teléfono.',
  cuentaErrorSinCuenta: 'No hay una cuenta de Google en este teléfono. Agrega una en los Ajustes del teléfono.',
  cuentaErrorSinRed: 'Sin conexión. Inténtalo de nuevo cuando tengas internet.',
  cuentaErrorOtro: 'No se pudo entrar. Inténtalo de nuevo.',
  // -orden B, 20-10-2026- La tarjeta de la cuenta arriba de Ajustes, el segundo párrafo del diálogo de
  // borrar, la línea de estado de la copia de seguridad -el término de Android y Google Fotos- y el error
  // de borrar la cuenta, que antes decía «No se pudo entrar».
  cuentaBienvenidaTitulo: 'Nunca pierdas un guion',
  borrarCuentaTexto2: 'Los guiones de este teléfono no se tocan.',
  respaldoCompleto: 'Copia de seguridad completa',
  respaldoSubiendo: 'Haciendo copia de seguridad…',
  respaldoEsperando: 'Esperando conexión',
  respaldoDemasiadoLargo: 'Un guion es demasiado largo para la copia de seguridad; queda solo en este teléfono.',
  cuentaErrorBorrar: 'No se pudo borrar la cuenta. Inténtalo de nuevo.',
  deshacer: 'Deshacer',
  // -tarea 94, 05-10-2026- Selección de tomas. {n} es la cuenta.
  tomasSeleccionadas: '{n} seleccionadas',
  seleccionarTodo: 'Seleccionar todo',
  tomasBorradas: '{n} tomas borradas',
  tomaDescartada: 'Toma descartada',
  // -tarea 83, parte B, LS-M2- Otra app tomó la cámara o el micrófono en plena toma.
  tomaCortadaCamara: 'Otra app tomó la cámara. La toma se cortó y quedó guardada como incompleta.',
  tomaCortadaMicrofono: 'Otra app tomó el micrófono. La toma se cortó y quedó guardada como incompleta.',
  grabado: 'Grabado',
  grabadoDuracion: 'Grabado: {duracion}',
  // Al parar una lectura -28-09-2026-: antes decia Grabado aunque no se grababa nada.
  lecturaDuracion: 'Lectura: {duracion}',
  lecturaTerminada: 'Lectura terminada',
  avisoErrorMudo: 'El motor oyo y el archivo no tiene sonido',
  avisoMudo: 'No se oye audio en este archivo',
  galeriaGuardada: 'Quedó en la galería del teléfono, en Películas.',
  galeriaNoSeGuardo: 'No se pudo guardar en la galería',
  galeriaNoSeGuardoPorque: 'No se pudo guardar en la galería: {detalle}',
  noSeCompartio: 'No se pudo compartir',
  // -tomas-grandes- La toma grande se abre con otra aplicación y no hay ninguna que abra video.
  sinAppParaVideo: 'No hay una aplicación para ver el video',
  noSeAbrioVideo: 'No se pudo abrir el video',
  // -visor-servidor- El servidor local no arrancó.
  servidorNoArranco: 'No se pudo preparar el video',
  guionImportado: 'Guion importado',
  descargandoModelo: 'Descargando modelo de voz para uso offline:',
  // Antes: errorModelo: 'Error descargando modelo de voz Vosk: {detalle}.',
  errorModelo: 'No se pudo descargar la voz. Revisa tu conexión y toca Reintentar.',
  desconocido: 'Desconocido',
  reintentar: 'Reintentar',
  ajustesLectura: 'Ajustes de lectura',
  idiomaDelGuion: 'Idioma del guion: {idioma}',
  idiomaEspanol: 'Español',
  idiomaIngles: 'Inglés',
  tituloDelGuion: 'Título del guion',
  metaEditor: '{palabras} palabras · {duracion}',
  tipografia: 'Tipografía',
  coloresLectura: 'Colores de lectura',
  parejaNegroBlanco: 'Negro con blanco',
  parejaNegroAmbar: 'Negro con ámbar',
  // 05-10-2026, tarea 95: las dos parejas que vuelven de A9 -modelo.ts, PAREJAS_COLOR-.
  parejaNegroVerde: 'Negro con verde',
  parejaGrisHueso: 'Gris con hueso',
  parejaBlancoNegro: 'Blanco con negro',
  // Antes: errorAbrirArchivo: 'Error al abrir archivo: {detalle}',
  archivoNoSoportado: 'No se puede abrir {nombre}. Usa un archivo .txt, .md o .docx.',
  archivoSinTexto: 'Ese archivo no tiene texto para importar.',
  archivoNoSeImporto: 'No se pudo abrir el archivo. Inténtalo de nuevo.',
  formatoSeleccion: 'Formato del texto seleccionado',
  negrita: 'Negrita',
  // La letra del boton de negrita: la inicial de la palabra, como en cualquier procesador
  // de texto del idioma.
  letraNegrita: 'N',
  ambar: 'Ámbar',
  celeste: 'Celeste',
  verde: 'Verde',
  destacado: 'Destacado',
  acotacion: 'Acotación',
  botonAcotacion: '[...] Acotación',
  // -pulido-1- Puntos suspensivos de un carácter. Antes: placeholderGuion: 'Escribe el texto...\n\nEj: …' -el resto igual-.
  placeholderGuion: 'Escribe el texto…\n\nEj: Hola, hoy te quiero contar cómo usar Sigo para grabar tus videos mirando a la cámara.',
  pegarTexto: 'Pegar texto',
  abrirArchivo: 'Abrir archivo',
  // -pulido-1- Puntos suspensivos de un carácter. Antes: leyendoArchivo: 'Leyendo...',
  leyendoArchivo: 'Leyendo…',
  tamanoLetra: 'Tamaño de letra',
  letraMenos: 'Disminuir letra panel',
  letraMas: 'Aumentar letra panel',
  anchoTexto: 'Ancho del texto',
  ancho: 'Ancho',
  medio: 'Medio',
  angosto: 'Angosto',
  salir: 'Salir',
  descartarToma: 'Descartar toma',
  pausa: 'Pausa',
  seguir: 'Seguir',
  parar: 'Parar',
  // -pulido-1- Sin tilde. Antes: guionSinBloques: 'Guión sin bloques',
  guionSinBloques: 'Guion sin bloques',
  grabando: 'Grabando',
  // -tarea 88, 04-10-2026- Control por gestos, en el panel de la cámara de LISTO.
  controlPorGestos: 'Control por gestos',
  controlPorGestosExplicacion: 'Palma: pausar o seguir. En pausa, la V termina la toma.',
  gestosSoloFrontal: 'Solo con la cámara frontal.',
  gestosNoDisponible: 'No disponible en este teléfono.',
  ajustesEscena: 'Ajustes de la escena',
  imagenCamara: 'Imagen de la cámara',
  imagenDetras: 'Detrás',
  imagenRecuadro: 'Recuadro',
  imagenOculta: 'Oculta',
  voltearCamara: 'Voltear cámara',
  camaraSigueEncendida: 'la cámara sigue encendida',
  calidadVideo: 'Calidad del video',
  dondeLees: 'Dónde lees',
  leerArriba: 'Leer arriba',
  leerAlMedio: 'Leer al medio',
  minutosDisponibles: 'Te alcanzan unos {n} minutos',
  menosDeDosMinutos: 'Quedan menos de 2 minutos de espacio',
  espejoYTiempo: 'Espejo y tiempo',
  espejo: 'Espejo',
  mostrarTiempo: 'Mostrar tiempo',
  brillo: 'Brillo',
  empezar: 'Empezar',
  duracionEstimada: 'duración estimada del guion',
  tiempoTranscurrido: 'tiempo transcurrido y total estimado',
  // Claves nuevas al final -tarea 77, 28-09-2026-: el orden de las anteriores no se toca.
  fichaArriba: 'Arriba',
  fichaAlMedio: 'Al medio',
  fichaCamaraDetras: 'Detrás',
  fichaCamaraRecuadro: 'Recuadro',
  fichaCamaraOculta: 'Oculta',
  fichaMas: 'Más',
  brilloAuto: 'Auto',
  brilloAutomatico: 'Automático',
  tituloAjustes: 'Ajustes',
  seccionLectura: 'Lectura',
  seccionVideo: 'Video',
  seccionApariencia: 'Apariencia',
  seccionAcerca: 'Acerca de',
  acercaDeSigo: 'Acerca de Sigo',
  tipoSans: 'Sans',
  tipoSerif: 'Serif',
  version: 'Versión',
  privacidad: 'Privacidad',
  soporte: 'Soporte',
  licencias: 'Licencias de código abierto',
  licenciaSinTexto: 'Sin texto de licencia.',
  espejoExplicacion: 'Para usar con un vidrio de teleprompter',
  lineaMuestraLectura: 'Lee esto en voz alta, sin apuro.',
  // -mejoras-claridad, 21-10-2026- La etiqueta arriba de la línea de muestra.
  vistaPrevia: 'Vista previa',
  // Dialogo de permiso de microfono -28-09-2026-.
  microfonoTitulo: 'Sigo necesita el micrófono',
  microfonoExplicacion: 'Escucha tu voz para avanzar el texto al ritmo en que lees. La voz se reconoce en el teléfono, sin internet.',
  ahoraNo: 'Ahora no',
  abrirAjustes: 'Abrir ajustes',
  // Diálogo de permiso de cámara -tarea 84, F1, 29-09-2026-: mismo diálogo que el del micrófono.
  camaraTitulo: 'Sigo necesita la cámara',
  camaraExplicacion: 'La cámara filma mientras lees. La imagen y el video quedan en el teléfono.',
  // La voz en inglés se baja de Google Play la primera vez -tarea 84, D3-.
  // -tarea 104- Ahora la voz de cualquier idioma se baja de Play -también el español-: {idioma} es
  // idiomaEs o idiomaEn. Sale abajo, donde se abren los paneles de las fichas, en el color normal del
  // texto -el rojo queda para grabar y borrar, Javier-.
  // Antes: vozSinConexion: 'Para leer en inglés hace falta conexión una vez, para bajar la voz en inglés. Después funciona sin internet.',
  vozSinConexion: 'Para leer en {idioma} hace falta conexión una vez, para bajar la voz. Después funciona sin internet.',
  // El idioma dentro de una frase, en minúscula -vozSinConexion, vozRechazada-. idiomaEspanol es el
  // de la lista, con mayúscula.
  idiomaEs: 'español',
  idiomaEn: 'inglés',
  // -tarea 104, lámina a- En la pastilla del tiempo, al lado de Empezar, mientras baja la voz.
  preparandoVoz: 'Preparando la voz…',
  // -tarea 104- Al apretar Empezar Play preguntó si bajar con datos móviles y la persona dijo que no.
  vozRechazada: 'La voz en {idioma} se va a bajar cuando tengas Wi-Fi. Para bajarla ahora con datos, toca Reintentar y acepta.',
  // -tarea 104, lámina c- La fila de Control por gestos mientras baja su modelo, y sin internet.
  preparandoGestos: 'Preparando los gestos… {n} %',
  gestosSinConexion: 'Para usar gestos hace falta conexión una vez, para bajarlos. Después funcionan sin internet.',
  gestosRechazados: 'Los gestos se van a bajar cuando tengas Wi-Fi. Para bajarlos ahora con datos, enciende el interruptor y acepta.',
  // El nombre del campo del título del guion para el lector de pantalla -tarea 84, G3-.
  nombreCampoTitulo: 'Título del guion',
  // La flecha de las fichas de Grabar, para el lector de pantalla -tarea 93, 05-10-2026-.
  masOpciones: 'Más opciones',
  menosOpciones: 'Menos opciones',
  // Marcas de guía de primera vez -tarea 105, PASO 2-.
  entendido: 'Entendido',
  marcaGuiaIdioma: 'Sigo escucha tu voz en este idioma. Tócalo si tu guion es en otro.',
  // {idioma} es idiomaEs / idiomaEn -minúscula en español-.
  marcaGuiaIdiomaDetectado: 'Tu guion está en {idioma}: Sigo te escuchará en {idioma}. Toca para cambiarlo.',
  marcaGuiaRecuadro: 'Arrástralo a donde no te tape.',
  // Antes: 'Para seguir, baja la mano y vuelve a mostrar la palma: cuenta 3 segundos.'
  // Por qué cambió: explicaba solo seguir, no pausar ni dejar de hablar.
  marcaGuiaPalma: 'Para pausar, deja de hablar y muestra la palma. Para seguir, baja la mano y muéstrala de nuevo: cuenta 3 segundos.',
  marcaGuiaSubtitulos: 'Elige aquí los subtítulos antes de guardar.',
  // Ajustes de pantallas -10-10-2026-: el dock de LISTO en Grabar, de pie en el teléfono. Los rótulos
  // de los grupos de fichas, Voltear de la fila de abajo, la duración y el panel de Ajustes de la toma.
  rotuloGrupoTexto: 'Texto',
  rotuloGrupoCamara: 'Cámara',
  voltear: 'Voltear',
  duraAprox: 'dura aprox.',
  tituloAjustesToma: 'Ajustes de la toma',
  seccionPantalla: 'Pantalla',
  calidad: 'Calidad',
  estabilizar: 'Estabilizar',
  estabilizarExplicacion: 'Corrige el temblor de la mano. Recorta un poco los bordes.',
  // Accesos directos del ícono -11-10-2026-.
  accesoGrabar: 'Grabar',
  accesoGrabarTitulo: 'Grabar «{titulo}»',
  // Tarea 106 «Velocidad fija» -14-10-2026-: el modo de lectura y la velocidad en siete niveles.
  modoLectura: 'Modo de lectura',
  modoConLaVoz: 'Con la voz',
  modoVelocidadFija: 'Velocidad fija',
  modoVozCorto: 'Voz',
  explicacionModoVoz: 'El texto sigue tu voz.',
  explicacionModoFija: 'El texto sube solo, a la velocidad que elijas.',
  velocidad: 'Velocidad',
  rotuloVelocidad: 'velocidad',
  sigueTuVoz: 'sigue tu voz',
  velocidadNivel: 'Velocidad, nivel {n} de 7',
  velocidadFijaNivel: 'Velocidad fija, nivel {n} de 7',
  masLento: 'Más lento',
  masRapido: 'Más rápido',
  // Arreglos chicos de uso -estudio 1-.
  nadaCopiado: 'No hay texto copiado',
  abrirEnEditor: 'Abrir en el editor',
  cerrarSeleccion: 'Cerrar selección'
}

export type ClaveTexto = keyof typeof es
export type Textos = Record<ClaveTexto, string>
