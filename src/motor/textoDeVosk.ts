// PROTOTIPO DE LA VENTANA FLOTANTE, 08-11-2026: la lectura de Sigo sobre otra app, siguiendo la voz mientras esa app graba. Esta rama no va a main ni a Play.

// Vosk contesta en JSON: {"partial": "..."} mientras hablas y {"text": "..."} al
// cerrar una frase. Se parsea de este lado a proposito -el plugin pasa la cadena tal
// cual-, para no tener el formato escrito en dos lenguajes y tener que recompilar el
// APK cada vez que Vosk agregue un campo.
// Antes: esta función vivía como textoDe, privada, en MotorNativo.ts.
export function textoDe(json: string, campo: 'partial' | 'text'): string {
  try {
    const o = JSON.parse(json)
    const t = o[campo]
    return typeof t === 'string' ? t : ''
  } catch {
    return ''
  }
}
