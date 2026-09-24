// EL MOTOR WEB -Vosk en el navegador, MotorVosk-, SOLO FUERA DEL APK. 24-09-2026.
//
// En el telefono el reconocedor es el nativo -MotorNativo, el mismo Vosk compilado-; el web
// no se usa nunca ahi. Pero viajaba igual adentro del APK: su trabajador con vosk-browser son
// 5,8 MB de JavaScript -2,8 comprimidos-. Javier: sacarlo del APK y dejarlo "para despues
// que tendremos version web".
//
// Por eso se carga con import() y solo si el paquete NO se armo para Android: npm run
// build:android -y scripts/apk.mjs- arman con --mode android, que lee .env.android y deja
// VITE_SIN_MOTOR_WEB en '1'. Vite reemplaza esa variable por el texto al armar, la rama queda
// muerta y el import() no llega al paquete: ni MotorVosk ni el trabajador se generan. En el
// navegador y en las pruebas la variable no existe y el motor web carga como siempre.
import type { MotorVosk } from './MotorVosk'

export async function cargarMotorVosk(): Promise<typeof MotorVosk | null> {
  if (import.meta.env.VITE_SIN_MOTOR_WEB !== '1') {
    const m = await import('./MotorVosk')
    return m.MotorVosk
  }
  return null
}
