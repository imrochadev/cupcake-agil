// Regras do carrinho (CUPC-9): total, taxa de entrega e limites de quantidade.

export const TAXA_ENTREGA = 700
/** Pedido a partir deste subtotal não paga entrega. */
export const FRETE_GRATIS_A_PARTIR = 8000
/** Unidades de um mesmo cupcake por pedido. */
export const QUANTIDADE_MAXIMA = 20

export interface LinhaValor {
  precoCentavos: number
  quantidade: number
}

export interface Totais {
  quantidade: number
  subtotal: number
  taxaEntrega: number
  total: number
  /** Quanto falta para a entrega grátis (0 quando já é grátis ou o carrinho está vazio). */
  faltaFreteGratis: number
}

export function calcularTotais(linhas: LinhaValor[]): Totais {
  const quantidade = linhas.reduce((soma, l) => soma + l.quantidade, 0)
  const subtotal = linhas.reduce((soma, l) => soma + l.precoCentavos * l.quantidade, 0)
  const gratis = subtotal >= FRETE_GRATIS_A_PARTIR
  const taxaEntrega = quantidade === 0 || gratis ? 0 : TAXA_ENTREGA
  return {
    quantidade,
    subtotal,
    taxaEntrega,
    total: subtotal + taxaEntrega,
    faltaFreteGratis: quantidade === 0 || gratis ? 0 : FRETE_GRATIS_A_PARTIR - subtotal,
  }
}

/**
 * Quantidade que cabe no carrinho: nunca acima do estoque nem do limite por item.
 * Retorna 0 quando o produto não está disponível.
 */
export function quantidadePermitida(pedida: number, estoque: number): number {
  return Math.max(0, Math.min(Math.floor(pedida), estoque, QUANTIDADE_MAXIMA))
}
