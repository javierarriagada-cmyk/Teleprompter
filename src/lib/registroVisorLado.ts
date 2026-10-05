// EL REGISTRO DEL VISOR DE LADO -tarea 90, 04-10-2026-.
//
// Para que Claude verifique en el moto g86 lo que Chrome no puede mostrar:
//   (a) que la barra de estado vuelve a ocultarse después de deslizar desde arriba -cada cambio de los
//       bordes, con los ms desde el hide-;
//   (b) el giro 270 con la barra de tres botones a la izquierda -la orientación y los cuatro bordes-;
//   (c) videoWidth y videoHeight, la miniatura y la rotación del sidecar si la trae;
//   (d) los bordes que informa la WebView -env() y las variables --safe-area-inset-* de Capacitor-;
//   (e) la letra del sistema agrandada -el tamaño calculado de un rótulo y si alguna fila baja de 48-.
//
// Cada línea es «visor-lado <evento> clave=valor ...». Va a tres lugares:
//   1. Al registro de diagnóstico -anotar, tipo 'visor-lado'- si está encendido, o sea durante una toma.
//   2. A la consola como «[visor-lado] ...»: se ve en adb logcat -chromium- y en chrome://inspect.
//   3. A una memoria propia que se vuelca a <grabaciones>/visor-lado.txt al cerrar el visor de lado
//      -adb shell run-as com.sigoteleprompter.app cat files/grabaciones/visor-lado.txt-. Hace falta
//      porque el diagnóstico se apaga al terminar la toma, y el visor se abre después.
// El formato completo está en docs/tarea90.txt, "EL REGISTRO DEL VISOR DE LADO".
import { anotar } from './diagnostico'
import { Capacitor } from '@capacitor/core'
import { directorioGrabaciones, escribirTexto, leerTexto, juntos } from './archivosNativos'

const MAX_EN_MEMORIA = 2000
const MAX_EN_ARCHIVO = 4000
let lineas: string[] = []
let pendientes: string[] = []

export type Detalle = Record<string, string | number | boolean | null | undefined>

function valor(v: Detalle[string]): string {
  if (v === null || v === undefined) return '-'
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(2)
  return String(v).replace(/\s+/g, '_')
}

export function detalleComoTexto(d: Detalle): string {
  return Object.entries(d).map(([k, v]) => `${k}=${valor(v)}`).join(' ')
}

function hora(): string {
  const f = new Date()
  const dd = (n: number, c = 2) => String(n).padStart(c, '0')
  return `${f.getFullYear()}-${dd(f.getMonth() + 1)}-${dd(f.getDate())} ${dd(f.getHours())}:${dd(f.getMinutes())}:${dd(f.getSeconds())}.${dd(f.getMilliseconds(), 3)}`
}

export function anotarVisorLado(evento: string, d: Detalle = {}) {
  const detalle = detalleComoTexto(d)
  anotar({ tipo: 'visor-lado', evento, detalle })
  const linea = `${hora()}\tvisor-lado\t${evento}${detalle ? ' ' + detalle : ''}`
  lineas.push(linea)
  pendientes.push(linea)
  if (lineas.length > MAX_EN_MEMORIA) lineas = lineas.slice(-MAX_EN_MEMORIA)
  if (pendientes.length > MAX_EN_MEMORIA) pendientes = pendientes.slice(-MAX_EN_MEMORIA)
  try {
    console.info(`[visor-lado] ${evento} ${detalle}`)
  } catch (e) {
    // sin consola no pasa nada
  }
}

export function lineasVisorLado(): string[] {
  return lineas.slice()
}

export function limpiarRegistroVisorLado() {
  lineas = []
  pendientes = []
}

// Agrega lo nuevo al final de visor-lado.txt. Solo en el teléfono: en la web no hay carpeta de tomas.
// Si no se puede escribir, el visor sigue igual: es un instrumento.
export async function volcarRegistroVisorLado(): Promise<void> {
  if (pendientes.length === 0) return
  let nativo = false
  try {
    nativo = Capacitor.isNativePlatform()
  } catch (e) {
    nativo = false
  }
  if (!nativo) return
  const nuevas = pendientes
  pendientes = []
  try {
    const ruta = juntos(await directorioGrabaciones(), 'visor-lado.txt')
    let antes = ''
    try {
      antes = await leerTexto(ruta)
    } catch (e) {
      antes = '# REGISTRO DEL VISOR DE LADO -tarea 90-. Formato en docs/tarea90.txt.\n'
    }
    const todas = (antes.replace(/\n$/, '') + '\n' + nuevas.join('\n')).split('\n')
    await escribirTexto(ruta, todas.slice(-MAX_EN_ARCHIVO).join('\n') + '\n')
  } catch (e) {
    console.warn('[visor-lado] no se pudo escribir visor-lado.txt:', e)
  }
}
