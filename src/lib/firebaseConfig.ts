// LOS DATOS PÚBLICOS DE FIREBASE -orden A «Entrar con Google», 20-10-2026-.
//
// Son públicos: viajan en la app y cualquiera los puede leer. No abren nada por sí solos; lo que protege
// los datos son las reglas de Firebase y, más adelante, App Check -orden B o después-.
//
// -20-10-2026, Claude- YA EXISTEN: Javier los creó en la consola el 20-10. La app web «Sigo web» del
// proyecto sigoteleprompter da firebaseConfig, y el ID de cliente web lo creó Firebase al habilitar Google
// en Authentication. Con ellos configuracionLista() da true y la sección Cuenta aparece. La versión de Play
// y las APK de prueba entran por dos clientes de Android de Google Cloud, «Sigo Play» y «Sigo prueba», que
// no se escriben aquí: Google los reconoce por el paquete y la huella SHA-1 de la firma.
// Antes: HOY NO EXISTEN: el proyecto de la consola todavía no tiene la app web ni el cliente web de OAuth. Por
// eso van con el texto "PENDIENTE" y configuracionLista() da false: mientras sea así, la sección Cuenta
// de Ajustes NO SE MUESTRA y main puede seguir saliendo sin esto. Los valores reales los pone Claude.
export const PENDIENTE = 'PENDIENTE'

// Antes: apiKey, authDomain, projectId y appId con PENDIENTE.
export const firebaseConfig = {
  apiKey: 'AIzaSyAcsI4t2jiENyY4n-EyQYM7L2wtQWEhW_I',
  authDomain: 'sigoteleprompter.firebaseapp.com',
  projectId: 'sigoteleprompter',
  appId: '1:505619935722:web:c1f9d2221851903d8d8293'
}

// El ID de cliente web de OAuth -termina en .apps.googleusercontent.com-. Credential Manager lo pide
// como serverClientId -CuentaGooglePlugin.java- y el token que devuelve viene a su nombre, que es lo que
// Firebase espera.
// Antes: idClienteWeb = PENDIENTE.
export const idClienteWeb: string = '505619935722-ola0vhgilrbhmkbq8lr3pn44a5s35c9g.apps.googleusercontent.com'

// Lista cuando ningún dato falta ni sigue en "PENDIENTE".
export function configuracionLista(): boolean {
  return [...Object.values(firebaseConfig), idClienteWeb].every((v) => typeof v === 'string' && v.trim() !== '' && v !== PENDIENTE)
}
