import { Guion, ResumenGuion } from './modelo'

export interface RepositorioGuiones {
  listar(): Promise<ResumenGuion[]>          // por modificado, mas nuevo primero
  abrir(id: string): Promise<Guion | null>   // null si no existe, NO lanza
  guardar(g: Guion): Promise<void>           // actualiza `modificado`
  borrar(id: string): Promise<void>
}

// -orden B, respaldo de los guiones, 20-10-2026- El repositorio del teléfono, con guardarTal: escribe el
// guion SIN tocar modificado -RepositorioIndexedDB y RepositorioMemoria-. Lo necesita
// RepositorioSincronizado para escribir lo que baja de la nube.
export interface RepositorioLocal extends RepositorioGuiones {
  guardarTal(g: Guion): Promise<void>
}
