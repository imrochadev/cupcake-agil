import { reais } from '../../shared/dinheiro'
import { FORMAS } from '../../shared/pagamento'
import type { PedidoDTO } from '../../shared/tipos'

// Modelos dos e-mails (HTML com estilo inline, que é o que os leitores de e-mail respeitam), nas cores do site.
// Funções puras: recebem os dados e devolvem assunto, texto puro e HTML. O envio fica em email.ts.

export const LOGO_CID = 'logo@cupcakeagil'

const COR = { marca: '#b8245a', fundo: '#fff7f2', cartao: '#ffffff', texto: '#3b2420', suave: '#85655c', linha: '#f0dcd2', destaque: '#ffe3ec' }

export interface Email {
  assunto: string
  texto: string
  html: string
}

const ENTIDADES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }
export const esc = (t: string) => t.replace(/[&<>"']/g, c => ENTIDADES[c]!)
const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] || 'cliente'

function botao(url: string, rotulo: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td style="border-radius:12px;background:${COR.marca}">
<a href="${esc(url)}" style="display:inline-block;padding:14px 28px;font-weight:700;font-size:15px;color:#ffffff;text-decoration:none;border-radius:12px">${esc(rotulo)}</a></td></tr></table>`
}

function paragrafo(html: string): string {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${COR.texto}">${html}</p>`
}

/** Moldura de todos os e-mails: logo e nome no topo, cartão branco, rodapé com o aviso da loja de demonstração. */
function moldura(previa: string, titulo: string, conteudo: string, rodape: string): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(titulo)}</title></head>
<body style="margin:0;padding:0;background:${COR.fundo};font-family:'Nunito',Arial,Helvetica,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(previa)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COR.fundo};padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0 0 16px"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="padding-right:10px"><img src="cid:${LOGO_CID}" width="44" height="44" alt="" style="display:block;border:0"></td>
<td style="font-size:22px;font-weight:800;color:${COR.marca}">Cupcake Ágil</td></tr></table></td></tr>
<tr><td style="background:${COR.cartao};border:1px solid ${COR.linha};border-radius:20px;padding:32px 28px">
<h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;color:${COR.texto}">${esc(titulo)}</h1>
${conteudo}
</td></tr>
<tr><td style="padding:20px 8px 0;font-size:12px;line-height:1.6;color:${COR.suave};text-align:center">${rodape}<br>
Cupcake Ágil · Projeto Integrador Transdisciplinar em Engenharia de Software II · loja de demonstração, nenhum valor é cobrado.</td></tr>
</table></td></tr></table></body></html>`
}

export function emailBoasVindas(nome: string, site: string): Email {
  const titulo = `Que bom ter você aqui, ${primeiroNome(nome)}!`
  const html = moldura('Sua conta na Cupcake Ágil está pronta.', titulo,
    paragrafo('Sua conta na <strong>Cupcake Ágil</strong> está pronta. Agora é só escolher os sabores, pagar como preferir e acompanhar o pedido até a sua porta.')
    + paragrafo(`Entrega grátis em pedidos a partir de <strong>${reais(8000)}</strong>.`)
    + botao(site, 'Ver o cardápio'),
    'Você recebeu este e-mail porque criou uma conta na Cupcake Ágil.')
  return {
    assunto: 'Boas-vindas à Cupcake Ágil 🧁',
    texto: `${titulo}\n\nSua conta na Cupcake Ágil está pronta. Escolha seus sabores em ${site}\n\nEntrega grátis a partir de ${reais(8000)}.`,
    html,
  }
}

export function emailSenhaNova(nome: string, url: string): Email {
  const html = moldura('Link para criar uma senha nova (vale por 1 hora).', 'Crie uma senha nova',
    paragrafo(`Olá, ${esc(primeiroNome(nome))}! Recebemos um pedido para trocar a senha da sua conta.`)
    + botao(url, 'Criar senha nova')
    + paragrafo(`<span style="color:${COR.suave};font-size:13px">O link vale por <strong>1 hora</strong> e só pode ser usado uma vez. Se o botão não abrir, copie este endereço:<br><a href="${esc(url)}" style="color:${COR.marca};word-break:break-all">${esc(url)}</a></span>`),
    'Se não foi você que pediu, ignore este e-mail: sua senha continua a mesma.')
  return {
    assunto: 'Cupcake Ágil: crie uma senha nova',
    texto: `Olá, ${primeiroNome(nome)}!\n\nPara criar uma senha nova, abra o link abaixo (vale por 1 hora):\n${url}\n\nSe não foi você que pediu, ignore este e-mail.`,
    html,
  }
}

export function emailSenhaAlterada(nome: string, site: string): Email {
  const quando = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })
  const html = moldura('A senha da sua conta foi alterada.', 'Sua senha foi alterada',
    paragrafo(`Olá, ${esc(primeiroNome(nome))}! A senha da sua conta na Cupcake Ágil foi alterada em <strong>${esc(quando)}</strong> (horário de Brasília). Por segurança, as outras sessões abertas foram encerradas.`)
    + paragrafo('<strong>Não foi você?</strong> Peça uma senha nova agora mesmo pelo botão abaixo.')
    + botao(`${site}/recuperar-senha`, 'Proteger minha conta'),
    'Este é um aviso automático de segurança.')
  return {
    assunto: 'Cupcake Ágil: sua senha foi alterada',
    texto: `Olá, ${primeiroNome(nome)}!\n\nA senha da sua conta foi alterada em ${quando}. Se não foi você, peça uma senha nova em ${site}/recuperar-senha`,
    html,
  }
}

export function emailPedidoConfirmado(nome: string, pedido: PedidoDTO, site: string): Email {
  const url = `${site}/pedidos/${pedido.id}`
  const previsao = new Date(pedido.previsaoEntrega).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
  const linha = (rotulo: string, valor: string, forte = false) =>
    `<tr><td style="padding:6px 0;font-size:14px;color:${forte ? COR.texto : COR.suave}${forte ? ';font-weight:800;font-size:16px' : ''}">${rotulo}</td>
