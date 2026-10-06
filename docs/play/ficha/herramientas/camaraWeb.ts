// EL LADO NATIVO DE LAS TOMAS, EN EL NAVEGADOR -tarea 86-. Solo para las capturas.
//
// El reproductor de la toma -src/components/ReproductorGrabacion.tsx- arma los subtítulos con el
// registro que la toma guardó a su lado -<id>.motor.txt- y lo lee con el plugin CamaraNativa, que
// en el navegador no existe. Aquí se registra ese mismo plugin con una implementación web que
// entrega los archivos de la toma de ejemplo. Tiene que importarse ANTES que la app: Capacitor
// registra cada plugin una sola vez, y el registerPlugin de src/lib/camara.ts recibe este.
// Nada de esto toca el código de la app ni viaja en el APK.
import { registerPlugin, WebPlugin } from '@capacitor/core'

const archivos: Record<string, string> = {}
;(window as any).__sigoArchivos = archivos

class CamaraNativaWeb extends WebPlugin {
  async directorioGrabaciones() { return { ruta: '/grabaciones' } }
  async leerTexto({ ruta }: { ruta: string }) {
    if (!(ruta in archivos)) throw new Error('no existe ' + ruta)
    return { contenido: archivos[ruta] }
  }
  async escribirTexto({ ruta, contenido }: { ruta: string; contenido: string }) { archivos[ruta] = contenido }
  async listar() { return { nombres: [] } }
  async bytesDe() { return { bytes: 8 * 1024 * 1024 } }
  async espacioLibre() { return { bytesLibres: 32 * 1024 * 1024 * 1024 } }
  async buscarMp4Recientes() { return { rutas: [] } }
  async borrarArchivo() {}
}

registerPlugin('CamaraNativa', { web: () => new CamaraNativaWeb() })
