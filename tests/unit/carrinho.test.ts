import { describe, expect, it } from 'vitest'
import { calcularTotais, FRETE_GRATIS_A_PARTIR, QUANTIDADE_MAXIMA, quantidadePermitida, TAXA_ENTREGA } from '#shared/carrinho'
import { reais } from '#shared/dinheiro'

describe('calcularTotais', () => {
  it('soma em centavos, sem erro de ponto flutuante', () => {
    const t = calcularTotais([{ precoCentavos: 1190, quantidade: 3 }, { precoCentavos: 990, quantidade: 1 }])
    expect(t).toMatchObject({ quantidade: 4, subtotal: 4560, taxaEntrega: TAXA_ENTREGA, total: 4560 + TAXA_ENTREGA })
    expect(t.faltaFreteGratis).toBe(FRETE_GRATIS_A_PARTIR - 4560)
  })

  it('entrega grátis a partir do valor mínimo', () => {
    const t = calcularTotais([{ precoCentavos: FRETE_GRATIS_A_PARTIR, quantidade: 1 }])
    expect(t.taxaEntrega).toBe(0)
    expect(t.total).toBe(FRETE_GRATIS_A_PARTIR)
    expect(t.faltaFreteGratis).toBe(0)
  })

  it('carrinho vazio não cobra entrega', () => {
    expect(calcularTotais([])).toEqual({ quantidade: 0, subtotal: 0, taxaEntrega: 0, total: 0, faltaFreteGratis: 0 })
  })
})

describe('quantidadePermitida', () => {
  it('limita pelo estoque e pelo máximo por item', () => {
    expect(quantidadePermitida(5, 3)).toBe(3)
    expect(quantidadePermitida(50, 100)).toBe(QUANTIDADE_MAXIMA)
    expect(quantidadePermitida(2, 0)).toBe(0)
    expect(quantidadePermitida(2.7, 10)).toBe(2)
  })
})

describe('reais', () => {
  it('formata centavos em reais', () => {
    expect(reais(1290)).toBe('R$ 12,90')
    expect(reais(123456)).toBe('R$ 1.234,56')
  })
})
