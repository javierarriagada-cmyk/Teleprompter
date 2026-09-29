// LAS HERRAMIENTAS DE PRUEBA, SOLO EN LA APK DE PRUEBA -tarea 84, 29-09-2026-.
//
// La APK de siempre -npm run apk, --mode android- trae el panel de diagnóstico, el panel de
// corpus, la medición de cada lectura y el audio que escuchó Vosk: son los instrumentos con que
// se afina el motor en el moto g86. La versión de Google Play -npm run play, --mode play, archivo
// .env.play- no los lleva: no son para la gente, y el audio de cada lectura no se guarda en el
// teléfono de nadie.
//
// SE APAGA SOLO CON '0', A PROPÓSITO. En el navegador, en las pruebas y en la APK de prueba la
// variable vale '1' o no existe, y las herramientas siguen como hoy: las pruebas del diagnóstico
// corren igual -docs/tarea84.txt, LAS PRUEBAS-. Es el mismo mecanismo que VITE_SIN_MOTOR_WEB en
// src/motor/motorWeb.ts: Vite reemplaza import.meta.env.VITE_HERRAMIENTAS por el texto al armar,
// la constante queda en false y las ramas que la miran quedan muertas; Rollup las saca del
// paquete junto con los componentes que solo ellas usan -comprobado buscando los textos del panel
// en dist/ después de vite build --mode play-.
export const HERRAMIENTAS: boolean = import.meta.env.VITE_HERRAMIENTAS !== '0'
