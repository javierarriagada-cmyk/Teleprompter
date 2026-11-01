// -borrar-cuenta-suscripcion, 31-10-2026- Primera Cloud Function de Sigo.
// Al borrar la cuenta de Firebase Auth, borra el registro del cliente en RevenueCat.
// 1ª generación a propósito: onUserDeleted de 2ª gen sigue en vista previa y no es para
// producción -firebase.google.com/docs/functions/1st-gen/auth-events-.
// No cancela la suscripción de Google Play.

import * as functions from 'firebase-functions/v1'
import { defineSecret } from 'firebase-functions/params'
import { borrarSuscriptorRevenueCat } from './borrarSuscriptorRevenueCat'

const REVENUECAT_SECRET_KEY = defineSecret('REVENUECAT_SECRET_KEY')

export const borrarRegistroRevenueCatAlBorrarCuenta = functions
  .runWith({ secrets: [REVENUECAT_SECRET_KEY], failurePolicy: true })
  .auth.user()
  .onDelete(async (user) => {
    // Los registros dicen qué pasó, nunca el valor de la clave.
    console.log(`onDelete: borrando registro RevenueCat para uid=${user.uid}`)
    await borrarSuscriptorRevenueCat(user.uid, REVENUECAT_SECRET_KEY.value())
    console.log(`onDelete: registro RevenueCat borrado o inexistente para uid=${user.uid}`)
  })
