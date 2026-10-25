import { Capacitor, registerPlugin } from '@capacitor/core'

// EL IDIOMA DE LA APP -D1 de docs/ingles.txt, 27-09-2026-. Es el de los botones, los avisos
// y el guion Hola. NO es el idioma de cada guion -Guion.idioma, lib/detectarIdioma.ts-, que
// decide que reconocedor escucha: alguien con el telefono en espanol puede grabar un guion
// en ingles, y al reves.
//
// Antes -hasta el 2026-10-22, cuando entro el portugues de la orden portugues-app-: «Espanol si el
// telefono esta en espanol; ingles en cualquier otro caso.»
// Espanol si el telefono esta en espanol, portugues -de Brasil- si esta en portugues -pt-BR o pt-PT-,
// ingles en cualquier otro caso -P1 de docs/portugues.txt-. No se pregunta al empezar: se sigue al
// telefono y se cambia adentro, en el cajon del engranaje de la portada.
// Antes: export type IdiomaApp = 'es' | 'en'
export type IdiomaApp = 'es' | 'en' | 'pt'

// EL PLUGIN NATIVO 'IdiomaApp' LO ESCRIBE CLAUDE EN EL TELEFONO -locales_config.xml y
// AppCompatDelegate.setApplicationLocales-, asi lo que se elige adentro y lo que se elige en
// Ajustes del telefono -> Apps -> Idioma son lo mismo. Aca solo se usa si existe: sin el, el
// idioma sale de navigator.language y la eleccion se guarda en localStorage.
interface PluginIdiomaApp {
  leer(): Promise<{ idioma: string }>
  fijar(opciones: { idioma: IdiomaApp }): Promise<void>
}

// La eleccion hecha adentro, cuando no hay plugin. Con el plugin no se usa: el que guarda es
// Android, y tener dos lugares seria tener dos verdades.
const CLAVE_IDIOMA = 'sigo_idioma'

// -portugues-app, punto 3, 2026-10-22- Suma pt: 'pt', 'pt-BR' y 'pt-PT' van a 'pt'.
// Antes: return typeof codigo === 'string' && codigo.trim().toLowerCase().startsWith('es') ? 'es' : 'en'
export function normalizarIdioma(codigo: string | null | undefined): IdiomaApp {
  const c = typeof codigo === 'string' ? codigo.trim().toLowerCase() : ''
  if (c.startsWith('es')) return 'es'
  if (c.startsWith('pt')) return 'pt'
  return 'en'
}

// registerPlugin se llama UNA vez: Capacitor avisa si el mismo plugin se registra dos.
let plugin: PluginIdiomaApp | null | undefined
function pluginIdioma(): PluginIdiomaApp | null {
  if (plugin !== undefined) return plugin
  try {
    plugin = Capacitor.isPluginAvailable('IdiomaApp') ? registerPlugin<PluginIdiomaApp>('IdiomaApp') : null
  } catch (e) {
    console.warn('[idioma] no se pudo preguntar por el plugin IdiomaApp:', e)
    plugin = null
  }
  return plugin
}

function idiomaDelNavegador(): IdiomaApp {
  try {
    return normalizarIdioma(typeof navigator !== 'undefined' ? navigator.language : null)
  } catch {
    return 'en'
  }
}

function idiomaDeArranque(): IdiomaApp {
  if (!pluginIdioma()) {
    try {
      const guardado = localStorage.getItem(CLAVE_IDIOMA)
      // -portugues-app, punto 3, 2026-10-22- Antes: if (guardado === 'es' || guardado === 'en') return guardado
      if (guardado === 'es' || guardado === 'en' || guardado === 'pt') return guardado
    } catch (e) {
      // sin localStorage manda el navegador
    }
  }
  return idiomaDelNavegador()
}

let actual: IdiomaApp = idiomaDeArranque()
const oyentes = new Set<() => void>()

// El lang del documento sigue al de la app: el lector de pantalla del telefono elige la voz
// con que lee por este atributo, y un "Record" leido con voz espanola no se entiende.
function reflejarEnDocumento(idioma: IdiomaApp) {
  try {
    if (typeof document !== 'undefined') document.documentElement.lang = idioma
  } catch {
    // sin documento no hay a quien avisarle
  }
}
reflejarEnDocumento(actual)

function cambiar(idioma: IdiomaApp) {
  if (idioma === actual) return
  actual = idioma
  reflejarEnDocumento(idioma)
  oyentes.forEach((fn) => fn())
}

export function idiomaApp(): IdiomaApp {
  return actual
}

export function suscribirIdioma(fn: () => void): () => void {
  oyentes.add(fn)
  return () => {
    oyentes.delete(fn)
  }
}

// AL ARRANCAR, con el plugin: el idioma que Android tiene para esta app. Mientras responde
// se muestra el de navigator.language, que en el telefono casi siempre es el mismo; el
// splash nativo tapa ese momento. Sin plugin no hace nada: el de arranque ya es el bueno.
export async function leerIdiomaDelTelefono(): Promise<void> {
  const p = pluginIdioma()
  if (!p) return
  try {
    const r = await p.leer()
    cambiar(normalizarIdioma(r && r.idioma))
  } catch (e) {
    console.warn('[idioma] el plugin IdiomaApp no respondio al leer; queda el del navegador:', e)
  }
}

// CAMBIARLO: la app cambia en el momento -todos los que usan useTextos se redibujan- y la
// eleccion se guarda donde corresponde. Si el plugin falla, la pantalla ya cambio igual y se
// dice por consola que al reiniciar volvera el idioma del telefono.
export function fijarIdioma(idioma: IdiomaApp): void {
  cambiar(idioma)
  const p = pluginIdioma()
  if (p) {
    p.fijar({ idioma }).catch((e) => {
      console.warn('[idioma] el plugin IdiomaApp no pudo guardar el idioma; al reiniciar vuelve el del telefono:', e)
    })
    return
  }
  try {
    localStorage.setItem(CLAVE_IDIOMA, idioma)
  } catch (e) {
    console.warn('[idioma] no se pudo guardar el idioma elegido; al reiniciar vuelve el del navegador:', e)
  }
}
