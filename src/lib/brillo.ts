import { CamaraNativa } from './camara'

// BRILLO DE LA ESCENA, NO DE LA APLICACION.
//
// Hasta el 24-09-2026 eran tres pasos nombrados -Automatico, Tenue, Alto- y
// no habia deslizador, con este razonamiento: "filmando nadie acierta un
// valor continuo". Se cambio por decision del dueno al llevar el engranaje
// al estandar del cajon Aa: "podria ser una barrita que avance, con los
// solcitos". El argumento de los pasos era que no se podia acertar; con la
// barra no hace falta acertar, se ve el efecto en la pantalla mientras se
// arrastra, que es la regla de producto -cada control muestra su efecto-.
//
// Automatico sigue existiendo: es el estado mientras no se toca la barra, y
// al salir del lienzo el brillo vuelve al sistema -screenBrightness = -1-.
// Lo que se elige es de esta toma y se muere al salir.

// Por debajo de esto la pantalla queda casi negra y no se lee el guion.
export const BRILLO_MINIMO = 0.05

export async function aplicarBrillo(valor: number): Promise<void> {
  const v = Math.min(1, Math.max(BRILLO_MINIMO, valor))
  try {
    await CamaraNativa.fijarBrillo({ valor: v })
  } catch {
    // En el navegador el plugin no existe. El control se dibuja igual.
  }
}

// El brillo que tiene el sistema ahora, de 0 a 1, para que la barra parta
// de donde esta la pantalla y no de un valor inventado. null si no se puede
// leer -en el navegador-.
export async function leerBrilloSistema(): Promise<number | null> {
  try {
    const { valor } = await CamaraNativa.leerBrillo()
    return typeof valor === 'number' && valor >= 0 ? Math.min(1, valor) : null
  } catch {
    return null
  }
}

export async function restaurarBrillo(): Promise<void> {
  try {
    await CamaraNativa.restaurarBrillo()
  } catch {
  }
}
