// EL PORTUGUÉS DE BRASIL -portugues-voz, 2026-10-22-. Solo lógica: el idioma de la voz, el detector, las letras y
// los subtítulos.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, test, vi } from 'vitest'
import { idiomaDeVoz, LANG_MOTOR } from '../lib/vozAPedido'
import { detectarIdioma } from '../lib/detectarIdioma'
import { bloqueDeBienvenida } from '../app/bienvenida'
import { normalizar, tokenizarGuion } from '../lib/seguidor'
import { armarSubtitulos } from '../lib/subtitulos'

// El código sin comentarios: los «Antes:» guardan los ternarios viejos y no cuentan.
function sinComentarios(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/.*$/gm, '')
}
function leer(relativo: string): string {
  return sinComentarios(fs.readFileSync(path.resolve(__dirname, '..', '..', relativo), 'utf8'))
}

describe('Portugués 2 - Una sola regla para el idioma de la voz', () => {
  test('pt y pt-BR van a pt; es y en como siempre', () => {
    expect(idiomaDeVoz('pt')).toBe('pt')
    expect(idiomaDeVoz('pt-BR')).toBe('pt')
    expect(idiomaDeVoz('es-ES')).toBe('es')
    expect(idiomaDeVoz('en-US')).toBe('en')
    expect(LANG_MOTOR).toEqual({ es: 'es-ES', en: 'en-US', pt: 'pt-BR' })
  })

  test("'fr' se escucha en español y avisa una sola vez", () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(idiomaDeVoz('fr')).toBe('es')
    expect(idiomaDeVoz('fr')).toBe('es')
    expect(aviso).toHaveBeenCalledTimes(1)
    expect(aviso).toHaveBeenCalledWith('[voz] idioma desconocido, se escucha en español:', 'fr')
    aviso.mockRestore()
  })

  test('no vuelven los ternarios de dos idiomas', () => {
    const motor = leer('src/motor/MotorNativo.ts')
    const voz = leer('src/lib/vozAPedido.ts')
    const app = leer('src/App.tsx')
    const java = leer('android/app/src/main/java/com/sigoteleprompter/app/VoskNativoPlugin.java')
    const startsWithEn = /startsWith\(\s*['"]en['"]\s*\)\s*\?/
    for (const codigo of [motor, voz, app]) {
      expect(codigo).not.toMatch(startsWithEn)
      expect(codigo).not.toMatch(/'es'\s*\|\s*'en'\s*[;=>)]/)
      expect(codigo).not.toMatch(/===\s*'en'\s*\?\s*'en-US'/)
    }
    expect(java).not.toMatch(/"en"\.equals\([^)]*\)\s*\?/)
    expect(java).toMatch(/static String idiomaDeVoz\(/)
    expect(motor.match(/idiomaDeVoz\(/g)?.length).toBe(3)
  })
})

// El guion de prueba de docs/investigacion/idiomas.md 7.3, el que va a leer el papá de Javier.
const GUION_7_3 = `Bom dia! Meu nome é Roberto e hoje eu vou contar uma história que começou em 1985, na cidade de Campinas, no interior de São Paulo.

Naquela época eu trabalhava numa fábrica de peças para automóveis. Eram quase 300 funcionários, e todo mundo se conhecia pelo nome. O dono, o senhor Antônio Ferreira, chegava às sete e meia da manhã e cumprimentava cada um na porta. Ele dizia que uma empresa não é feita de máquinas, mas de pessoas.

Em março de 1987 a fábrica recebeu um pedido enorme: 12 mil peças para entregar em apenas 45 dias. Ninguém acreditava que fosse possível. Mesmo assim, fizemos dois turnos, dividimos as tarefas e ninguém reclamou.

[pausa]

No último dia, faltando poucas horas para o caminhão sair, uma das máquinas quebrou. Foi o Joaquim, um mecânico que tinha vindo de Belo Horizonte, quem resolveu o problema. Ele trabalhou a noite inteira e, às cinco da manhã, a máquina voltou a funcionar.

A entrega foi feita no prazo. O cliente, uma montadora de Curitiba, mandou uma carta de agradecimento que ficou pendurada na parede do refeitório por mais de 20 anos.

Hoje, olhando para trás, eu penso que aprendi ali três coisas importantes. A primeira: um problema grande fica menor quando é dividido. A segunda: a confiança de um chefe faz as pessoas darem o melhor de si. E a terceira, talvez a mais importante: ninguém faz nada sozinho.

Se você está começando agora, seja no Rio de Janeiro, em Recife ou em Porto Alegre, lembre disso. Cuide das pessoas ao seu lado. Elas vão lembrar de você muito depois que o trabalho terminar.

Muito obrigado por ouvir, e até a próxima!`

describe('Portugués 3 - detectarIdioma reconoce el portugués', () => {
  test('el guion de 7.3 y tres párrafos más salen pt', () => {
    expect(detectarIdioma(GUION_7_3)).toBe('pt')
    expect(detectarIdioma(
      'Neste vídeo eu vou mostrar como organizar a sua rotina de estudos sem perder a cabeça. A ideia é simples: você separa o dia em blocos curtos e, no final de cada bloco, faz uma pausa de cinco minutos.'
    )).toBe('pt')
    expect(detectarIdioma(
      'Quando a gente fala de alimentação saudável, muita gente pensa logo em dieta. Mas não precisa ser assim. O mais importante é comer comida de verdade, com atenção, e beber bastante água durante o dia.'
    )).toBe('pt')
    expect(detectarIdioma(
      'Olá, pessoal! Hoje a aula é sobre a Revolução Industrial e as mudanças que ela trouxe para as cidades. Vamos ver os pontos principais e, no fim, eu deixo três perguntas para vocês pensarem.'
    )).toBe('pt')
  })

  test('los Hola en español y en inglés no cambian, enteros y párrafo por párrafo', () => {
    for (const idioma of ['es', 'en'] as const) {
      const texto = bloqueDeBienvenida(idioma).texto
      expect(detectarIdioma(texto)).toBe(idioma)
      for (const p of texto.split('\n').filter((l) => l.trim().split(/\s+/).length >= 20)) {
        expect(detectarIdioma(p), p).toBe(idioma)
      }
    }
  })

  // -portugues-voz, 2026-10-22, revisión de Javier- Español sin artículos, con palabras que también son portuguesas: salían 'pt'.
  test('el español con «no», «nos», «dos», «o», «mas» no sale portugués', () => {
    for (const texto of [
      'No sé. No quiero. No puedo. No voy a ir. Dos o tres veces dije que no, y no.',
      'Nos vamos, nos quedamos, no importa. Dos caminos o ninguno, mas nadie sabe qué es mejor.',
      'No sé si ir a São Paulo o no. Dos amigos me dijeron que no, nos conviene esperar un poco más.'
    ]) expect(detectarIdioma(texto), texto).not.toBe('pt')
  })

  test('el portugués escrito sin tildes sale pt', () => {
    expect(detectarIdioma(
      'Hoje eu quero falar com voce sobre o que aprendi no trabalho, e por que isso mudou a minha forma de pensar o dia a dia.'
    )).toBe('pt')
  })

  test('un texto corto no decide', () => {
    expect(detectarIdioma('Bom dia, meu nome é Roberto.')).toBeNull()
  })
})

describe('Portugués 4 - Las letras y los subtítulos', () => {
  test('normalizar con pt deja la letra sin la tilde', () => {
    expect(normalizar('ação', 'pt')).toBe('acao')
    expect(normalizar('ação', 'pt')).not.toBe(normalizar('ao', 'pt'))
    expect(normalizar('à', 'pt')).toBe('a')
    expect(normalizar('São', 'pt')).toBe('sao')
  })

  test('sin idioma, o en español, igual que antes con el Hola', () => {
    const hola = bloqueDeBienvenida('es').texto
    // La regla de siempre, copiada: el seguro de que nada cambió para el español.
    const antes = (t: string) => t.toLowerCase().replace(/[^a-z0-9áéíóúñü\s]/gi, '').replace(/\s+/g, ' ').trim()
    expect(normalizar(hola)).toBe(antes(hola))
    expect(normalizar(hola, 'es')).toBe(antes(hola))
    expect(normalizar(hola, 'en')).toBe(antes(hola))
    expect(tokenizarGuion(hola).map((t) => t.palabra)).toEqual(tokenizarGuion(hola, 'es').map((t) => t.palabra))
  })

  // Un guion sin puntos, leído de corrido -una palabra cada 300 ms, sin pausas-: los subtítulos se
  // cortan solo por espacio, que es cuando las palabras atadas pasan al siguiente.
  function toma(idioma: string | null, frase: string, veces: number): string {
    const guion = Array.from({ length: veces }, () => frase).join(' ')
    const palabras = guion.split(' ')
    const oidas = palabras.map((w, k) => `${w.toLowerCase()}@${k * 300}-${k * 300 + 250}`).join(' ')
    return [
      '# PALABRAS DE UNA TOMA',
      ...(idioma ? [`# idioma: ${idioma}`] : []),
      '# ---------- GUION, TAL CUAL SE LEYO ----------',
      `# | ${guion}`,
      '# ---------------------------------------------',
      '',
      'ms\ttipo\tdetalle',
      `${palabras.length * 300}\tpalabras\tFINAL: ${oidas}`
    ].join('\n')
  }
  const finales = (registro: string) => armarSubtitulos(registro).map((s) => {
    const r = s.renglones[s.renglones.length - 1]
    return r[r.length - 1].texto.toLowerCase()
  })

  test('con «# idioma: pt» ninguno termina en «do» ni en «pelo»', () => {
    const frase = 'o caminho do rio passa pelo vale verde e a gente vê a beira do mar pelo lado de lá'
    const pt = finales(toma('pt', frase, 12))
    expect(pt.length).toBeGreaterThan(5)
    expect(pt).not.toContain('do')
    expect(pt).not.toContain('pelo')
    // Sin la línea, una toma de antes, se arma como siempre: ahí sí pueden quedar.
    const sinIdioma = finales(toma(null, frase, 12))
    expect(sinIdioma.some((w) => w === 'do' || w === 'pelo')).toBe(true)
  })

  test('con «# idioma: es», «los dos» todavía puede cerrar uno', () => {
    const frase = 'llegaron temprano a la casa grande y saludaron los dos'
    const es = finales(toma('es', frase, 12))
    expect(es).toContain('dos')
  })
})

// -portugues-voz, puntos 6 y 7, 2026-10-22- Nombres de idioma en mapa y aviso del idioma del guion.
// Solo lógica: ni posiciones, ni tamaños, ni orden en pantalla.
import { NOMBRE_IDIOMA, IDIOMA_EN_FRASE, ENDONIMO_IDIOMA, avisoIdiomaGuion } from '../textos'
import { colorAccionAviso } from '../hooks/useAviso'
import {
  avisoIdiomaGuionYaVisto,
  marcarAvisoIdiomaGuionVisto,
  reiniciarMarcasGuiaParaPruebas
} from '../lib/marcasGuia'

describe('portugues-voz punto 6 - nombres de idioma', () => {
  test('los mapas tienen los tres idiomas y el menú nombra cada uno en el suyo', () => {
    expect(NOMBRE_IDIOMA).toEqual({ es: 'idiomaEspanol', en: 'idiomaIngles', pt: 'idiomaPortugues' })
    expect(IDIOMA_EN_FRASE).toEqual({ es: 'idiomaEs', en: 'idiomaEn', pt: 'idiomaPt' })
    expect(ENDONIMO_IDIOMA).toEqual({ es: 'Español', en: 'English', pt: 'Português' })
  })
})

describe('portugues-voz punto 7 - aviso del idioma del guion', () => {
  test('sale en el idioma del guion y solo si difiere de la app; nunca con pt', () => {
    expect(avisoIdiomaGuion('en', 'es')).toEqual({
      texto: 'Your script is in English. Use Sigo in English?',
      accionTexto: 'Switch to English',
      idioma: 'en',
      accionNeutra: true
    })
    expect(avisoIdiomaGuion('es', 'en')).toEqual({
      texto: 'Tu guion está en español. ¿Quieres usar Sigo en español?',
      accionTexto: 'Pasar a español',
      idioma: 'es',
      accionNeutra: true
    })
    expect(avisoIdiomaGuion('es', 'es')).toBeNull()
    expect(avisoIdiomaGuion('en', 'en')).toBeNull()
    expect(avisoIdiomaGuion('pt', 'es')).toBeNull()
    expect(avisoIdiomaGuion('pt', 'en')).toBeNull()
  })

  test('el aviso de idioma pide la acción neutra; el de borrar no y sigue en rojo', () => {
    const idioma = avisoIdiomaGuion('en', 'es')!
    expect(idioma.accionNeutra).toBe(true)
    expect(colorAccionAviso(idioma)).toBe('var(--color-texto)')
    const borrar = { texto: 'Guion borrado', accionTexto: 'Deshacer' }
    expect(colorAccionAviso(borrar)).toBe('var(--aviso-accion)')
  })

  test('queda visto una vez por idioma del guion', () => {
    reiniciarMarcasGuiaParaPruebas()
    expect(avisoIdiomaGuionYaVisto('en')).toBe(false)
    marcarAvisoIdiomaGuionVisto('en')
    expect(avisoIdiomaGuionYaVisto('en')).toBe(true)
    expect(avisoIdiomaGuionYaVisto('es')).toBe(false)
    reiniciarMarcasGuiaParaPruebas()
    expect(avisoIdiomaGuionYaVisto('en')).toBe(false)
  })
})
