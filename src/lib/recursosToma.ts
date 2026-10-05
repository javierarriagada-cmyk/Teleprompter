// LA CÁMARA O EL MICRÓFONO TOMADOS POR OTRA APP EN PLENA TOMA -tarea 83, parte B, 04-10-2026-.
//
// Es el punto LS-M2 de la guía de calidad de Android para pantallas grandes -developer.android.com/docs/
// quality-guidelines/archive/adaptive/large-screen-app-quality-: en ventana múltiple la app tiene que
// manejar que otra le quite la cámara o el micrófono. Javier aprobó solo ese punto de la parte A.1. En
// pantalla dividida Sigo sigue al frente -no pasa por segundo plano-, así que el corte de appStateChange
// -App.tsx- no llega: hace falta otra señal.
//
// Las señales son del nativo -CamaraNativaPlugin.vigilarRecursos, la decisión en PerdidaDeRecursos.java-:
//   - cámara: la vista previa de CameraX deja de transmitir con la actividad al frente;
//   - micrófono: el sistema silencia la grabación de Sigo porque otra app le ganó el micrófono.
// Cuando llega una, App corta la toma por el MISMO camino que al pasar a segundo plano -cortarTomaSiHay
// con incompleta- y la toma queda guardada como incompleta, recuperable como siempre. Después sale un
// aviso que dice qué pasó. En la web el plugin no existe: no se vigila nada y no pasa nada.
import { CamaraNativa } from './camara'

export type Recurso = 'camara' | 'microfono'
export interface PerdidaDeRecurso {
  recurso: Recurso
  motivo: string
}

// La clave del aviso -textos/es.ts y en.ts- para cada recurso perdido.
export function avisoDePerdida(recurso: Recurso): 'tomaCortadaCamara' | 'tomaCortadaMicrofono' {
  return recurso === 'camara' ? 'tomaCortadaCamara' : 'tomaCortadaMicrofono'
}

// Lo que llega del nativo, validado: cualquier otra cosa no es una pérdida.
export function leerPerdida(d: unknown): PerdidaDeRecurso | null {
  if (!d || typeof d !== 'object') return null
  const r = (d as { recurso?: unknown }).recurso
  if (r !== 'camara' && r !== 'microfono') return null
  const m = (d as { motivo?: unknown }).motivo
  return { recurso: r, motivo: typeof m === 'string' ? m : '' }
}

// Empieza a vigilar y devuelve con qué se deja de vigilar. Cada paso se anota en la consola como
// «[recursos] ...», como la orientación -orientacionToma.ts-.
export async function vigilarRecursos(alPerder: (p: PerdidaDeRecurso) => void, o: { camara: boolean }): Promise<() => void> {
  let escucha: { remove: () => Promise<void> } | null = null
  try {
    escucha = await CamaraNativa.addListener('recursoPerdido', (d) => {
      const p = leerPerdida(d)
      if (!p) return
      console.info('[recursos]', `perdido recurso=${p.recurso} motivo=${p.motivo || '-'}`)
      alPerder(p)
    })
    const r = await CamaraNativa.vigilarRecursos({ camara: o.camara })
    console.info('[recursos]', `vigilar camara=${r?.camara} microfono=${r?.microfono}`)
  } catch (e) {
    console.info('[recursos]', `no-disponible error=${(e as { code?: string })?.code || String(e)}`)
  }
  return () => {
    try { escucha?.remove().catch(() => {}) } catch (e) {}
    CamaraNativa.soltarRecursos().catch(() => {})
  }
}
