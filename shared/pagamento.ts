// Pagamento simulado (CUPC-10): nada é cobrado. PIX e cartão são aprovados na hora, com uma exceção de propósito: o
// cartão de teste CARTAO_RECUSADO é sempre recusado, para mostrar o tratamento de falha. Dinheiro fica para a entrega.
// Do cartão só se guardam a bandeira e os 4 últimos dígitos (CT-5): número completo e CVV nunca saem desta função.

export type FormaPagamento = 'pix' | 'cartao' | 'dinheiro'
export type StatusPagamento = 'aprovado' | 'na_entrega' | 'recusado'

export const FORMAS: Record<FormaPagamento, string> = {
  pix: 'PIX',
  cartao: 'Cartão de crédito',
  dinheiro: 'Dinheiro na entrega',
}

/** Cartões de teste (passam no dígito verificador). */
export const CARTAO_APROVADO = '4242424242424242'
export const CARTAO_RECUSADO = '4000000000000002'

export interface DadosCartao {
  numero: string
  nome: string
  /** MM/AA */
  validade: string
  cvv: string
}

export type EntradaPagamento
  = | { forma: 'pix' }
    | { forma: 'cartao', cartao: DadosCartao }
    | { forma: 'dinheiro', trocoParaCentavos?: number | null }

export interface ResumoPagamento {
  forma: FormaPagamento
  status: StatusPagamento
  codigo: string
  valorCentavos: number
  cartaoFinal?: string
  bandeira?: string
  trocoParaCentavos?: number
  pixCopiaECola?: string
}

export type ResultadoPagamento = { ok: true, pagamento: ResumoPagamento } | { ok: false, erro: string, campo?: string }

export function soDigitos(texto: string): string {
  return texto.replace(/\D/g, '')
}

/** Dígito verificador (Luhn), o mesmo que as operadoras conferem antes de qualquer cobrança. */
export function luhnValido(numero: string): boolean {
  const digitos = soDigitos(numero)
  if (digitos.length < 13 || digitos.length > 19) return false
  let soma = 0
  for (let i = 0; i < digitos.length; i++) {
    let d = Number(digitos[digitos.length - 1 - i])
    if (i % 2 === 1) {
      d *= 2
      if (d > 9) d -= 9
    }
    soma += d
  }
  return soma % 10 === 0
}

export function bandeira(numero: string): string {
  const n = soDigitos(numero)
  if (/^4/.test(n)) return 'Visa'
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'Mastercard'
  if (/^3[47]/.test(n)) return 'American Express'
  if (/^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(n)) return 'Elo'
  return 'Cartão'
}

/** Validade MM/AA ainda não vencida (o cartão vale até o último dia do mês). */
export function validadeOk(validade: string, hoje: Date): boolean {
  const m = validade.trim().match(/^(\d{2})\s*\/\s*(\d{2})$/)
  if (!m) return false
  const mes = Number(m[1])
  const ano = 2000 + Number(m[2])
  if (mes < 1 || mes > 12) return false
  return ano > hoje.getFullYear() || (ano === hoje.getFullYear() && mes >= hoje.getMonth() + 1)
}

/** "Copia e cola" de mentira, só para a tela de confirmação parecer real. */
export function pixCopiaECola(codigo: string, valorCentavos: number): string {
  const valor = (valorCentavos / 100).toFixed(2)
  return `00020126580014BR.GOV.BCB.PIX0136cupcake-agil-simulado5204000053039865406${valor}5802BR5912CUPCAKE AGIL6009SAO PAULO62${String(codigo.length + 4).padStart(2, '0')}05${codigo}6304SIMU`
}

export function processarPagamento(entrada: EntradaPagamento, valorCentavos: number, codigo: string, hoje = new Date()): ResultadoPagamento {
  if (entrada.forma === 'pix') {
    return { ok: true, pagamento: { forma: 'pix', status: 'aprovado', codigo, valorCentavos, pixCopiaECola: pixCopiaECola(codigo, valorCentavos) } }
  }

  if (entrada.forma === 'dinheiro') {
    const troco = entrada.trocoParaCentavos ?? null
    if (troco !== null && troco < valorCentavos) {
      return { ok: false, erro: 'O valor para troco precisa ser maior ou igual ao total do pedido.', campo: 'trocoPara' }
    }
    return { ok: true, pagamento: { forma: 'dinheiro', status: 'na_entrega', codigo, valorCentavos, ...(troco !== null ? { trocoParaCentavos: troco } : {}) } }
  }

  const { numero, nome, validade, cvv } = entrada.cartao
  const digitos = soDigitos(numero)
  if (!luhnValido(digitos)) return { ok: false, erro: 'Número do cartão inválido. Confira os dígitos.', campo: 'numero' }
  if (nome.trim().length < 3) return { ok: false, erro: 'Informe o nome como está impresso no cartão.', campo: 'nome' }
  if (!validadeOk(validade, hoje)) return { ok: false, erro: 'Validade inválida ou cartão vencido (use MM/AA).', campo: 'validade' }
  if (!/^\d{3,4}$/.test(cvv.trim())) return { ok: false, erro: 'CVV inválido: são 3 ou 4 dígitos no verso do cartão.', campo: 'cvv' }
  if (digitos === CARTAO_RECUSADO) {
    return { ok: false, erro: 'Pagamento recusado pela operadora (saldo insuficiente). Tente outro cartão ou outra forma de pagamento.' }
  }
  return {
    ok: true,
    pagamento: { forma: 'cartao', status: 'aprovado', codigo, valorCentavos, cartaoFinal: digitos.slice(-4), bandeira: bandeira(digitos) },
  }
}
