import { useSyncExternalStore } from 'react'
import { estadoVelocidad, suscribirVelocidad } from '../lib/velocidadFija'

// El modo de lectura y el nivel de la velocidad -lib/velocidadFija.ts-: quien lo use se redibuja
// cuando cambian, venga el cambio de la ficha, del panel o de la toma.
export function useVelocidadFija() {
  return useSyncExternalStore(suscribirVelocidad, estadoVelocidad, estadoVelocidad)
}
