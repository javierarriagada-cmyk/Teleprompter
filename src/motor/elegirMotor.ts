import { IdMotor, MotorDeVoz } from './MotorDeVoz'
import { MotorFake } from './MotorFake'
import { MotorNativo } from './MotorNativo'
import { cargarMotorVosk } from './motorWeb'

export async function elegirMotor(preferido?: IdMotor): Promise<MotorDeVoz> {
  // El motor web se carga aparte -motorWeb.ts-: en el APK no viaja, y ahi 'vosk' no esta.
  const MotorVosk = await cargarMotorVosk()
  const motores: Partial<Record<IdMotor, MotorDeVoz>> = {
    ...(MotorVosk ? { vosk: new MotorVosk() } : {}),
    nativo: new MotorNativo(),
    fake: new MotorFake()
  }

  const errores: Record<string, string> = {}

  if (preferido) {
    const candidate = motores[preferido]
    if (candidate) {
      try {
        if (await candidate.disponible()) {
          return candidate
        } else {
          errores[preferido] = 'disponible() devolvió false'
        }
      } catch (e: any) {
        errores[preferido] = e.message || String(e)
      }
    }
  }

  // -24-09-2026: y despues el nativo. En el APK el web no viaja -motorWeb.ts-; si alguien
  // tenia 'vosk' guardado, sin esto se quedaba sin reconocedor.
  const ordenFallback: IdMotor[] = ['vosk', 'nativo']
  for (const id of ordenFallback) {
    if (id === preferido) continue
    const candidate = motores[id]
    if (!candidate) {
      errores[id] = 'no viene en este paquete'
      continue
    }
    try {
      if (await candidate.disponible()) {
        if (typeof candidate.listo === 'function') {
          const estaListo = await candidate.listo()
          if (!estaListo) {
            errores[id] = 'listo() devolvió false'
            continue
          }
        }
        return candidate
      } else {
        errores[id] = 'disponible() devolvió false'
      }
    } catch (e: any) {
      errores[id] = e.message || String(e)
    }
  }

  const detalleErrores = Object.entries(errores)
    .map(([id, err]) => `${id}: ${err}`)
    .join('; ')

  throw new Error(`Ningún motor de voz está disponible. Detalles: ${detalleErrores}`)
}
