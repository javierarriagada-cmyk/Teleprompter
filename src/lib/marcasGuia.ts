// MARCAS DE GUÍA DE PRIMERA VEZ -tarea 105, PASO 2, 06-10-2026-.
//
// Tres marcas, una vez en la vida, máx. una por sesión. Cada una vista se guarda en
// localStorage para siempre -mismo try/catch que teleprompter_bienvenida_puesta-. La de la
// sesión vive en memoria: si ya salió una, la siguiente espera a la próxima apertura.
//
// La lógica es pura para probarla sin montar la UI. MarcaGuia solo dibuja.

export type IdMarcaGuia = 'idioma' | 'recuadro' | 'palma'

export const CLAVE_MARCA_IDIOMA = 'teleprompter_marca_idioma'
export const CLAVE_MARCA_RECUADRO = 'teleprompter_marca_recuadro'
export const CLAVE_MARCA_PALMA = 'teleprompter_marca_palma'

const CLAVES: Record<IdMarcaGuia, string> = {
  idioma: CLAVE_MARCA_IDIOMA,
  recuadro: CLAVE_MARCA_RECUADRO,
  palma: CLAVE_MARCA_PALMA
}

// Una sola marca por apertura de la app. No se persiste.
let marcaEnSesion = false

export function hayMarcaEnSesion(): boolean {
  return marcaEnSesion
}

export function registrarMarcaEnSesion(): void {
  marcaEnSesion = true
}

export function marcaYaVista(id: IdMarcaGuia): boolean {
  try {
    return localStorage.getItem(CLAVES[id]) === 'true'
  } catch (e) {
    return false
  }
}

// Queda vista para siempre: al salir la marca, o si la persona ya usó el control -ES/EN,
// arrastrar el recuadro, interruptor de gestos- sin que hubiera salido.
export function marcarComoVista(id: IdMarcaGuia): void {
  try {
    localStorage.setItem(CLAVES[id], 'true')
  } catch (e) {}
}

// Solo para las pruebas: deja la sesión y el almacenamiento como al abrir la app.
export function reiniciarMarcasGuiaParaPruebas(): void {
  marcaEnSesion = false
  try {
    localStorage.removeItem(CLAVE_MARCA_IDIOMA)
    localStorage.removeItem(CLAVE_MARCA_RECUADRO)
    localStorage.removeItem(CLAVE_MARCA_PALMA)
  } catch (e) {}
}

// El Hola se reconoce por el id del GUION -'bienvenida-' + Date.now() en App.tsx-.
// b-bienvenida-1 es id de bloque dentro del Hola, no de un guion.
export function esGuionHola(idGuion: string | null | undefined): boolean {
  return typeof idGuion === 'string' && idGuion.startsWith('bienvenida-')
}

// Condiciones comunes: nunca sobre el Hola, ni durante lectura/toma, ni encima de aviso de
// voz o diálogo de permiso, ni si ya salió otra en esta sesión.
export type CondicionesComunes = {
  idGuion?: string | null
  enLecturaOToma: boolean
  hayAvisoVoz: boolean
  hayDialogoPermiso: boolean
}

export function condicionesComunesOk(c: CondicionesComunes): boolean {
  if (esGuionHola(c.idGuion)) return false
  if (c.enLecturaOToma) return false
  if (c.hayAvisoVoz) return false
  if (c.hayDialogoPermiso) return false
  if (hayMarcaEnSesion()) return false
  return true
}

// Idioma: pegar/importar (sin umbral de palabras) o blur con ≥12 palabras -mismo umbral que
// detectarIdioma-. Si la persona ya tocó ES/EN, no sale -eso se marca vista desde afuera-.
export type DisparoIdioma = 'pegar' | 'blur'

export function debeMostrarMarcaIdioma(opts: {
  yaVista: boolean
  disparo: DisparoIdioma
  palabras: number
  umbralPalabras: number
} & CondicionesComunes): boolean {
  if (opts.yaVista) return false
  if (!condicionesComunesOk(opts)) return false
  if (opts.disparo === 'blur' && opts.palabras < opts.umbralPalabras) return false
  return true
}

// Recuadro: primera vez que el fondo pasa a 'recuadro' con estadoToma listo.
// Si ya arrastró, no sale.
export function debeMostrarMarcaRecuadro(opts: {
  yaVista: boolean
  fondoEsRecuadro: boolean
  estadoListo: boolean
  yaArrastro: boolean
} & CondicionesComunes): boolean {
  if (opts.yaVista) return false
  if (opts.yaArrastro) return false
  if (!opts.fondoEsRecuadro || !opts.estadoListo) return false
  if (!condicionesComunesOk(opts)) return false
  return true
}

// Palma: primera vez que se enciende Control por gestos con motivoSinGestos nulo.
// Espera mientras el modelo baja -estado === 'bajando'-; preparandoGestos es solo la clave i18n.
// También espera con diálogo de Play -pidiendoGestos- o de permiso.
export function debeMostrarMarcaPalma(opts: {
  yaVista: boolean
  gestosEncendidos: boolean
  motivoSinGestos: 'soloFrontal' | 'noDisponible' | null
  modeloBajando: boolean
  pidiendoGestos: boolean
} & CondicionesComunes): boolean {
  if (opts.yaVista) return false
  if (!opts.gestosEncendidos) return false
  if (opts.motivoSinGestos != null) return false
  if (opts.modeloBajando) return false
  if (opts.pidiendoGestos) return false
  if (!condicionesComunesOk(opts)) return false
  return true
}

// Si puede salir: registra la sesión y la deja vista para siempre -una vez en la vida-.
export function abrirMarcaSiCorresponde(id: IdMarcaGuia, puede: boolean): boolean {
  if (!puede) return false
  if (marcaYaVista(id)) return false
  if (hayMarcaEnSesion()) return false
  registrarMarcaEnSesion()
  marcarComoVista(id)
  return true
}
