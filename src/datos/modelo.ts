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

// LAS TRES PAREJAS DE FONDO Y LETRA DE LA LECTURA, y los tres colores con que se
// puede pintar un tramo de texto.
//
// Viven aca y no en styles.css a proposito: NO SON TEMA, SON DATO. El usuario los
// elige, se guardan con sus ajustes y se dibujan sobre la superficie de lectura,
// que esta exceptuada del sistema visual justamente porque sus colores son suyos.
//
// PAREJAS_COLOR estaba en App.tsx hasta la tarea 46 y se movio aca porque tambien
// la necesita EditorView para dibujar los cuadraditos donde se eligen. Una sola
// fuente de la verdad: si se agrega una pareja, se agrega aca y en ningun otro
// lado. sanitizarColores -src/app/ajustesIniciales.ts desde la tarea 81- la usa para descartar combinaciones viejas.
export const PAREJAS_COLOR = [
  { fondo: '#000000', letra: '#FFFFFF' },
  { fondo: '#000000', letra: '#F5C24B' },
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
  const segundos = Math.max(1, Math.round((palabras / 150) * 60))
  if (segundos < 60) return `${segundos} s`
  const m = Math.floor(segundos / 60)
  const s = segundos % 60
  return s === 0 ? `${m} min` : `${m}:${String(s).padStart(2, '0')} min`
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
