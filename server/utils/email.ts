import nodemailer, { type Transporter } from 'nodemailer'
import type { H3Event } from 'h3'
import type { PedidoDTO } from '#shared/tipos'
import { emailBoasVindas, emailPedidoConfirmado, emailSenhaAlterada, emailSenhaNova, LOGO_CID, type Email } from './email-modelos'

// Envio dos e-mails pelo SMTP (MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM). Sem MAIL_HOST
// (desenvolvimento e testes), o e-mail não sai: o assunto e o link aparecem no log. Os modelos ficam em email-modelos.ts.

let transporte: Transporter | null = null

function smtp(): Transporter | null {
  const cfg = useRuntimeConfig()
  if (!cfg.mailHost) return null
  const porta = Number(cfg.mailPort) || 587
  transporte ??= nodemailer.createTransport({
    host: cfg.mailHost,
    port: porta,
    // 465 = TLS desde o início; 587 = STARTTLS obrigatório (a senha nunca vai em texto aberto).
    secure: porta === 465,
    requireTLS: porta !== 465,
    auth: cfg.mailUser ? { user: cfg.mailUser, pass: cfg.mailPassword } : undefined,
  })
  return transporte
}

let logo: Promise<Buffer | null> | null = null
function logoDoEmail(): Promise<Buffer | null> {
  logo ??= Promise.resolve(useStorage('assets:server').getItemRaw<Uint8Array>('mail/logo.png'))
    .then(dados => (dados ? Buffer.from(dados) : null))
    .catch(() => null)
  return logo
}

async function enviar(para: string, email: Email, dica = ''): Promise<void> {
  const transporte = smtp()
  if (!transporte) {
    console.info(`[email] sem MAIL_HOST: "${email.assunto}" para ${para}${dica ? `: ${dica}` : ''}`)
    return
  }
  const imagem = await logoDoEmail()
  await transporte.sendMail({
    from: useRuntimeConfig().mailFrom,
    to: para,
    subject: email.assunto,
    text: email.texto,
    // Sem o arquivo do logo, o e-mail vai só com o nome da loja.
    html: imagem ? email.html : email.html.replace(/<td style="padding-right:10px"><img[^>]+><\/td>/, ''),
    attachments: imagem ? [{ filename: 'cupcake-agil.png', content: imagem, cid: LOGO_CID, contentDisposition: 'inline' }] : [],
  })
}

/** Endereço público do site para os links dos e-mails. */
export function enderecoDoSite(event?: H3Event): string {
  return (process.env.BETTER_AUTH_URL || (event ? getRequestURL(event).origin : '')).replace(/\/$/, '')
}

/** E-mail que não pode atrapalhar o que a pessoa estava fazendo: falha vira log. */
function semFalhar(promessa: Promise<void>, tipo: string): Promise<void> {
  return promessa.catch(erro => console.error(`[email] falha ao enviar ${tipo}:`, erro instanceof Error ? erro.message : erro))
}

export function enviarLinkDeSenha(para: string, nome: string, url: string): Promise<void> {
  return enviar(para, emailSenhaNova(nome, url), url)
}

export function enviarBoasVindas(para: string, nome: string): Promise<void> {
  return semFalhar(enviar(para, emailBoasVindas(nome, enderecoDoSite())), 'boas-vindas')
}

export function enviarSenhaAlterada(para: string, nome: string): Promise<void> {
  return semFalhar(enviar(para, emailSenhaAlterada(nome, enderecoDoSite())), 'senha alterada')
}

export function enviarPedidoConfirmado(event: H3Event, para: string, nome: string, pedido: PedidoDTO): Promise<void> {
  return semFalhar(enviar(para, emailPedidoConfirmado(nome, pedido, enderecoDoSite(event))), 'pedido confirmado')
}
