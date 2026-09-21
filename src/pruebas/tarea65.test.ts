import { describe, test, expect } from 'vitest'
import { calcularMinutosDisponibles, RESERVA_BYTES } from '../lib/espacio'
import { grabacionNueva, ResumenGrabacion } from '../datos/modelo'

describe('Pruebas TAREA 65 - Calidad, espacio y exportar (T278)', () => {
  test('T278: la cuenta de los minutos. Con un ritmo conocido y un espacio libre conocido, devuelve los minutos esperados; descuenta la reserva de 300 MB; y si ya hay una grabacion propia en esa calidad, usa el ritmo de esa grabacion y NO el de la tabla de arranque.', () => {
    // 1. Espacio libre conocido: 3,314,572,800 bytes (~3.31 GB)
    const bytesLibres = 3_314_572_800
    // Reserva de 300 MB = 314,572,800 bytes
    expect(RESERVA_BYTES).toBe(300 * 1024 * 1024)

    // A. Sin grabaciones previas: se usa la tabla de arranque para 1080p (20 Mbps = 2.5 MB/s = 150 MB/min)
    // Espacio para la toma = 3,314,572,800 - 314,572,800 = 3,000,000,000 bytes
    // Minutos esperados = 3,000,000,000 / 150,000,000 = 20 minutos
    const minsArranque = calcularMinutosDisponibles(bytesLibres, '1080p', [])
    expect(minsArranque).toBeCloseTo(20, 2)

    // Verificación de que la reserva NO se ignora:
    // Si se ignorase la reserva, daría (3,314,572,800 / 150,000,000) = 22.097152 minutos
    const minsSinReserva = bytesLibres / (((20 * 1_000_000) / 8) * 60)
    expect(minsArranque).not.toBeCloseTo(minsSinReserva, 2)

    // B. Con grabación propia en esa calidad: 600 MB en 120,000 ms (120 s) => 5 MB/s = 300 MB/min
    const grabacionPropia: ResumenGrabacion = grabacionNueva({
      tituloGuion: 'Toma 1080p',
      calidad: '1080p',
      bytes: 600_000_000,
      duracionMs: 120_000
    })

    // Minutos esperados = 3,000,000,000 bytes disponibles / 300,000,000 bytes/minuto = 10 minutos
    const minsPropio = calcularMinutosDisponibles(bytesLibres, '1080p', [grabacionPropia])
    expect(minsPropio).toBeCloseTo(10, 2)
    // Asegurar que usó el ritmo propio (10 min) y NO el de la tabla de arranque (20 min)
    expect(minsPropio).not.toBeCloseTo(minsArranque, 2)
  })
})
