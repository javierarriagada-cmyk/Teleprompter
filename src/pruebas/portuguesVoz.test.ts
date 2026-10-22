// EL PORTUGUÉS DE BRASIL -portugues-voz, 2026-10-22-. Solo lógica: el idioma de la voz, el detector, las letras y
// los subtítulos.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, test, vi } from 'vitest'
import { idiomaDeVoz, LANG_MOTOR } from '../lib/vozAPedido'
import { detectarIdioma } from '../lib/detectarIdioma'
import { bloqueDeBienvenida } from '../app/bienvenida'

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

  test('un texto corto no decide', () => {
    expect(detectarIdioma('Bom dia, meu nome é Roberto.')).toBeNull()
  })
})
