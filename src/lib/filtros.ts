// LOS FILTROS DE LA TOMA -tarea 96, 05-10-2026, docs/planes/plan-3-filtros.txt, fase 1-. Seis filtros
// cerrados, como los estilos de subtítulos: Natural, Cálido, Frío, Vivo, Suave y B/N. Se eligen en el
// visor DESPUÉS de grabar y se queman al guardar con Media3 -MatrizDeColor.java-. Nada en vivo: la
// vista previa de la cámara es una SurfaceView y un filtro CSS no la alcanza -plan 3, 1.1-.
//
// UNA SOLA FUENTE DE VERDAD. Cada filtro es UNA matriz de color 4x5 -la de feColorMatrix-. La misma
// matriz va al <video> del visor -valoresFeColorMatrix, con color-interpolation-filters="sRGB"- y al
// nativo -matrizParaMedia3, los 16 números de RgbMatrix-. El nativo no conoce los nombres: recibe
// números, así que afinar un filtro no pide APK.
//
// MEDIDO POR CLAUDE EN EL MOTO G86 -05-10-2026, paso 0.1 del plan-: en el WebView, un filtro SVG
// feColorMatrix con color-interpolation-filters="sRGB" puesto con style.filter='url(#id)' sobre el
// <video> del visor SÍ se ve, detenido y reproduciendo. Por eso el visor muestra el filtro con la
// misma matriz que se guarda.
//
// "Piel suave" y la viñeta NO van en esta tarea -corrección del 02-10-2026 del plan-: primero los
// seis tonos, y Javier los mira en su cara.
import type { ClaveTexto } from '../textos'

export type TonoFiltro = 'natural' | 'calido' | 'frio' | 'vivo' | 'suave' | 'bn'
// -tarea 96- Sin pielSuave: el plan la ponía en el tipo -4.2-, y queda para su propia tarea.
export type FiltroToma = { version: 1; tono: TonoFiltro }

// El orden es el de la tira del visor.
export const TONOS: Array<{ valor: TonoFiltro; clave: ClaveTexto }> = [
  { valor: 'natural', clave: 'filtroNatural' },
  { valor: 'calido', clave: 'filtroCalido' },
  { valor: 'frio', clave: 'filtroFrio' },
  { valor: 'vivo', clave: 'filtroVivo' },
  { valor: 'suave', clave: 'filtroSuave' },
  { valor: 'bn', clave: 'filtroBN' }
]

// 20 números, POR FILAS, como el atributo values de feColorMatrix -W3C Filter Effects Module Level 1,
// https://www.w3.org/TR/filter-effects-1/#feColorMatrixElement-: filas R', G', B', A' y columnas r, g, b,
// a y el desplazamiento. El desplazamiento va en la escala 0..1, no en 0..255.
export type Matriz4x5 = number[]

export const IDENTIDAD: Matriz4x5 = [
  1, 0, 0, 0, 0,
  0, 1, 0, 0, 0,
  0, 0, 1, 0, 0,
  0, 0, 0, 1, 0
]

// componer(a, b): primero b y después a, como funciones -a(b(color))-. Cada 4x5 se lee como una 5x5
// con la última fila [0 0 0 0 1]; el producto es a·b.
export function componer(a: Matriz4x5, b: Matriz4x5): Matriz4x5 {
  const r: number[] = new Array(20).fill(0)
  for (let fila = 0; fila < 4; fila++) {
    for (let col = 0; col < 5; col++) {
      let s = 0
      for (let k = 0; k < 4; k++) s += a[fila * 5 + k] * b[k * 5 + col]
      // La quinta fila de b es [0 0 0 0 1]: solo suma en la columna del desplazamiento.
      if (col === 4) s += a[fila * 5 + 4]
      r[fila * 5 + col] = s
    }
  }
  return r
}

