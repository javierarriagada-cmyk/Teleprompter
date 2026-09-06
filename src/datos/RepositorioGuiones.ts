import { Guion, ResumenGuion } from './modelo'

export interface RepositorioGuiones {
  listar(): Promise<ResumenGuion[]>          // por modificado, mas nuevo primero
  abrir(id: string): Promise<Guion | null>   // null si no existe, NO lanza
  guardar(g: Guion): Promise<void>           // actualiza `modificado`
  borrar(id: string): Promise<void>
}
