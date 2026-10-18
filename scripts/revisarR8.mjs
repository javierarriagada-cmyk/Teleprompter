// LO QUE R8 NO PUEDE TOCAR, COMPROBADO EN EL MAPPING -tarea 85, 29-09-2026-.
//
// La versión de Play se caía al apretar Grabar: R8 había dejado Plugin.getPermissionStates
// reducido a "throw null" porque dio por hecho que la anotación @CapacitorPlugin no existe nunca
// -ver android/app/proguard-rules.pro, EL NÚCLEO DE CAPACITOR-. Nada lo avisó: la app compiló,
// abrió y leyó. Esta revisión mira los dos informes que R8 deja junto al AAB y dice qué falta,
// para que npm run play lo marque en FALLA antes de subir nada:
//   mapping.txt  qué clase y qué método quedó con qué nombre. Lo que se buscaba por nombre tiene
//                que conservar el suyo.
//   usage.txt    lo que R8 quitó. Del núcleo de Capacitor no se puede quitar nada: fue ahí donde
//                desapareció el campo PluginHandle.pluginAnnotation.
// Es una función pura -recibe los textos y devuelve la lista de problemas- para que las pruebas
// la puedan correr con un mapping del build que se caía -src/pruebas/tarea85-r8.test.ts-.

// Las clases que se leen por reflexión o por nombre y tienen que quedar con el suyo.
const CLASES_CON_SU_NOMBRE = [
  'com.getcapacitor.annotation.CapacitorPlugin',
  'com.getcapacitor.annotation.Permission',
  'com.getcapacitor.annotation.PermissionCallback',
  'com.getcapacitor.annotation.ActivityCallback',
  'com.getcapacitor.PluginMethod',
  'com.getcapacitor.Plugin',
  'com.getcapacitor.PluginHandle',
  'com.getcapacitor.Bridge',
  'app.capgo.capacitor.camera.preview.CameraPreview',
  'com.sigoteleprompter.app.VoskNativoPlugin',
  'com.sigoteleprompter.app.CamaraNativaPlugin',
  'org.vosk.LibVosk',
  // -18-10-2026- Flogger la busca por su nombre en texto. En la 0.9.1 quedó como v7.b y MediaPipe no
  // arrancaba: los gestos rotos en Play -proguard-rules.pro, FLOGGER-.
  'com.google.common.flogger.backend.system.DefaultPlatform'
]

// Los miembros que la caída de Grabar necesitaba, cada uno en su clase. El mapping solo nombra un
// miembro si tiene código con números de línea o si R8 le cambió algo: un campo o un método de
// anotación que quedó igual no aparece. Por eso cada uno dice cómo se reconoce en el mapping, si
// tiene que estar sí o sí -los métodos con código- y cómo aparecería en usage.txt si R8 lo quitó.
const MIEMBROS = [
  { clase: 'com.getcapacitor.Plugin', nombre: 'getPermissionState', firma: 'getPermissionState(java.lang.String)', siempre: true, texto: 'Plugin.getPermissionState(String)' },
  { clase: 'com.getcapacitor.Plugin', nombre: 'getPermissionStates', firma: 'getPermissionStates()', siempre: true, texto: 'Plugin.getPermissionStates()' },
  { clase: 'com.getcapacitor.PluginHandle', nombre: 'pluginAnnotation', firma: 'pluginAnnotation', siempre: false, texto: 'PluginHandle.pluginAnnotation' },
  { clase: 'com.getcapacitor.PluginHandle', nombre: 'getPluginAnnotation', firma: 'getPluginAnnotation()', siempre: true, texto: 'PluginHandle.getPluginAnnotation()' },
  { clase: 'com.getcapacitor.annotation.CapacitorPlugin', nombre: 'permissions', firma: 'permissions()', siempre: false, texto: 'CapacitorPlugin.permissions()' }
]

// Lo que el compilador inventa y R8 puede quitar sin que nadie lo eche de menos: las clases de
// acceso -IA y -CC, las lambdas sintéticas y los static {} vacíos -<clinit>-.
const esSintetica = (clase) => /-(IA|CC)$|\$\$InternalSyntheticLambda|\$\$ExternalSyntheticLambda/.test(clase)
const esClinit = (linea) => /^\s+static void <clinit>\(\)\s*$/.test(linea)

// El trozo del mapping de una clase: su línea "clase -> nombre:" y las de sus miembros, que van
// con sangría o son comentarios #.
function seccion(mapping, clase) {
  const lineas = mapping.split('\n')
  const i = lineas.findIndex((l) => l.startsWith(clase + ' -> '))
  if (i < 0) return null
  let fin = i + 1
  while (fin < lineas.length && (/^\s/.test(lineas[fin]) || lineas[fin].startsWith('#'))) fin++
  return lineas.slice(i, fin).join('\n')
}

// usage.txt: cada clase de la que R8 quitó algo va sin sangría -con ":" y debajo, con sangría, lo
// que quitó- o sin ":" si la quitó entera. Devuelve { clase: [miembros] }, con null si fue entera.
function leerUsage(usage) {
  const quitado = {}
  let actual = null
  for (const l of usage.split('\n')) {
    if (!l.trim()) continue
    if (/^\s/.test(l)) {
      if (actual && quitado[actual]) quitado[actual].push(l)
    } else if (l.trimEnd().endsWith(':')) {
      actual = l.trimEnd().slice(0, -1)
      quitado[actual] = []
    } else {
      actual = null
      quitado[l.trim()] = null
    }
  }
  return quitado
}

export function revisarR8(mapping, usage) {
  const problemas = []
  for (const clase of CLASES_CON_SU_NOMBRE) {
    const s = seccion(mapping, clase)
    if (!s) problemas.push(`${clase} no está en el mapping`)
    else if (!s.startsWith(`${clase} -> ${clase}:`)) problemas.push(`${clase} quedó renombrada: ${s.split('\n')[0]}`)
  }
  const quitado = leerUsage(usage)
  for (const m of MIEMBROS) {
    const lineas = (seccion(mapping, m.clase) || '').split('\n').filter((l) => /^\s/.test(l) && l.includes(' ' + m.firma))
    const deClase = quitado[m.clase]
    if (deClase === null || (deClase && deClase.some((l) => new RegExp(`\\s${m.nombre}(\\(|\\s*$)`).test(l)))) {
      problemas.push(`${m.texto}: R8 lo quitó -usage.txt-`)
    } else if (lineas.some((l) => !l.trimEnd().endsWith('-> ' + m.nombre))) {
      problemas.push(`${m.texto} quedó con otro nombre en el mapping`)
    } else if (m.siempre && lineas.length === 0) {
      problemas.push(`${m.texto} no está en el mapping`)
    }
  }
  // Del núcleo de Capacitor no se quita nada que no sea sintético.
  const delNucleo = Object.entries(quitado).filter(([clase, miembros]) =>
    clase.startsWith('com.getcapacitor.') && !esSintetica(clase) && (miembros === null || miembros.some((l) => !esClinit(l))))
  if (delNucleo.length > 0) {
    const nombres = delNucleo.map(([clase, miembros]) => (miembros === null ? `${clase} -entera-` : clase))
    problemas.push(`R8 quitó cosas del núcleo de Capacitor -usage.txt-: ${nombres.slice(0, 5).join(', ')}${nombres.length > 5 ? ` y ${nombres.length - 5} más` : ''}`)
  }
  return problemas
}
