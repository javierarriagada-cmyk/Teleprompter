// LA MÁQUINA DE PAUSA DE UNA TOMA -tarea 88, 04-10-2026, docs/tarea88.txt, sección 3-. TypeScript puro.
//
// El botón de pausa, el tacho y los gestos -palma y V- pasan por esta MISMA máquina: App despacha cada
// entrada con despachar() y ejecuta las acciones que devuelve. Así el botón y la palma dejan el mismo
// tramo en el sidecar, y un control a distancia, si algún día se hace, es otra entrada más.
//
// Los milisegundos son de Date.now(): App los lleva al reloj del video al abrir y cerrar la pausa
// -tomaVideo.abrirPausa / cerrarPausa-.
//
// LO QUE CAMBIÓ RESPECTO DEL PLAN 2 -docs/planes/plan-2-gestos-grabacion.txt, sección 5-: solo palma y
// V; seguir con la palma pasa por la cuenta de 3 s; el botón no lleva margen; no hay borrar ni
// confirmación por gesto. Fuera Pointing_Up, los dos dedos, MS_PARA_CONFIRMAR_BORRADO y
// MS_PARA_REANUDAR_CON_PALMA.
export type OrigenPausa = 'boton' | 'palma'
export type Gesto = 'palma' | 'victoria' | 'ninguno'
export type EstadoPausa =
  | { tipo: 'grabando' }
  // contando = la cuenta de 3 s de seguir con la palma está corriendo.
  | { tipo: 'pausada'; desdeMs: number; origen: OrigenPausa; manoBajada: boolean; contando: boolean }
  // Solo el tacho: el "¿Seguro?" de hoy.
  | { tipo: 'confirmando'; desdeMs: number; origen: OrigenPausa }
export type Entrada =
  | { tipo: 'alternar'; tMs: number } // el botón de pausa
  | { tipo: 'tacho' }
  | { tipo: 'gesto'; gesto: Gesto; tMs: number; vistoDesdeMs: number } // ya confirmado
  | { tipo: 'finCuenta'; tMs: number }
export type Accion =
  | { tipo: 'pausar'; desdeMs: number; origen: OrigenPausa }
  | { tipo: 'reanudar'; hastaMs: number }
  | { tipo: 'empezarCuenta' } | { tipo: 'cancelarCuenta' }
  | { tipo: 'terminar' } | { tipo: 'pedirConfirmacion' } | { tipo: 'borrar' }

// El margen ANTES de una pausa con la palma: la mano que sube no queda en la toma -o casi: la que sube
// más lento puede quedar, no se promete-. Nunca baja de 0: lo acota tramos.ts. El botón no lleva margen,
// ni antes ni después -P4 del plan, cerrada-.
export const MARGEN_MANO_MS = 1000

const quieto = (e: EstadoPausa) => ({ estado: e, acciones: [] as Accion[] })

// Todas las combinaciones que no están escritas aquí: estado igual, sin acciones.
export function paso(e: EstadoPausa, en: Entrada): { estado: EstadoPausa; acciones: Accion[] } {
  if (e.tipo === 'grabando') {
    if (en.tipo === 'alternar') {
      return {
        estado: { tipo: 'pausada', desdeMs: en.tMs, origen: 'boton', manoBajada: true, contando: false },
        acciones: [{ tipo: 'pausar', desdeMs: en.tMs, origen: 'boton' }]
      }
    }
    if (en.tipo === 'gesto' && en.gesto === 'palma') {
      // La palma que pausó sigue arriba: manoBajada false, para que sostenerla no reanude.
      const desdeMs = en.vistoDesdeMs - MARGEN_MANO_MS
      return {
        estado: { tipo: 'pausada', desdeMs, origen: 'palma', manoBajada: false, contando: false },
        acciones: [{ tipo: 'pausar', desdeMs, origen: 'palma' }]
      }
    }
    // La V grabando no hace nada: solo termina en pausa.
    return quieto(e)
  }

  if (e.tipo === 'pausada') {
    const cancelar: Accion[] = e.contando ? [{ tipo: 'cancelarCuenta' }] : []
    switch (en.tipo) {
      case 'alternar':
        // Seguir con el botón, también durante la cuenta: sigue al tiro.
        return { estado: { tipo: 'grabando' }, acciones: [...cancelar, { tipo: 'reanudar', hastaMs: en.tMs }] }
      case 'finCuenta':
        if (!e.contando) return quieto(e)
        // El corte termina al final de la cuenta, sin margen después.
        return { estado: { tipo: 'grabando' }, acciones: [{ tipo: 'reanudar', hastaMs: en.tMs }] }
      case 'tacho':
        return {
          estado: { tipo: 'confirmando', desdeMs: e.desdeMs, origen: e.origen },
          acciones: [...cancelar, { tipo: 'pedirConfirmacion' }]
        }
      case 'gesto':
        if (en.gesto === 'ninguno') return e.manoBajada ? quieto(e) : quieto({ ...e, manoBajada: true })
        if (en.gesto === 'victoria') return { estado: { tipo: 'grabando' }, acciones: [...cancelar, { tipo: 'terminar' }] }
        // Palma: solo después de haber visto la mano abajo, y si la cuenta no corre ya.
        if (!e.manoBajada || e.contando) return quieto(e)
        return { estado: { ...e, contando: true }, acciones: [{ tipo: 'empezarCuenta' }] }
    }
    return quieto(e)
  }

  // confirmando: el tacho borra, el botón de pausa reanuda -como hoy, App.tsx, btn-pausa-lectura-, y
  // los gestos no hacen nada.
  if (en.tipo === 'tacho') return { estado: { tipo: 'grabando' }, acciones: [{ tipo: 'borrar' }] }
  if (en.tipo === 'alternar') return { estado: { tipo: 'grabando' }, acciones: [{ tipo: 'reanudar', hastaMs: en.tMs }] }
  return quieto(e)
}

// Lo que App mostraba con dos useState -enPausa y confirmandoDescarte-, derivado del único estado.
export const enPausaDe = (e: EstadoPausa): boolean => e.tipo !== 'grabando'
export const confirmandoDe = (e: EstadoPausa): boolean => e.tipo === 'confirmando'
