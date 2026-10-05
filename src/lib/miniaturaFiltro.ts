// EL CUADRO DE LAS MINIATURAS DEL FILTRO -tarea 96, segunda vuelta, 05-10-2026-.
//
// En el WebView de Android, dibujar el <video> en un canvas sale negro. El cuadro
// se pide al nativo, el mismo que arma la miniatura de la toma, en la posición
// actual. currentTime está en segundos; extraerMiniatura pide milisegundos.
// El destino es siempre el mismo archivo, para no dejar uno nuevo cada vez que
// se abre la tira. Si el nativo falla, queda la miniatura que la toma ya tiene.

export function msDelCuadro(currentTime: number): number {
  if (!Number.isFinite(currentTime) || currentTime < 0) return 0
  return Math.round(currentTime * 1000)
}

export function destinoDelCuadro(rutaVideo: string): string {
  return rutaVideo.replace(/\.mp4$/i, '') + '-filtro.jpg'
}

export function elegirCuadro(nativa: string | null | undefined, poster?: string): string {
  if (nativa) return nativa
  return poster || ''
}
