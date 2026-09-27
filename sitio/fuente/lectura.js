// LA LECTURA DE LA PORTADA: que muestra la pantalla de Sigo en cada milisegundo. 27-09-2026,
// docs/el-sitio.md version 2, secciones 3 y 5.
//
// Corre EN EL PC, al armar el sitio -armar.mjs lo carga con Vite, que entiende TypeScript-,
// no en el navegador. Y corre la conduccion de la aplicacion, no una copia: el mismo
// seguidor -src/lib/seguidor.ts-, el mismo avance -src/lib/avance.ts- y la misma conduccion
// -src/lib/conduccion.ts-, en el mismo orden en que los llama la aplicacion -useSeguidor.ts
// y el lazo de TeleprompterView.tsx-, cuadro por cuadro. Lo que sale es desde que palabra
// habria ido el destacado en la pantalla del telefono con esa voz.
//
// NADA DE ESTO SE PUBLICA -Javier, 27-09-2026: "la pagina no debe incluir ni copiar la logica
// del motor"; todo JavaScript publicado se puede leer-. Lo que se publica es un JSON de
// numeros: el milisegundo y la palabra destacada, los tiempos de la voz de cada palabra -para
// la onda y los subtitulos-, y los subtitulos ya cortados. La pagina solo los dibuja. El
// renglon NO se decide aca: depende del ancho de la pantalla, y lo mide la pagina.
//
// DE DONDE SALEN LOS TIEMPOS. El texto del telefono es el de docs/el-sitio.md seccion 5, con
// sus formatos, y ninguna toma del corpus lo lee. Asi que la VOZ es estimada, como dice esa
// seccion: 150 palabras por minuto, cada palabra un poco mas larga o mas corta segun sus
// letras, y pausas en las comas, en los puntos y entre parrafos. Mas UNA pausa de pensar, a
// proposito, despues de "Si me detengo a pensar,": es la que muestra la escena E2. Con esa
// voz se escribe un registro con el mismo formato que deja una toma -lineas 'palabras
// FINAL'- y de ahi en adelante todo es lo de la aplicacion: los parciales como los entrega
// Vosk, con la demora medida del reconocedor, el seguidor, el avance y los subtitulos.
//
// LA LECTURA DEFINITIVA -Javier la grabara leyendo este mismo texto-: su registro va en TOMA.
// Si su guion no es este texto, se para: los formatos se dibujan sobre este.

import fs from 'node:fs'
import { leerCorpus } from '../../src/lib/repetidor'
import { tokenizarGuion, crearSeguidor } from '../../src/lib/seguidor'
import { crearMotorDeAvance } from '../../src/lib/avance'
import { procesarFinal, procesarParcial } from '../../src/lib/conduccion'
import { palabrasDelDestacado } from '../../src/lib/destacado'
import { armarSubtitulos } from '../../src/lib/subtitulos'

// EL TEXTO DEL TELEFONO, con los formatos del editor -src/datos/modelo.ts, COLORES_TRAMO y
// DESTACADO-: **negrita**, {ambar}...{/}, {celeste}...{/}, {salvia}...{/} -el verde- y
// ==destacado==. Un parrafo por elemento.
export const GUION = [
  'Hoy quiero contarte algo **importante**. Durante años grabé videos mirando un papel, y se notaba. Ahora leo, hablo y {salvia}el texto me sigue{/}. {ambar}Sin apuro.{/} {celeste}Sin perder el hilo.{/} Y lo que no se me puede pasar, ==lo marco en amarillo==.',
  'Si me detengo a pensar, el texto me espera. Cuando vuelvo a hablar, sigue conmigo. Miro al lente, no a la pantalla, y quien me ve siente que le hablo directamente.',
  'Grabo de principio a fin, sin cortes, y al terminar el video ya lleva sus subtítulos. Lo comparto así, tal como salió.'
]
// Cuantos parrafos se leen. El ultimo no: esta para que debajo del renglon vivo siempre haya
// guion, como en la aplicacion, y para que el teleprompter comun de E2 tenga por donde correr.
export const PARRAFOS_LEIDOS = 2

