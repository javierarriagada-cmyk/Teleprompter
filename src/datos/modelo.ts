import type { PausaToma } from '../lib/tramos'
export type TramoFormato = {
  desde: number
  hasta: number
  negrita?: boolean
  color?: 'ambar' | 'celeste' | 'salvia'
  // Fondo amarillo y letra negra, como un resaltador. 24-09-2026. Es lo que
  // mas se ve a distancia y de pasada, que es como se lee un teleprompter.
  // Opcional: un guion sin destacados se guarda igual que antes.
  destacado?: boolean
}

// LAS CINCO PAREJAS DE FONDO Y LETRA DE LA LECTURA -cinco desde el 05-10-2026, tarea 95-, y
// los tres colores con que se puede pintar un tramo de texto.
// Antes: «LAS TRES PAREJAS DE FONDO Y LETRA DE LA LECTURA, y los tres colores con que se
// puede pintar un tramo de texto.»
//
// Viven aca y no en styles.css a proposito: NO SON TEMA, SON DATO. El usuario los
// elige, se guardan con sus ajustes y se dibujan sobre la superficie de lectura,
// que esta exceptuada del sistema visual justamente porque sus colores son suyos.
//
// PAREJAS_COLOR estaba en App.tsx hasta la tarea 46 y se movio aca porque tambien
// la necesita EditorView para dibujar los cuadraditos donde se eligen. Una sola
// fuente de la verdad: si se agrega una pareja, se agrega aca y en ningun otro
// lado. sanitizarColores -src/app/ajustesIniciales.ts desde la tarea 81- la usa para descartar combinaciones viejas.
//
// 05-10-2026, TAREA 95: DE TRES A CINCO PAREJAS. Javier aprobo el 07-09-2026 -decisiones-de-
// diseno.txt, A9- TRES FONDOS -negro interior, gris muy oscuro para la halacion, blanco
// exterior- y TRES LETRAS sobre los fondos oscuros -blanco, ambar y verde fuerte-. En la tarea
// 44 quedaron tres parejas y se cayeron el gris y el verde sin ninguna razon escrita. Vuelven:
//
//   GRIS MUY OSCURO CON LETRA HUESO, #121212 / #EDE6D6. Es el remedio de A9 contra la
//   HALACION: cerca de la mitad de la gente tiene algo de astigmatismo y la letra blanca sobre
//   negro puro le "brilla" y se desdibuja. Lo que la produce es el salto de luminancia, 21:1
//   del blanco sobre negro. #121212 es el gris que la guia de tema oscuro de Material propone
//   como superficie justamente por eso -no es negro puro y sigue sin iluminar la cara-, y el
//   hueso #EDE6D6 es un blanco calido al ~80 % de la luminancia del blanco: le saca el filo sin
//   que se lea gris. Contraste medido con la formula de WCAG 2.x -luminancia relativa,
//   (L1 + 0,05) / (L2 + 0,05)-: 15,07:1. Sobra para AAA -7:1- y baja de 21 a 15.
//
//   NEGRO CON LETRA VERDE FUERTE, #000000 / #4ADE80. Verde saturado pero no fosforescente: el
//   verde puro #00FF00 da 15,3:1 y encandila de reojo, que es como se lee un teleprompter. El
//   #4ADE80 da 12,05:1, casi lo mismo que el ambar de al lado -12,70:1-, asi las dos letras de
//   color pesan igual a la vista y ninguna llega al brillo duro del blanco. AAA con holgura.
//
// Medido el 05-10-2026 con la misma formula sobre las cinco: negro/blanco 21:1, negro/ambar
// 12,70:1, negro/verde 12,05:1, gris/hueso 15,07:1, blanco/negro 21:1.
//
// TODO LO QUE DISTINGUE CLARO DE OSCURO MIRA SOLO SI EL FONDO ES #FFFFFF -colorLetraEfectiva y
// colorDeTramo en estiloLectura.ts, isWhiteBg en TeleprompterView.tsx: la banda de B4, la
// capsula del destacado, la sombra de la letra sobre la camara, el halo de Grabar-. Las dos
// nuevas son oscuras, asi que toman el camino de las oscuras sin tocar nada de eso: banda de
// LUZ, tramos claros, letra de la pareja. El velo de los controles y el halo de la letra sobre
// la camara usan el color de fondo de la pareja tal cual -hexToRgb, --fondo-lectura-.
//
// EL ORDEN es el de la lista donde se eligen -PantallaAjustes.tsx-: primero las tres letras
// sobre negro, despues el gris, al final el blanco, que es la de exterior. La primera sigue
// siendo la de omision: sanitizarColores cae en PAREJAS_COLOR[0].
// Antes, desde la tarea 44:
//   { fondo: '#000000', letra: '#FFFFFF' },
//   { fondo: '#000000', letra: '#F5C24B' },
//   { fondo: '#FFFFFF', letra: '#000000' }
export const PAREJAS_COLOR = [
  { fondo: '#000000', letra: '#FFFFFF' },
  { fondo: '#000000', letra: '#F5C24B' },
  { fondo: '#000000', letra: '#4ADE80' },
  { fondo: '#121212', letra: '#EDE6D6' },
  { fondo: '#FFFFFF', letra: '#000000' }
]

