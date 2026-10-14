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

// EL RESORTE SIN REBOTE -13-10-2026, resorte-sin-rebote-. Va al lado de acercarScroll, que no se toca.
//
// acercarScroll es un EMPUJON: en el primer cuadro del cambio de renglon recorre la tajada mas grande
// de todo el camino -1 - e^(-16/70), un 20% del renglon- y de ahi va frenando. La velocidad salta de
// cero a su maximo de un cuadro al siguiente, y eso es lo que el ojo lee como tiron. Nunca se pasa,
// pero arranca de golpe.
//
// Esto es un CIERRAPUERTAS HIDRAULICO: la puerta arranca suave, toma velocidad, y frena hasta quedar
// justo en el marco sin golpear ni rebotar. Es un resorte con amortiguacion critica -la justa para no
// oscilar-: con estado -posicion y velocidad- en vez de solo la posicion. La velocidad crece desde
// cero, asi que no hay tiron al empezar, y llega sin pasarse.
//
// La cuenta es la solucion EXACTA del resorte para un dt cualquiera -no un paso de Euler-, asi que
// da lo mismo con cuadros de 8 o de 40 ms. Con x = posicion - objetivo y v = velocidad:
//   x' = (x + (v + w x) dt) e^(-w dt)
//   v' = (v - w (v + w x) dt) e^(-w dt)
// w es la rapidez, en 1/ms. Asienta al 98% en unos 5,83 / w ms y llega a la mitad en 1,68 / w ms.
//
// SI EL OBJETIVO CAMBIA A MEDIO CAMINO, la velocidad sigue: no se reinicia ni salta. Solo cambia
// hacia donde tira el resorte.
//
// EL TOPE -14-10-2026, resorte-de-fabrica-: EL RESORTE NUNCA SE PASA, se mueva como se mueva el
// objetivo. Si en un cuadro la posicion nueva quedaria del otro lado del objetivo -x cambia de signo-,
// se queda justo en el objetivo con velocidad cero: la puerta llega al marco y ahi para.
// Antes:
// OJO: no se pasa MIENTRAS LA VELOCIDAD APUNTA HACIA EL OBJETIVO o es cero. Leyendo, el scroll solo
// avanza y eso siempre se cumple. Si el objetivo saltara HACIA ATRAS con la velocidad todavia hacia
// adelante, la puerta podria cruzar el marco antes de volver.
// -14-10-2026-: tope dice si en ese cuadro actuo el tope, para que el banco lo cuente.
// Antes: export type EstadoResorte = { posicion: number; velocidad: number } // px y px/ms
export type EstadoResorte = { posicion: number; velocidad: number; tope?: boolean } // px y px/ms

// Bajo medio pixel de distancia y casi quieto -menos de 0,05 px/ms, menos de un pixel por cuadro-
// se clava exacto en el objetivo y con velocidad cero, como el corte de acercarScroll.
//
// REVISADO -14-10-2026-: el corte salta a lo sumo medio pixel -|x| < 0,5-, nunca algo visible. No
// deja cola: llegando desde quieto la velocidad a menos de medio pixel es siempre menor que w por la
// distancia -0,012 px/ms con w de 250 ms-, bajo VELOCIDAD_QUIETO, asi que se clava en el primer
// cuadro que entra al medio pixel. La «cola» de T158 no venia de aca: ver TeleprompterView, el
// resorte arrancaba desde scrollTop 0 al montar la vista.
export const VELOCIDAD_QUIETO = 0.05

// La rapidez que asienta al 98% en `ms` milisegundos: (1 + u) e^(-u) = 0,02 da u = 5,834.
export function omegaParaAsentar(ms: number): number {
  return 5.834 / ms
}

// El valor por omision: lo eligio el banco del motor -npm run banco, docs/mediciones/banco-motor/-.
export const MS_RESORTE = 250
export const OMEGA_RESORTE = omegaParaAsentar(MS_RESORTE)

export function moverResorte(e: EstadoResorte, objetivo: number, dtCuadro: number, omega = OMEGA_RESORTE): EstadoResorte {
  const x = e.posicion - objetivo
  const v = e.velocidad
  const amort = Math.exp(-omega * dtCuadro)
  const comun = (v + omega * x) * dtCuadro
  const x2 = (x + comun) * amort
  const v2 = (v - omega * comun) * amort
  // EL TOPE: del otro lado del objetivo, o saliendo de el estando encima, no; se queda en el.
  if (x2 * x < 0 || (x === 0 && x2 !== 0)) return { posicion: objetivo, velocidad: 0, tope: true }
  if (Math.abs(x2) < 0.5 && Math.abs(v2) < VELOCIDAD_QUIETO) return { posicion: objetivo, velocidad: 0 }
  return { posicion: objetivo + x2, velocidad: v2 }
}
