import { RepositorioGrabaciones } from './RepositorioGrabaciones'
import { ResumenGrabacion } from './modelo'

export class RepositorioGrabacionesMemoria implements RepositorioGrabaciones {
  private mapa = new Map<string, ResumenGrabacion>()

  async listar(): Promise<ResumenGrabacion[]> {
    const lista = Array.from(this.mapa.values())
    lista.sort((a, b) => b.creado - a.creado)
    return lista.map((g) => ({ ...g }))
  }

  async abrir(id: string): Promise<ResumenGrabacion | null> {
    const g = this.mapa.get(id)
    return g ? { ...g } : null
  }

  async guardar(g: ResumenGrabacion): Promise<void> {
    this.mapa.set(g.id, { ...g })
  }

  async borrar(id: string): Promise<void> {
    this.mapa.delete(id)
  }
}
