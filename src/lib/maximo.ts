// EL MÁXIMO DE UNA LISTA SIN «...» -banco-largo, 17-10-2026-. Math.max(...lista) pasa cada valor como
// un argumento, y con una lista que crece con la toma revienta la pila: «Maximum call stack size
// exceeded» con 200000 valores -informe del #129, toma de 30 min-. Un recorrido, con lo mismo que
// Math.max: una lista vacía da -Infinity y un NaN da NaN. Para listas de tamaño fijo -los rótulos del
// visor, las palabras de un final- Math.max(...) sigue bien.
export function maximoDe(lista: readonly number[]): number {
  let m = -Infinity
  for (const x of lista) {
    if (Number.isNaN(x)) return NaN
    if (x > m) m = x
  }
  return m
}
