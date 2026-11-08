import { describe, expect, it } from 'vitest'
import type { FeedbackDTO } from '../../shared/tipos'
import { admin, Cliente } from './cliente'

// Formulário dos testadores (PIT II, Situação 3): sem conta, com captura de tela, lido só no painel.
const PNG_1PX = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg=='), c => c.charCodeAt(0))

function formulario(campos: Record<string, string>, imagem?: Uint8Array) {
  const f = new FormData()
  for (const [k, v] of Object.entries(campos)) f.append(k, v)
  if (imagem) f.append('imagem', new Blob([imagem], { type: 'image/png' }), 'tela.png')
  return f
}

describe('feedback', () => {
  it('visitante envia com captura de tela e o administrador lê tudo', async () => {
    const nome = `Testador ${Date.now()}`
    const r = await new Cliente().post('/api/feedbacks', formulario({
      nome,
      dataTeste: '2026-11-07',
      funcionou: 'Cadastro e PIX.',
      naoFuncionou: 'O botão de voltar do checkout.',
      naoTestado: 'Login com Google: não apareceu o botão.',
      sugestoes: 'Mais sabores veganos.',
      nota: '4',
      pagina: '/checkout',
    }, PNG_1PX))
    expect(r.status).toBe(201)

    const a = await admin()
    const lista = (await a.get<FeedbackDTO[]>('/api/admin/feedbacks')).dados
    const meu = lista.find(f => f.nome === nome)
    expect(meu).toMatchObject({ dataTeste: '2026-11-07', nota: 4, naoTestado: 'Login com Google: não apareceu o botão.', temImagem: true, pagina: '/checkout' })

    const foto = await fetch(`${a.base}/api/admin/feedbacks/${meu!.id}/imagem`, { headers: { cookie: '' } })
    expect(foto.status).toBe(401)
    const comAdmin = await a.get(`/api/admin/feedbacks/${meu!.id}/imagem`)
    expect(comAdmin.status).toBe(200)
    expect(comAdmin.headers.get('content-type')).toBe('image/png')
    // A captura não sai pela rota pública das fotos de produto.
  })

  it('pede nome, data e pelo menos um campo de texto', async () => {
    const c = new Cliente()
    expect((await c.post('/api/feedbacks', formulario({ nome: 'Ana', dataTeste: '2026-11-07' }))).status).toBe(400)
    expect((await c.post('/api/feedbacks', formulario({ dataTeste: '2026-11-07', funcionou: 'tudo' }))).status).toBe(400)
    expect((await c.post('/api/feedbacks', formulario({ nome: 'Ana', dataTeste: 'ontem', funcionou: 'tudo' }))).status).toBe(400)
  })

  it('recusa arquivo que não é imagem', async () => {
    const r = await new Cliente().post('/api/feedbacks', formulario({ nome: 'Ana', dataTeste: '2026-11-07', funcionou: 'tudo' }, new TextEncoder().encode('não sou imagem')))
    expect(r.status).toBe(415)
  })

  it('limita o envio a 10 por hora por IP', async () => {
    const c = new Cliente()
    const status: number[] = []
    for (let i = 0; i < 11; i++) status.push((await c.post('/api/feedbacks', formulario({ nome: 'Spam', dataTeste: '2026-11-07', funcionou: `msg ${i}` }))).status)
    expect(status.filter(s => s === 201)).toHaveLength(10)
    expect(status.at(-1)).toBe(429)
  })
})
