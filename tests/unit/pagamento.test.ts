import { describe, expect, it } from 'vitest'
import { bandeira, CARTAO_APROVADO, CARTAO_RECUSADO, luhnValido, processarPagamento, validadeOk } from '#shared/pagamento'

const HOJE = new Date(2026, 10, 7)
const cartao = (numero: string, extra: Partial<{ nome: string, validade: string, cvv: string }> = {}) => ({
  forma: 'cartao' as const,
  cartao: { numero, nome: 'Maria Teste', validade: '12/29', cvv: '123', ...extra },
})

describe('luhnValido', () => {
  it('aceita números com dígito verificador certo, com ou sem espaços', () => {
    expect(luhnValido(CARTAO_APROVADO)).toBe(true)
    expect(luhnValido('4242 4242 4242 4242')).toBe(true)
    expect(luhnValido('5555555555554444')).toBe(true)
  })
  it('recusa dígito errado e tamanhos impossíveis', () => {
    expect(luhnValido('4242424242424241')).toBe(false)
    expect(luhnValido('4242')).toBe(false)
    expect(luhnValido('42424242424242424242')).toBe(false)
  })
})

describe('bandeira', () => {
  it('identifica pelas primeiras casas', () => {
    expect(bandeira('4242424242424242')).toBe('Visa')
    expect(bandeira('5555555555554444')).toBe('Mastercard')
    expect(bandeira('378282246310005')).toBe('American Express')
    expect(bandeira('9999')).toBe('Cartão')
  })
})

describe('validadeOk', () => {
  it('vale até o fim do mês da validade', () => {
    expect(validadeOk('11/26', HOJE)).toBe(true)
    expect(validadeOk('10/26', HOJE)).toBe(false)
    expect(validadeOk('01/27', HOJE)).toBe(true)
  })
  it('recusa formato ou mês inválido', () => {
    expect(validadeOk('13/27', HOJE)).toBe(false)
    expect(validadeOk('1227', HOJE)).toBe(false)
  })
})

describe('processarPagamento', () => {
  it('PIX é aprovado e traz o copia e cola com o valor', () => {
    const r = processarPagamento({ forma: 'pix' }, 2580, 'ABC123', HOJE)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.pagamento.status).toBe('aprovado')
      expect(r.pagamento.pixCopiaECola).toContain('25.80')
    }
  })

  it('cartão aprovado guarda só a bandeira e os 4 últimos dígitos', () => {
    const r = processarPagamento(cartao('4242 4242 4242 4242'), 1000, 'X', HOJE)
    expect(r).toEqual({ ok: true, pagamento: { forma: 'cartao', status: 'aprovado', codigo: 'X', valorCentavos: 1000, cartaoFinal: '4242', bandeira: 'Visa' } })
    expect(JSON.stringify(r)).not.toContain('123')
  })

  it('o cartão de teste de recusa é recusado com mensagem clara', () => {
    const r = processarPagamento(cartao(CARTAO_RECUSADO), 1000, 'X', HOJE)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.erro).toMatch(/recusado/i)
  })

  it.each([
    ['numero', cartao('4242424242424241')],
    ['nome', cartao(CARTAO_APROVADO, { nome: 'A' })],
    ['validade', cartao(CARTAO_APROVADO, { validade: '01/20' })],
    ['cvv', cartao(CARTAO_APROVADO, { cvv: '12' })],
  ])('cartão com %s inválido aponta o campo', (campo, entrada) => {
    const r = processarPagamento(entrada, 1000, 'X', HOJE)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.campo).toBe(campo)
  })

  it('dinheiro fica para a entrega e confere o troco', () => {
    expect(processarPagamento({ forma: 'dinheiro', trocoParaCentavos: 5000 }, 2580, 'X', HOJE)).toMatchObject({ ok: true, pagamento: { status: 'na_entrega', trocoParaCentavos: 5000 } })
    expect(processarPagamento({ forma: 'dinheiro' }, 2580, 'X', HOJE)).toMatchObject({ ok: true, pagamento: { status: 'na_entrega' } })
    expect(processarPagamento({ forma: 'dinheiro', trocoParaCentavos: 2000 }, 2580, 'X', HOJE)).toMatchObject({ ok: false, campo: 'trocoPara' })
  })
})
