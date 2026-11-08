import { MongoClient, type Binary, type Db, type ObjectId } from 'mongodb'
import type { Endereco } from '#shared/endereco'
import type { ResumoPagamento } from '#shared/pagamento'
import type { EventoPedido, StatusPedido } from '#shared/rastreamento'

// Model: conexão com o MongoDB, formato de cada coleção e o projeto físico (validação $jsonSchema e índices).
// As coleções do Better Auth (user, session, account, verification) são criadas e mantidas por ele.

export interface CategoriaDoc {
  /** Slug, ex.: "classicos". */
  _id: string
  nome: string
  ordem: number
}

export interface ProdutoDoc {
  _id: ObjectId
  nome: string
  descricao: string
  categoriaId: string
  precoCentavos: number
  estoque: number
  ativo: boolean
  imagemId: ObjectId | null
  criadoEm: Date
  atualizadoEm: Date
  /** Excluído pelo painel: some do cardápio, mas continua nos pedidos antigos. */
  excluidoEm: Date | null
}

export interface ImagemDoc {
  _id: ObjectId
  mime: string
  dados: Binary
  /** Foto de produto (pública) ou captura de tela de um feedback (só administradores). */
  uso: 'produto' | 'feedback'
  criadoEm: Date
}

export interface CarrinhoDoc {
  /** Id do usuário: um carrinho por conta. */
  _id: string
  itens: { produtoId: ObjectId, quantidade: number }[]
  atualizadoEm: Date
}

export interface PedidoDoc {
  _id: ObjectId
  userId: string
  status: StatusPedido
  /** Cópia do produto no momento da compra: o preço e o nome do pedido não mudam se o cardápio mudar. */
  itens: { produtoId: ObjectId, nome: string, precoCentavos: number, quantidade: number }[]
  subtotal: number
  taxaEntrega: number
  total: number
  endereco: string
  /** Os campos do endereço, para o cliente reaproveitar num próximo pedido (pedidos antigos não têm). */
  enderecoDados?: Endereco
  telefone: string
  observacao: string
  pagamento: ResumoPagamento
  eventos: EventoPedido[]
  previsaoEntrega: Date
  /** A entrega anda sozinha até o administrador mexer no pedido. */
  simulado: boolean
  criadoEm: Date
}

/** Toda tentativa de pagamento, aprovada ou não (CUPC-10, CT-3). */
export interface TransacaoDoc {
  _id: ObjectId
  userId: string
  pedidoId: ObjectId | null
  forma: ResumoPagamento['forma']
  status: 'aprovado' | 'na_entrega' | 'recusado'
  valorCentavos: number
  codigo: string
  cartaoFinal: string | null
  motivo: string | null
  criadoEm: Date
}

export interface FeedbackDoc {
  _id: ObjectId
  nome: string
  dataTeste: string
  funcionou: string
  naoFuncionou: string
  naoTestado: string
  sugestoes: string
  nota: number | null
  pagina: string
  navegador: string
  imagemId: ObjectId | null
  userId: string | null
  criadoEm: Date
}

const g = globalThis as { __cupcakeMongo?: MongoClient, __cupcakePronto?: Promise<MongoClient> }

export function getMongo(): MongoClient {
  if (!g.__cupcakeMongo) {
    const url = process.env.DATABASE_URL || useRuntimeConfig().databaseUrl
    if (!url) throw new Error('DATABASE_URL não definida')
    g.__cupcakeMongo = new MongoClient(url, { maxPoolSize: 10, serverSelectionTimeoutMS: 5000 })
  }
  return g.__cupcakeMongo
}

/** Conecta uma vez; se falhar, a próxima requisição tenta de novo. */
export function conectar(): Promise<MongoClient> {
  g.__cupcakePronto ??= getMongo().connect().catch((erro) => {
    g.__cupcakePronto = undefined
    throw erro
  })
  return g.__cupcakePronto
}

export function getDb(): Db {
  return getMongo().db()
}

export function colecoes() {
  const db = getDb()
  return {
    categorias: db.collection<CategoriaDoc>('categorias'),
    produtos: db.collection<ProdutoDoc>('produtos'),
    imagens: db.collection<ImagemDoc>('imagens'),
    carrinhos: db.collection<CarrinhoDoc>('carrinhos'),
    pedidos: db.collection<PedidoDoc>('pedidos'),
    transacoes: db.collection<TransacaoDoc>('transacoes'),
    feedbacks: db.collection<FeedbackDoc>('feedbacks'),
    usuarios: db.collection<{ _id: ObjectId, name: string, email: string, role?: string }>('user'),
  }
}

