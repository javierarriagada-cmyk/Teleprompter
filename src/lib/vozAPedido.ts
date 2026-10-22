// LA VOZ A PEDIDO, EN SILENCIO -tarea 104, PASO 2, 06-10-2026-.
//
// En la versión de Play ningún modelo de voz viene con la instalación: el español -57,5 MB- y el
// inglés -67,6 MB- son paquetes on-demand -android/model-es y android/model-en-. Antes el español era
// install-time y, además, StorageService.unpack lo copiaba entero la primera vez: quedaba dos veces en
// el teléfono -unos 150 MB instalados-. Cada 6 MB de descarga cuestan cerca de 1 % de instalaciones.
//
// Por eso, al abrir Sigo se pide en silencio el modelo del idioma de la app -el mismo que elige entre
// "Hola" y "Hi"-, sin avisos. Si cambia el idioma de la app, se pide el otro igual. Nunca los dos si
// no se usan los dos. Si no hay conexión, o Play deja la descarga en pausa -WAITING_FOR_WIFI-, se
// vuelve a pedir sola cuando vuelve la red. El diálogo de Play -el que dice el tamaño- sale solo al
// apretar Empezar -asegurarVoz sin silencioso-, nunca aquí: opción B de Javier.
//
// Aquí está solo la decisión, sin React ni Capacitor, para poder probarla: App le pasa con qué pedir
// -MotorNativo.asegurarVoz en silencio- y con qué saber que volvió la red.
import type { ResultadoVoz } from '../motor/MotorDeVoz'

// -portugues-voz, 2026-10-22- Se suma 'pt', el portugués de Brasil -assets/model-pt-. Antes:
//   export type IdiomaVoz = 'es' | 'en'
export type IdiomaVoz = 'es' | 'en' | 'pt'

// El modelo que corresponde a un idioma -de la app, 'es' | 'en', o del motor, 'es-ES' | 'en-US'-.
// Inglés solo si dice inglés: un idioma que no conocemos no puede dejar a la app sin voz, y el
// español es el mercado principal. Es la misma regla de MotorNativo y de VoskNativoPlugin.
// -portugues-voz, 2026-10-22- Es ahora LA ÚNICA regla: MotorNativo y App la usan, y VoskNativoPlugin.idiomaDeVoz la
// repite en Java. Entiende 'pt' y 'pt-BR'. Lo desconocido sigue yendo a español, pero avisa una vez
// por valor en la consola, para que un idioma mal escrito no pase callado. Antes:
//   return (lang || '').toLowerCase().startsWith('en') ? 'en' : 'es'
const desconocidosAvisados = new Set<string>()
export function idiomaDeVoz(lang: string | null | undefined): IdiomaVoz {
  const base = (lang || '').toLowerCase().split(/[-_]/)[0]
  if (base === 'es' || base === 'en' || base === 'pt') return base
  const valor = String(lang)
  if (!desconocidosAvisados.has(valor)) {
    desconocidosAvisados.add(valor)
    console.warn('[voz] idioma desconocido, se escucha en español:', lang)
  }
  return 'es'
}

// -portugues-voz, 2026-10-22- EL CÓDIGO DEL MOTOR DE CADA IDIOMA, en un solo mapa: App lo usa para langMotor y para
// pedir el modelo en silencio.
export const LANG_MOTOR: Record<IdiomaVoz, string> = { es: 'es-ES', en: 'en-US', pt: 'pt-BR' }

export type EstadoVozEnSilencio =
  | { estado: 'bajando'; progreso: number }
  | { estado: 'lista' }
  // Sin internet: se reintenta solo cuando vuelve la red.
  | { estado: 'sin-conexion' }
  // Play la dejó en pausa -WAITING_FOR_WIFI o REQUIRES_USER_CONFIRMATION- y la retoma sola con Wi-Fi.
  | { estado: 'en-pausa' }
  | { estado: 'error'; mensaje: string }

