import { RepositorioGuiones, RepositorioLocal } from './RepositorioGuiones'
import { Guion, ResumenGuion } from './modelo'

// EL RESPALDO DE LOS GUIONES -orden B, 20-10-2026-. ENVUELVE al repositorio del teléfono: no copia nada
// de IndexedDB. App.tsx no cambia sus llamadas; solo usa este repositorio mientras hay sesión
// -src/lib/respaldo.ts- y el del teléfono cuando no hay.
//   guardar: primero en el teléfono, después sube el documento.
//   borrar:  primero en el teléfono, después sube una marca { id, borrado: true, modificado: ahora }, para
//            que los otros aparatos también lo borren.
//   listar y abrir: siempre del teléfono.
// La nube es una interfaz -NubeGuiones-: en la app es Firestore -src/lib/respaldo.ts-, en las pruebas un
// simulado.

// Lo que se guarda en la nube: el Guion completo, o la marca de borrado.
export type DocumentoGuion = Guion & { borrado?: false } | { id: string; borrado: true; modificado: number }

export interface NubeGuiones {
  // Sube un documento. La promesa termina cuando la nube lo confirmó -sin red, espera-.
  subir(doc: DocumentoGuion): Promise<void>
  // Escucha la colección del usuario. La primera llamada trae TODOS los documentos; después, los que
  // cambiaron. Devuelve con qué dejar de escuchar.
  escuchar(alCambiar: (docs: DocumentoGuion[], primera: boolean) => void): () => void
}

// Firestore acepta como máximo 1 MiB por documento. Se deja margen: más de 900 KB en JSON no sube.
export const MAXIMO_BYTES = 900 * 1024
const PREFIJO_BIENVENIDA = 'bienvenida-'

// El estado para la línea de la sección Cuenta.
export interface EstadoRespaldo {
  pendientes: number
  // Ids de los guiones que no suben por tamaño: se quedan solo en el teléfono.
  demasiadoLargos: string[]
}

// Firestore no acepta campos undefined: el JSON los quita.
function sinIndefinidos<T>(x: T): T {
  return JSON.parse(JSON.stringify(x))
}

function bytesDe(g: Guion): number {
  return new TextEncoder().encode(JSON.stringify(g)).length
}

export class RepositorioSincronizado implements RepositorioGuiones {
  private dejarDeEscuchar: (() => void) | null = null
  private pendientes = 0
  private largos = new Set<string>()

  constructor(
    readonly local: RepositorioLocal,
    private nube: NubeGuiones,
    // Avisa que el teléfono cambió por algo que bajó de la nube: la biblioteca se vuelve a leer.
    private alCambiarLocal: () => void = () => {},
    // Avisa que cambió el estado del respaldo.
    private alCambiarEstado: (e: EstadoRespaldo) => void = () => {}
  ) {}

  listar(): Promise<ResumenGuion[]> {
    return this.local.listar()
  }

  abrir(id: string): Promise<Guion | null> {
    return this.local.abrir(id)
  }

  async guardar(g: Guion): Promise<void> {
    await this.local.guardar(g)
    this.subirGuion(g)
  }

  async borrar(id: string): Promise<void> {
    await this.local.borrar(id)
    this.largos.delete(id)
    if (id.startsWith(PREFIJO_BIENVENIDA)) return this.avisarEstado()
    this.subirDoc({ id, borrado: true, modificado: Date.now() })
  }

  estado(): EstadoRespaldo {
    return { pendientes: this.pendientes, demasiadoLargos: [...this.largos] }
  }

  // Empieza a escuchar la nube. La primera vez que llegan los documentos se juntan los dos lados.
  iniciar(): void {
    if (this.dejarDeEscuchar) return
    this.dejarDeEscuchar = this.nube.escuchar((docs, primera) => {
      void this.juntar(docs, primera).catch((e) => console.warn('[respaldo] no se pudo juntar:', e))
    })
  }

  detener(): void {
    this.dejarDeEscuchar?.()
    this.dejarDeEscuchar = null
  }

  // HACIA EL TELÉFONO. Por cada documento de la nube:
  //   borrado y el teléfono no tiene uno más nuevo → se borra en el teléfono;
  //   no está en el teléfono, o el de la nube es más nuevo → se escribe en el teléfono CON SU modificado
  //     -guardarTal-, para que no vuelva a subir;
  //   el del teléfono es más nuevo → sube el del teléfono.
  // SI LOS DOS CAMBIARON, GANA EL MODIFICADO MAYOR: el último cambio guardado -decisión de Javier,
  // 20-10-2026-. El otro cambio se pierde; no se juntan textos.
  // La primera vez -al entrar en este aparato- además sube todo lo del teléfono que la nube no tiene.
  async juntar(docs: DocumentoGuion[], primera: boolean): Promise<void> {
    let cambio = false
    const enLaNube = new Set<string>()
    for (const remoto of docs) {
      enLaNube.add(remoto.id)
      if (remoto.id.startsWith(PREFIJO_BIENVENIDA)) continue
      const local = await this.local.abrir(remoto.id)
      if (remoto.borrado) {
        if (!local) continue
        if (local.modificado > remoto.modificado) this.subirGuion(local)
        else {
          await this.local.borrar(remoto.id)
          cambio = true
        }
        continue
      }
      if (!local || remoto.modificado > local.modificado) {
        const { borrado: _b, ...guion } = remoto as Guion & { borrado?: false }
        await this.local.guardarTal(guion as Guion)
        cambio = true
      } else if (local.modificado > remoto.modificado) {
        this.subirGuion(local)
      }
    }
    if (primera) {
      for (const r of await this.local.listar()) {
        if (enLaNube.has(r.id)) continue
        const g = await this.local.abrir(r.id)
        if (g) this.subirGuion(g)
      }
    }
    if (cambio) this.alCambiarLocal()
  }

  // NO SUBEN: el guion de bienvenida -cada aparato crea el suyo- y el que pasa de 900 KB, que queda solo
  // en el teléfono y la sección Cuenta lo dice. Los Ajustes y las tomas ni pasan por aquí.
  private subirGuion(g: Guion): void {
    if (g.id.startsWith(PREFIJO_BIENVENIDA)) return
    if (bytesDe(g) > MAXIMO_BYTES) {
      this.largos.add(g.id)
      this.avisarEstado()
      return
    }
    if (this.largos.delete(g.id)) this.avisarEstado()
    this.subirDoc(sinIndefinidos(g))
  }

  private subirDoc(doc: DocumentoGuion): void {
    this.pendientes++
    this.avisarEstado()
    this.nube.subir(doc)
      .catch((e) => console.warn('[respaldo] no se pudo subir', doc.id, e))
      .finally(() => {
        this.pendientes--
        this.avisarEstado()
      })
  }

  private avisarEstado(): void {
    this.alCambiarEstado(this.estado())
  }
}
