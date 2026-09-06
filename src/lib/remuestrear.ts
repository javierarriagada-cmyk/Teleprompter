/**
 * Interpolación lineal para remuestrear audio PCM en Float32Array.
 * Si deHz === aHz, devuelve la entrada original sin modificar.
 */
export function remuestrear(entrada: Float32Array, deHz: number, aHz: number): Float32Array {
  if (deHz === aHz || entrada.length === 0) {
    return entrada
  }
  const ratio = deHz / aHz
  const nuevoLargo = Math.round(entrada.length / ratio)
  const resultado = new Float32Array(nuevoLargo)

  for (let i = 0; i < nuevoLargo; i++) {
    const posOriginal = i * ratio
    const indexBajo = Math.floor(posOriginal)
    const indexAlto = Math.min(indexBajo + 1, entrada.length - 1)
    const fraccion = posOriginal - indexBajo
    resultado[i] = entrada[indexBajo] * (1 - fraccion) + entrada[indexAlto] * fraccion
  }

  return resultado
}
