// LOS DATOS PÚBLICOS DE FIREBASE -orden A «Entrar con Google», 20-10-2026-.
//
// Son públicos: viajan en la app y cualquiera los puede leer. No abren nada por sí solos; lo que protege
// los datos son las reglas de Firebase y, más adelante, App Check -orden B o después-.
//
// HOY NO EXISTEN: el proyecto de la consola todavía no tiene la app web ni el cliente web de OAuth. Por
// eso van con el texto "PENDIENTE" y configuracionLista() da false: mientras sea así, la sección Cuenta
// de Ajustes NO SE MUESTRA y main puede seguir saliendo sin esto. Los valores reales los pone Claude.
export const PENDIENTE = 'PENDIENTE'

export const firebaseConfig = {
  apiKey: PENDIENTE,
  authDomain: PENDIENTE,
  projectId: PENDIENTE,
  appId: PENDIENTE
}

// El ID de cliente web de OAuth -termina en .apps.googleusercontent.com-. Credential Manager lo pide
// como serverClientId -CuentaGooglePlugin.java- y el token que devuelve viene a su nombre, que es lo que
// Firebase espera.
export const idClienteWeb: string = PENDIENTE

// Lista cuando ningún dato falta ni sigue en "PENDIENTE".
export function configuracionLista(): boolean {
  return [...Object.values(firebaseConfig), idClienteWeb].every((v) => typeof v === 'string' && v.trim() !== '' && v !== PENDIENTE)
}