// La toma real de este texto, cuando exista. null: la voz estimada de abajo.
export const TOMA = null

// La pantalla con que se dibuja: letra 26 -mas grande que la de todos los dias, porque el
// telefono de la pagina se ve chico en un telefono de verdad-, columna completa con 5% de
// margen, "donde lees" arriba. Son ajustes que la aplicacion tiene.
export const PANTALLA = { letra: 26, tipo: 'serif', angosta: false, margen: 5, anclaje: 'arriba', fondo: '#151312' }
// El ancho del telefono dibujado, en px de CSS -estilo.css, .pantalla-lectura-.
export const ANCHO_PANTALLA = 360

// ---- la voz estimada ----
const MS_POR_PALABRA = 60000 / 150
const PAUSA_COMA_MS = 260
const PAUSA_PUNTO_MS = 620
const PAUSA_PARRAFO_MS = 1100
// La pausa de pensar de E2, despues de esta palabra.
export const PAUSA_PENSAR = { despuesDe: 'pensar,', ms: 2800 }
// Cuanto despues de la ultima palabra cierra Vosk la frase: con una pausa de este largo.
const CIERRE_FRASE_MS = 600
// Demora del reconocedor para armar los parciales -src/lib/compensacion.ts: "esa palabra
// llega 0,35 s despues de dicha: en el telefono de Javier"-.
export const DEMORA_PARCIAL_MS = 350

// El lazo de la aplicacion corre a unos 60 cuadros por segundo -requestAnimationFrame-.
const PASO_MS = 16

// ---------- el texto y sus formatos ----------

// Saca las marcas y devuelve el texto plano con sus tramos -desde, hasta, formato-.
function leerFormatos(parrafos) {
  const tramos = []
  const lineas = []
  let base = 0
  for (const p of parrafos) {
    let plano = ''
    let i = 0
    const abiertos = {}
    while (i < p.length) {
      if (p.startsWith('**', i)) {
        abrirOCerrar('negrita')
        i += 2
      } else if (p.startsWith('==', i)) {
        abrirOCerrar('destacado')
        i += 2
      } else if (p.startsWith('{/}', i)) {
        const color = Object.keys(abiertos).find((k) => k !== 'negrita' && k !== 'destacado')
        if (!color) throw new Error(`GUION: "{/}" sin color abierto en "${p}".`)
        abrirOCerrar(color)
        i += 3
      } else if (p[i] === '{') {
        const fin = p.indexOf('}', i)
        const color = p.slice(i + 1, fin)
        if (!['ambar', 'celeste', 'salvia'].includes(color)) throw new Error(`GUION: color "${color}" no es de la aplicacion.`)
        abrirOCerrar(color)
        i = fin + 1
      } else {
        plano += p[i]
        i++
      }
    }
    if (Object.keys(abiertos).length) throw new Error(`GUION: quedo abierto ${Object.keys(abiertos).join(', ')}.`)
    lineas.push(plano)
    base += plano.length + 1

    function abrirOCerrar(formato) {
      const aqui = base + plano.length
      if (formato in abiertos) {
        tramos.push({ desde: abiertos[formato], hasta: aqui, formato })
        delete abiertos[formato]
      } else {
        abiertos[formato] = aqui
      }
    }
  }
  return { texto: lineas.join('\n'), tramos }
}

// ---------- el registro de la voz estimada ----------

const normalizar = (s) => s.toLowerCase().replace(/[^a-z0-9áéíóúñü]/gi, '')