export interface DependenciasVozEnSilencio {
  // Pide el modelo SIN el diálogo de Play. Resuelve 'lista', 'sin-conexion' o 'en-pausa'.
  asegurar: (idioma: IdiomaVoz, alProgreso: (fraccion: number) => void) => Promise<ResultadoVoz>
  // Avisa cada cambio de estado de un idioma.
  alCambiar: (idioma: IdiomaVoz, estado: EstadoVozEnSilencio) => void
  // Se suscribe a "volvió la red" -o a un reloj de respaldo- y devuelve cómo darse de baja.
  escucharRed: (alVolver: () => void) => () => void
}

export interface VozEnSilencio {
  // Pide el modelo del idioma. Si ya está listo, o ya se está pidiendo, no hace nada.
  pedir: (idioma: IdiomaVoz) => void
  // Vuelve a pedirlo ahora, aunque esté esperando la red -el botón Reintentar-.
  reintentar: (idioma: IdiomaVoz) => void
  // Suelta las esperas de red -al desmontar App-.
  soltar: () => void
}

export function crearVozEnSilencio(dep: DependenciasVozEnSilencio): VozEnSilencio {
  const pidiendo = new Set<IdiomaVoz>()
  const listos = new Set<IdiomaVoz>()
  const esperas = new Map<IdiomaVoz, () => void>()
  let soltado = false

  function dejarDeEsperar(idioma: IdiomaVoz) {
    const baja = esperas.get(idioma)
    if (baja) {
      esperas.delete(idioma)
      baja()
    }
  }

  function esperarRed(idioma: IdiomaVoz) {
    if (esperas.has(idioma) || soltado) return
    esperas.set(
      idioma,
      dep.escucharRed(() => {
        dejarDeEsperar(idioma)
        pedir(idioma)
      })
    )
  }

  function pedir(idioma: IdiomaVoz) {
    if (soltado || listos.has(idioma) || pidiendo.has(idioma)) return
    dejarDeEsperar(idioma)
    pidiendo.add(idioma)
    // 'bajando' recién con el primer avance de Play: si el modelo ya está, responde al instante y la
    // pastilla no parpadea "Preparando la voz… 0 %".
    dep
      .asegurar(idioma, (fraccion) => {
        if (!soltado) dep.alCambiar(idioma, { estado: 'bajando', progreso: fraccion })
      })
      .then((r) => {
        pidiendo.delete(idioma)
        if (soltado) return
        if (r === 'lista') {
          listos.add(idioma)
          dep.alCambiar(idioma, { estado: 'lista' })
          return
        }
        // 'rechazada' no debería llegar en silencio -no hay diálogo-; si llega, se trata como pausa.
        dep.alCambiar(idioma, r === 'sin-conexion' ? { estado: 'sin-conexion' } : { estado: 'en-pausa' })
        esperarRed(idioma)
      })
      .catch((e: any) => {
        pidiendo.delete(idioma)
        if (soltado) return
        dep.alCambiar(idioma, { estado: 'error', mensaje: e?.message || String(e) })
        // Un error de Play puede ser pasajero: se prueba otra vez cuando vuelva la red.
        esperarRed(idioma)
      })
  }

  return {
    pedir,
    reintentar(idioma) {
      dejarDeEsperar(idioma)
      pedir(idioma)
    },
    soltar() {
      soltado = true
      for (const idioma of Array.from(esperas.keys())) dejarDeEsperar(idioma)
    }
  }
}

// "VOLVIÓ LA RED", EN EL TELÉFONO. El WebView avisa con el evento 'online' de window. Por si en algún
// equipo no llega -sin verificar en el teléfono-, además se prueba cada MS_RELOJ_RED: preguntar sin red
// es barato, PaqueteDeVoz mira la red antes de pedir nada a Play.
export const MS_RELOJ_RED = 30000

export function escucharRedDelNavegador(alVolver: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  let hecho = false
  const una = () => {
    if (hecho) return
    hecho = true
    baja()
    alVolver()
  }
  const reloj = window.setInterval(una, MS_RELOJ_RED)
  window.addEventListener('online', una)
  function baja() {
    window.clearInterval(reloj)
    window.removeEventListener('online', una)
  }
  return () => {
    hecho = true
    baja()
  }
}
