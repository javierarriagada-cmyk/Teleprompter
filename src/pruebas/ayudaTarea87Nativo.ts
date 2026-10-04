// AYUDA DE LAS PRUEBAS DE LA TAREA 87 -04-10-2026-: el CamaraNativa fingido. Va aparte de
// ayudaTarea87.tsx porque lo importa el vi.mock de @capacitor/core, y ese no puede importar <App>
// -que importa @capacitor/core: se esperarían el uno al otro-.
import fs from 'fs'
import path from 'path'

export const TOMA_REGISTRO = fs.readFileSync(path.join(__dirname, 'corpus', 'toma-008a7133-palabras.motor.txt'), 'utf8')

export type EstadoNativo = {
  llamadas: Array<[string, any]>
  // Un APK viejo: sin exportarToma ni capacidades -Capacitor rechaza "not implemented"-.
  apkViejo: boolean
  // Lo que devuelve analizarVideo -una toma vieja que se analiza al abrir el visor-.
  analisis: Record<string, unknown> | null
  // Para dejar el guardado colgado y soltarlo cuando la prueba quiera.
  retenerGuardado: boolean
  soltar: Array<() => void>
  guardadoFalla: string | null
  compartirFalla: string | null
}

export function estadoNativoNuevo(): EstadoNativo {
  return { llamadas: [], apkViejo: false, analisis: null, retenerGuardado: false, soltar: [], guardadoFalla: null, compartirFalla: null }
}

function noImplementado(nombre: string) {
  const e: any = new Error(`"CamaraNativa.${nombre}()" is not implemented on android`)
  e.code = 'UNIMPLEMENTED'
  return Promise.reject(e)
}

// El plugin fingido. Lo que no está aquí rechaza como un método que el APK no tiene.
export function camaraNativaFingida(estado: EstadoNativo): any {
  const guardar = (nombre: string, uri: string, extra: Record<string, unknown> = {}) => (o: any) => {
    estado.llamadas.push([nombre, o])
    if (estado.guardadoFalla) return Promise.reject(new Error(estado.guardadoFalla))
    const res = { ok: true, uri, ...extra }
    if (!estado.retenerGuardado) return Promise.resolve(res)
    return new Promise((r) => estado.soltar.push(() => r(res)))
  }
  const metodos: Record<string, (o?: any) => Promise<any>> = {
    directorioGrabaciones: async () => ({ ruta: '/grabaciones' }),
    leerTexto: async () => ({ contenido: TOMA_REGISTRO }),
    escribirTexto: async () => ({ ok: true }),
    listar: async () => ({ nombres: [] }),
    borrarArchivo: async (o) => { estado.llamadas.push(['borrarArchivo', o]); return { ok: true } },
    analizarVideo: async (o) => {
      estado.llamadas.push(['analizarVideo', o])
      if (!estado.analisis) throw new Error('sin análisis')
      return estado.analisis
    },
    guardarEnGaleria: guardar('guardarEnGaleria', 'content://media/copia'),
    guardarConSubtitulos: guardar('guardarConSubtitulos', 'content://media/vieja'),
    exportarToma: guardar('exportarToma', 'content://media/87', { recodifico: true, msGuardado: 1 }),
    capacidades: async () => ({ exportarToma: true }),
    compartir: async (o) => {
      estado.llamadas.push(['compartir', o])
      if (estado.compartirFalla) throw new Error(estado.compartirFalla)
    },
    existeEnGaleria: async () => ({ existe: true }),
    addListener: async () => ({ remove: async () => {} }),
    anotarMedicion: async () => ({ escrita: false })
  }
  return new Proxy({}, {
    get(_t, prop: string) {
      if (prop === 'then') return undefined
      if (estado.apkViejo && (prop === 'exportarToma' || prop === 'capacidades')) return () => noImplementado(prop)
      if (prop in metodos) return metodos[prop]
      return () => noImplementado(prop)
    }
  })
}

// La receta que llegó al nativo, leída de vuelta.
export function recetaQueLlego(estado: EstadoNativo): any {
  const l = estado.llamadas.find(([n]) => n === 'exportarToma')
  return l ? JSON.parse(l[1].receta) : null
}

