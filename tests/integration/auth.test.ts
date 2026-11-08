import { describe, expect, it } from 'vitest'
import { Cliente, ENDERECO } from './cliente'

// CUPC-6 (cadastro) e CUPC-7 (login), pela API do Better Auth.
describe('cadastro', () => {
  it('cria a conta com telefone e endereço, entra direto e o perfil é cliente', async () => {
    const c = new Cliente()
    const { email } = await c.cadastrar({ telefone: '(11) 91234-5678', endereco: JSON.stringify(ENDERECO) })
    const { status, dados } = await c.get('/api/eu')
    expect(status).toBe(200)
    expect(dados).toMatchObject({ email, nome: 'Cliente Teste', telefone: '(11) 91234-5678', endereco: ENDERECO, perfil: 'cliente' })
  })

  it('recusa e-mail repetido', async () => {
    const primeiro = new Cliente()
    const { email } = await primeiro.cadastrar()
    const r = await new Cliente().post('/api/auth/sign-up/email', { name: 'Outra', email, password: 'senha-forte-123' })
    expect(r.status).toBe(422)
    expect(r.dados.code).toMatch(/USER_ALREADY_EXISTS/)
  })

  it('recusa senha curta, e-mail inválido e telefone fora do formato', async () => {
    const c = new Cliente()
    expect((await c.post('/api/auth/sign-up/email', { name: 'Ana', email: 'ana@teste.dev', password: '123' })).status).toBe(400)
    expect((await c.post('/api/auth/sign-up/email', { name: 'Ana', email: 'nao-e-email', password: 'senha-forte-123' })).status).toBe(400)
    const tel = await c.post('/api/auth/sign-up/email', { name: 'Ana', email: 'ana2@teste.dev', password: 'senha-forte-123', telefone: '123' })
    expect(tel.status).toBe(400)
    expect(tel.dados.message).toMatch(/Telefone/)
    const end = await c.post('/api/auth/sign-up/email', { name: 'Ana', email: 'ana3@teste.dev', password: 'senha-forte-123', endereco: JSON.stringify({ ...ENDERECO, cep: '1' }) })
    expect(end.status).toBe(400)
    expect(end.dados.message).toMatch(/Endereço incompleto/)
  })

  it('não deixa ninguém se promover a administrador pelo cadastro', async () => {
    const c = new Cliente()
    await c.cadastrar({ role: 'admin' }).catch(() => {})
    const eu = await c.get('/api/eu')
    if (eu.dados) expect(eu.dados.perfil).toBe('cliente')
  })
})

describe('login', () => {
  it('entra com a senha certa e sai', async () => {
    const c = new Cliente()
    const { email } = await c.cadastrar()
    await c.post('/api/auth/sign-out', {})
    expect((await c.get('/api/eu')).dados).toBeNull()
    const r = await c.post('/api/auth/sign-in/email', { email, password: 'senha-forte-123' })
    expect(r.status).toBe(200)
    expect((await c.get('/api/eu')).dados.email).toBe(email)
  })

  it('senha errada é recusada sem dizer se o e-mail existe', async () => {
    const c = new Cliente()
    const { email } = await c.cadastrar()
    const errada = await new Cliente().post('/api/auth/sign-in/email', { email, password: 'errada-123' })
    const inexistente = await new Cliente().post('/api/auth/sign-in/email', { email: 'ninguem@teste.dev', password: 'errada-123' })
    expect(errada.status).toBe(401)
    expect(inexistente.status).toBe(401)
    expect(errada.dados.code).toBe(inexistente.dados.code)
  })

  it('bloqueia tentativas repetidas do mesmo IP (CT-4)', async () => {
    const c = new Cliente()
    const status: number[] = []
    for (let i = 0; i < 7; i++) status.push((await c.post('/api/auth/sign-in/email', { email: 'alvo@teste.dev', password: `tentativa-${i}` })).status)
    expect(status.slice(0, 5).every(s => s === 401)).toBe(true)
    expect(status.at(-1)).toBe(429)
  })

  it('o pedido de senha nova responde igual com ou sem conta (CA-3)', async () => {
    const c = new Cliente()
    const { email } = await c.cadastrar()
    const comConta = await new Cliente().post('/api/auth/request-password-reset', { email, redirectTo: '/redefinir-senha' })
    const semConta = await new Cliente().post('/api/auth/request-password-reset', { email: 'ninguem@teste.dev', redirectTo: '/redefinir-senha' })
    expect(comConta.status).toBe(200)
    expect(semConta.status).toBe(200)
    expect(comConta.dados).toEqual(semConta.dados)
  })
})

describe('rotas protegidas', () => {
  it('pedem login', async () => {
    const anonimo = new Cliente()
    for (const caminho of ['/api/carrinho', '/api/pedidos']) expect((await anonimo.get(caminho)).status).toBe(401)
  })
})