// LAS PIEZAS, de las fórmulas del W3C -Filter Effects Module Level 1-:
//   - saturate(s): https://www.w3.org/TR/filter-effects-1/#saturateEquivalent -la matriz de
//     feColorMatrix type="saturate"-.
//   - grayscale(1): https://www.w3.org/TR/filter-effects-1/#grayscaleEquivalent, con amount 1: las tres
//     filas valen 0.2126 / 0.7152 / 0.0722 -luma BT.709-.
//   - contrast(c): https://www.w3.org/TR/filter-effects-1/#contrastEquivalent -feComponentTransfer
//     linear, slope c, intercept 0.5 - 0.5·c-; como matriz, c en la diagonal y 0.5 - 0.5·c de
//     desplazamiento.
//   - escalas por canal: la diagonal de feColorMatrix -lo mismo que RgbAdjustment de Media3-.
//   - brillo +b: el desplazamiento de feColorMatrix -la última columna-. OJO: brightness() de CSS es una
//     MULTIPLICACIÓN -slope-; el plan pide "brillo +0,03", que SUMA, como Brightness de Media3 -plan 3,
//     sección 2-. Por eso no se usa brightness() de CSS sino el desplazamiento.
function saturar(s: number): Matriz4x5 {
  return [
    0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s, 0, 0,
    0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s, 0, 0,
    0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s, 0, 0,
    0, 0, 0, 1, 0
  ]
}
const GRISES: Matriz4x5 = [
  0.2126, 0.7152, 0.0722, 0, 0,
  0.2126, 0.7152, 0.0722, 0, 0,
  0.2126, 0.7152, 0.0722, 0, 0,
  0, 0, 0, 1, 0
]
function contrastar(c: number): Matriz4x5 {
  const d = 0.5 - 0.5 * c
  return [
    c, 0, 0, 0, d,
    0, c, 0, 0, d,
    0, 0, c, 0, d,
    0, 0, 0, 1, 0
  ]
}
function escalar(r: number, g: number, b: number): Matriz4x5 {
  return [
    r, 0, 0, 0, 0,
    0, g, 0, 0, 0,
    0, 0, b, 0, 0,
    0, 0, 0, 1, 0
  ]
}
function aclarar(b: number): Matriz4x5 {
  return [
    1, 0, 0, 0, b,
    0, 1, 0, 0, b,
    0, 0, 1, 0, b,
    0, 0, 0, 1, 0
  ]
}

// LOS SEIS, con los números de PARTIDA del plan -plan 3, 4.1; se afinan en el moto g86 con tomas
// reales, P4-. El orden de cada composición es el de CSS -filter: saturate(1.25) contrast(1.08) aplica
// primero saturate-.
export function matrizDeTono(t: TonoFiltro): Matriz4x5 {
  switch (t) {
    case 'calido':
      // Más rojo, menos azul.
      return escalar(1.06, 1.0, 0.92)
    case 'frio':
      // Menos rojo, más azul.
      return escalar(0.94, 1.0, 1.06)
    case 'vivo':
      // Más color y un poco más de contraste.
      return componer(contrastar(1.08), saturar(1.25))
    case 'suave':
      // Menos contraste y un poco más de luz.
      return componer(aclarar(0.03), contrastar(0.92))
    case 'bn':
      return GRISES.slice()
    case 'natural':
    default:
      return IDENTIDAD.slice()
  }
}

// Para el visor: los 20 números por filas, separados por espacio. Se redondea a 6 decimales para que
// el atributo no cargue el ruido del punto flotante -0.30000000000000004-.
export function valoresFeColorMatrix(m: Matriz4x5): string {
  return m.map((n) => String(Math.round(n * 1e6) / 1e6)).join(' ')
}