export const COLORES_TRAMO = {
  ambar: '#F0C070',
  celeste: '#8FB8DE',
  salvia: '#9CC5A1'
}

// LOS MISMOS TRES COLORES, PARA FONDO BLANCO. Los de arriba son claros y estan
// pensados para fondo negro: sobre la pareja blanca el ambar casi no se leia.
// Son el mismo tono, oscurecido hasta contraste 4.5:1 o mas sobre blanco. Se
// eligen con colorDeTramo -estiloLectura.ts-, igual que la letra pasa a negra
// sobre blanco con colorLetraEfectiva. 24-09-2026.
export const COLORES_TRAMO_SOBRE_CLARO = {
  ambar: '#8F5B00',
  celeste: '#2B679E',
  salvia: '#3C7347'
}

// El destacado es igual sobre cualquier fondo: amarillo con letra negra se lee
// sobre negro y sobre blanco.
export const DESTACADO = { fondo: '#FFE066', letra: '#111111' }

export type Bloque = {
  id: string        // uuid
  nombre: string    // puede ir vacio
  texto: string
  tramos?: TramoFormato[]
}

export type Guion = {
  id: string
  titulo: string
  idioma: string    // 'es', 'en', 'pt'... codigo corto. NUNCA cablear 'es'.
  // true si la persona eligio el idioma a mano en el editor: desde ahi ya no lo cambia la
  // deteccion -lib/detectarIdioma.ts-. Un guion guardado sin el campo se detecta como antes.
  idiomaElegido?: boolean
  creado: number    // epoch ms
  modificado: number
  archivado?: boolean
  bloques: Bloque[]
}

export type ResumenGuion = {
  id: string
  titulo: string
  idioma: string
  modificado: number
  palabras: number
  archivado?: boolean
  // Las primeras palabras del texto: el nombre que se muestra si el guion no tiene titulo
  // -28-09-2026, inicioDelTexto-.
  inicio?: string
}

// LAS PRIMERAS PALABRAS, PARA UN GUION SIN TITULO -28-09-2026-. La lista mostraba "Sin titulo" en
// cada guion creado sin nombre: con varios, una columna de filas iguales. El agente de pruebas de
// Firebase lo encontro al crear un guion y no poder reconocerlo en la lista; Javier: "toda la razon
// en que aparezcan las primeras palabras si no existen titulos". Se saltan las acotaciones
// -[...]-, que no se leen en voz alta.
export const PALABRAS_DEL_INICIO = 6

export function inicioDelTexto(g: Guion): string {
  if (!g || !g.bloques) return ''
  const texto = g.bloques
    .map((b) => b.texto || '')
    .join(' ')
    .replace(new RegExp(REGEX_ACOTACION.source, REGEX_ACOTACION.flags), ' ')
  const palabras = texto.trim().split(/\s+/).filter(Boolean)
  if (palabras.length === 0) return ''
  const inicio = palabras.slice(0, PALABRAS_DEL_INICIO).join(' ')
  return palabras.length > PALABRAS_DEL_INICIO ? `${inicio}…` : inicio
}

