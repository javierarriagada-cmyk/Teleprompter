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

/**
 * Limpia marcas de sintaxis Markdown para obtener texto plano apto para lectura en voz alta.
 * Elimina encabezados (#), énfasis (**negrita**, *cursiva*, _cursiva_), viñetas de lista (- *, 1.),
 * citas (>), enlaces [texto](url) dejando solo el texto sin corchetes, código en línea y reglas horizontales.
 */
export function limpiarMarkdown(markdown: string): string {
  if (!markdown) return ''

  const lineas = markdown.split(/\r?\n/)
  const lineasProcesadas: string[] = []

  for (let linea of lineas) {
    // 1. Eliminar regla horizontal (---, ***, ___ en la línea)
    if (/^\s*(---|[*]{3,}|_{3,})\s*$/.test(linea)) {
      continue
    }

    // 2. Encabezados (# Título, ## Subtítulo)
    linea = linea.replace(/^\s*#+\s+/, '')

    // 3. Citas (> Cita)
    linea = linea.replace(/^\s*>\s+/, '')

    // 4. Elementos de lista (- ítem, * ítem, 1. ítem)
    linea = linea.replace(/^\s*[-*+]\s+/, '')
    linea = linea.replace(/^\s*\d+\.\s+/, '')

    // 5. Enlaces [texto](url) -> texto (elimina corchetes y url)
    linea = linea.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

    // 6. Código en línea `código` -> código
    linea = linea.replace(/`([^`]+)`/g, '$1')

    // 7. Negrita y cursiva
    linea = linea.replace(/\*\*([^*]+)\*\*/g, '$1')
    linea = linea.replace(/__([^_]+)__/g, '$1')
    linea = linea.replace(/\*([^*]+)\*/g, '$1')
    linea = linea.replace(/_([^_]+)_/g, '$1')

    lineasProcesadas.push(linea)
  }

  return lineasProcesadas.join('\n')
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
 * en bloques de guión mediante `importarTexto`. Carga `mammoth` de forma dinámica únicamente
 * cuando se lee un archivo .docx para no engrosar el paquete principal.
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

  if (extension === 'txt') {
    if (typeof file.text === 'function') {
      texto = await file.text()
    } else {
      texto = await leerTextoConFileReader(file)
    }
  } else if (extension === 'md') {
    if (typeof file.text === 'function') {
      texto = await file.text()
    } else {
      texto = await leerTextoConFileReader(file)
    }
    texto = limpiarMarkdown(texto)
  } else if (extension === 'docx') {
    let arrayBuffer: ArrayBuffer
    if (typeof file.arrayBuffer === 'function') {
      arrayBuffer = await file.arrayBuffer()
    } else {
      arrayBuffer = await leerArrayBufferConFileReader(file)
    }

    try {
      // Importación dinámica para que mammoth solo se cargue al abrir un .docx
      const mammoth = (await import('mammoth')).default
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
