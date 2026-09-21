import { ResumenGrabacion } from './modelo'

export interface RepositorioGrabaciones {
  listar(): Promise<ResumenGrabacion[]>
  abrir(id: string): Promise<ResumenGrabacion | null>
  guardar(g: ResumenGrabacion): Promise<void>
  borrar(id: string): Promise<void>
}