// Projeto físico: regras que o próprio MongoDB confere em toda gravação (além da validação da API), documentadas em
// docs/situacao-1/situacao-1.pdf (Banco de dados).
const int = { bsonType: ['int', 'long'] }
const str = (maxLength: number) => ({ bsonType: 'string', maxLength })
const data = { bsonType: 'date' }

export const VALIDADORES: Record<string, object> = {
  categorias: {
    bsonType: 'object',
    required: ['_id', 'nome', 'ordem'],
    properties: { _id: str(40), nome: str(40), ordem: int },
  },
  produtos: {
    bsonType: 'object',
    required: ['nome', 'descricao', 'categoriaId', 'precoCentavos', 'estoque', 'ativo', 'criadoEm'],
    properties: {
      nome: str(60),
      descricao: str(300),
      categoriaId: str(40),
      precoCentavos: { ...int, minimum: 1 },
      estoque: { ...int, minimum: 0 },
      ativo: { bsonType: 'bool' },
      imagemId: { bsonType: ['objectId', 'null'] },
      criadoEm: data,
      excluidoEm: { bsonType: ['date', 'null'] },
    },
  },
  carrinhos: {
    bsonType: 'object',
    required: ['itens', 'atualizadoEm'],
    properties: {
      itens: {
        bsonType: 'array',
        items: { bsonType: 'object', required: ['produtoId', 'quantidade'], properties: { produtoId: { bsonType: 'objectId' }, quantidade: { ...int, minimum: 1 } } },
      },
    },
  },
  pedidos: {
    bsonType: 'object',
    required: ['userId', 'status', 'itens', 'subtotal', 'taxaEntrega', 'total', 'endereco', 'telefone', 'pagamento', 'eventos', 'criadoEm'],
    properties: {
      status: { enum: ['recebido', 'em_preparo', 'saiu_para_entrega', 'entregue', 'cancelado'] },
      itens: { bsonType: 'array', minItems: 1 },
      total: { ...int, minimum: 0 },
      endereco: str(300),
      pagamento: { bsonType: 'object', required: ['forma', 'status', 'codigo'], properties: { forma: { enum: ['pix', 'cartao', 'dinheiro'] } } },
    },
  },
  transacoes: {
    bsonType: 'object',
    required: ['userId', 'forma', 'status', 'valorCentavos', 'codigo', 'criadoEm'],
    properties: { status: { enum: ['aprovado', 'na_entrega', 'recusado'] }, cartaoFinal: { bsonType: ['string', 'null'], maxLength: 4 } },
  },
  feedbacks: {
    bsonType: 'object',
    required: ['nome', 'dataTeste', 'criadoEm'],
    properties: { nome: str(80), nota: { bsonType: ['int', 'null'], minimum: 1, maximum: 5 } },
  },
}

export async function prepararBanco(): Promise<void> {
  const db = getDb()
  const existentes = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map(c => c.name))
  for (const [nome, schema] of Object.entries(VALIDADORES)) {
    const validacao = { validator: { $jsonSchema: schema }, validationLevel: 'strict' as const }
    if (!existentes.has(nome)) {
      await db.createCollection(nome, validacao)
      continue
    }
    // Atualiza a regra de uma coleção que já existe. O usuário "leitura e escrita" do Atlas não pode (collMod é de
    // dbAdmin): segue com a regra antiga em vez de derrubar a subida.
    await db.command({ collMod: nome, ...validacao }).catch(erro => console.warn(`[banco] validação de ${nome} não atualizada:`, erro instanceof Error ? erro.message : erro))
  }
  const c = colecoes()
  await Promise.all([
    c.produtos.createIndex({ categoriaId: 1, nome: 1 }),
    c.pedidos.createIndex({ userId: 1, criadoEm: -1 }),
    c.pedidos.createIndex({ status: 1, criadoEm: -1 }),
    c.transacoes.createIndex({ userId: 1, criadoEm: -1 }),
    c.feedbacks.createIndex({ criadoEm: -1 }),
  ])
}
