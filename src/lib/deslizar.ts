// EL DESLIZAMIENTO DEL SCROLL DE LA PANTALLA DE LECTURA -13-10-2026, banco del motor-.
//
// Vivia dentro del bucle de cuadros de components/TeleprompterView.tsx y se saco TAL CUAL para que
// el banco del motor -scripts/banco-motor.ts- simule la misma cuenta sin copiarla. La vista la usa
// sin cambios: mismo MS_DESLIZAR, mismo acercamiento exponencial, mismo corte bajo medio pixel.

// Cuanto tarda la pantalla en pasar de un renglon al siguiente. Constante de tiempo de un
// acercamiento exponencial: con 70 ms, el renglon se recorre casi entero en unos 200.
export const MS_DESLIZAR = 70

// Y ESE CAMBIO SE DESLIZA, NO SALTA.
//
// El movimiento continuo se puso en su momento para matar los saltitos que Javier
// reporto el primer dia -68% de los cuadros congelados y tirones entre medio-. Si el
// desplazamiento cambia de golpe un renglon, vuelve eso.
//
// Aca el blanco cambia una vez por renglon y la pantalla lo alcanza con un acercamiento
// exponencial: MS_DESLIZAR es la constante de tiempo, asi que un renglon se recorre en
// algo mas de 200 ms. Regular, siempre igual, y sin parar en el medio.
export function acercarScroll(actual: number, objetivo: number, dtCuadro: number, msDeslizar = MS_DESLIZAR): number {
  const acercamiento = 1 - Math.exp(-dtCuadro / msDeslizar)
  let nuevo = actual + (objetivo - actual) * acercamiento
  if (Math.abs(objetivo - nuevo) < 0.5) nuevo = objetivo
  return nuevo
}
