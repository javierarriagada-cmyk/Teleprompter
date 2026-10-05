// LA ORIENTACIÓN QUEDA FIJA MIENTRAS DURA LA TOMA -tarea 91, 04-10-2026-.
//
// Pedido de Javier: mientras dura una toma, de Empezar a Parar y tanto en Leer como en Grabar, la
// pantalla se queda en la orientación que tenía al empezar, como la cámara del teléfono. En LISTO y en
// el visor se gira libremente.
//
// Este es el ÚNICO módulo que la fija y la suelta. Lo llama un solo efecto de App.tsx -el de
// «tomaAndando»-: entra cuando la toma pasa a LEYENDO y sale cuando deja de estarlo -Parar, Descartar,
// el atrás, un error al empezar- o cuando App se desmonta. Al ir a segundo plano se suelta, y al volver
// con la toma todavía andando se fija la MISMA de antes -repetir-, no la del momento.
//
// Del lado nativo, CamaraNativaPlugin.fijarOrientacion / soltarOrientacion -Activity.
// setRequestedOrientation, con el mapeo de OrientacionDeToma.java- escriben en logcat con la etiqueta
// SigoOrientacion. Aquí cada paso se anota como «[orientacion] <evento> clave=valor ...» en la consola
// -chromium en logcat, o chrome://inspect- y en una memoria que leen las pruebas. En la web el plugin no
// existe: se anota «no-disponible» y no pasa nada más.
//
// EN LA TABLETA NO SE BLOQUEA, Y SE ACEPTA -tarea 83, parte B, 04-10-2026, aprobado por Javier-. Con
// targetSdkVersion 36 -android/variables.gradle-, Android 16 ignora setRequestedOrientation en pantallas
// de 600 dp o más de ancho mínimo -developer.android.com/about/versions/16/behavior-changes-16-. Aquí se
// sigue llamando igual -en el teléfono vale y la llamada no hace daño-, pero en la tableta la pantalla
// gira durante la toma y vale la vara: «Rotación en plena toma: se cambia de layout sin cortar la
// grabación ni mover el renglón vivo» -docs/pantallas/tarea82/medidas-implementacion.md:29-. NO se usa
// la excepción PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY: pondría la app en modo de compatibilidad
// en la tableta -LS-C1 de la guía de pantallas grandes-.
import { CamaraNativa } from './camara'

let bloqueada = false
let lineas: string[] = []

export function lineasOrientacion(): string[] {
  return lineas.slice()
}

export function limpiarRegistroOrientacion() {
  lineas = []
  bloqueada = false
}

export function orientacionBloqueada(): boolean {
  return bloqueada
}

function anotar(evento: string, d: Record<string, unknown>) {
  const detalle = Object.entries(d)
    .map(([k, v]) => `${k}=${v === null || v === undefined ? '-' : String(v).replace(/\s+/g, '_')}`)
    .join(' ')
  const linea = `${evento}${detalle ? ' ' + detalle : ''}`
  lineas.push(linea)
  if (lineas.length > 500) lineas = lineas.slice(-500)
  try {
    console.info(`[orientacion] ${linea}`)
  } catch (e) {
    // sin consola no pasa nada
  }
}

// Cómo ve la web la pantalla en ese momento: el ángulo y el tipo de screen.orientation y el tamaño.
function pantallaWeb(): Record<string, unknown> {
  let angulo: unknown = null
  let tipo: unknown = null
  try {
    const o: any = typeof screen !== 'undefined' ? (screen as any).orientation : null
    angulo = o && typeof o.angle === 'number' ? o.angle : null
    tipo = o && o.type ? o.type : null
  } catch (e) {
    // sin screen.orientation
  }
  return {
    anguloWeb: angulo,
    tipoWeb: tipo,
    ventana: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : null
  }
}

// motivo: 'empezar' -la toma pasa a LEYENDO- o 'volver' -de segundo plano con la toma andando-.
export async function bloquearOrientacion(motivo: 'empezar' | 'volver' = 'empezar'): Promise<void> {
  if (bloqueada) return
  bloqueada = true
  const web = pantallaWeb()
  try {
    const r: any = await CamaraNativa.fijarOrientacion({ repetir: motivo === 'volver' })
    anotar('fijada', { motivo, rotacion: r?.rotacion, orientacion: r?.orientacion, anterior: r?.anterior, natural: r?.natural, ...web })
  } catch (e: any) {
    anotar('no-disponible', { motivo, accion: 'fijar', error: e?.code || e?.message || String(e), ...web })
  }
}

// motivo: 'fin-de-toma' -Parar, Descartar, el atrás, un error, desmontar- o 'segundo-plano'.
export async function soltarOrientacion(motivo: 'fin-de-toma' | 'segundo-plano' = 'fin-de-toma'): Promise<void> {
  if (!bloqueada) return
  bloqueada = false
  try {
    const r: any = await CamaraNativa.soltarOrientacion({ olvidar: motivo !== 'segundo-plano' })
    anotar('soltada', { motivo, orientacion: r?.orientacion, rotacion: r?.rotacion, ...pantallaWeb() })
  } catch (e: any) {
    anotar('no-disponible', { motivo, accion: 'soltar', error: e?.code || e?.message || String(e) })
  }
}
