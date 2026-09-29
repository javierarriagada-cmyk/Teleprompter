import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

// TAREA 85 -29-09-2026-: la versión de Play se caía al apretar Grabar. R8 renombró la anotación
// @CapacitorPlugin y, como nadie la crea con new, dio por hecho que nunca existe: plegó a
// "throw null" Plugin.getPermissionStates, que es lo primero que llama CameraPreview.start.
// Estas pruebas cuidan las dos defensas: las reglas de android/app/proguard-rules.pro y la
// revisión del mapping que hace npm run play -scripts/revisarR8.mjs-.

const RAIZ = path.resolve(__dirname, '..', '..')
// La ruta va en una variable para que TypeScript no pida tipos de un .mjs de scripts/.
const RUTA_REVISAR = path.join(RAIZ, 'scripts', 'revisarR8.mjs')
const cargarRevisar = async (): Promise<(mapping: string, usage: string) => string[]> =>
  (await import(/* @vite-ignore */ RUTA_REVISAR)).revisarR8

// Un trozo del mapping del AAB que se caía -versionCode 506-, copiado tal cual: la anotación y
// Plugin quedaron con otro nombre, y usage.txt dice que se quitó PluginHandle.pluginAnnotation.
const MAPPING_ANTES = [
  'app.capgo.capacitor.camera.preview.CameraPreview -> app.capgo.capacitor.camera.preview.CameraPreview:',
  'com.getcapacitor.Plugin -> com.getcapacitor.c0:',
  '# {"id":"sourceFile","fileName":"Plugin.java"}',
  '    1:11:com.getcapacitor.PermissionState getPermissionState(java.lang.String):609:609 -> getPermissionState',
  '    1:2:java.util.Map getPermissionStates():619:619 -> getPermissionStates',
  'com.getcapacitor.annotation.CapacitorPlugin -> w5.b:',
  '    com.getcapacitor.annotation.Permission[] permissions() -> permissions'
].join('\n')
const USAGE_ANTES = ['com.getcapacitor.AppUUID', 'com.getcapacitor.PluginHandle:', '    private final com.getcapacitor.annotation.CapacitorPlugin pluginAnnotation'].join('\n')

// Lo mismo como tiene que quedar: cada clase con su nombre y nada quitado de Capacitor.
const CLASES = [
  'com.getcapacitor.annotation.CapacitorPlugin', 'com.getcapacitor.annotation.Permission',
  'com.getcapacitor.annotation.PermissionCallback', 'com.getcapacitor.annotation.ActivityCallback',
  'com.getcapacitor.PluginMethod', 'com.getcapacitor.Plugin', 'com.getcapacitor.PluginHandle',
  'com.getcapacitor.Bridge', 'app.capgo.capacitor.camera.preview.CameraPreview',
  'com.sigoteleprompter.app.VoskNativoPlugin', 'com.sigoteleprompter.app.CamaraNativaPlugin', 'org.vosk.LibVosk'
]
const MIEMBROS_BIEN: Record<string, string[]> = {
  'com.getcapacitor.Plugin': [
    '    1:11:com.getcapacitor.PermissionState getPermissionState(java.lang.String):609:609 -> getPermissionState',
    '    1:2:java.util.Map getPermissionStates():619:619 -> getPermissionStates'
  ],
  'com.getcapacitor.PluginHandle': ['    1:5:com.getcapacitor.annotation.CapacitorPlugin getPluginAnnotation():156:156 -> getPluginAnnotation'],
  'com.getcapacitor.annotation.CapacitorPlugin': ['    com.getcapacitor.annotation.Permission[] permissions() -> permissions']
}
const MAPPING_BIEN = CLASES.map((c) => [`${c} -> ${c}:`, ...(MIEMBROS_BIEN[c] ?? [])].join('\n')).join('\n')
// Así quedó usage.txt del AAB arreglado en lo que toca a Capacitor: solo cosas que inventa el
// compilador -clases -IA, static {} vacíos-, que R8 puede quitar sin daño.
const USAGE_BIEN = [
  'androidx.core.app.NotificationCompat:', '    public static final int PRIORITY_MAX',
  'com.getcapacitor.AndroidProtocolHandler:', '    static void <clinit>()', 'com.getcapacitor.Bridge-IA'
].join('\n')

describe('T85f R8 y el núcleo de Capacitor', () => {
  test('la revisión del mapping marca el AAB que se caía al apretar Grabar', async () => {
    const revisarR8 = await cargarRevisar()
    const problemas = revisarR8(MAPPING_ANTES, USAGE_ANTES)
    expect(problemas.some((p) => p.includes('com.getcapacitor.annotation.CapacitorPlugin quedó renombrada'))).toBe(true)
    expect(problemas.some((p) => p.includes('com.getcapacitor.Plugin quedó renombrada'))).toBe(true)
    expect(problemas).toContain('PluginHandle.pluginAnnotation: R8 lo quitó -usage.txt-')
    expect(problemas.some((p) => p.includes('quitó cosas del núcleo de Capacitor') && p.includes('com.getcapacitor.AppUUID'))).toBe(true)
  })

  test('la revisión del mapping deja pasar un AAB que lo conserva todo', async () => {
    const revisarR8 = await cargarRevisar()
    expect(revisarR8(MAPPING_BIEN, USAGE_BIEN)).toEqual([])
    // Sin getPermissionState con su nombre, falla aunque la clase lo conserve.
    const sinMetodo = MAPPING_BIEN.replace('-> getPermissionState\n', '-> a\n')
    expect(revisarR8(sinMetodo, USAGE_BIEN)).toEqual(['Plugin.getPermissionState(String) quedó con otro nombre en el mapping'])
    // Y si R8 quita algo de verdad del núcleo, también.
    expect(revisarR8(MAPPING_BIEN, USAGE_BIEN + '\ncom.getcapacitor.JSValue')).toEqual(['R8 quitó cosas del núcleo de Capacitor -usage.txt-: com.getcapacitor.JSValue -entera-'])
  })

  test('proguard-rules.pro conserva el núcleo de Capacitor y sus anotaciones', () => {
    const reglas = fs.readFileSync(path.join(RAIZ, 'android', 'app', 'proguard-rules.pro'), 'utf-8')
    // Solo cuentan las reglas de verdad, no lo que dicen los comentarios.
    const activas = reglas.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('-')).join('\n')
    expect(activas).toContain('-keep class com.getcapacitor.** { *; }')
    expect(activas).toContain('-keep @interface com.getcapacitor.annotation.** { *; }')
    expect(activas).toContain('-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }')
    const atributos = activas.split('\n').filter((l) => l.startsWith('-keepattributes')).join(',')
    for (const a of ['RuntimeVisibleAnnotations', 'RuntimeVisibleParameterAnnotations', 'AnnotationDefault', 'Signature', 'InnerClasses', 'EnclosingMethod']) {
      expect(atributos).toContain(a)
    }
  })
})
