// LOS TEXTOS DEL SITIO EN PORTUGUÉS DE BRASIL -orden portugues-sitio, Javier, 2026-10-24-.
//
// Mismas claves que textos/es.js y en.js: armar.mjs arma /pt, /pt/privacidade, /pt/suporte,
// /pt/ajuda y /pt/excluir-conta con las mismas plantillas que los otros dos idiomas. Si falta
// una clave, el armado se para.
//
// SE ESCRIBE, NO SE TRADUCE -como el inglés, y P5 de docs/portugues.txt-: portugués de Brasil,
// con «você», el mismo tono de es.js. Los términos son los del glosario de docs/portugues.txt
// -rama portugues-app, sección 4-, que manda: roteiro, take, Ler, Gravar, legendas,
// Configurações, Excluir conta, backup, celular -y no «telefone»-, «o Sigo» y «o app».
//
// LA PRIVACIDAD Y LA PÁGINA PARA BORRAR LA CUENTA dicen EXACTAMENTE lo mismo que en español,
// punto por punto y en el mismo orden: es lo que revisa Google Play. Donde una frase no tiene
// forma natural en portugués, se reescribió sin cambiar lo que promete.
//
// LA AYUDA SIN FOTOS POR AHORA: las de sitio/fuente/capturas muestran la app en español. Ninguna
// sección lleva imagen ni alt; cada una deja su captura descrita, como salió el manual al
// principio -armar.mjs, «LAS FOTOS VAN DESPUÉS»-. Las fotos en portugués llegan con la ficha
// de Play, desde la app en portugués.

