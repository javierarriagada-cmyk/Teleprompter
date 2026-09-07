import mammoth from 'mammoth'
import { Bloque } from './modelo'
import { importarTexto, OpcionesImportar } from './importar'

export interface ResultadoImportacionArchivo {
  titulo: string
  bloques: Bloque[]
}

/**
 * Extrae el título del guión a partir del nombre del archivo.
 * Elimina la extensión (.txt, .md, .docx) y remueve espacios en los extremos.
 * Si el nombre resultante queda vacío, retorna "Sin titulo".
 */
export function extraerTituloArchivo(nombreArchivo: string): string {
  if (!nombreArchivo) return 'Sin titulo'
  const sinExtension = nombreArchivo.replace(/\.(txt|md|docx)$/i, '').trim()
  return sinExtension.length > 0 ? sinExtension : 'Sin titulo'
}

function leerTextoConFileReader(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string) || '')
    reader.onerror = () => reject(reader.error || new Error('Error al leer el archivo de texto'))
    reader.readAsText(file)
  })
}

function leerArrayBufferConFileReader(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as ArrayBuffer) || new ArrayBuffer(0))
    reader.onerror = () => reject(reader.error || new Error('Error al leer el archivo de arrayBuffer'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Importa un archivo (.txt, .md, .docx) extrayendo su título y convirtiendo su contenido
 * en bloques de guión mediante `importarTexto`.
 */
export async function importarArchivo(
  file: File,
  opciones?: OpcionesImportar
): Promise<ResultadoImportacionArchivo> {
  if (!file || !file.name) {
    throw new Error('Archivo no válido')
  }

  const match = file.name.match(/\.(txt|md|docx)$/i)
  if (!match) {
    throw new Error(`Formato de archivo no soportado (${file.name}). Solo se permiten .txt, .md y .docx`)
  }

  const extension = match[1].toLowerCase()
  let texto = ''

  if (extension === 'txt' || extension === 'md') {
    if (typeof file.text === 'function') {
      texto = await file.text()
    } else {
      texto = await leerTextoConFileReader(file)
    }
  } else if (extension === 'docx') {
    let arrayBuffer: ArrayBuffer
    if (typeof file.arrayBuffer === 'function') {
      arrayBuffer = await file.arrayBuffer()
    } else {
      arrayBuffer = await leerArrayBufferConFileReader(file)
    }

    try {
      const res = await new Promise<{ value: string }>((resolve, reject) => {
        try {
          mammoth.extractRawText({ arrayBuffer }).then(resolve, reject)
        } catch (e) {
          reject(e)
        }
      })
      texto = res.value || ''
    } catch (e: any) {
      throw new Error(`Error al procesar el archivo .docx: ${e?.message || e}`)
    }
  }

  const titulo = extraerTituloArchivo(file.name)
  const bloques = importarTexto(texto, opciones)

  return {
    titulo,
    bloques
  }
}
