// QUE LA VERSION NUEVA LLEGUE A LA PRIMERA, NO A LA SEGUNDA CARGA.
//
// La aplicacion es una PWA: guarda una copia de si misma en el telefono para poder abrirse
// sin red. El precio es que, cuando se publica una version nueva, el que ya la tenia
// guardada sigue viendo la vieja.
//
// Lo que pasa por debajo, y por que no alcanzaba con esperar: al cargar la pagina, el
// navegador se entera de que hay una version nueva y la instala, PERO el HTML y el
// programa que ya se estaban mostrando siguen siendo los viejos. La version nueva recien
// se ve en la carga SIGUIENTE. O sea que hay que cargar dos veces, y nadie carga dos veces.
//
// Medido el 13 de septiembre de 2026 sobre el sitio publicado: el servidor entregaba
// index-ngsdgqao.js y el navegador seguia ejecutando index-B3Lv4wzB.js, de dos entregas
// antes. Javier lo reporto como "no se movio nada", y tenia razon: nada de lo que
// publicabamos le llegaba.
//
// El arreglo es avisado: cuando la version nueva toma el control, se recarga sola una vez.
//
// DOS CUIDADOS, Y LOS DOS IMPORTAN:
//
//   1. En la PRIMERA visita de alguien que no tenia nada guardado tambien hay un cambio de
//      control, y ahi recargar seria un parpadeo al pedo. Por eso solo se recarga si ANTES
//      ya habia una version controlando, que es el caso "tenias la vieja".
//
//   2. NUNCA en medio de una lectura. Recargar a alguien que esta leyendo a camara le
//      arruina la toma. Si la version nueva llega mientras se esta leyendo o grabando, se
//      espera a que termine y recien ahi se aplica.

let habiaControladorAlCargar = false
let yaRecargue = false
let actualizacionPendiente = false

// Los motivos por los que ahora mismo no se puede recargar, POR NOMBRE y no por un
// contador. Dos partes distintas pueden estar leyendo a la vez -la lectura en si y la
// grabacion del corpus-, y con un contador que sube y baja, un desbalance deja la recarga
// bloqueada para siempre o la suelta antes de tiempo. Con nombres, cada parte solo habla de
// lo suyo y repetir la misma orden no rompe nada.
const motivosParaNoRecargar = new Set<string>()

export function bloquearRecargaAutomatica(motivo: string, bloquear: boolean): void {
  if (bloquear) {
    motivosParaNoRecargar.add(motivo)
  } else {
    motivosParaNoRecargar.delete(motivo)
    if (motivosParaNoRecargar.size === 0 && actualizacionPendiente) {
      aplicar()
    }
  }
}

function aplicar(): void {
  if (yaRecargue) return
  if (motivosParaNoRecargar.size > 0) {
    actualizacionPendiente = true
    return
  }
  yaRecargue = true
  window.location.reload()
}

export function instalarRecargaAlActualizar(): void {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) return

  habiaControladorAlCargar = !!navigator.serviceWorker.controller

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Primera visita: no habia nada viejo que reemplazar, no hay nada que recargar.
    if (!habiaControladorAlCargar) return
    aplicar()
  })
}
