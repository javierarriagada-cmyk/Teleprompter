import fs from 'fs'
import path from 'path'

// COMO LEEN LAS PRUEBAS LA MARCA DEL ARRANQUE NATIVO. 24-09-2026.
//
// Desde la marca "Sig" y la bola -trazoMarca.ts- el splash dibuja: el nombre
// -un trazo relleno-, la bola -un circulo adentro del grupo "bola", que se
// mueve-, una linea circular que la bola recorre, y el lema TELEPROMPTER bajo
// la marca. Estas funciones leen el XML
// y los animadores para que tarea49 y tarea50 prueben lo mismo sin repetir
// el analisis.

const raiz = process.cwd()
export const RUTA_MARCA = path.join(raiz, 'android/app/src/main/res/drawable/marca_arranque.xml')
export const RUTA_MARCA_ANIMADA = path.join(raiz, 'android/app/src/main/res/drawable/marca_arranque_animada.xml')
export const RUTA_ANIMADORES = path.join(raiz, 'android/app/src/main/res/animator')
export const RUTA_MAIN_ACTIVITY = path.join(raiz, 'android/app/src/main/java/com/teleprompter/app/MainActivity.java')

// El splash deja ver un circulo de 288 dp en un lienzo de 432: radio 144.
export const CENTRO = 216
export const RADIO_VISIBLE = 144

function bloque(xml: string, nombre: string): string {
  const m = new RegExp(`<(path|group)[^>]*android:name="${nombre}"[^>]*>`).exec(xml)
  if (!m) throw new Error(`No esta ${nombre} en marca_arranque.xml`)
  return m[0]
}

function atributo(b: string, nombre: string): string | null {
  const m = new RegExp(`android:${nombre}="([^"]*)"`).exec(b)
  return m ? m[1] : null
}

// Todos los pares de coordenadas de un trazo absoluto -M, L, Q, C, Z-, que es
// como lo escribe opentype.js.
export function puntosDelTrazo(d: string): Array<[number, number]> {
  const numeros = (d.match(/-?\d+(\.\d+)?/g) || []).map(Number)
  const pares: Array<[number, number]> = []
  for (let i = 0; i + 1 < numeros.length; i += 2) pares.push([numeros[i], numeros[i + 1]])
  return pares
}

export function leerMarca() {
  const xml = fs.readFileSync(RUTA_MARCA, 'utf8')
  const nombre = bloque(xml, 'nombre')
  const punto = bloque(xml, 'punto')
  const linea = bloque(xml, 'linea')
  const lema = bloque(xml, 'lema')
  const mp = /M(-?[\d.]+),(-?[\d.]+) m-([\d.]+),0/.exec(atributo(punto, 'pathData') || '')
  if (!mp) throw new Error('El punto no es un circulo M cx,cy m-r,0 ...')
  const ml = /A([\d.]+),/.exec(atributo(linea, 'pathData') || '')
  return {
    xml,
    trazoNombre: atributo(nombre, 'pathData') || '',
    alfaNombre: atributo(nombre, 'fillAlpha'),
    alfaPunto: atributo(punto, 'fillAlpha'),
    alfaLinea: atributo(linea, 'strokeAlpha'),
    trazoLema: atributo(lema, 'pathData') || '',
    alfaLema: atributo(lema, 'fillAlpha'),
    anchoLinea: Number(atributo(linea, 'strokeWidth')),
    radioLinea: ml ? Number(ml[1]) : NaN,
    punto: { cx: Number(mp[1]), cy: Number(mp[2]), r: Number(mp[3]) }
  }
}

export type Animador = { propiedad: string; desde: number; hasta: number; valorFinal: string | null; trayecto: string | null }

// Los animadores de cada target, con su comienzo y su fin en ms.
export function leerAnimaciones(): Record<string, Animador[]> {
  const xml = fs.readFileSync(RUTA_MARCA_ANIMADA, 'utf8')
  const salida: Record<string, Animador[]> = {}
  const re = /<target[^>]*android:name="([^"]+)"[^>]*android:animation="@animator\/([^"]+)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) {
    const archivo = path.join(RUTA_ANIMADORES, `${m[2]}.xml`)
    const anim = fs.readFileSync(archivo, 'utf8')
    const bloques = anim.match(/<objectAnimator[\s\S]*?\/>/g) || []
    salida[m[1]] = bloques.map((b) => {
      const inicio = Number(atributo(b, 'startOffset') || 0)
      const duracion = Number(atributo(b, 'duration') || 0)
      return {
        propiedad: atributo(b, 'propertyName') || 'traslado',
        desde: inicio,
        hasta: inicio + duracion,
        valorFinal: atributo(b, 'valueTo'),
        trayecto: atributo(b, 'pathData')
      }
    })
  }
  return salida
}

export function finDeLaAnimacion(): number {
  return Math.max(...Object.values(leerAnimaciones()).flat().map((a) => a.hasta))
}
