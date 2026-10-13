import { describe, expect, test } from 'vitest'
import zlib from 'node:zlib'
import { join, resolve } from 'node:path'

// EL PESO DE SIGO -tarea 103-. Solo la lógica de scripts/medir-peso.mjs: leer lo que dice
// bundletool, leer un zip y sumar. Sin bundletool, sin AAB y sin teléfono: los textos de bundletool
// son copias de lo que salió al medir el AAB de 1d72aeb -docs/peso/informe.txt-.
//
// La ruta va en una variable para que TypeScript no pida tipos de un .mjs de scripts/ -el mismo
// recurso de tarea85-r8.test.ts y tarea99-play.test.ts-.
const SCRIPTS = resolve(__dirname, '..', '..', 'scripts')
const peso = await import(/* @vite-ignore */ join(SCRIPTS, 'medir-peso.mjs'))

// Un zip mínimo armado aquí -encabezados locales, directorio central y fin-, con entradas guardadas
// o comprimidas. El CRC queda en cero: listarZip no lo mira, y así la prueba no depende de
// zlib.crc32, que Node 20 -el del CI- no tiene.
function armarZip(entradas: { nombre: string; datos: Buffer; comprimir: boolean }[]): Buffer {
  const locales: Buffer[] = []
  const centrales: Buffer[] = []
  let desplazamiento = 0
  for (const e of entradas) {
    const nombre = Buffer.from(e.nombre, 'utf8')
    const cuerpo = e.comprimir ? zlib.deflateRawSync(e.datos) : e.datos
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(e.comprimir ? 8 : 0, 8)
    local.writeUInt32LE(cuerpo.length, 18)
    local.writeUInt32LE(e.datos.length, 22)
    local.writeUInt16LE(nombre.length, 26)
    locales.push(local, nombre, cuerpo)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(e.comprimir ? 8 : 0, 10)
    central.writeUInt32LE(cuerpo.length, 20)
    central.writeUInt32LE(e.datos.length, 24)
    central.writeUInt16LE(nombre.length, 28)
    central.writeUInt32LE(desplazamiento, 42)
    centrales.push(central, nombre)
    desplazamiento += 30 + nombre.length + cuerpo.length
  }
  const dir = Buffer.concat(centrales)
  const fin = Buffer.alloc(22)
  fin.writeUInt32LE(0x06054b50, 0)
  fin.writeUInt16LE(entradas.length, 8)
  fin.writeUInt16LE(entradas.length, 10)
  fin.writeUInt32LE(dir.length, 12)
  fin.writeUInt32LE(desplazamiento, 16)
  return Buffer.concat([...locales, dir, fin])
}

const MANIFIESTO_MODEL_ES = `<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:dist="http://schemas.android.com/apk/distribution" split="model_es">
  <dist:module dist:type="asset-pack">
    <dist:fusing dist:include="true"/>
    <dist:delivery>
      <dist:install-time/>
    </dist:delivery>
  </dist:module>
</manifest>`

