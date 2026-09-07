import { RepositorioGuiones } from './RepositorioGuiones'
import { Guion, ResumenGuion, contarPalabras } from './modelo'

export class RepositorioMemoria implements RepositorioGuiones {
  private guionesMap = new Map<string, Guion>()
  private ultimoModificado = 0

  async listar(): Promise<ResumenGuion[]> {
    const lista: ResumenGuion[] = []
    for (const g of this.guionesMap.values()) {
      lista.push({
        id: g.id,
        titulo: g.titulo || 'Sin título',
        idioma: g.idioma,
        modificado: g.modificado,
        palabras: contarPalabras(g),
        archivado: Boolean(g.archivado),
        textoCompleto: g.bloques ? g.bloques.map((b) => b.texto || '').join(' ') : ''
      })
    }
    lista.sort((a, b) => b.modificado - a.modificado)
    return lista
  }

  async abrir(id: string): Promise<Guion | null> {
    const original = this.guionesMap.get(id)
    if (!original) return null
    const copia: Guion = JSON.parse(JSON.stringify(original))
    copia.archivado = Boolean(copia.archivado)
    return copia
  }

  async guardar(g: Guion): Promise<void> {
    const copia: Guion = JSON.parse(JSON.stringify(g))
    let ahora = Date.now()
    if (ahora <= this.ultimoModificado) {
      ahora = this.ultimoModificado + 1
    }
    this.ultimoModificado = ahora
    copia.modificado = ahora
    copia.archivado = Boolean(copia.archivado)
    g.modificado = ahora
    g.archivado = copia.archivado
    this.guionesMap.set(copia.id, copia)
  }

  async borrar(id: string): Promise<void> {
    this.guionesMap.delete(id)
  }
}
