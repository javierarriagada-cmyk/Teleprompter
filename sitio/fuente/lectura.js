// LA LECTURA DE LA PORTADA: que muestra la pantalla de Sigo en cada milisegundo de una toma
// real. 27-09-2026, docs/el-sitio.md seccion 2.
//
// Corre EN EL PC, al armar el sitio -armar.mjs lo carga con Vite, que entiende TypeScript-,
// no en el navegador. Y corre la conduccion de la aplicacion, no una copia: el mismo
// seguidor -src/lib/seguidor.ts-, el mismo avance -src/lib/avance.ts- y la misma conduccion
// -src/lib/conduccion.ts-, en el mismo orden en que los llama la aplicacion -useSeguidor.ts
// y el lazo de TeleprompterView.tsx-, cuadro por cuadro. Lo que sale es desde que palabra
// habria ido el destacado en la pantalla del telefono con esa voz.
//
// NADA DE ESTO SE PUBLICA -Javier, 27-09-2026: "la pagina no debe incluir ni copiar la logica
// del motor"; todo JavaScript publicado se puede leer-. Lo que se publica es un JSON con el
// milisegundo y el numero de la palabra destacada, nada mas -y cuantas palabras lleva la
// linea, un solo numero para toda la lectura-. demo.js mide en la pagina donde quedo esa
// palabra y la dibuja. El renglon NO se decide aca: depende del ancho de la pantalla donde se
// mira la pagina, y lo mide la pagina.
//
// POR QUE NO SE INVENTA UN RITMO. Los tiempos son los de la toma. Si el registro trae lo que
// el reconocedor entrego -lineas 'oyo', parciales y frases cerradas, con su milisegundo-, se
// usa tal cual: es exactamente lo que recibio la aplicacion. La toma provisoria del corpus
// -toma-008a7133-palabras.motor.txt- no trae esas lineas: trae las frases cerradas con cada
// palabra y el milisegundo en que empezo y termino en el audio -'palabras FINAL', lo mismo
// que lee armarSubtitulos() en src/lib/subtitulos.ts-. Con eso se arman los parciales como
// los entrega Vosk -la frase que va creciendo, palabra por palabra- en el momento en que
// termina cada palabra MAS la demora medida del reconocedor en el telefono, y la frase
// cerrada en el milisegundo en que llego. Esa demora no es un numero puesto a ojo:
// src/lib/compensacion.ts, "esa palabra llega 0,35 s despues de dicha: en el telefono de
// Javier".
//
// LA TOMA DEFINITIVA -la lectura corta que grabara Javier, con audio- se cambia en TOMA,
// abajo. Si su registro trae las lineas 'oyo', se usan esas y la demora de aca no interviene.

import fs from 'node:fs'
import { leerCorpus } from '../../src/lib/repetidor'
import { tokenizarGuion, crearSeguidor } from '../../src/lib/seguidor'
import { crearMotorDeAvance } from '../../src/lib/avance'
import { procesarFinal, procesarParcial } from '../../src/lib/conduccion'
import { palabrasDelDestacado } from '../../src/lib/destacado'

// La toma. Ruta desde la carpeta Teleprompter.
export const TOMA = 'src/pruebas/corpus/toma-008a7133-palabras.motor.txt'

// Cuantos parrafos del guion se muestran. La toma provisoria es una lectura de 66 s sobre un
// guion de cuatro parrafos largos; se lee solo el comienzo del primero, pero con uno solo la
// pantalla de un computador quedaba vacia de la mitad para abajo, y en la aplicacion debajo
// del renglon vivo siempre hay guion.
export const PARRAFOS = 2

// Donde termina la demostracion, en ms de la toma. La toma provisoria sigue leyendo 52 s mas;
// se corta al terminar la tercera oracion -"...que nunca vamos a poder superar."-: la palabra
// termina en 13785 y la siguiente, "sin", empieza en 14205. 14150 cae en ese silencio, asi
// que con audio tampoco se oye media palabra. null: medio segundo despues de la ultima
// palabra, para una toma que es entera la lectura.
export const HASTA_MS = 14150

// La demora del reconocedor, solo para armar los parciales cuando el registro no los trae.
// src/lib/compensacion.ts, medida en el telefono de Javier con el oido propio. avance.ts
// tiene otra cifra -MS_RETRASO_RECONOCEDOR = 400- que es la del reconocedor web, anterior.
export const DEMORA_PARCIAL_MS = 350

// El audio de la toma, para el boton de sonido -docs/el-sitio.md: "arranca SIN sonido"-. Ruta
// desde la carpeta Teleprompter, o null. Su segundo cero es el milisegundo cero de la toma:
// el comienzo del video, que es el reloj del registro. Sin audio la pagina no muestra el
// boton: un control que no hace nada no va.
export const AUDIO = null

// El ancho con que la pagina dibuja la pantalla, en px de CSS -estilo.css, .lienzo-: el de un
// telefono Android comun, y el mas chico en que la pagina tiene que verse bien. Aca solo se
// usa para estimar cuantas palabras entran en un renglon.
export const ANCHO_PANTALLA = 360