function registroEstimado(texto, tokens) {
  const letras = tokens.map((t) => normalizar(texto.substring(t.desdeChar, t.hastaChar)).length || 1)
  const media = letras.reduce((s, x) => s + x, 0) / letras.length
  const voz = []
  let t = 400
  tokens.forEach((tok, k) => {
    const dur = MS_POR_PALABRA * (0.45 + (0.55 * letras[k]) / media)
    voz.push([Math.round(t), Math.round(t + dur * 0.86)])
    t += dur
    const crudo = texto.substring(tok.desdeChar, tok.hastaChar)
    const siguiente = tokens[k + 1]
    if (crudo === PAUSA_PENSAR.despuesDe) t += PAUSA_PENSAR.ms
    else if (siguiente && siguiente.linea !== tok.linea) t += PAUSA_PARRAFO_MS
    else if (/[.?!]$/.test(crudo)) t += PAUSA_PUNTO_MS
    else if (/[,;:]$/.test(crudo)) t += PAUSA_COMA_MS
  })
  // Frases como las cierra Vosk: donde la voz calla mas de medio segundo.
  const lineas = []
  let frase = []
  tokens.forEach((tok, k) => {
    frase.push(k)
    const silencio = k + 1 < tokens.length ? voz[k + 1][0] - voz[k][1] : Infinity
    if (silencio > 500) {
      const palabras = frase.map((j) => `${normalizar(texto.substring(tokens[j].desdeChar, tokens[j].hastaChar))}@${voz[j][0]}-${voz[j][1]}`)
      lineas.push(`${voz[k][1] + CIERRE_FRASE_MS}\tpalabras\tFINAL: ${palabras.join(' ')}`)
      frase = []
    }
  })
  const registro = [
    '# REGISTRO DEL MOTOR DE UNA TOMA',
    '# toma: voz estimada de la pagina -sitio/fuente/lectura.js-',
    '# motor de voz: estimado',
    `# letra: ${PANTALLA.letra} px, ${PANTALLA.tipo}`,
    `# columna: completa, margen ${PANTALLA.margen}%`,
    `# donde lees: ${PANTALLA.anclaje}`,
    '# ---------- GUION, TAL CUAL SE LEYO ----------',
    ...texto.split('\n').map((l) => `# | ${l}`),
    '# ---------------------------------------------',
    '',
    'ms\ttipo\tdetalle',
    ...lineas
  ].join('\n')
  return { registro, voz }
}

// ---------- lo que recibio la aplicacion ----------

function leerPalabras(registro) {
  const frases = []
  for (const linea of registro.split(/\r?\n/)) {
    if (linea.startsWith('#')) continue
    const c = linea.split('\t')
    if (c.length < 3 || c[1] !== 'palabras' || !c[2].startsWith('FINAL')) continue
    const palabras = [...c[2].matchAll(/(\S+)@(-?\d+)-(-?\d+)/g)].map((m) => ({ w: m[1], desde: +m[2], hasta: +m[3] }))
    if (palabras.length) frases.push({ ms: +c[0], palabras })
  }
  return frases
}

// { ms, final, texto } en orden. Si el registro trae lo que entrego el reconocedor -'oyo'-,
// se usa tal cual; si no, se arman los parciales palabra por palabra.
function eventosDelReconocedor(registro, corpus) {
  const oyo = corpus.eventos.filter((e) => e.tipo === 'oyo')
  if (oyo.length) return oyo.map((e) => ({ ms: e.ms, final: e.final, texto: e.texto }))
  const frases = leerPalabras(registro)
  if (!frases.length) throw new Error('El registro no trae lineas "oyo" ni "palabras FINAL": no hay tiempos.')
  const eventos = []
  for (const f of frases) {
    f.palabras.forEach((p, k) => {
      // Un parcial nunca llega despues de la frase cerrada que lo contiene.
      const ms = Math.min(f.ms, p.hasta + DEMORA_PARCIAL_MS)
      eventos.push({ ms, final: false, texto: f.palabras.slice(0, k + 1).map((x) => x.w).join(' ') })
    })
    eventos.push({ ms: f.ms, final: true, texto: f.palabras.map((x) => x.w).join(' ') })
  }
  return eventos.sort((a, b) => a.ms - b.ms || (a.final ? 1 : 0) - (b.final ? 1 : 0))
}

