// -portugues-app, 2026-10-22- LA APP EN PORTUGUES. Pruebas de logica: textos, idioma de la app, fechas,
// numeros, el Hola, el aviso del idioma del guion y el mapa de enlaces. Nada de posiciones ni tamanos.
import { describe, expect, test } from 'vitest'
import { es } from '../textos/es'
import { en } from '../textos/en'
import { pt } from '../textos/pt'
import { fechaCorta, fechaCortaDosDigitos, numeroLocal } from '../textos'

// LAS PALABRAS QUE EL PORTUGUES COMPARTE DE VERDAD con el espanol o el ingles. Cada una con su razon:
// fuera de esta lista, un texto de pt.ts igual al de es.ts o en.ts es un texto copiado sin escribir.
const IGUALES_PERMITIDOS: Record<string, string> = {
  toma: '«Take» es la palabra del glosario -docs/portugues.txt, (*1)-, igual que en ingles',
  tomasConteo: 'el plural de «take», igual que en ingles',
  tomaDuracion: '«Take · duracion», igual que en ingles',
  tema: '«Tema» se escribe igual en portugues',
  temaClaro: '«Claro» se escribe igual en portugues',
  duracionAproximada: 'solo un simbolo, una variable y «min»',
  subtitulosFormal: '«Formal» se escribe igual en los tres',
  filtro: '«Filtro» se escribe igual en portugues',
  filtroNatural: '«Natural» se escribe igual en los tres',
  filtroSuave: '«Suave» se escribe igual en portugues',
  cancelar: '«Cancelar» es el boton de Android en pt-BR',
  letraNegrita: 'N de Negrito, como la N de Negrita',
  verde: '«Verde» se escribe igual en portugues',
  parar: '«Parar» se escribe igual en portugues',
  imagenOculta: '«Oculta» se escribe igual en portugues',
  fichaCamaraOculta: '«Oculta» se escribe igual en portugues',
  brilloAuto: '«Auto» es igual en los tres',
  brilloAutomatico: '«Automático» se escribe igual en portugues',
  tipoSans: 'nombre de tipografia, igual en los tres',
  tipoSerif: 'nombre de tipografia, igual en los tres',
  rotuloGrupoTexto: '«Texto» se escribe igual en portugues',
  estabilizar: '«Estabilizar» se escribe igual en portugues',
  modoVozCorto: '«Voz» se escribe igual en portugues'
}

describe('portugues-app punto 2 - pt.ts', () => {
  test('pt.ts tiene las mismas claves que es.ts', () => {
    expect(Object.keys(pt).sort()).toEqual(Object.keys(es).sort())
  })

  test('ningun texto es el de es.ts o en.ts, salvo la lista con su razon', () => {
    const copiados = Object.keys(es).filter((clave) => {
      const k = clave as keyof typeof es
      return (pt[k] === es[k] || pt[k] === en[k]) && !(clave in IGUALES_PERMITIDOS)
    })
    expect(copiados).toEqual([])
  })

  test('la lista no guarda claves que ya no coinciden', () => {
    for (const clave of Object.keys(IGUALES_PERMITIDOS)) {
      const k = clave as keyof typeof es
      expect(pt[k] === es[k] || pt[k] === en[k], clave).toBe(true)
    }
  })

  test('los nombres de los idiomas y el aviso en portugues', () => {
    expect([pt.idiomaEs, pt.idiomaEn, pt.idiomaPt]).toEqual(['espanhol', 'inglês', 'português'])
    expect([pt.idiomaEspanol, pt.idiomaIngles, pt.idiomaPortugues]).toEqual(['Espanhol', 'Inglês', 'Português'])
    expect(pt.avisoIdiomaGuion.startsWith('Seu roteiro está em português')).toBe(true)
    expect(pt.avisoIdiomaGuionAccion).toBe('Mudar para português')
  })

  test('fechas y numeros en pt-BR: el dia antes del mes', () => {
    const sieteSep = new Date(2026, 8, 7).getTime()
    const veintisieteSep = new Date(2026, 8, 27).getTime()
    expect(fechaCorta(veintisieteSep, 'pt' as never)).toBe('27/9')
    expect(fechaCorta(sieteSep, 'pt' as never)).toBe('7/9')
    expect(fechaCortaDosDigitos(veintisieteSep, 'pt' as never)).toBe('27/09')
    expect(fechaCortaDosDigitos(sieteSep, 'pt' as never)).toBe('07/09')
    expect(numeroLocal(1234, 'pt' as never)).toBe('1.234')
  })
})

