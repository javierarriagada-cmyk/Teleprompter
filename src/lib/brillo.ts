import { CamaraNativa } from './camara'

// BRILLO DE LA ESCENA, NO DE LA APLICACION.
//
// Tres pasos nombrados. No hay deslizador: filmando nadie acierta un valor
// continuo. Automático le devuelve el control al sistema (screenBrightness
// = -1). Tenue y Alto son de esta toma y se mueren al salir del lienzo.
export type PasoBrillo = 'automatico' | 'tenue' | 'alto'

export const PASOS_BRILLO: { id: PasoBrillo; nombre: string; valor: number }[] = [
  { id: 'automatico', nombre: 'Automático', valor: -1 },
  { id: 'tenue', nombre: 'Tenue', valor: 0.3 },
  { id: 'alto', nombre: 'Alto', valor: 1 }
]

export async function aplicarBrillo(paso: PasoBrillo): Promise<void> {
  const encontrado = PASOS_BRILLO.find((p) => p.id === paso)
  const valor = encontrado ? encontrado.valor : -1
  try {
    await CamaraNativa.fijarBrillo({ valor })
  } catch {
    // En el navegador el plugin no existe. El control se dibuja igual.
  }
}

export async function restaurarBrillo(): Promise<void> {
  try {
    await CamaraNativa.restaurarBrillo()
  } catch {
  }
}
