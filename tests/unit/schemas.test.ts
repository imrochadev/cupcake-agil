import { describe, expect, it } from 'vitest'
import { checkoutSchema, feedbackSchema, produtoSchema, telefoneSchema } from '#shared/schemas'

describe('telefone', () => {
  it.each(['(11) 91234-5678', '11912345678', '(21) 3456-7890'])('aceita %s', t => expect(telefoneSchema.safeParse(t).success).toBe(true))
  it.each(['1234', '(11) 9123-45', 'abc'])('recusa %s', t => expect(telefoneSchema.safeParse(t).success).toBe(false))
})

describe('checkout', () => {
  const endereco = { cep: '01310-100', logradouro: 'Avenida Paulista', numero: '1000', bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP' }
  const base = { endereco, telefone: '(11) 91234-5678' }

  it('aceita PIX sem dados extras e põe observação vazia', () => {
    expect(checkoutSchema.parse({ ...base, pagamento: { forma: 'pix' } }).observacao).toBe('')
  })
  it('recusa forma de pagamento desconhecida', () => {
    expect(checkoutSchema.safeParse({ ...base, pagamento: { forma: 'boleto' } }).success).toBe(false)
  })
  it('recusa endereço sem CEP válido, apontando o campo, com mensagem em português', () => {
    const r = checkoutSchema.safeParse({ ...base, endereco: { ...endereco, cep: '123' }, pagamento: { forma: 'pix' } })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.path).toEqual(['endereco', 'cep'])
    expect(r.error?.issues[0]?.message).toMatch(/CEP/)
  })
})

describe('produto (vindo de formulário)', () => {
  it('converte os textos do multipart', () => {
    expect(produtoSchema.parse({ nome: 'Cupcake Novo', descricao: 'Uma descrição gostosa', categoriaId: 'classicos', precoCentavos: '1290', estoque: '5', ativo: 'false' }))
      .toMatchObject({ precoCentavos: 1290, estoque: 5, ativo: false })
  })
  it('recusa preço quebrado ou estoque negativo', () => {
    const base = { nome: 'Cupcake Novo', descricao: 'Uma descrição gostosa', categoriaId: 'classicos' }
    expect(produtoSchema.safeParse({ ...base, precoCentavos: '12.5', estoque: '1' }).success).toBe(false)
    expect(produtoSchema.safeParse({ ...base, precoCentavos: '1250', estoque: '-1' }).success).toBe(false)
  })
})

describe('feedback', () => {
  const base = { nome: 'Ana', dataTeste: '2026-11-07' }

  it('pede pelo menos um dos campos de texto', () => {
    expect(feedbackSchema.safeParse(base).success).toBe(false)
    expect(feedbackSchema.safeParse({ ...base, sugestoes: 'Mais sabores!' }).success).toBe(true)
  })
  it('nota vazia vira null; fora de 1 a 5 é recusada', () => {
    expect(feedbackSchema.parse({ ...base, funcionou: 'tudo', nota: '' }).nota).toBeNull()
    expect(feedbackSchema.parse({ ...base, funcionou: 'tudo', nota: '4' }).nota).toBe(4)
    expect(feedbackSchema.safeParse({ ...base, funcionou: 'tudo', nota: '9' }).success).toBe(false)
  })
})
