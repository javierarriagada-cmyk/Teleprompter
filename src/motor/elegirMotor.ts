import { IdMotor, MotorDeVoz } from './MotorDeVoz'
import { MotorFake } from './MotorFake'
import { MotorNativo } from './MotorNativo'
import { MotorWebSpeech } from './MotorWebSpeech'
import { MotorWhisperLocal } from './MotorWhisperLocal'

export async function elegirMotor(preferido?: IdMotor): Promise<MotorDeVoz> {
  const motores: Record<IdMotor, MotorDeVoz> = {
    'whisper-local': new MotorWhisperLocal(),
    webspeech: new MotorWebSpeech(),
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

  const ordenFallback: IdMotor[] = ['webspeech', 'whisper-local']
  for (const id of ordenFallback) {
    if (id === preferido) continue
    const candidate = motores[id]
    try {
      if (await candidate.disponible()) {
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