describe('tarea 103: medir el peso', () => {
  test('lee el MAX de bundletool get-size total', () => {
    expect(peso.leerGetSize('MIN,MAX\n58166020,58166020\n')).toBe(58166020)
    expect(peso.leerGetSize('MIN,MAX\r\n100,200')).toBe(200)
    expect(peso.leerGetSize('Error: algo falló')).toBeNull()
  })

  test('lee el versionCode de dump manifest', () => {
    expect(peso.leerVersionCode('630\n')).toBe(630)
    expect(peso.leerVersionCode('')).toBeNull()
  })

  test('distingue install-time, on-demand, fast-follow y el módulo base', () => {
    expect(peso.leerEntrega(MANIFIESTO_MODEL_ES)).toBe('install-time')
    expect(peso.leerEntrega(MANIFIESTO_MODEL_ES.replace('install-time', 'on-demand'))).toBe('on-demand')
    expect(peso.leerEntrega(MANIFIESTO_MODEL_ES.replace('install-time', 'fast-follow'))).toBe('fast-follow')
    expect(peso.leerEntrega('<manifest package="com.sigoteleprompter.app"><uses-sdk/></manifest>')).toBeNull()
  })

  test('lee un zip con entradas guardadas y comprimidas', () => {
    const texto = Buffer.from('hola '.repeat(200))
    const modelo = Buffer.alloc(1000, 7)
    const zip = armarZip([
      { nombre: 'base/assets/public/index.js', datos: texto, comprimir: true },
      { nombre: 'model_es/assets/model-es/am/final.mdl', datos: modelo, comprimir: false }
    ])
    const entradas = peso.listarZip(zip)
    expect(entradas.map((e: { nombre: string }) => e.nombre)).toEqual(['base/assets/public/index.js', 'model_es/assets/model-es/am/final.mdl'])
    expect(entradas[0].metodo).toBe(8)
    expect(entradas[0].original).toBe(1000)
    expect(entradas[0].comprimido).toBeLessThan(100)
    expect(entradas[1].metodo).toBe(0)
    expect(entradas[1].comprimido).toBe(1000)
    expect(peso.leerEntrada(zip, entradas[0]).equals(texto)).toBe(true)
    expect(peso.leerEntrada(zip, entradas[1]).equals(modelo)).toBe(true)
  })

  test('un archivo que no es zip falla con su motivo, no en silencio', () => {
    expect(() => peso.listarZip(Buffer.alloc(10))).toThrow(/no es un zip/)
    expect(() => peso.listarZip(Buffer.alloc(100))).toThrow(/fin del directorio central/)
  })

  test('pone cada entrada del AAB en su parte de la app', () => {
    expect(peso.categoria('model_es/assets/model-es/graph/Gr.fst')).toBe('paquete model_es')
    expect(peso.categoria('base/lib/arm64-v8a/libmediapipe_tasks_jni.so')).toBe('MediaPipe libmediapipe_tasks_jni.so (arm64-v8a)')
    expect(peso.categoria('base/lib/armeabi-v7a/libvosk.so')).toBe('Vosk libvosk.so (armeabi-v7a)')
    expect(peso.categoria('base/lib/arm64-v8a/libjnidispatch.so')).toBe('otras bibliotecas nativas (arm64-v8a)')
    expect(peso.categoria('base/assets/gesture_recognizer.task')).toBe('modelo de gestos (.task)')
    expect(peso.categoria('base/dex/classes.dex')).toBe('código Java/Kotlin (dex)')
    expect(peso.categoria('base/assets/public/assets/index-BXEUooku.js')).toBe('app web (assets/public)')
    expect(peso.categoria('base/res/drawable/ic_marca.xml')).toBe('recursos Android (res)')
    expect(peso.categoria('base/resources.pb')).toBe('recursos Android (res)')
    expect(peso.categoria('base/assets/native-bridge.js')).toBe('otros de base')
    // Lo que no viaja a ningún teléfono no se cuenta: el mapa de R8 pesa 47 MB en el AAB.
    expect(peso.categoria('BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map')).toBeNull()
    expect(peso.categoria('BundleConfig.pb')).toBeNull()
  })

  test('suma por parte, de la más pesada a la más liviana, sin los metadatos', () => {
    const entradas = [
      { nombre: 'base/dex/classes.dex', metodo: 0, comprimido: 600, original: 600, local: 0 },
      { nombre: 'base/dex/classes2.dex', metodo: 0, comprimido: 400, original: 400, local: 0 },
      { nombre: 'model_es/assets/model-es/am/final.mdl', metodo: 0, comprimido: 5000, original: 5000, local: 0 },
      { nombre: 'BUNDLE-METADATA/x/proguard.map', metodo: 8, comprimido: 9999, original: 99999, local: 0 }
    ]
    const r = peso.resumirPorCategoria(entradas, (e: { original: number }) => Math.round(e.original / 2))
    expect(r).toEqual([
      { categoria: 'paquete model_es', original: 5000, comprimido: 2500, archivos: 1 },
      { categoria: 'código Java/Kotlin (dex)', original: 1000, comprimido: 500, archivos: 2 }
    ])
  })

  test('elige la ABI como bundletool: la primera del teléfono que traiga el AAB', () => {
    expect(peso.abiElegida(['arm64-v8a', 'armeabi-v7a', 'armeabi'], ['armeabi-v7a', 'arm64-v8a'])).toBe('arm64-v8a')
    expect(peso.abiElegida(['armeabi-v7a', 'armeabi'], ['armeabi-v7a', 'arm64-v8a'])).toBe('armeabi-v7a')
    expect(peso.abiElegida(['x86_64'], ['armeabi-v7a', 'arm64-v8a'])).toBeNull()
  })

  test('saca el módulo del nombre de cada APK', () => {
    expect(peso.moduloDeApk('base-master.apk')).toBe('base')
    expect(peso.moduloDeApk('base-arm64_v8a.apk')).toBe('base')
    expect(peso.moduloDeApk('/tmp/x/model_es-master.apk')).toBe('model_es')
  })

  // Los bytes son los del moto g86 con el AAB de 1d72aeb -docs/peso/informe.txt-.
  test('estima lo instalado: APK de la instalación, la copia del español y el inglés bajado', () => {
    const apks = [
      { nombre: 'base-master.apk', bytes: 15638708 },
      { nombre: 'base-arm64_v8a.apk', bytes: 21324467 },
      { nombre: 'base-xxhdpi.apk', bytes: 62590 },
      { nombre: 'base-es.apk', bytes: 16730 },
      { nombre: 'model_es-master.apk', bytes: 60298680 },
      { nombre: 'model_en-master.apk', bytes: 70911416 }
    ]
    const r = peso.estimarInstalado({
      apks,
      entregas: { model_es: 'install-time', model_en: 'on-demand' },
      contenidoDePaquete: { model_es: 60286683, model_en: 70899052 }
    })
    // model_en no entra al instalar: es on-demand.
    expect(r.alInstalar).toBe(15638708 + 21324467 + 62590 + 16730 + 60298680)
    // StorageService copia el español entero: queda dos veces.
    expect(r.primeraLectura).toBe(r.alInstalar + 60286683)
    expect(r.conAPedido).toBe(r.primeraLectura + 70899052)
    expect(peso.formatearMB(r.alInstalar)).toBe('92,8')
  })

  test('escribe los MB como Play en español', () => {
    expect(peso.formatearMB(58166020)).toBe('55,5')
    expect(peso.formatearMB(1048576, 2)).toBe('1,00')
  })

  test('el informe nombra el AAB y cada teléfono', () => {
    const texto = peso.armarInforme({
      aab: 'app-release.aab',
      bytesAab: 110816795,
      versionCode: 630,
      entregas: { model_es: 'install-time' },
      contenidoDePaquete: { model_es: 60286683 },
      telefonos: [{
        d: peso.DISPOSITIVOS[0],
        descargaInstalar: 58166020,
        descargaBase: 18343479,
        descargaTodo: 99354920,
        listaApks: [{ nombre: 'base-master.apk', bytes: 15638708 }],
        instalado: { alInstalar: 97341175, primeraLectura: 157627858, conAPedido: 228526910 },
        desglose: [{ categoria: 'paquete model_es', original: 60286683, comprimido: 39822541, archivos: 15 }]
      }]
    })
    expect(texto).toContain('versionCode 630')
    expect(texto).toContain('moto g86')
    expect(texto).toContain('Descarga al instalar (base + install-time): 55,5 MB')
    expect(texto).toContain('Descarga extra a pedido (on-demand/fast-follow): 39,3 MB')
    expect(texto).toContain('model_es install-time')
  })

  test('los teléfonos medidos son el g86 de 64 bits y uno de 32 bits', () => {
    const [g86, e20] = peso.DISPOSITIVOS
    expect(g86.spec.supportedAbis[0]).toBe('arm64-v8a')
    expect(g86.spec.supportedLocales).toEqual(['es-419'])
    expect(e20.spec.supportedAbis).not.toContain('arm64-v8a')
  })
})
