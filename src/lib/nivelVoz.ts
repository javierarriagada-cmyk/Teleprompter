// EL NIVEL DEL SONIDO QUE ENTRA AL MICRÓFONO -proxima-version, 2026-11-08-. Existe para el disco del micrófono
// junto a la pastilla del tiempo -BarraDeTiempo.tsx-: su halo crece con el VOLUMEN, como el punto verde de
// Android. NO es el indicador «te escucho / te perdí» que Javier rechazó el 29-09-2026: aquel dependía del
// reconocimiento y tenía un estado de pérdida. Este canal solo lleva el rms que ya calcula
// VoskNativoPlugin.java en cada trozo -0..1, sobre 32768- y nunca sabe lo que se reconoció. No se ata al
// seguidor ni a ResultadoVoz.
//
// Un canal chico y propio: MotorNativo publica el rms de cada evento y la pastilla se suscribe. Las cuentas
// de abajo son puras para poder probarlas.

// -60 dB o menos es silencio -0-; -20 dB o más es voz fuerte -1-. Entre los dos, parejo en dB.
export const DB_PISO = -60
export const DB_TECHO = -20
// El suavizado: sube rápido -ataque, 100 ms- y baja lento -caída, 500 ms-, para que el halo no tiemble.
export const ATAQUE_MS = 100
export const CAIDA_MS = 500
// Sin eventos por más de medio segundo, el nivel vuelve a 0.
export const SIN_EVENTOS_MS = 500

export function rmsANivel(rms: number): number {
  if (!(rms > 0)) return 0
  const db = 20 * Math.log10(rms)
  return Math.min(1, Math.max(0, (db - DB_PISO) / (DB_TECHO - DB_PISO)))
}

// Un paso del suavizado exponencial: con el objetivo arriba usa el ataque y abajo la caída.
export function suavizarNivel(actual: number, objetivo: number, dtMs: number): number {
  if (!(dtMs > 0)) return actual
  const tau = objetivo > actual ? ATAQUE_MS : CAIDA_MS
  return actual + (objetivo - actual) * (1 - Math.exp(-dtMs / tau))
}

// Adónde va el nivel ahora: el del último rms, o 0 si hace más de medio segundo que no llega nada.
export function objetivoNivel(ultimoRms: number, ultimoEventoMs: number | null, ahoraMs: number): number {
  if (ultimoEventoMs === null || ahoraMs - ultimoEventoMs > SIN_EVENTOS_MS) return 0
  return rmsANivel(ultimoRms)
}

// CUÁNDO SE VE EL DISCO -revisión del 08-11-2026-. Leyendo o grabando -estadoToma 'leyendo', que es el mismo en
// Leer y en Grabar-, con la voz -no con Velocidad fija- y con el micrófono abierto de verdad -isRecording de
// useASR, que pasa a false al detener el motor y en la pausa con la voz-. Estaba suelto en App.tsx y no tenía
// prueba; la orden la pedía. Antes, en App: const microfonoEscuchando = isRecording && !fija && estadoToma === 'leyendo'
export function discoMicrofonoVisible(p: { microfonoAbierto: boolean; fija: boolean; estadoToma: 'listo' | 'leyendo' }): boolean {
  return p.microfonoAbierto && !p.fija && p.estadoToma === 'leyendo'
}

// EL CANAL. publicar y suscribir; suscribir devuelve la desuscripción.
type OyenteNivel = (rms: number, tMs: number) => void
const oyentes = new Set<OyenteNivel>()

export function publicarNivelVoz(rms: number, tMs: number = performance.now()): void {
  for (const o of oyentes) o(rms, tMs)
}
export function suscribirNivelVoz(oyente: OyenteNivel): () => void {
  oyentes.add(oyente)
  return () => { oyentes.delete(oyente) }
}
