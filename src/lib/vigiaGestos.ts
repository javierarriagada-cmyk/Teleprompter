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
export const MS_SILENCIO_PARA_MIRAR = 2000
export const MS_ENTRE_CUADROS = 500

export type Vigia = { ultimoTexto: string; ultimoCambioMs: number; ultimoPedidoMs: number | null; enVuelo: boolean }
export type Situacion = { activo: boolean; estado: 'grabando' | 'pausada' | 'confirmando' }

// ahoraMs: cuando empieza a escuchar -el comienzo de la toma o la vuelta de una pausa-. Cuenta como un
// cambio: los primeros 2 s no se mira.
export function vigiaNuevo(ahoraMs: number): Vigia {
  return { ultimoTexto: '', ultimoCambioMs: ahoraMs, ultimoPedidoMs: null, enVuelo: false }
}

// Un parcial vacío -el que llega después de un final- no es cambio, pero deja el texto en blanco: el
// mismo texto otra vez, después, sí cuenta.
export function oirParcial(v: Vigia, texto: string, ahoraMs: number): { vigia: Vigia; cambio: boolean } {
  const t = (texto || '').trim()
  if (t === v.ultimoTexto) return { vigia: v, cambio: false }
  if (!t) return { vigia: { ...v, ultimoTexto: '' }, cambio: false }
  return { vigia: { ...v, ultimoTexto: t, ultimoCambioMs: ahoraMs }, cambio: true }
}

export function oirFinal(v: Vigia, texto: string, ahoraMs: number): { vigia: Vigia; cambio: boolean } {
  if (!(texto || '').trim()) return { vigia: v, cambio: false }
  // Después de un final, el reconocedor empieza un parcial nuevo desde cero.
  return { vigia: { ...v, ultimoTexto: '', ultimoCambioMs: ahoraMs }, cambio: true }
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