// El lazo de la aplicacion corre a unos 60 cuadros por segundo -requestAnimationFrame-.
const PASO_MS = 16

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

// Lo que recibio la aplicacion, en orden: { ms, final, texto }.
function eventosDelReconocedor(registro, corpus) {
  const oyo = corpus.eventos.filter((e) => e.tipo === 'oyo')
  if (oyo.length) return { eventos: oyo.map((e) => ({ ms: e.ms, final: e.final, texto: e.texto })), origen: 'oyo' }

  const frases = leerPalabras(registro)
  if (!frases.length) {
    throw new Error(`${TOMA}: no trae lineas 'oyo' ni 'palabras FINAL'. Sin tiempos del reconocedor no hay demostracion: no se inventa un ritmo.`)
  }
  const eventos = []
  const atajados = []
  for (const f of frases) {
    f.palabras.forEach((p, k) => {
      // Un parcial nunca llega despues de la frase cerrada que lo contiene: Vosk cierra la
      // frase cuando ya entrego todas sus palabras. Si la cuenta lo pusiera despues, se deja
      // en el milisegundo de la frase y se cuenta en el resumen: seria un registro raro.
      let ms = p.hasta + DEMORA_PARCIAL_MS
      if (ms > f.ms) { ms = f.ms; atajados.push(ms) }
      eventos.push({ ms, final: false, texto: f.palabras.slice(0, k + 1).map((x) => x.w).join(' ') })
    })
    eventos.push({ ms: f.ms, final: true, texto: f.palabras.map((x) => x.w).join(' ') })
  }
  eventos.sort((a, b) => a.ms - b.ms || (a.final ? 1 : 0) - (b.final ? 1 : 0))
  return { eventos, origen: 'palabras', frases, atajados }
}

// La pantalla con que se grabo la toma, de la cabecera del registro -la arma App.tsx al empezar
// la toma: cabeceraMotor-.
// La portada se dibuja con esos mismos ajustes. Si falta uno se para: no se completa con un
// valor por omision que nadie eligio.
function leerPantalla(registro) {
  const campo = (nombre) => {
    const m = registro.match(new RegExp(`^# ${nombre}: (.+)$`, 'm'))
    if (!m) throw new Error(`${TOMA}: la cabecera no dice "${nombre}".`)
    return m[1].trim()
  }
  const letra = campo('letra').match(/^(\d+(?:\.\d+)?) px, (serif|sans)$/)
  const columna = campo('columna').match(/^(completa|angosta), margen (\d+(?:\.\d+)?)%$/)
  const anclaje = campo('donde lees')
  if (!letra || !columna || !['arriba', 'medio', 'abajo'].includes(anclaje)) {
    throw new Error(`${TOMA}: no se entiende la cabecera -letra "${campo('letra')}", columna "${campo('columna')}", donde lees "${anclaje}"-.`)
  }
  return {
    letra: +letra[1],
    tipo: letra[2],
    angosta: columna[1] === 'angosta',
    margen: +columna[2],
    anclaje,
    // La pareja de colores no queda en el registro. Es la de la aplicacion recien instalada,
    // la que pide docs/el-sitio.md.
    fondo: '#151312'
  }
}

function escaparHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// El guion como lo dibuja TeleprompterView.tsx: un bloque, una linea por renglon del guion, y
// cada palabra en un <span data-token="N"> con el numero que le da tokenizarGuion -el mismo
// que usan el seguidor y el destacado-. Lo que no es palabra -los espacios- va suelto, como
// renderSegmentContent en renglones.tsx. Esta toma no tiene acotaciones ni formato; si la
// definitiva los trae, se avisa en vez de dibujarlos distinto a la aplicacion.
function htmlDelGuion(guion, tokens) {
  const lineas = guion.split('\n')
  let offset = 0
  const partes = []
  lineas.forEach((linea, l) => {
    const propios = tokens.filter((t) => t.linea === l)
    if (propios.some((t) => t.esAcotacion)) {
      throw new Error(`${TOMA}: el guion trae acotaciones entre corchetes. demo.js no las dibuja como renglones.tsx: hay que agregarlas antes de usar esta toma.`)
    }
    let html = ''
    let cursor = offset
    for (const t of propios) {
      html += escaparHtml(guion.substring(cursor, t.desdeChar))
      html += `<span data-token="${t.tokenAbsoluto}">${escaparHtml(guion.substring(t.desdeChar, t.hastaChar))}</span>`
      cursor = t.hastaChar
    }
    html += escaparHtml(guion.substring(cursor, offset + linea.length))
    if (linea.length) partes.push(`<div class="line">${html}</div>`)
    offset += linea.length + 1
  })
  return partes.join('')
}

