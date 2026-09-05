export type EntradaRegistro = {
  desdeToken: number
  hastaToken: number
  inicioMs: number
  finMs: number
  textoReconocido: string
}

export interface RegistroDeLectura {
  anotar(e: EntradaRegistro): void
  entradas(): EntradaRegistro[]
  limpiar(): void
}

export function crearRegistro(): RegistroDeLectura {
  let lista: EntradaRegistro[] = []

  return {
    anotar(e: EntradaRegistro) {
      lista.push({ ...e })
    },
    entradas() {
      return [...lista]
    },
    limpiar() {
      lista = []
    }
  }
}
