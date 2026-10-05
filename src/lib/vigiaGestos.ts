// EL VIGÍA DE LOS GESTOS -tarea 88, 04-10-2026, docs/tarea88.txt, sección 6.4-. TypeScript puro.
//
// Decide CUÁNDO pedir un cuadro -lib/gestos.ts, revisarCuadro-. Mirar la cámara cuesta: mientras la
// persona habla no se mira, porque quien habla no está levantando la mano para pausar -plan 2, 1.6-.
//   - Activo = interruptor && cámara frontal && grabando de verdad && equipo apto. Lo arma App.
//   - Grabando: pide solo con MS_SILENCIO_PARA_MIRAR sin CAMBIO en el texto de la voz, y uno cada
//     MS_ENTRE_CUADROS. "Sin cambio" = desde el último parcial con texto DISTINTO o el último final no
//     vacío: el mismo parcial repetido cuenta como silencio.
//   - En pausa: uno cada MS_ENTRE_CUADROS -la voz está apagada-.
//   - Confirmando -el "¿Seguro?" del tacho-: no pide.
//   - Nunca dos pedidos en vuelo: alPedir los marca y alResponder los suelta.
// El lazo vive en App -setInterval de 100 ms solo con el vigía activo-.
//
// -tarea 88, segunda vuelta, 04-10-2026- Lo que midió Claude en el moto g86 -toma 6cce33b4-: «ellos»
// terminó a los 15 108 ms y el FINAL de Vosk llegó a los 16 453 con el MISMO texto que el último
// parcial; contaba como cambio, el vigía empezaba a mirar 2 s después -~18 450- y la mano quedaba en el
// archivo. Ahora:
//   a) Un FINAL con el mismo texto que el último parcial no mueve el reloj de voz. Se compara ANTES de
//      vaciar el texto.
//   b) El vigía lleva finVozMs -Date.now()-: el fin de la última palabra dicha. Sale de las palabras
//      con hora del FINAL -lib/diagnostico.ts, tomarFinUltimaPalabraEpochMs, que la convierte UNA vez
//      al reloj de Date.now()-; si el FINAL no las trae, es la hora del último cambio de texto. Un
//      parcial con texto nuevo también la deja en su hora -la palabra se está diciendo-. La máquina
//      corta la pausa por palma desde ahí -pausaToma.ts, desdeDePalma-.
export const MS_SILENCIO_PARA_MIRAR = 2000
export const MS_ENTRE_CUADROS = 500

// finVozMs -tarea 88, segunda vuelta-: ver arriba, b).
export type Vigia = { ultimoTexto: string; ultimoCambioMs: number; ultimoPedidoMs: number | null; enVuelo: boolean; finVozMs: number }
export type Situacion = { activo: boolean; estado: 'grabando' | 'pausada' | 'confirmando' }

// ahoraMs: cuando empieza a escuchar -el comienzo de la toma o la vuelta de una pausa-. Cuenta como un
// cambio: los primeros 2 s no se mira.
// -tarea 88, segunda vuelta- finVozMs también parte en ahoraMs: el corte de una palma nunca empieza antes
// del comienzo de la toma o de la vuelta de la pausa anterior, aunque la última palabra sea de antes.
export function vigiaNuevo(ahoraMs: number): Vigia {
  return { ultimoTexto: '', ultimoCambioMs: ahoraMs, ultimoPedidoMs: null, enVuelo: false, finVozMs: ahoraMs }
}

// Un parcial vacío -el que llega después de un final- no es cambio, pero deja el texto en blanco: el
// mismo texto otra vez, después, sí cuenta.
export function oirParcial(v: Vigia, texto: string, ahoraMs: number): { vigia: Vigia; cambio: boolean } {
  const t = (texto || '').trim()
  if (t === v.ultimoTexto) return { vigia: v, cambio: false }
  if (!t) return { vigia: { ...v, ultimoTexto: '' }, cambio: false }
  return { vigia: { ...v, ultimoTexto: t, ultimoCambioMs: ahoraMs, finVozMs: ahoraMs }, cambio: true }
}

// finPalabraMs -tarea 88, segunda vuelta-: el fin de la última palabra del FINAL, ya en Date.now(), o
// null si el FINAL no trajo palabras con hora. Antes: oirFinal(v, texto, ahoraMs), y todo final no
// vacío era cambio -return { vigia: { ...v, ultimoTexto: '', ultimoCambioMs: ahoraMs }, cambio: true }-.
export function oirFinal(v: Vigia, texto: string, ahoraMs: number, finPalabraMs: number | null = null): { vigia: Vigia; cambio: boolean } {
  const t = (texto || '').trim()
  if (!t) return { vigia: v, cambio: false }
  // a) Se compara ANTES de vaciar: el mismo texto que el último parcial no es cambio.
  const cambio = t !== v.ultimoTexto
  const ultimoCambioMs = cambio ? ahoraMs : v.ultimoCambioMs
  // b) Sin palabras con hora: la hora del último cambio de texto.
  const finVozMs = finPalabraMs !== null && Number.isFinite(finPalabraMs) ? finPalabraMs : ultimoCambioMs
  // Después de un final, el reconocedor empieza un parcial nuevo desde cero.
  return { vigia: { ...v, ultimoTexto: '', ultimoCambioMs, finVozMs }, cambio }
}

export function debePedir(v: Vigia, s: Situacion, ahoraMs: number): boolean {
  if (!s.activo || v.enVuelo || s.estado === 'confirmando') return false
  if (v.ultimoPedidoMs !== null && ahoraMs - v.ultimoPedidoMs < MS_ENTRE_CUADROS) return false
  if (s.estado === 'pausada') return true
  return ahoraMs - v.ultimoCambioMs >= MS_SILENCIO_PARA_MIRAR
}

export function alPedir(v: Vigia, ahoraMs: number): Vigia {
  return { ...v, enVuelo: true, ultimoPedidoMs: ahoraMs }
}

export function alResponder(v: Vigia): Vigia {
  return { ...v, enVuelo: false }
}
