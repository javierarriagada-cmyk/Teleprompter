// EL BANCO DEL MOTOR -13-10-2026-. `npm run banco`, fuera de `npm test`.
//
// "EL MOTOR SE TOCA MIDIENDO" -docs/lo-que-hay-que-saber.txt-: un cambio al seguidor, al avance o
// a la conduccion se evalua sobre TODAS las tomas. Esto junta en una sola pasada las cifras que
// hasta hoy se sacaban a mano, toma por toma, y no cambia nada del motor: solo lo repite y mide.
//
// POR CADA TOMA:
//   1. Se repite la lectura con repetirLectura -lib/repetidor.ts-: los 'oyo' del registro pasan
//      por lib/conduccion.ts al seguidor y al motor de avance, igual que en la aplicacion, y sale
//      la posicion del motor. -correccion, 13-10-2026-: en cada 'cuadro' del registro y como el
//      telefono, con { comoElTelefono: true } -ver repetidor.ts-. Antes: cada 16 ms.
//   2. El renglon vivo y el scroll se simulan con lo MISMO que corre la vista: anclaCompensada,
//      indiceDeRenglon, avanzarTrabado, calcularScrollTop y acercarScroll -lib/deslizar.ts-. Los
//      renglones son los del registro -linea 'renglones'-, de alto letra x 1,4 -el interlineado de
//      la vista, filaPx / 1.4 en TeleprompterView-, porque el registro no guarda los pixeles.
//   3. La vara -cuando se dijo cada palabra- es la de medir-toma.mjs, con la misma funcion:
//      medirContraLaVoz -src/pruebas/alinearToma.js-.
//
// LAS CIFRAS:
//   atraso, palabras        palabra que se dice menos posicion del motor, cada 100 ms: media y p90.
//                           Tambien el del telefono -los 'cuadro' grabados- para comparar.
//   reparto de renglones    renglon de la palabra que se dice menos renglon vivo: 0 = se lee en
//                           el renglon vivo, 1 = en el de abajo, 2 o mas = mas abajo, negativo =
//                           la pantalla va adelantada.
//   deslizamiento           por cada cambio de renglon vivo: ms hasta quedar a menos de 0,5 px,
//                           velocidad maxima -px/s-, tiron -el salto de velocidad mas grande
//                           entre dos cuadros, px/s-, pasada de largo -px- y cuantos cambios
//                           empiezan antes de que termine el anterior. Con el dt de los cuadros
//                           del telefono, topado en 100 como en la vista. Antes: cuadros de 16 ms.
//   destacado               cuanto va el borde de adelante del destacado -palabrasDelDestacado
//                           palabras desde la posicion del motor- delante de la voz: media y max.
//   dif telefono            -correccion- media de la posicion repetida menos la del telefono en
//                           cada cuadro: cuanto se aleja el banco de lo que paso de verdad.
//   tiron motor             -motor sin pastilla- el salto de velocidad mas grande del motor entre
//                           dos cuadros, palabras/s, sin los arrastres a mano.
//   cuadros                 intervalos entre lineas 'cuadro' del registro del telefono: mediana,
//                           p95, max y cuantos pasan de 50 ms.

import { leerCorpus, repetirLectura } from '../lib/repetidor'
import { anclaCompensada, crearCompensacion } from '../lib/compensacion'
import { indiceDeRenglon, Renglon } from '../lib/renglones'
import { palabrasDelDestacado } from '../lib/destacado'
// Antes: import { acercarScroll } from '../lib/deslizar'
import { acercarScroll, moverResorte } from '../lib/deslizar'
import { avanzarTrabado, calcularScrollTop } from '../components/TeleprompterView'
import { leerRegistro, medirContraLaVoz, percentil, CuadroRegistro } from './alinearToma.js'

// El paso de repetirLectura: un cuadro de la simulacion.
const MS_CUADRO_SIMULADO = 16
// La letra por omision si la cabecera no la dice: la de la vista.
const LETRA_POR_OMISION = 24
const INTERLINEADO = 1.4

export type CrudosToma = {
  atrasoPal: number[]
  atrasoPalTelefono: number[]
  atrasoRen: number[]
  cambios: CambioRenglon[]
  solapes: number
  adelantoDestacado: number[]
  intervalos: number[]
  difTelefono: number[]     // posicion repetida menos la del telefono, en cada cuadro
  tironesMotor: number[]    // -motor sin pastilla- salto de velocidad del motor entre cuadros, palabras/s
  topesResorte: number      // -14-10-2026- cuadros en que actuo el tope del resorte -lib/deslizar.ts-
}