// PARA MEDIA3: los 16 números de RgbMatrix.getMatrix. LEÍDO en Media3 1.9.0 -etiqueta 1.9.0 de
// androidx/media, libraries/effect/src/main-:
//   - assets/shaders/fragment_shader_transformation_es2.glsl:27: gl_FragColor = uRgbMatrix *
//     vec4(inputColor.rgb, 1). O sea, actúa sobre (r, g, b, 1): la cuarta columna SUMA.
//   - java/androidx/media3/effect/RgbFilter.java:39-41: el gris SDR es {0.2126, 0.2126, 0.2126, 0,
//     0.7152, ...}: los primeros cuatro son lo que aporta el rojo de entrada a r, g, b. POR COLUMNAS,
//     como OpenGL -android.opengl.Matrix-.
//   - RgbFilter.java:51-52: el invertido es {-1,0,0,0, 0,-1,0,0, 0,0,-1,0, 1,1,1,1}: el +1 va en los
//     índices 12, 13 y 14. Brightness.java:45-50 lo pone con Matrix.translateM: igual.
//   - El alfa no lo toca la matriz: fragment_shader_transformation_es2.glsl:28 deja el de la entrada.
// Entonces: m16[col*4 + fila] = m[fila*5 + col] para fila y col de 0 a 2; m16[12 + fila] = el
// desplazamiento de esa fila; m16[3], m16[7], m16[11] = 0 y m16[15] = 1. La fila de alfa de la 4x5 no
// viaja.
// Y EN QUÉ VALORES: con WORKING_COLOR_SPACE_DEFAULT -el que usamos- y SDR, la matriz opera sobre los
// valores con gamma, sin EOTF -fragment_shader_transformation_sdr_external_es2.glsl:86-88 y :103-107-,
// como el feColorMatrix en sRGB del visor. Ojo: el javadoc de RgbMatrix.java:35-36 dice "linear RGB
// BT.709", pero el código manda: en DEFAULT no se linealiza.
export function matrizParaMedia3(m: Matriz4x5): number[] {
  const r: number[] = new Array(16).fill(0)
  for (let fila = 0; fila < 3; fila++) {
    for (let col = 0; col < 3; col++) r[col * 4 + fila] = m[fila * 5 + col]
    r[12 + fila] = m[fila * 5 + 4]
  }
  r[15] = 1
  return r
}

// Natural, o nada: el camino de hoy -copia si no hay subtítulos ni pausas-.
export function esNeutro(f: FiltroToma | null | undefined): boolean {
  return !f || f.tono === 'natural'
}

// SE RECUERDA COMO EL ESTILO DE SUBTÍTULOS -estiloSubtituloGuardado, lib/subtitulos.ts-: comodidad de
// este teléfono, no un dato. Si no hay o es basura, Natural.
const CLAVE_FILTRO = 'sigo_filtro'
export const FILTRO_NATURAL: FiltroToma = { version: 1, tono: 'natural' }
export function esTono(v: unknown): v is TonoFiltro {
  return typeof v === 'string' && TONOS.some((t) => t.valor === v)
}
export function filtroGuardado(): FiltroToma {
  try {
    const v = localStorage.getItem(CLAVE_FILTRO)
    if (v) {
      const o = JSON.parse(v)
      if (o && o.version === 1 && esTono(o.tono)) return { version: 1, tono: o.tono }
    }
  } catch (e) {
    // basura o sin localStorage: Natural
  }
  return { ...FILTRO_NATURAL }
}
export function guardarFiltro(f: FiltroToma): void {
  try {
    localStorage.setItem(CLAVE_FILTRO, JSON.stringify({ version: 1, tono: f.tono }))
  } catch (e) {
    // sin localStorage no se recuerda: no pasa nada
  }
}

// El id del <filter> SVG de cada tono -FiltrosSvg, SelectorFiltro.tsx-. Natural no tiene: va sin filtro.
export function idFiltroSvg(t: TonoFiltro): string {
  return `filtro-sigo-${t}`
}
export function filtroCss(t: TonoFiltro): string | undefined {
  return t === 'natural' ? undefined : `url(#${idFiltroSvg(t)})`
}
