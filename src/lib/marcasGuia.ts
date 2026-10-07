// MARCAS DE GUÍA DE PRIMERA VEZ -tarea 105, PASO 2, 06-10-2026-.
//
// Tres marcas, una vez en la vida, máx. una por sesión. Cada una queda vista en
// localStorage para siempre SOLO con «Entendido» o al usar el control señalado -mismo
// try/catch que teleprompter_bienvenida_puesta-. Tocar afuera la cierra pero NO la gasta:
// vuelve la próxima vez que se haga la acción. Si el componente se desmonta con la marca
// a la vista, no queda vista y se libera la de la sesión.
//
// La de la sesión vive en memoria: si ya salió una, la siguiente espera -salvo que se
// libere al desmontar o al tocar afuera-.
//
// La lógica es pura para probarla sin montar la UI. MarcaGuia solo dibuja.

export type IdMarcaGuia = 'idioma' | 'recuadro' | 'palma'

export const CLAVE_MARCA_IDIOMA = 'teleprompter_marca_idioma'
export const CLAVE_MARCA_RECUADRO = 'teleprompter_marca_recuadro'
export const CLAVE_MARCA_PALMA = 'teleprompter_marca_palma'

// Id del bloque molde del guion Hola -bienvenida.ts-. No es id de guion.
export const ID_BLOQUE_HOLA = 'b-bienvenida-1'

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

// Si se desmonta con la marca a la vista, o se toca afuera: no quedó vista; la sesión
// vuelve a estar libre para que la marca pueda salir otra vez al repetir la acción.
export function liberarMarcaEnSesion(): void {
  marcaEnSesion = false
}

export function marcaYaVista(id: IdMarcaGuia): boolean {
  try {
    return localStorage.getItem(CLAVES[id]) === 'true'
  } catch (e) {
    return false
  }
}

// Queda vista para siempre: «Entendido» o usar el control -ES/EN, arrastrar el recuadro,
// interruptor-. Antes: también al tocar afuera.
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

// El Hola: id del GUION que empieza con 'bienvenida-' -App.tsx- O el molde de bloque
// b-bienvenida-1. Antes: solo el id del guion; b-bienvenida-1 se descartaba porque no es
// id de guion, pero el molde también identifica al Hola.
export function esGuionHola(
  idGuion: string | null | undefined,
  idsBloques?: Array<string | null | undefined> | null
): boolean {
  if (typeof idGuion === 'string' && idGuion.startsWith('bienvenida-')) return true
  if (idsBloques && idsBloques.some((id) => id === ID_BLOQUE_HOLA)) return true
  return false
}

// Condiciones comunes: nunca sobre el Hola, ni durante lectura/toma, ni encima de aviso de
// voz o diálogo de permiso, ni si ya salió otra en esta sesión.
export type CondicionesComunes = {
  idGuion?: string | null
  idsBloques?: Array<string | null | undefined> | null
  enLecturaOToma: boolean
  hayAvisoVoz: boolean
  hayDialogoPermiso: boolean
}

export function condicionesComunesOk(c: CondicionesComunes): boolean {
  if (esGuionHola(c.idGuion, c.idsBloques)) return false
  if (c.enLecturaOToma) return false
  if (c.hayAvisoVoz) return false
  if (c.hayDialogoPermiso) return false
  if (hayMarcaEnSesion()) return false
  return true
}

// Idioma: pegar/importar con al menos una palabra, o blur con ≥12 -mismo umbral que
// detectarIdioma-. Pegado vacío no sale. Si ya tocó ES/EN, no sale -marca vista afuera-.
export type DisparoIdioma = 'pegar' | 'blur'

export function debeMostrarMarcaIdioma(opts: {
  yaVista: boolean
  disparo: DisparoIdioma
  palabras: number
  umbralPalabras: number
} & CondicionesComunes): boolean {
  if (opts.yaVista) return false
  if (!condicionesComunesOk(opts)) return false
  // Pegar/importar sin texto: no sale.
  if (opts.disparo === 'pegar' && opts.palabras < 1) return false
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

// Si puede salir: registra la sesión. NO la deja vista: eso solo con Entendido o el control.
// Antes: marcarComoVista(id) al abrir.
export function abrirMarcaSiCorresponde(id: IdMarcaGuia, puede: boolean): boolean {
  if (!puede) return false
  if (marcaYaVista(id)) return false
  if (hayMarcaEnSesion()) return false
  registrarMarcaEnSesion()
  return true
}
