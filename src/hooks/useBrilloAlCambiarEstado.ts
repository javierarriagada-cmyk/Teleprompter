// Este hook mantiene el brillo de la toma sincronizado con el ciclo de vida nativo.
import { useEffect } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import { aplicarBrillo, restaurarBrillo } from '../lib/brillo'

export function useBrilloAlCambiarEstado(brillo: number | null): void {
  // EL BRILLO SE DEVUELVE AL SISTEMA EN LOS DOS CAMINOS DE SALIDA, NO EN UNO.
  //
  // Al desmontar el lienzo, que es salir por la puerta. Y AL IRSE A SEGUNDO
  // PLANO, que no desmonta nada: si entra una llamada o se cambia de
  // aplicacion con el brillo en Alto, la pantalla se queda encendida a tope en
  // otra parte y gastando bateria, sin que nadie entienda por que.
  //
  // Al volver se repone el brillo elegido, porque la persona no abandono la toma:
  // la interrumpieron. Si volviera en automatico, tendria que acordarse de
  // ajustarlo otra vez justo cuando retoma.
  useEffect(() => {
    const sub: any = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) restaurarBrillo()
      else if (brillo !== null) aplicarBrillo(brillo)
    })
    return () => {
      try {
        if (sub && typeof sub.then === 'function') sub.then((s: any) => s.remove())
        else if (sub && typeof sub.remove === 'function') sub.remove()
      } catch (e) {}
    }
  }, [brillo])
}