export function generarUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Indice de una toma. El mp4 y la miniatura viven en disco; aca va SOLO
// lo que la biblioteca necesita para listar, reproducir y borrar.
// Es el mismo dato que el sidecar {id}.json que se escribe mientras se graba:
// si la aplicacion muere a mitad de la toma, al arrancar se reconstruye
// este indice desde el sidecar y el .part, y se marca incompleta.
export type ResumenGrabacion = {
  id: string
  guionId?: string
  tituloGuion: string
  creado: number
  duracionMs: number
  bytes: number
  ruta: string
  rutaMiniatura: string
  tieneAudio: boolean
  incompleta: boolean
  avisoMudo?: boolean
  errorMudo?: boolean
  calidad?: string
  // La copia en la galeria del telefono, si ya se guardo -24-09-2026-. Una toma
  // guardada ofrece Compartir y Borrar, y nada mas: sus subtitulos quedaron como
  // se eligieron al guardar -Javier: "ya se guardaron asi no mas"-.
  galeriaUri?: string
  // Con que subtitulos quedo esa copia: el visor la muestra igual.
  estiloGaleria?: 'no' | 'amarillo' | 'rojo' | 'formal'
  // -tarea 87, parte C, 04-10-2026- Cómo se VE la toma -lib/orientacion.ts-: un 1920x1080 con
  // rotación 90 es vertical. Sin el dato -toma vieja o APK viejo- el visor la analiza al abrirla.
  // Campo opcional: no se sube DB_VERSION.
  orientacion?: 'vertical' | 'horizontal' | 'cuadrada'
  // -tarea 88, 04-10-2026- Las pausas de la toma, en el reloj del video -lib/tramos.ts-. Lo pausado no
  // está en la toma: el visor lo salta y Guardar lo corta. Campo opcional: no se sube DB_VERSION.
  pausas?: PausaToma[]
}

export function grabacionNueva(parcial: Partial<ResumenGrabacion> & Pick<ResumenGrabacion, 'tituloGuion'>): ResumenGrabacion {
  return {
    id: parcial.id || generarUuid(),
    guionId: parcial.guionId,
    tituloGuion: parcial.tituloGuion,
    creado: parcial.creado ?? Date.now(),
    duracionMs: parcial.duracionMs ?? 0,
    bytes: parcial.bytes ?? 0,
    ruta: parcial.ruta ?? '',
    rutaMiniatura: parcial.rutaMiniatura ?? '',
    tieneAudio: parcial.tieneAudio ?? false,
    incompleta: parcial.incompleta ?? false,
    avisoMudo: parcial.avisoMudo,
    errorMudo: parcial.errorMudo,
    calidad: parcial.calidad,
    galeriaUri: parcial.galeriaUri,
    estiloGaleria: parcial.estiloGaleria,
    orientacion: parcial.orientacion,
    ...(parcial.pausas && parcial.pausas.length > 0 ? { pausas: parcial.pausas } : {})
  }
}

export function guionNuevo(idioma: string): Guion {
  const ahora = Date.now()
  return {
    id: generarUuid(),
    // Se guarda en espanol en los dos idiomas de la app: es una marca, no un texto -ver
    // TITULO_SIN_NOMBRE en textos/index.ts-. Para mostrarlo, tituloVisible().
    titulo: 'Sin título',
    idioma,
    creado: ahora,
    modificado: ahora,
    archivado: false,
    bloques: [
      {
        id: generarUuid(),
        nombre: '',
        texto: ''
      }
    ]
  }
}

import { REGEX_ACOTACION } from '../lib/acotaciones'
import { t } from '../textos'

