import { z } from 'zod'
import { QUANTIDADE_MAXIMA } from './carrinho'
import { ETAPAS } from './rastreamento'
import { enderecoSchema } from './endereco'

// Validação das entradas da API (o servidor confere sempre; as telas usam as mesmas regras para avisar antes).

const texto = (min: number, max: number, campo: string) =>
  z.string().trim().min(min, `${campo}: mínimo de ${min} caracteres.`).max(max, `${campo}: máximo de ${max} caracteres.`)

export const telefoneSchema = z.string().trim().regex(/^\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/, 'Telefone: use DDD + número, ex.: (11) 91234-5678.')

export const itemCarrinhoSchema = z.object({
  produtoId: z.string().regex(/^[a-f\d]{24}$/i, 'Produto inválido.'),
  quantidade: z.number().int().min(1, 'Quantidade mínima: 1.').max(QUANTIDADE_MAXIMA, `Quantidade máxima: ${QUANTIDADE_MAXIMA}.`),
})

export const quantidadeSchema = z.object({
  quantidade: z.number().int().min(0).max(QUANTIDADE_MAXIMA, `Quantidade máxima: ${QUANTIDADE_MAXIMA}.`),
})

export const checkoutSchema = z.object({
  endereco: enderecoSchema,
  telefone: telefoneSchema,
  observacao: z.string().trim().max(300, 'Observação: máximo de 300 caracteres.').optional().default(''),
  /** Guarda este endereço e o telefone como padrão da conta (sugestão dos testadores). */
  salvarEndereco: z.boolean().optional().default(false),
  pagamento: z.discriminatedUnion('forma', [
    z.object({ forma: z.literal('pix') }),
    z.object({
      forma: z.literal('cartao'),
      cartao: z.object({
        numero: z.string().max(30),
        nome: z.string().max(80),
        validade: z.string().max(7),
        cvv: z.string().max(4),
      }),
    }),
    z.object({ forma: z.literal('dinheiro'), trocoParaCentavos: z.number().int().positive().max(100_000_00).nullable().optional() }),
  ], { error: 'Escolha uma forma de pagamento.' }),
})
export type CheckoutEntrada = z.infer<typeof checkoutSchema>

export const produtoSchema = z.object({
  nome: texto(3, 60, 'Nome'),
  descricao: texto(10, 300, 'Descrição'),
  categoriaId: z.string().trim().min(1, 'Escolha uma categoria.'),
  precoCentavos: z.coerce.number().int('Preço inválido.').min(100, 'Preço mínimo: R$ 1,00.').max(100_000, 'Preço máximo: R$ 1.000,00.'),
  estoque: z.coerce.number().int('Estoque inválido.').min(0, 'O estoque não pode ser negativo.').max(9999),
  ativo: z.union([z.boolean(), z.enum(['true', 'false']).transform(v => v === 'true')]).default(true),
})
export type ProdutoEntrada = z.infer<typeof produtoSchema>

export const statusSchema = z.object({
  status: z.enum([...ETAPAS, 'cancelado'], { error: 'Status inválido.' }),
})

// Formulário de feedback dos testadores (PIT II, Situação 3): os campos mínimos pedidos no "Problema em Foco".
export const feedbackSchema = z.object({
  nome: texto(2, 80, 'Nome'),
  dataTeste: z.iso.date('Data do teste inválida.'),
  funcionou: z.string().trim().max(2000).default(''),
  naoFuncionou: z.string().trim().max(2000).default(''),
  naoTestado: z.string().trim().max(2000).default(''),
  sugestoes: z.string().trim().max(2000).default(''),
  // Vem de formulário (texto): vazio é "sem nota".
  nota: z.preprocess(v => (v === '' || v == null ? null : Number(v)), z.number().int().min(1).max(5).nullable()).default(null),
  pagina: z.string().max(200).default(''),
}).refine(f => f.funcionou || f.naoFuncionou || f.naoTestado || f.sugestoes, {
  message: 'Conte pelo menos o que funcionou, o que não funcionou, o que não testou ou uma sugestão.',
  path: ['funcionou'],
})
export type FeedbackEntrada = z.infer<typeof feedbackSchema>