// ---------- el HTML del guion ----------

function escaparHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Como TeleprompterView.tsx: una linea por renglon del guion, cada palabra en un
// <span data-token="N"> con el numero de tokenizarGuion. Los formatos van como clases -la
// pagina los pinta en la escena E3-. El espacio entre dos palabras destacadas tambien se
// destaca, como en el editor: el amarillo es una sola franja.
function htmlDelGuion(texto, tokens, tramos) {
  // Una palabra toma el formato si se cruza con el tramo: "**importante**." pone la negrita en
  // "importante." entero, que es lo que es una palabra para el seguidor. Un espacio, solo si
  // queda adentro.
  const formatosDe = (desde, hasta) => tramos.filter((tr) => tr.desde < hasta && tr.hasta > desde).map((tr) => `f-${tr.formato}`)
  const formatosDelEspacio = (desde, hasta) => tramos.filter((tr) => desde >= tr.desde && hasta <= tr.hasta).map((tr) => `f-${tr.formato}`)
  const lineas = texto.split('\n')
  let offset = 0
  const partes = []
  lineas.forEach((linea, l) => {
    const propios = tokens.filter((t) => t.linea === l)
    let html = ''
    let cursor = offset
    for (const t of propios) {
      const entre = texto.substring(cursor, t.desdeChar)
      if (entre) {
        const f = cursor > offset ? formatosDelEspacio(cursor, t.desdeChar).filter((x) => x === 'f-destacado') : []
        html += f.length ? `<span class="${f.join(' ')}">${escaparHtml(entre)}</span>` : escaparHtml(entre)
      }
      const f = formatosDe(t.desdeChar, t.hastaChar)
      html += `<span data-token="${t.tokenAbsoluto}"${f.length ? ` class="${f.join(' ')}"` : ''}>${escaparHtml(texto.substring(t.desdeChar, t.hastaChar))}</span>`
      cursor = t.hastaChar
    }
    html += escaparHtml(texto.substring(cursor, offset + linea.length))
    partes.push(`<div class="line">${html}</div>`)
    offset += linea.length + 1
  })
  return partes.join('')
}

// ---------- todo junto ----------

