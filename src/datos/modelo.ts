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
// lado. sanitizarColores, en App.tsx, la usa para descartar combinaciones viejas.
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
    calidad: parcial.calidad
  }
}

export function guionNuevo(idioma: string): Guion {
  const ahora = Date.now()
  return {
    id: generarUuid(),
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
