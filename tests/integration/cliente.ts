import { randomInt, randomUUID } from 'node:crypto'
import { inject } from 'vitest'
import { ADMIN_TESTE } from '../../scripts/servidor-teste'
import type { CatalogoDTO, ProdutoDTO } from '../../shared/tipos'

// Um "navegador" para os testes: guarda os cookies da sessão e manda o Origin do site (o Better Auth exige).
// Cada cliente finge um IP próprio (o servidor de teste confia no X-Forwarded-For), já que os limites são por IP.
export class Cliente {
  readonly base = inject('base')
  readonly ip = `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`
  private cookies = new Map<string, string>()

  async req<T = any>(method: string, caminho: string, corpo?: unknown): Promise<{ status: number, dados: T, headers: Headers }> {
    const headers: Record<string, string> = { 'origin': this.base, 'x-forwarded-for': this.ip }
    if (this.cookies.size) headers.cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ')
    let body: BodyInit | undefined
    if (corpo instanceof FormData) body = corpo
    else if (corpo !== undefined) {
      body = JSON.stringify(corpo)
      headers['content-type'] = 'application/json'
    }
    const r = await fetch(this.base + caminho, { method, headers, body, redirect: 'manual' })
    for (const cookie of r.headers.getSetCookie()) {
      const [par = ''] = cookie.split(';')
      const i = par.indexOf('=')
      const nome = par.slice(0, i)
      const valor = par.slice(i + 1)
      if (!valor || /max-age=0/i.test(cookie)) this.cookies.delete(nome)
      else this.cookies.set(nome, valor)
    }
    const texto = await r.text()
    let dados: any = texto
    try {
      dados = texto ? JSON.parse(texto) : null
    } catch {}
    return { status: r.status, dados, headers: r.headers }
  }

  get = <T = any>(caminho: string) => this.req<T>('GET', caminho)
  post = <T = any>(caminho: string, corpo?: unknown) => this.req<T>('POST', caminho, corpo)
  put = <T = any>(caminho: string, corpo?: unknown) => this.req<T>('PUT', caminho, corpo)
  patch = <T = any>(caminho: string, corpo?: unknown) => this.req<T>('PATCH', caminho, corpo)
  delete = <T = any>(caminho: string) => this.req<T>('DELETE', caminho)

  /** Cria uma conta nova (e já entra nela). */
  async cadastrar(extra: Record<string, unknown> = {}) {
    const email = (extra.email as string) ?? `cliente-${randomUUID().slice(0, 8)}@teste.dev`
    const r = await this.post('/api/auth/sign-up/email', { name: 'Cliente Teste', email, password: 'senha-forte-123', ...extra })
    if (r.status !== 200) throw new Error(`cadastro falhou (${r.status}): ${JSON.stringify(r.dados)}`)
    return { email, ...r }
  }
}

export async function cliente(): Promise<Cliente> {
  const c = new Cliente()
  await c.cadastrar()
  return c
}

let adminPronto: Promise<Cliente> | undefined

/** Administrador (o e-mail de NUXT_ADMIN_EMAILS do servidor de teste). A conta é criada uma vez por arquivo. */
export function admin(): Promise<Cliente> {
  adminPronto ??= (async () => {
    const c = new Cliente()
    const entrou = await c.post('/api/auth/sign-in/email', { email: ADMIN_TESTE, password: 'senha-forte-123' })
    if (entrou.status !== 200) await c.cadastrar({ email: ADMIN_TESTE })
    return c
  })()
  return adminPronto
}

export async function produtoDisponivel(estoqueMinimo = 1): Promise<ProdutoDTO> {
  const { dados } = await new Cliente().get<CatalogoDTO>('/api/catalogo')
  const produto = dados.produtos.find(p => p.disponivel && p.estoque >= estoqueMinimo)
  if (!produto) throw new Error('nenhum produto com estoque suficiente')
  return produto
}

export const ENDERECO = { cep: '01310-100', logradouro: 'Avenida Paulista', numero: '1000', complemento: 'Apto 12', bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP' }
export const ENTREGA = { endereco: ENDERECO, telefone: '(11) 91234-5678' }

/** Produto novo só para o teste (estoque e preço sob controle), cadastrado pelo administrador. */
export async function novoProduto(campos: { estoque?: number, precoCentavos?: number, nome?: string } = {}): Promise<ProdutoDTO> {
  const form = new FormData()
  form.append('nome', campos.nome ?? `Teste ${randomUUID().slice(0, 6)}`)
  form.append('descricao', 'Cupcake criado pelo teste automatizado.')
  form.append('categoriaId', 'classicos')
  form.append('precoCentavos', String(campos.precoCentavos ?? 1000))
  form.append('estoque', String(campos.estoque ?? 10))
  const r = await (await admin()).post<ProdutoDTO>('/api/admin/produtos', form)
  if (r.status !== 201) throw new Error(`não criou o produto (${r.status}): ${JSON.stringify(r.dados)}`)
  return r.dados
}