// -13-10-2026, resorte-sin-rebote-: mas el tiron de ARRANQUE -el salto de velocidad entre el ultimo
// cuadro antes del cambio y el primero del cambio, la cifra principal- y cuanto tarda en ir por la
// mitad -null si otro cambio lo corto antes-. `tiron` sigue siendo lo de antes: el salto mas grande
// entre dos cuadros cualesquiera del cambio; en la tabla ahora se llama «salto max».
// Antes: export type CambioRenglon = { ms: number; px: number; velMax: number; tiron: number; pasada: number }
export type CambioRenglon = { ms: number; px: number; velMax: number; tiron: number; pasada: number; tironInicio: number; msMitad: number | null }

// Como desliza el banco: 'hoy' -acercarScroll- o el resorte con su rapidez -lib/deslizar.ts-.
export type OpcionesBanco = { deslizar?: 'hoy' | { omega: number } }

export type CifrasBanco = {
  muestras: number
  atrasoMedio: number
  atrasoP90: number
  atrasoMedioTelefono: number
  atrasoP90Telefono: number
  renglonVivo: number      // % de muestras
  renglonDeAbajo: number
  masAbajo: number
  pantallaAdelante: number
  cambiosDeRenglon: number
  msHastaQuieto: number    // media
  msHastaQuietoMax: number
  velocidadMax: number     // px/s
  tironMax: number         // px/s de un cuadro al siguiente
  tironInicioMax: number   // -resorte- px/s, del cuadro antes del cambio al primero del cambio
  tironInicioMedio: number
  msMitad: number          // -resorte- media, ms hasta ir por la mitad del cambio
  pasadaMax: number        // px
  solapes: number
  destacadoMedio: number
  destacadoMax: number
  palabrasDestacado: number | null
  cuadroMediana: number
  cuadroP95: number
  cuadroMax: number
  cuadrosSobre50: number
  difTelefono: number      // media de posicion repetida menos posicion del telefono, palabras
  tironMotor: number       // el salto de velocidad mas grande del motor, palabras/s
  topesResorte: number
}

const media = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN)
const maximo = (a: number[]) => (a.length ? Math.max(...a) : NaN)
const pct = (n: number, d: number) => (d ? (100 * n) / d : NaN)

export function cifrasDe(c: CrudosToma, palabrasDestacado: number | null = null): CifrasBanco {
  const r = c.atrasoRen
  return {
    muestras: c.atrasoPal.length,
    atrasoMedio: media(c.atrasoPal),
    atrasoP90: percentil(c.atrasoPal, 90),
    atrasoMedioTelefono: media(c.atrasoPalTelefono),
    atrasoP90Telefono: percentil(c.atrasoPalTelefono, 90),
    renglonVivo: pct(r.filter((x) => x === 0).length, r.length),
    renglonDeAbajo: pct(r.filter((x) => x === 1).length, r.length),
    masAbajo: pct(r.filter((x) => x >= 2).length, r.length),
    pantallaAdelante: pct(r.filter((x) => x < 0).length, r.length),
    cambiosDeRenglon: c.cambios.length,
    msHastaQuieto: media(c.cambios.map((x) => x.ms)),
    msHastaQuietoMax: maximo(c.cambios.map((x) => x.ms)),
    velocidadMax: maximo(c.cambios.map((x) => x.velMax)),
    tironMax: maximo(c.cambios.map((x) => x.tiron)),
    tironInicioMax: maximo(c.cambios.map((x) => x.tironInicio)),
    tironInicioMedio: media(c.cambios.map((x) => x.tironInicio)),
    msMitad: media(c.cambios.flatMap((x) => (x.msMitad === null ? [] : [x.msMitad]))),
    pasadaMax: maximo(c.cambios.map((x) => x.pasada)),
    solapes: c.solapes,
    destacadoMedio: media(c.adelantoDestacado),
    destacadoMax: maximo(c.adelantoDestacado),
    palabrasDestacado,
    cuadroMediana: percentil(c.intervalos, 50),
    cuadroP95: percentil(c.intervalos, 95),
    cuadroMax: maximo(c.intervalos),
    cuadrosSobre50: c.intervalos.filter((x) => x > 50).length,
    difTelefono: media(c.difTelefono),
    tironMotor: maximo(c.tironesMotor),
    topesResorte: c.topesResorte
  }
}

export function juntarCrudos(lista: CrudosToma[]): CrudosToma {
  return {
    atrasoPal: lista.flatMap((c) => c.atrasoPal),
    atrasoPalTelefono: lista.flatMap((c) => c.atrasoPalTelefono),
    atrasoRen: lista.flatMap((c) => c.atrasoRen),
    cambios: lista.flatMap((c) => c.cambios),
    solapes: lista.reduce((s, c) => s + c.solapes, 0),
    adelantoDestacado: lista.flatMap((c) => c.adelantoDestacado),
    intervalos: lista.flatMap((c) => c.intervalos),
    difTelefono: lista.flatMap((c) => c.difTelefono),
    tironesMotor: lista.flatMap((c) => c.tironesMotor),
    topesResorte: lista.reduce((s, c) => s + c.topesResorte, 0)
  }
}