describe('portugues-app punto 3 - el idioma de la app con pt', () => {
  test('normalizarIdioma: pt, pt-BR y pt-PT van a pt; es-CL a es; fr-FR a en', async () => {
    const { normalizarIdioma } = await import('../lib/idioma')
    expect(normalizarIdioma('pt')).toBe('pt')
    expect(normalizarIdioma('pt-BR')).toBe('pt')
    expect(normalizarIdioma('pt-PT')).toBe('pt')
    expect(normalizarIdioma('es-CL')).toBe('es')
    expect(normalizarIdioma('fr-FR')).toBe('en')
  })

  test('el mapa de enlaces: las paginas /pt y hola@ para pt', async () => {
    const { ENLACES_SITIO } = await import('../lib/enlacesSitio')
    expect(ENLACES_SITIO.pt).toEqual({
      privacidad: 'https://sigoteleprompter.com/pt/privacidade',
      soporte: 'https://sigoteleprompter.com/pt/suporte',
      ayuda: 'https://sigoteleprompter.com/pt/ajuda',
      correo: 'hola@sigoteleprompter.com'
    })
    expect(ENLACES_SITIO.es.correo).toBe('hola@sigoteleprompter.com')
    expect(ENLACES_SITIO.en.correo).toBe('hello@sigoteleprompter.com')
  })

  test('con la app en pt, la voz y el guion nuevo salen pt sin mas cambios', async () => {
    const { idiomaDeVoz } = await import('../lib/vozAPedido')
    const { guionNuevo } = await import('../datos/modelo')
    expect(idiomaDeVoz('pt')).toBe('pt')
    expect(guionNuevo('pt').idioma).toBe('pt')
  })
})

describe('portugues-app punto 4 - el Hola en portugues', () => {
  test('se llama Olá, lleva cada formato sobre su frase y detectarIdioma da pt', async () => {
    const { bloqueDeBienvenida, tituloDeBienvenida } = await import('../App')
    const { detectarIdioma } = await import('../lib/detectarIdioma')
    const { readFileSync } = await import('fs')
    const { resolve } = await import('path')
    const b = bloqueDeBienvenida('pt')
    const pintado = (b.tramos || []).map((t) => [b.texto.slice(t.desde, t.hasta), t.negrita ? 'negrita' : t.destacado ? 'destacado' : t.color])
    expect(tituloDeBienvenida('pt')).toBe('Olá')
    expect(b.texto.startsWith('Olá. Leia isto em voz alta')).toBe(true)
    expect(pintado).toEqual([
      ['sem você tocar em nada', 'negrita'],
      ['o texto espera por você', 'celeste'],
      ['negrito', 'negrita'],
      ['âmbar', 'ambar'],
      ['azul-claro', 'celeste'],
      ['verde', 'salvia'],
      ['destaque amarelo', 'destacado'],
      ['para que seu olhar vá para a câmera', 'ambar'],
      ['não fica no vídeo', 'negrita'],
      ['Controle por gestos', 'ambar'],
      ['O que você vê é o que fica salvo', 'salvia'],
      ['Você não precisa decorar nada.', 'negrita'],
      ['na hora que quiser', 'destacado'],
      ['hola@sigoteleprompter.com', 'celeste']
    ])
    const t = b.tramos || []
    for (let i = 1; i < t.length; i++) expect(t[i].desde).toBeGreaterThanOrEqual(t[i - 1].hasta)
    expect(t.length).toBe((bloqueDeBienvenida('es').tramos || []).length)
    expect(detectarIdioma(b.texto)).toBe('pt')
    // Es el de docs/portugues.txt, seccion 5, letra por letra.
    const doc = readFileSync(resolve(__dirname, '../../docs/portugues.txt'), 'utf8')
    const desde = doc.indexOf('Olá. Leia isto em voz alta')
    const fin = 'Tudo de bom!'
    expect(desde).toBeGreaterThan(0)
    expect(b.texto).toBe(doc.slice(desde, doc.indexOf(fin, desde) + fin.length))
  })
})
