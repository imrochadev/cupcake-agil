import type { H3Event } from 'h3'
import { ObjectId } from 'mongodb'
import type { ZodType } from 'zod'
import { ErroCatalogo } from '../models/catalogo'
import { ErroCarrinho } from '../models/carrinho'
import { ErroPedido } from '../models/pedido'

// Utilitários dos Controllers: erro com mensagem para a tela, validação da entrada, ids, limite de requisições e
// imagens enviadas.

/** Erro de resposta. A tela mostra `message`; `campo` diz qual campo do formulário destacar. */
export function falhar(status: number, mensagem: string, campo?: string): never {
  throw createError({ statusCode: status, message: mensagem, data: { mensagem, campo } })
}

/** Erros esperados dos Models viram resposta com a mensagem deles; o resto continua como erro 500. */
export async function semErroDeModelo<T>(promessa: Promise<T>): Promise<T> {
  try {
    return await promessa
  } catch (erro) {
    if (erro instanceof ErroPedido) falhar(erro.status, erro.message, erro.campo)
    if (erro instanceof ErroCarrinho) falhar(erro.status, erro.message)
    if (erro instanceof ErroCatalogo) falhar(400, erro.message, 'categoriaId')
    throw erro
  }
}

export function validar<T>(schema: ZodType<T>, dados: unknown): T {
  const r = schema.safeParse(dados)
  if (!r.success) {
    const primeiro = r.error.issues[0]
    falhar(400, primeiro?.message ?? 'Dados inválidos.', primeiro?.path.join('.'))
  }
  return r.data
}

export async function lerCorpo<T>(event: H3Event, schema: ZodType<T>): Promise<T> {
  return validar(schema, await readBody(event).catch(() => undefined))
}

export function idDaRota(event: H3Event, nome = 'id'): ObjectId {
  const valor = getRouterParam(event, nome)
  if (!valor || !/^[a-f\d]{24}$/i.test(valor)) falhar(404, 'Não encontrado.')
  return new ObjectId(valor)
}

export function ipDo(event: H3Event): string {
  // Na Vercel (ou atrás de um proxy que reescreve o X-Forwarded-For, com NUXT_CONFIAR_PROXY=1) vale o cabeçalho;
  // fora disso, o IP da conexão (o cabeçalho viria do próprio cliente).
  const confiar = process.env.VERCEL === '1' || process.env.NUXT_CONFIAR_PROXY === '1'
  return getRequestIP(event, { xForwardedFor: confiar }) ?? 'desconhecido'
}

// shortcut: contador em memória, por instância do servidor; com várias instâncias, mover para o MongoDB ou Redis.
const janelas = new Map<string, { inicio: number, n: number }>()

export function limitar(chave: string, maximo: number, janelaMs: number): void {
  const agora = Date.now()
  const j = janelas.get(chave)
  if (!j || agora - j.inicio > janelaMs) {
    janelas.set(chave, { inicio: agora, n: 1 })
    return
  }
  if (++j.n > maximo) falhar(429, 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.')
}

const TIPOS: [string, (b: Uint8Array) => boolean][] = [
  ['image/png', b => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47],
  ['image/jpeg', b => b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF],
  ['image/webp', b => String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP'],
]

export const IMAGEM_MAX_BYTES = 3 * 1024 * 1024

/** Imagem de um formulário: PNG, JPEG ou WebP (pelo conteúdo, não pela extensão) de até 3 MB. SVG não: pode ter script. */
export function imagemEnviada(dados: Uint8Array | undefined): { mime: string, dados: Uint8Array } | null {
  if (!dados?.length) return null
  if (dados.length > IMAGEM_MAX_BYTES) falhar(413, 'Imagem muito grande: o limite é 3 MB.', 'imagem')
  const tipo = TIPOS.find(([, confere]) => confere(dados))
  if (!tipo) falhar(415, 'Envie uma imagem PNG, JPEG ou WebP.', 'imagem')
  return { mime: tipo[0], dados }
}

/** Campos de texto e o arquivo `imagem` de um formulário multipart. */
export async function lerFormulario(event: H3Event): Promise<{ campos: Record<string, string>, arquivo: Uint8Array | undefined }> {
  const partes = (await readMultipartFormData(event).catch(() => undefined)) ?? []
  const campos: Record<string, string> = {}
  let arquivo: Uint8Array | undefined
  for (const parte of partes) {
    if (!parte.name) continue
    if (parte.name === 'imagem' && parte.filename !== undefined) arquivo = parte.data
    else campos[parte.name] = parte.data.toString('utf8')
  }
  return { campos, arquivo }
}

/** Imagem guardada no banco, com cabeçalhos que impedem o navegador de tratá-la como página. */
export function responderImagem(event: H3Event, imagem: { mime: string, dados: { buffer: Uint8Array } }, cache: string) {
  setResponseHeaders(event, {
    'Content-Type': imagem.mime,
    'Cache-Control': cache,
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': 'default-src \'none\'; style-src \'unsafe-inline\'; sandbox',
  })
  return imagem.dados.buffer
}