// CUANTO DURA LEIDO, EN UN SOLO FORMATO. 24-09-2026.
// La tarjeta de la portada decia "01:30" -su propio formatearDuracion- y la
// fila del mismo guion, justo debajo, "2 min" -redondeado aparte-. Dos
// numeros distintos para la misma cosa, uno arriba del otro. Ahora los dos
// salen de aca: "45 s", "1:30 min", "2 min". A 150 palabras por minuto,
// el mismo ritmo de siempre.
// El formato sirve igual en ingles -"45 s", "2:09 min"-; solo 'vacío' se traduce -tarea 75-.
export function duracionDeLectura(palabras: number): string {
  if (!palabras || palabras <= 0) return t('vacio')
  // Nunca "0 s" para un guion con palabras -28-09-2026-: uno de una palabra decia "0 s" en la
  // portada, como si estuviera vacio.
  // Antes -hasta 2026-10-10-: const segundos = Math.max(1, Math.round((palabras / 150) * 60))
  // Ajustes de pantallas, 10-10-2026: la cuenta pasa a segundosDeLectura, que comparte con la
  // duración del dock de LISTO -«2:50», la misma estimación del editor-.
  const segundos = segundosDeLectura(palabras)
  if (segundos < 60) return `${segundos} s`
  const m = Math.floor(segundos / 60)
  const s = segundos % 60
  return s === 0 ? `${m} min` : `${m}:${String(s).padStart(2, '0')} min`
}

// LA ESTIMACIÓN DEL EDITOR, EN SEGUNDOS -ajustes de pantallas, 10-10-2026-. La misma cuenta de
// duracionDeLectura -150 palabras por minuto, nunca 0 con palabras-; 0 si no hay palabras.
// UNA SOLA ESTIMACIÓN -ajustes de pantallas, segunda vuelta, 10-10-2026-. Es la ÚNICA cuenta de lo que
// dura un guion: la usan el editor -duracionDeLectura-, el dock de LISTO -duracionDeLecturaReloj- y el
// total de la pastilla de tiempo -BarraDeTiempo, antes y durante la toma-. Antes la pastilla contaba
// los tokens del seguidor -que incluyen las notas entre corchetes- a su propio ritmo, y el mismo guion
// decía 2:48 en el dock y 02:53 al arrancar. Las palabras son las de contarPalabras. Durante la toma,
// cuando el motor ya midió el ritmo del que lee, la pastilla pasa ese ritmo en ppm: la cuenta es la
// misma, con otro ritmo. Antes:
//   export function segundosDeLectura(palabras: number): number {
//     if (!palabras || palabras <= 0) return 0
//     return Math.max(1, Math.round((palabras / 150) * 60))
//   }
export const PALABRAS_POR_MINUTO = 150
export function segundosDeLectura(palabras: number, ppm: number = PALABRAS_POR_MINUTO): number {
  if (!palabras || palabras <= 0) return 0
  const ritmo = ppm > 0 ? ppm : PALABRAS_POR_MINUTO
  return Math.max(1, Math.round((palabras / ritmo) * 60))
}

// LA DURACIÓN DEL DOCK DE LISTO -ajustes de pantallas, 10-10-2026-: la misma estimación del editor,
// en reloj y sin la unidad -«2:50» y debajo «dura aprox.»-. 45 s se ve «0:45».
export function duracionDeLecturaReloj(palabras: number): string {
  const segundos = segundosDeLectura(palabras)
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`
}

export function contarPalabras(g: Guion): number {
  let total = 0
  if (!g || !g.bloques) return 0
  for (const b of g.bloques) {
    if (!b.texto) continue
    const sinAcotaciones = b.texto
      .replace(new RegExp(REGEX_ACOTACION.source, REGEX_ACOTACION.flags), ' ')
      .replace(/[\[\(].*$/g, ' ')
    const palabras = sinAcotaciones.trim().split(/\s+/).filter(Boolean)
    total += palabras.length
  }
  return total
}

export function calcularDuracionTexto(palabras: number, ppm: number = 150): string {
  if (palabras <= 0) return '0:00'
  const totalSegundos = Math.round((palabras / ppm) * 60)
  const mins = Math.floor(totalSegundos / 60)
  const segs = totalSegundos % 60
  return `${mins}:${segs.toString().padStart(2, '0')}`
}