export default {
  idioma: 'pt',
  // og:locale. El hreflang es «pt», sin país: así lo encuentra también Portugal -armar.mjs-.
  locale: 'pt_BR',
  // Las mismas rutas que ya usa la app en portugués.
  rutas: { portada: '/pt', privacidad: '/pt/privacidade', terminos: '/pt/termos', soporte: '/pt/suporte', ayuda: '/pt/ajuda', borrarCuenta: '/pt/excluir-conta' },

  meta: {
    // -portugues-sitio, 2026-10-24, decisión de Javier- El nombre del producto es el mismo que en la marca y en la
    // ficha de Play: «Sigo — Teleprompter de voz», aunque en portugués suene más natural «por voz». Antes:
    // titulo: 'Sigo — Teleprompter por voz',
    titulo: 'Sigo — Teleprompter de voz',
    descripcion: 'O Sigo é o teleprompter que acompanha a sua voz: você lê em voz alta e o texto anda junto. Se você para, ele espera. Em breve no Google Play.',
    ogDescripcion: 'O teleprompter que acompanha a sua voz. Em breve no Google Play.',
    privacidadTitulo: 'Privacidade — Sigo',
    terminosTitulo: 'Termos de uso — Sigo',
    terminosDescripcion: 'O que o Sigo grátis e o Sigo+ incluem, como funciona a cobrança e como cancelar.',
    privacidadDescripcion: 'Como o Sigo trata seus roteiros, seus takes, sua voz e sua conta.',
    soporteTitulo: 'Suporte — Sigo',
    soporteDescripcion: 'Como avisar sobre um problema no Sigo, o teleprompter que acompanha a sua voz.',
    ayudaTitulo: 'Ajuda — Sigo',
    ayudaDescripcion: 'Como usar o Sigo: ler, gravar, pausar, legendas e mais.',
    borrarCuentaTitulo: 'Excluir conta — Sigo',
    borrarCuentaDescripcion: 'Como excluir sua conta do Sigo e o backup dos seus roteiros, pelo app ou sem ele.'
  },

  selector: { etiqueta: 'Idioma' },
  escenario: 'Sigo, cena por cena',
  capitulosEtiqueta: 'Capítulos',
  inicio: 'Sigo, início',

  entrada: { titular: 'O teleprompter que acompanha a&nbsp;sua&nbsp;voz.' },

  e1: { capitulo: 'Ler', titular: 'Acompanha a sua voz.', bajada: 'Você fala e o texto anda junto. Sem tocar em nada.' },
  e2: { capitulo: 'Espera você', titular: 'Os outros correm. <span class="acento">O Sigo espera.</span>', bajada: 'Se você para para pensar, o texto espera. Quando volta a falar, ele continua junto.' },
  e3: { capitulo: 'Seu roteiro', titular: 'Seu roteiro, com intenção.', bajada: 'Marque o que você quer dizer com força. Pinte as mudanças de tom. Destaque o que não pode passar batido.' },
  e4: { capitulo: 'Gravar', titular: 'Olhando para a lente.', bajada: 'O texto fica logo abaixo da câmera: você olha para a lente, não para a tela. Pause quando quiser, e a pausa não fica no vídeo. Longe do celular, pause com a palma da mão.' },
  e5: { capitulo: 'Seu vídeo', titular: 'Legendas no ritmo da sua voz.', bajada: 'Ao terminar, seu vídeo vem com legendas no ritmo da sua voz e o filtro que você escolher. O que você vê é o que fica salvo.' },
  e6: { capitulo: 'Sem internet', titular: 'Sem internet.', bajada: 'A voz do seu idioma é baixada sozinha na primeira vez que você abre o Sigo. Depois funciona sem internet, e a sua voz não sai do celular.' },

  // Los tres estilos de subtítulos de la app, con los nombres del glosario.
  estilos: { amarillo: 'Amarelo', rojo: 'Vermelho', formal: 'Formal' },

  tarjetas: {
    espera: 'Você parou: o texto espera',
    corre: 'O outro continua correndo',
    negrita: 'Negrito',
    ambar: 'Âmbar',
    celeste: 'Azul-claro',
    salvia: 'Verde',
    destacado: 'Destaque',
    lente: 'A linha fica logo abaixo da lente',
    camara: 'A câmera, atrás do texto',
    avion: 'Modo avião. O texto continua.'
  },

  telefono: {
    sigo: 'Sigo',
    comun: 'Um teleprompter comum',
    espera: 'Espera você',
    escapa: 'Passou direto',
    avion: 'Modo avião'
  },

  cierre: { frase: 'O teleprompter que acompanha a sua&nbsp;voz.', disponible: 'Em breve no Google Play.' },

  pie: { privacidad: 'Privacidade', terminos: 'Termos', soporte: 'Suporte', ayuda: 'Ajuda', borrarCuenta: 'Excluir conta' },

  // EL CORREO EN PORTUGUÉS es el del español -Javier, 22-10-2026, P4 de docs/portugues.txt-:
  // «Olá» y «hola» se parecen lo bastante, y no hace falta otro reenvío.
  correo: 'hola@sigoteleprompter.com',

  prueba: {
    franja: 'O Sigo está em fase de testes.',
    franjaAccion: 'Seja um dos primeiros a usar&nbsp;→',
    cerrar: 'Fechar aviso',
    titulo: 'Experimente o Sigo antes de todo mundo',
    antesDelCorreo: 'Estamos convidando um grupo pequeno para usar o Sigo no Android antes do lançamento. Escreva para',
    despuesDelCorreo: 'com o e-mail da sua conta do Google, e enviamos o convite para você.'
  },

  // Punto por punto, en el mismo orden que es.js.
  privacidad: {
    titulo: 'Privacidade',
    puntos: [
      'Seus roteiros ficam no seu celular.<small>Se você entrar na sua conta, também existe um backup na nuvem: veja mais abaixo.</small>',
      'Seus takes também.<small>Se você salvar um na galeria, ele fica lá.</small>',
      'O Sigo usa o microfone para acompanhar a sua voz.<small>O reconhecimento de voz roda no celular. O áudio não é enviado a nenhum servidor.</small>',
      'O Sigo usa a câmera quando você a liga para se gravar.<small>O vídeo fica salvo no seu celular e não sai de lá.</small>',
      'Os gestos são reconhecidos no celular.<small>Nenhuma imagem sai dele.</small>',
      // Antes: 'Sigo no envía estadísticas de uso.'
      // Antes: 'O Sigo não usa o Firebase Analytics nem o Firebase Remote Config. O Firebase é usado para fazer login e guardar o backup dos roteiros; esses serviços transmitem os dados técnicos necessários para funcionar.'
      'O Sigo não usa o Firebase Analytics. Usa o Firebase Remote Config para receber os limites de tempo da versão grátis.<small>O Firebase recebe um ID de instalação (FID) para escolher quais valores de configuração enviar ao Sigo. O ID identifica uma instalação e, por si só, não identifica uma pessoa nem um aparelho físico. <a href="https://firebase.google.com/support/privacy">Saiba mais sobre privacidade no Firebase</a>.</small>',
      'Entrar com o Google é opcional.<small>O Sigo funciona por completo sem conta.</small>',
      'Se você entrar com o Google, o Sigo recebe seu e-mail, seu nome e um identificador da conta.<small>O Firebase também guarda o link da sua foto de perfil do Google, que o Sigo não usa nem mostra.</small>',
      'O backup dos seus roteiros fica no Firebase, do Google, na região de Santiago do Chile.<small>Seus roteiros viajam criptografados, e nenhuma outra conta pode lê-los.</small>',
      'O Firebase registra o endereço IP para impedir abusos.',
      'Se você assinar o Sigo+, o Google Play processa o pagamento. O Sigo não recebe nem vê os dados do seu cartão.',
      'O RevenueCat verifica se o Sigo+ está ativo.<small>Para isso, processa o histórico de compras e o identificador usado pelo app: seu UID do Firebase se você entrou na conta, ou um identificador anônimo do RevenueCat se não entrou. O Sigo não envia seu nome nem seu e-mail. O RevenueCat pode receber dados de moeda e localidade para mostrar a oferta. <a href="https://www.revenuecat.com/privacy-policy">Leia a política de privacidade do RevenueCat</a>.</small>',
      'Os vídeos nunca saem do celular.',
      'Para excluir sua conta e o backup dos seus roteiros: <a href="/pt/excluir-conta">sigoteleprompter.com/pt/excluir-conta</a>.',
      'Este site não usa cookies de rastreamento nem ferramentas de análise.'
    ],
    contacto: 'Se tiver alguma dúvida, escreva para a gente.'
  },

  terminos: {
    titulo: 'Termos de uso',
    // -publicado el 26-10-2026, con el sí de Javier- Antes: vigencia: 'Em vigor desde &#123;&#123;FECHA&#125;&#125;',
    vigencia: 'Em vigor desde 26 de outubro de 2026',
    secciones: [
      { titulo: 'Quem oferece o Sigo', parrafos: ['O Sigo é um teleprompter para Android que acompanha a sua voz. Sigo Teleprompter é um serviço de J. Arriagada, desenvolvedor independente no Chile.', 'Contato: <a href="mailto:hola@sigoteleprompter.com">hola@sigoteleprompter.com</a>.'] },
      { titulo: 'Usar o Sigo grátis', parrafos: ['A versão grátis limita o tempo de leitura com a voz e de gravação. Os vídeos têm marca-d’água. <small>Os limites atuais aparecem no app e podem mudar.</small>'] },
      { titulo: 'Sigo+', parrafos: ['O Sigo+ tira os limites de tempo para ler e gravar e permite salvar vídeos sem marca-d’água. Há planos mensal e anual. Você paga o preço e os impostos que o Google Play mostra para seu país.'] },
      { titulo: 'Cobrança', parrafos: ['O Google Play cobra pela sua conta do Google; o Sigo não recebe nem vê os dados do cartão. A assinatura renova automaticamente até você cancelar: todo mês ou ano, conforme o plano.'] },
      { titulo: 'Teste grátis de 7 dias', parrafos: ['O Google Play oferece 7 dias grátis nos dois planos a novos clientes que nunca tiveram aquela assinatura. A plataforma verifica se você tem direito e pede uma forma de pagamento. Cancele antes do fim dos 7 dias e não pagará; caso contrário, começa a cobrança recorrente pelo preço e frequência mostrados na compra.'] },
      { titulo: 'Cancelar', parrafos: ['Cancele no Google Play → Assinaturas ou no Sigo: Configurações → “Sigo+ ativo · Gerenciar”. Isso evita a renovação. O Sigo+ fica ativo até o fim do período pago, salvo indicação diferente do Google Play. Desinstalar não cancela.'] },
      { titulo: 'Reembolsos', parrafos: ['Peça reembolso ao Google Play conforme políticas que dependem do país, da data e da compra. <a href="https://support.google.com/googleplay/answer/15574908">Consulte as políticas</a>. Se houver erro na cobrança ou o Sigo+ não ativar, escreva para <a href="mailto:hola@sigoteleprompter.com">hola@sigoteleprompter.com</a>.'] },
      { titulo: 'Mudanças de preço', parrafos: ['O Google Play gerencia avisos e consentimento conforme as regras do seu país. Se você não aceitar um aumento quando solicitado, pode cancelar. <a href="https://support.google.com/googleplay/android-developer/answer/12154973">Regras de mudança de preço</a>.'] },
      { titulo: 'Seus roteiros e vídeos', parrafos: ['Seus roteiros e vídeos são seus. O Sigo não reivindica nem reutiliza seu conteúdo. Você responde por ele e por ter os direitos necessários.'] },
      { titulo: 'Uso correto', parrafos: ['Não use o Sigo ilegalmente, para prejudicar outras pessoas nem para burlar ou quebrar a cobrança.'] },
      { titulo: 'Sem garantias', parrafos: ['O reconhecimento de voz pode errar. Ao ler ao vivo, mantenha o texto por perto. Seus direitos legais continuam valendo.'] },
      { titulo: 'Responsabilidade', parrafos: ['Respondemos somente até onde a lei permitir. Estes termos não limitam nem excluem seus direitos obrigatórios como consumidor.'] },
      { titulo: 'Privacidade e conta', parrafos: ['Leia a <a href="/pt/privacidade">Política de privacidade</a>. Para excluir sua conta e o backup, acesse <a href="/pt/excluir-conta">Excluir conta</a>.'] },
      { titulo: 'Mudanças nestes termos', parrafos: ['Publicaremos as mudanças e datas aqui. Avisaremos você no app sobre mudanças importantes. A vigência aparece no início.'] },
      { titulo: 'Lei aplicável', parrafos: ['Vale a lei do Chile, sem retirar os direitos do consumidor no seu país.'] }
    ]
  },

  // Las mismas secciones que es.js, en el mismo orden. Sin imagen: ver arriba.
  ayuda: {
    titulo: 'Ajuda',
    intro: 'O Sigo acompanha a sua voz. Você lê em voz alta e o texto anda junto. Se você para, ele espera.',
    escribirnos: 'Como falar com a gente',
    secciones: [
      { titulo: 'Ler e gravar', parrafos: ['Abra um roteiro e toque em Ler ou Gravar. Na tela, toque no círculo para começar. Ele conta 3 segundos e começa.'], captura: '[CAPTURA: tela PRONTO de Gravar, com o círculo vermelho e a contagem de 3]' },
      { titulo: 'Pausar e parar', parrafos: ['Ao ler ou gravar, Pausar e Parar ficam escondidos. Toque no texto e eles aparecem. Com a voz, eles se escondem sozinhos depois de alguns segundos.', 'O que acontece durante a pausa não fica no vídeo. Em pausa, a lixeira descarta o take. O gesto de voltar do Android encerra o take e salva.'], captura: '[CAPTURA: lendo, com os controles à vista depois de tocar no texto]' },
      { titulo: 'Se o texto se adiantar', parrafos: ['Se você pular uma parte, arraste o texto com o dedo até onde você está. Ele continua dali. Antes de começar, também dá para arrastar e escolher de onde ele parte.'], captura: '[CAPTURA: PRONTO, com o texto arrastado para baixo]' },
      { titulo: 'Com a voz ou com velocidade fixa', parrafos: ['Antes de começar, toque na ficha que diz Com a voz e escolha Com a voz ou Velocidade fixa. Também dá para mudar em Configurações. Com a voz, o texto acompanha o que você diz. Com Velocidade fixa, ele sobe sozinho, na velocidade que você escolher.'], captura: '[CAPTURA: PRONTO, ficha do modo aberta com Com a voz / Velocidade fixa]' },
      { titulo: 'A câmera', parrafos: ['Em Gravar, você pode se ver Atrás do texto, em uma Janela pequena, ou com a câmera Oculta. A janela pode ser arrastada. Virar troca de câmera. Qualidade e Estabilizar ficam no painel de Configurações do take.'], captura: '[CAPTURA: PRONTO de Gravar, painel da câmera aberto com Atrás do texto, Janela pequena e Oculta]' },
      { titulo: 'Controle por gestos', parrafos: ['No painel da câmera, ative o Controle por gestos. Só funciona com a câmera frontal. A palma pausa ou continua. Para continuar, abaixe a mão e mostre de novo: ela conta 3 segundos. Em pausa, o V encerra o take.'], captura: '[CAPTURA: painel da câmera, linha Controle por gestos ativada]' },
      { titulo: 'Legendas e filtro', parrafos: ['Você escolhe no visualizador, ao terminar o take, antes de salvar. Cada take começa sem legendas. Depois de salvo, não dá mais para colocar. O que você vê é o que fica salvo.'], captura: '[CAPTURA: visualizador de um take sem salvar, com Legendas e Filtro à vista]' },
      { titulo: 'Salvar e compartilhar', parrafos: ['Salvar deixa o take na galeria, em Filmes. Salvar e compartilhar abre o menu de compartilhar. Refazer grava de novo. Excluir pede confirmação.'], captura: '[CAPTURA: visualizador, linha com Salvar, Salvar e compartilhar, Refazer e Excluir]' },
      { titulo: 'Seus roteiros', parrafos: ['Toque em + para criar um. Cole um texto ou abra um arquivo .txt, .md ou .docx. No editor, selecione o texto para negrito, cores e destaque. O que você escreve entre colchetes é uma anotação: aparece, mas não é lida. O botão do idioma -ES, EN ou PT- é o idioma em que o Sigo escuta você. Toque nele para escolher outro.'], captura: '[CAPTURA: editor com texto selecionado e a barra de formatação]' },
      { titulo: 'Excluir e arquivar um roteiro', parrafos: ['Deslize a linha, mantenha pressionada, ou use o menu do editor. Ao excluir, aparece Desfazer. Os arquivados ficam em Arquivados.'], captura: '[CAPTURA: lista de roteiros, menu de uma linha com Arquivar e Excluir]' },
      { titulo: 'Atalhos', parrafos: ['Mantenha pressionado o ícone do Sigo no celular. Novo roteiro com o texto copiado cria um roteiro e cola o que estiver copiado. Gravar abre direto em Gravar o roteiro mais recente.'], captura: '[CAPTURA: tela inicial do Android, menu do ícone do Sigo com os dois atalhos]' },
      { titulo: 'Configurações', parrafos: ['Em Configurações você muda o tamanho do texto, a fonte, a largura, as cores, o espelhamento e mostrar tempo. Pela tela inicial do Sigo, você também muda o tema e o idioma do app.'], captura: '[CAPTURA: painel de Configurações pela tela inicial do Sigo, seções Leitura e Aparência]' },
      { titulo: 'Sem conexão', parrafos: ['A voz do seu idioma e os gestos são baixados uma vez. Depois funcionam sem internet. Se não houver conexão na primeira vez, o Sigo avisa e oferece Tentar de novo.'], captura: '[CAPTURA: aviso de sem conexão ao tentar ler sem a voz baixada]' },
      { titulo: 'Sua conta e o backup', parrafos: ['Com sua conta do Google, o Sigo faz backup dos seus roteiros e você os tem em todos os seus dispositivos. É opcional: sem conta, o Sigo funciona igual.', 'Para entrar, abra Configurações pela tela inicial do Sigo e toque em Continuar com o Google. Para sair, toque na sua conta no alto de Configurações e escolha Sair da conta. Seus roteiros continuam no celular.', 'Para excluí-la, toque na sua conta e escolha Excluir conta. Sua conta e o backup na nuvem são excluídos; os roteiros do celular não são tocados.'], captura: '[CAPTURA: Configurações pela tela inicial do Sigo, com o cartão da conta no alto: sem conta, Nunca perca um roteiro e Continuar com o Google; com conta, o e-mail e Backup concluído]' }
    ]
  },
  soporte: {
    titulo: 'Suporte',
    queEs: 'O Sigo é um teleprompter que acompanha a sua voz: você lê em voz alta e o texto anda junto. Hoje ele é para celulares Android.',
    avisa: 'Se algo não funcionar, escreva para a gente e conte:',
    puntos: ['Qual celular você usa.', 'Qual versão do Android ele tem.', 'O que você estava fazendo quando aconteceu.']
  },

  // LA PÁGINA PARA BORRAR LA CUENTA SIN LA APP, que pide Google Play: lo mismo que es.js, punto
  // por punto -cómo se hace, qué se borra, que no se deshace y cuánto demora-.
  borrarCuenta: {
    titulo: 'Excluir sua conta do Sigo',
    desdeLaApp: 'Pelo app: abra o Sigo, toque na sua conta no alto de Configurações, escolha Excluir conta e confirme. Sua conta e o backup dos seus roteiros na nuvem são excluídos na hora. Não é possível desfazer. Os roteiros do seu celular não são tocados.',
    sinLaApp: 'Sem o app: escreva para <a href="mailto:hola@sigoteleprompter.com">hola@sigoteleprompter.com</a> a partir do e-mail da sua conta do Google, com o assunto «Excluir minha conta do Sigo». Excluímos sua conta e o backup dos seus roteiros o quanto antes, em no máximo 7 dias, e avisamos você quando estiver feito.',
    queSeBorra: 'O que é excluído: sua conta do Sigo (seu e-mail, seu nome, o link da sua foto de perfil e o identificador da conta) e todo o backup dos seus roteiros. Não guardamos cópias.',
    // -borrar-cuenta-suscripcion, 31-10-2026- Mesma chave que es.js. Antes: (não existia).
    avisoSuscripcion: 'Se você tem o Sigo+, excluir sua conta não cancela a assinatura. Cancele no <a href="https://play.google.com/store/account/subscriptions">Google Play</a> para parar de pagar. Também excluímos seu registro de compras na RevenueCat; o Google mantém o dele.'
  },

  // EL GUION DEL TELÉFONO -sitio/fuente/lectura.js-, escrito en portugués con los mismos formatos
  // que el de es.js: **negrito**, {ambar}...{/}, {celeste}...{/}, {salvia}...{/} -el verde- y
  // ==destaque==. Un párrafo por elemento.
  lectura: {
    guion: [
      'Hoje quero contar uma coisa **importante** para você. Ao gravar um vídeo, curto ou longo, ler de um papel sempre aparece. Agora eu leio, falo e {salvia}o texto me acompanha{/}. {ambar}Sem pressa.{/} {celeste}Sem perder o fio.{/} E o que não pode passar batido, ==eu marco em amarelo==.',
      'Se eu paro para pensar, o texto me espera. Quando volto a falar, ele continua comigo. Olho para a lente, não para a tela, e quem me vê sente que falo direto com ele.',
      'Se eu pauso, esse trecho não fica. Ao terminar, o vídeo já vem com as legendas. Compartilho assim, do jeito que saiu.'
    ],
    // Como en es.js: el último párrafo no se lee.
    parrafosLeidos: 2,
    // La pausa de pensar de E2, después de esta palabra tal como está escrita en el guion.
    pausaDespuesDe: 'pensar,',
    // Sin toma real todavía: la voz estimada, como en los otros dos idiomas.
    toma: null
  }
}