export function armarLectura(raiz) {
  const { texto, tramos } = leerFormatos(GUION)
  const tokens = tokenizarGuion(texto)

  let registro
  let voz
  if (TOMA) {
    registro = fs.readFileSync(`${raiz}/${TOMA}`, 'utf8')
    if (leerCorpus(registro).guion.trim() !== texto.trim()) {
      throw new Error(`${TOMA}: su guion no es el texto de GUION. Los formatos se dibujan sobre ese texto.`)
    }
    // La voz de la toma, palabra por palabra, para la onda y los subtitulos.
    const subs = armarSubtitulos(registro).flatMap((s) => s.renglones.flat())
    voz = subs.map((w) => [Math.round(w.desdeMs), Math.round(w.hastaMs)])
  } else {
    const leidos = tokens.filter((t) => t.linea < PARRAFOS_LEIDOS)
    ;({ registro, voz } = registroEstimado(texto, leidos))
  }

  const corpus = leerCorpus(registro)
  const eventos = eventosDelReconocedor(registro, corpus)
  const hasta = Math.max(...voz.map((v) => v[1])) + 900

  // Como useSeguidor.ts: limites de linea y de bloque, el motor de avance y el seguidor.
  const limitesLinea = new Map()
  const limitesBloque = new Map()
  tokens.forEach((t, i) => { limitesLinea.set(`${t.bloque}-${t.linea}`, i); limitesBloque.set(t.bloque, i) })
  const limitesDeLinea = [...limitesLinea.values()].sort((a, b) => a - b)
  const limitesDeBloque = [...limitesBloque.values()].sort((a, b) => a - b)
  const motor = crearMotorDeAvance(undefined, limitesDeLinea, limitesDeBloque)
  const seguidor = crearSeguidor(tokens)
  const conduccion = { seguidor, motor, tokens, limitesDeLinea }

  // CUANTAS PALABRAS DESTACA: palabrasDelDestacado de la aplicacion, con las palabras por
  // renglon estimadas -la columna, el 90% de ANCHO_PANTALLA menos el margen, sobre media letra
  // por caracter, y el largo medio de las palabras-. La regla va de 4 a 6.
  const anchoColumnaPx = ANCHO_PANTALLA * (1 - (2 * PANTALLA.margen) / 100) * 0.9
  const letrasPorPalabra = tokens.reduce((s, t) => s + (t.hastaChar - t.desdeChar) + 1, 0) / tokens.length
  const palabrasPorRenglon = anchoColumnaPx / (PANTALLA.letra * 0.5) / letrasPorPalabra
  const n = palabrasDelDestacado(palabrasPorRenglon)

  const cuadros = []
  let i = 0
  let ubicados = 0
  let recibidos = 0
  let previo = -1
  for (let t = 0; t <= hasta; t += PASO_MS) {
    while (i < eventos.length && eventos[i].ms <= t) {
      const e = eventos[i++]
      recibidos++
      if (e.final ? procesarFinal(conduccion, e.texto, t) : procesarParcial(conduccion, e.texto, t)) ubicados++
    }
    // Como el lazo de TeleprompterView.tsx: el destacado va desde la posicion del motor.
    const destacado = Math.max(0, Math.floor(motor.estadoEn(t).posicion))
    if (destacado !== previo) {
      cuadros.push([t, destacado])
      previo = destacado
    }
  }

  // NADA FALLA EN SILENCIO.
  if (recibidos === 0 || ubicados / recibidos < 0.5) {
    throw new Error(`El seguidor ubico ${ubicados} de ${recibidos} entregas del reconocedor: la pantalla no avanzaria.`)
  }
  const ultimo = cuadros[cuadros.length - 1][1]
  if (ultimo < voz.length - 3) {
    throw new Error(`El destacado termina en la palabra ${ultimo} y la voz llega a la ${voz.length - 1}: el motor no llego al final de la lectura.`)
  }

  // Los subtitulos de la toma, cortados como los corta la aplicacion. Se publican ya cortados:
  // [desde, hasta, [[ [texto, desde, hasta], ... ], ...]].
  const subtitulos = armarSubtitulos(registro).map((s) => [
    Math.round(s.desdeMs), Math.round(s.hastaMs),
    s.renglones.map((r) => r.map((w) => [w.texto, Math.round(w.desdeMs), Math.round(w.hastaMs)]))
  ])

  const pausa = (() => {
    const k = tokens.findIndex((t) => texto.substring(t.desdeChar, t.hastaChar) === PAUSA_PENSAR.despuesDe)
    return k >= 0 && k + 1 < voz.length ? [voz[k][1], voz[k + 1][0], k] : null
  })()

  return {
    html: htmlDelGuion(texto, tokens, tramos),
    pantalla: PANTALLA,
    datos: { hastaMs: hasta, palabrasDestacadas: n, cuadros, voz, subtitulos, pausa },
    resumen: `${TOMA || 'voz estimada'}: ${tokens.length} palabras, ${(hasta / 1000).toFixed(1)} s; ${recibidos} entregas del reconocedor, ${ubicados} ubicadas; ${n} palabras destacadas; ${cuadros.length} cambios del destacado; ${subtitulos.length} subtitulos; pausa de pensar ${pausa ? `${pausa[0]}-${pausa[1]} ms` : 'no encontrada'}.`
  }
}