<td align="right" style="padding:6px 0;font-size:14px;color:${COR.texto}${forte ? ';font-weight:800;font-size:16px' : ''}">${valor}</td></tr>`
  const itens = pedido.itens.map(i => linha(`${i.quantidade}× ${esc(i.nome)}`, reais(i.precoCentavos * i.quantidade))).join('')
  const pagamento = FORMAS[pedido.pagamento.forma]
    + (pedido.pagamento.cartaoFinal ? ` (${pedido.pagamento.bandeira} final ${pedido.pagamento.cartaoFinal})` : '')
    + (pedido.pagamento.status === 'aprovado' ? ' · aprovado' : ' · pagar na entrega')
  const html = moldura(`Pedido #${pedido.numero} recebido. Previsão de entrega: ${previsao}.`, `Pedido #${pedido.numero} confirmado!`,
    paragrafo(`Oba, ${esc(primeiroNome(nome))}! Já recebemos seu pedido e ele vai para a cozinha. Previsão de entrega: <strong>${previsao}</strong>.`)
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;border-top:1px solid ${COR.linha};border-bottom:1px solid ${COR.linha}">
${itens}${linha('Entrega', pedido.taxaEntrega ? reais(pedido.taxaEntrega) : 'Grátis')}${linha('Total', reais(pedido.total), true)}</table>`
+ `<p style="margin:16px 0 4px;font-size:14px;line-height:1.6;color:${COR.texto}"><strong>Entrega:</strong> ${esc(pedido.endereco)}</p>`
+ `<p style="margin:0;font-size:14px;line-height:1.6;color:${COR.texto}"><strong>Pagamento:</strong> ${esc(pagamento)}</p>`
+ botao(url, 'Acompanhar pedido'),
    'Você recebeu este e-mail porque fez um pedido na Cupcake Ágil.')
  const texto = [`Pedido #${pedido.numero} confirmado!`, `Previsão de entrega: ${previsao}`, '',
    ...pedido.itens.map(i => `${i.quantidade}× ${i.nome}: ${reais(i.precoCentavos * i.quantidade)}`),
    `Entrega: ${pedido.taxaEntrega ? reais(pedido.taxaEntrega) : 'Grátis'}`, `Total: ${reais(pedido.total)}`, '',
    `Endereço: ${pedido.endereco}`, `Pagamento: ${pagamento}`, '', `Acompanhe: ${url}`].join('\n')
  return { assunto: `Cupcake Ágil: pedido #${pedido.numero} confirmado`, texto, html }
}
