// EL BANCO LARGO -motor-largo, 15-10-2026-, SOLO EN LA APK DE PRUEBA -HERRAMIENTAS-.
//
// Una toma de verdad -Grabar, cámara a 1080p- de 35 min en el teléfono, con el MISMO lazo de Vosk
// alimentado con los audios de files/oido a ritmo de tiempo real -VoskNativoPlugin, BancoLargo.java-,
// y el motor siguiendo un guion hecho con lo que Vosk oyó en esas mismas lecturas. Mide; no arregla.
// Lo lanza scripts/banco-largo.mjs, que deja el pedido por adb; App lo toma al abrir
// -hooks/useBancoLargo.ts-. Este archivo es la parte que no depende del teléfono: leer el pedido y
// armar la línea de cada minuto.

export type PedidoBancoLargo = {
  minutos: number
  // Los .pcm de files/oido, en el orden en que se repiten. Vacío: todos, del más viejo al más nuevo.
  archivos: string[]
  // El guion que sigue el motor: lo que Vosk oyó en esos audios, en el mismo orden -banco-largo.mjs-.
  guion: string
  idioma: 'es' | 'en'
  // El nombre de la tabla en files/banco-largo/<nombre>.txt.
  nombre: string
}

export function leerPedidoBancoLargo(texto: string | null | undefined): PedidoBancoLargo | null {
  if (!texto) return null
  try {
    const o = JSON.parse(texto)
    if (!o || typeof o.guion !== 'string' || !o.guion.trim()) return null
    const minutos = Number.isFinite(o.minutos) && o.minutos > 0 ? Math.round(o.minutos) : 35
    return {
      minutos,
      archivos: Array.isArray(o.archivos) ? o.archivos.filter((a: unknown) => typeof a === 'string') : [],
      guion: o.guion,
      idioma: o.idioma === 'en' ? 'en' : 'es',
      nombre: typeof o.nombre === 'string' && /^[\w.-]+$/.test(o.nombre) ? o.nombre : `tabla-${Date.now()}`
    }
  } catch {
    return null
  }
}

export type MedidaMinuto = { minuto: number; msVoskPorSegundo: number; atrasoMs: number; relevos: number; temperatura: string }
export type EstadoMotor = { calce: number; freno: string; trabado: number; posicion: number } | null

// Una línea por minuto, clave=valor separadas por espacios: se lee de corrido y se separa fácil.
// El relevo, si hubo, se anota aparte del resto: no es parte de la medida.
export function lineaDelMinuto(m: MedidaMinuto, motor: EstadoMotor): string {
  const partes = [
    `minuto=${m.minuto}`,
    `vosk_ms_por_s=${Number.isFinite(m.msVoskPorSegundo) ? m.msVoskPorSegundo.toFixed(1) : 'NA'}`,
    `atraso_ms=${Math.round(m.atrasoMs)}`,
    motor ? `calce=${motor.calce}` : 'calce=NA',
    motor ? `estado=${motor.freno || '-'}` : 'estado=NA',
    motor ? `pos=${motor.posicion.toFixed(1)}` : 'pos=NA',
    `temp=${m.temperatura && m.temperatura.trim() ? m.temperatura.replace(/\s+/g, '_') : 'sin temperatura'}`
  ]
  if (m.relevos > 0) partes.push(`relevo=${m.relevos}`)
  return partes.join(' ')
}

// El pedido en curso: lo pone useBancoLargo antes de entrar a la toma y lo lee MotorNativo al escuchar.
let activo: { pedido: PedidoBancoLargo; alTerminar: () => void } | null = null

export function activarBancoLargo(pedido: PedidoBancoLargo, alTerminar: () => void) {
  activo = { pedido, alTerminar }
}

export function bancoLargoActivo(): { pedido: PedidoBancoLargo; alTerminar: () => void } | null {
  return activo
}

export function terminarBancoLargo() {
  const a = activo
  activo = null
  if (a) a.alTerminar()
}

// Sin avisar a nadie: lo llama MotorNativo.detener, que ya está parando.
export function olvidarBancoLargo() {
  activo = null
}