export function armarLectura(raiz) {
  const registro = fs.readFileSync(`${raiz}/${TOMA}`, 'utf8')
  const pantalla = leerPantalla(registro)
  // La pantalla solo sabe dibujar la columna completa con la ventana arriba -estilo.css-: con
  // otra, la pagina no mostraria la toma como se leyo. Se para en vez de dibujarla distinta.
  if (pantalla.anclaje !== 'arriba' || pantalla.angosta) {
    throw new Error(`${TOMA}: la toma se leyo con columna ${pantalla.angosta ? 'angosta' : 'completa'} y "donde lees: ${pantalla.anclaje}". La portada dibuja columna completa y "arriba": hay que agregarlo en estilo.css antes de usar esta toma.`)
  }
  const corpus = leerCorpus(registro)
  const guion = corpus.guion.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, PARRAFOS).join('\n')
  if (!guion) throw new Error(`${TOMA}: el registro no trae el guion en la cabecera.`)

  // El guion que ve el seguidor es el mismo que se dibuja: los numeros de palabra calzan.
  const tokens = tokenizarGuion(guion)
  const { eventos, origen, frases, atajados = [] } = eventosDelReconocedor(registro, corpus)

  let hasta = HASTA_MS
  if (hasta === null) {
    const ultima = frases ? Math.max(...frases.flatMap((f) => f.palabras.map((p) => p.hasta))) : Math.max(...eventos.map((e) => e.ms))
    hasta = ultima + 500
  }

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
  // renglon de esta pantalla. La aplicacion las cuenta despues de dibujar; aca no hay pantalla,
  // asi que se estiman: el ancho de la columna -ANCHO_PANTALLA menos el margen, y el 90% de
  // eso, como la columna completa de la aplicacion- sobre media letra por caracter -Source Serif 4 y Source Sans 3 andan cerca de 0,5 em- y el largo medio de las
  // palabras del guion. La regla va de 4 a 6: con letra 18 y 360 px salen unas 5,5 palabras
  // por renglon, y la estimacion tendria que errar por mas de un tercio para cambiar el 6.
  const anchoColumnaPx = ANCHO_PANTALLA * (1 - (2 * pantalla.margen) / 100) * 0.9
  const letrasPorRenglon = anchoColumnaPx / (pantalla.letra * 0.5)
  const letrasPorPalabra = tokens.reduce((s, t) => s + (t.hastaChar - t.desdeChar) + 1, 0) / Math.max(1, tokens.length)
  const palabrasPorRenglon = letrasPorRenglon / letrasPorPalabra
  const n = palabrasDelDestacado(palabrasPorRenglon)

  // Se sigue corriendo el motor despues del corte: la voz sigue en la toma, y lo que muestra
  // la pantalla en el ultimo cuadro depende de lo que se oyo hasta ahi, nada mas. Los eventos
  // posteriores al corte no entran.
  const cuadros = []
  let i = 0
  let ubicados = 0
  let recibidos = 0
  let previo = -1
  for (let t = 0; t <= hasta; t += PASO_MS) {
    while (i < eventos.length && eventos[i].ms <= t) {
      const e = eventos[i++]
      recibidos++
      const r = e.final ? procesarFinal(conduccion, e.texto, t) : procesarParcial(conduccion, e.texto, t)
      if (r) ubicados++
    }
    // Como el lazo de TeleprompterView.tsx: el destacado va desde la posicion del motor.
    const destacado = Math.max(0, Math.floor(motor.estadoEn(t).posicion))
    if (destacado !== previo) {
      cuadros.push([t, destacado])
      previo = destacado
    }
  }

  // NADA FALLA EN SILENCIO: si el seguidor no ubico casi nada, la demostracion seria una
  // pantalla quieta. Se para el armado con el numero.
  if (recibidos === 0 || ubicados / recibidos < 0.5) {
    throw new Error(`${TOMA}: el seguidor ubico ${ubicados} de ${recibidos} entregas del reconocedor antes de ${hasta} ms. Con eso la pantalla no avanza: revisar la toma o el corte.`)
  }
  const ultimoDestacado = cuadros[cuadros.length - 1][1]
  if (ultimoDestacado + n > tokens.length) {
    throw new Error(`${TOMA}: el destacado llega al final del guion mostrado -${tokens.length} palabras-. Subir PARRAFOS.`)
  }

  return {
    html: htmlDelGuion(guion, tokens),
    pantalla,
    datos: { hastaMs: hasta, palabrasDestacadas: n, cuadros },
    resumen: `${TOMA}: ${tokens.length} palabras a la vista, ${recibidos} entregas del reconocedor hasta ${hasta} ms (${origen === 'oyo' ? 'las del registro' : `armadas de 'palabras FINAL' + ${DEMORA_PARCIAL_MS} ms, ${atajados.filter((ms) => ms <= hasta).length} parciales dejados en el ms de su frase`}), ${ubicados} ubicadas; ${n} palabras destacadas (unas ${palabrasPorRenglon.toFixed(1)} por renglon); el destacado llega a la palabra ${ultimoDestacado}; ${cuadros.length} cambios.`
  }
}