export type ResultadoToma = { cifras: CifrasBanco; crudos: CrudosToma; avisos: string[] }

// Mide UNA toma a partir del texto de su .motor.txt.
// Antes: export function medirTomaEnBanco(texto: string): ResultadoToma {
export function medirTomaEnBanco(texto: string, opciones: OpcionesBanco = {}): ResultadoToma {
  const deslizar = opciones.deslizar || 'hoy'
  const avisos: string[] = []
  const reg = leerRegistro(texto)
  // -13-10-2026, correccion-: se repite COMO EL TELEFONO -reloj de sus cuadros, la pastilla del
  // tiempo, el idioma, donde empezo y los arrastres a mano; ver repetidor.ts-.
  // Antes: const rep = repetirLectura(leerCorpus(texto))
  const rep = repetirLectura(leerCorpus(texto), { comoElTelefono: true })

  const letra = parseFloat(reg.cab.letra || '') || LETRA_POR_OMISION
  const filaPx = letra * INTERLINEADO
  const inicios = reg.renglones
  const nTokens = medirContraLaVoz(reg, []).tokens.length
  const renglones: Renglon[] = (inicios || []).map((desde, k) => ({
    top: k * filaPx,
    alto: filaPx,
    desdeToken: desde,
    hastaToken: k + 1 < inicios!.length ? inicios![k + 1] - 1 : Math.max(desde, nTokens - 1)
  }))
  if (renglones.length === 0) avisos.push('sin linea renglones: no hay renglon vivo ni deslizamiento')

  // El renglon vivo y el scroll, cuadro a cuadro, como en la vista.
  const comp = crearCompensacion()
  let trabado: number | null = null
  let scroll: number | null = null
  let objetivoPrevio: number | null = null
  let velPrevia = 0
  // -resorte-: la velocidad del cuadro anterior SIN poner en cero al empezar un cambio -para el tiron
  // de arranque, igual para hoy y para el resorte- y la velocidad del resorte, en px/ms.
  let velCuadroAnterior = 0
  let velResorte = 0
  let topesResorte = 0
  let enCurso: (CambioRenglon & { desde: number; inicioMs: number; dir: number }) | null = null
  const cambios: CambioRenglon[] = []
  let solapes = 0
  const cuadros: CuadroRegistro[] = []
  let msPrevio: number | null = null
  for (const s of rep.serie) {
    let idx: number | null = null
    if (renglones.length > 0) {
      const ancla = anclaCompensada(comp, {
        posicion: s.pos,
        ultimoCalce: s.calce,
        siguiendo: s.estado === 'SIGUIENDO' && s.freno === null,
        tMs: s.ms
      })
      trabado = avanzarTrabado(trabado, indiceDeRenglon(renglones, ancla), ancla, renglones)
      idx = trabado
      const objetivo = calcularScrollTop(renglones[trabado].top, 0, filaPx)
      const previo: number = scroll === null ? objetivo : scroll
      // -correccion-: el dt es el de los cuadros del telefono, con el mismo tope de 100 ms que la vista.
      // Antes:
      // scroll = scroll === null ? objetivo : acercarScroll(scroll, objetivo, MS_CUADRO_SIMULADO)
      // const vel = ((scroll - previo) * 1000) / MS_CUADRO_SIMULADO
      const dtCuadro = msPrevio === null ? MS_CUADRO_SIMULADO : Math.min(100, s.ms - msPrevio)
      // -resorte-: o el resorte, con su velocidad guardada.
      // Antes: scroll = scroll === null ? objetivo : acercarScroll(scroll, objetivo, dtCuadro)
      if (scroll === null) scroll = objetivo
      else if (deslizar === 'hoy') scroll = acercarScroll(scroll, objetivo, dtCuadro)
      else {
        const e = moverResorte({ posicion: scroll, velocidad: velResorte }, objetivo, dtCuadro, deslizar.omega)
        scroll = e.posicion
        velResorte = e.velocidad
        if (e.tope) topesResorte++
      }
      const vel = ((scroll - previo) * 1000) / Math.max(1, dtCuadro)
      // -correccion-: un arrastre a mano no es un deslizamiento del motor -en la vista el dedo mueve el
      // texto-: el scroll queda en su lugar y ese cambio no se cuenta.
      if (s.aMano) {
        scroll = objetivo
        enCurso = null
        objetivoPrevio = objetivo
        velPrevia = 0
        velCuadroAnterior = 0
        velResorte = 0
        cuadros.push({ ms: s.ms, pos: s.pos, trabado: idx })
        msPrevio = s.ms
        continue
      }
      if (objetivoPrevio !== null && objetivo !== objetivoPrevio) {
        if (enCurso) { solapes++; cambios.push(cerrar(enCurso, s.ms)) }
        // Antes: enCurso = { ms: 0, px: objetivo - previo, velMax: 0, tiron: 0, pasada: 0, desde: previo, inicioMs: s.ms - dtCuadro, dir: Math.sign(objetivo - previo) }
        enCurso = { ms: 0, px: objetivo - previo, velMax: 0, tiron: 0, pasada: 0, tironInicio: Math.abs(vel - velCuadroAnterior), msMitad: null, desde: previo, inicioMs: s.ms - dtCuadro, dir: Math.sign(objetivo - previo) }
        velPrevia = 0
      }
      if (enCurso) {
        enCurso.velMax = Math.max(enCurso.velMax, Math.abs(vel))
        enCurso.tiron = Math.max(enCurso.tiron, Math.abs(vel - velPrevia))
        enCurso.pasada = Math.max(enCurso.pasada, enCurso.dir * (scroll - objetivo))
        if (enCurso.msMitad === null && Math.abs(objetivo - scroll) <= Math.abs(enCurso.px) / 2) enCurso.msMitad = s.ms - enCurso.inicioMs
        if (scroll === objetivo) { cambios.push(cerrar(enCurso, s.ms)); enCurso = null }
      }
      velPrevia = vel
      velCuadroAnterior = vel
      objetivoPrevio = objetivo
    }
    cuadros.push({ ms: s.ms, pos: s.pos, trabado: idx })
    msPrevio = s.ms
  }
  if (enCurso) cambios.push(cerrar(enCurso, rep.serie[rep.serie.length - 1].ms))

  const repetida = medirContraLaVoz(reg, cuadros)
  const telefono = medirContraLaVoz(reg)
  if (repetida.pares.length < 5) avisos.push('muy pocas palabras emparejadas con el guion')

  const n = renglones.length ? palabrasDelDestacado(nTokens / renglones.length) : null
  const adelantoDestacado = n === null ? [] : repetida.muestras.map((m) => Math.floor(m.pos) + n - 1 - m.tok)

  const intervalos: number[] = []
  for (let i = 1; i < reg.cuadros.length; i++) intervalos.push(reg.cuadros[i].ms - reg.cuadros[i - 1].ms)

  // Lo que reproduce el banco: la posicion repetida contra la del telefono, cuadro por cuadro.
  const difTelefono: number[] = []
  const n2 = Math.min(cuadros.length, reg.cuadros.length)
  if (cuadros.length === reg.cuadros.length) for (let i = 0; i < n2; i++) difTelefono.push(cuadros[i].pos - reg.cuadros[i].pos)
  // EL TIRON DEL MOTOR -motor sin pastilla, 13-10-2026-: la misma idea que cambioVelocidadMaximo de
  // repetidor.ts -el salto de velocidad mas grande entre dos cuadros- pero en palabras por segundo y
  // sin los cuadros de un arrastre a mano ni el siguiente: ese salto lo hace el dedo, no el motor.
  const tironesMotor: number[] = []
  for (let i = 2; i < rep.serie.length; i++) {
    const a = rep.serie[i - 2], b = rep.serie[i - 1], c = rep.serie[i]
    if (a.aMano || b.aMano || c.aMano) continue
    const v1 = ((b.pos - a.pos) * 1000) / Math.max(1, b.ms - a.ms)
    const v2 = ((c.pos - b.pos) * 1000) / Math.max(1, c.ms - b.ms)
    tironesMotor.push(Math.abs(v2 - v1))
  }
  const crudos: CrudosToma = {
    atrasoPal: repetida.atrasoPal,
    atrasoPalTelefono: telefono.atrasoPal,
    atrasoRen: repetida.atrasoRen,
    cambios,
    solapes,
    adelantoDestacado,
    intervalos,
    difTelefono,
    tironesMotor,
    topesResorte
  }
  return { cifras: cifrasDe(crudos, n), crudos, avisos }
}

function cerrar(c: CambioRenglon & { inicioMs: number }, ms: number): CambioRenglon {
  // Antes: return { ms: ms - c.inicioMs, px: c.px, velMax: c.velMax, tiron: c.tiron, pasada: c.pasada }
  return { ms: ms - c.inicioMs, px: c.px, velMax: c.velMax, tiron: c.tiron, pasada: c.pasada, tironInicio: c.tironInicio, msMitad: c.msMitad }
}
