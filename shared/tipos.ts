// Formatos que a API devolve para as telas (os "DTOs"). Datas viajam como texto ISO.
import type { FormaPagamento, StatusPagamento } from './pagamento'
import type { StatusPedido } from './rastreamento'
import type { Endereco } from './endereco'

export type Perfil = 'cliente' | 'admin'

export interface UsuarioDTO {
  id: string
  nome: string
  email: string
  telefone: string | null
  endereco: Endereco | null
  perfil: Perfil
}

export interface CategoriaDTO {
  id: string
  nome: string
}

export interface ProdutoDTO {
  id: string
  nome: string
  descricao: string
  categoriaId: string
  precoCentavos: number
  estoque: number
  ativo: boolean
  disponivel: boolean
  imagemUrl: string | null
}

export interface CatalogoDTO {
  categorias: CategoriaDTO[]
  produtos: ProdutoDTO[]
}

export interface ItemCarrinhoDTO {
  produto: ProdutoDTO
  quantidade: number
  /** Algo mudou desde que o item entrou (estoque menor, produto esgotado ou fora do cardápio). */
  aviso: string | null
}

export interface CarrinhoDTO {
  itens: ItemCarrinhoDTO[]
  quantidade: number
  subtotal: number
  taxaEntrega: number
  total: number
  faltaFreteGratis: number
}

export interface ItemPedidoDTO {
  produtoId: string
  nome: string
  precoCentavos: number
  quantidade: number
}

export interface PagamentoDTO {
  forma: FormaPagamento
  status: StatusPagamento
  codigo: string
  valorCentavos: number
  cartaoFinal?: string
  bandeira?: string
  trocoParaCentavos?: number
  pixCopiaECola?: string
}

export interface PedidoDTO {
  id: string
  numero: string
  status: StatusPedido
  itens: ItemPedidoDTO[]
  subtotal: number
  taxaEntrega: number
  total: number
  endereco: string
  telefone: string
  observacao: string
  pagamento: PagamentoDTO
  eventos: { status: StatusPedido, em: string }[]
  previsaoEntrega: string
  criadoEm: string
  cliente?: { nome: string, email: string }
}

export interface PaginaDTO<T> {
  itens: T[]
  pagina: number
  totalPaginas: number
  total: number
}

export interface FeedbackDTO {
  id: string
  nome: string
  dataTeste: string
  funcionou: string
  naoFuncionou: string
  naoTestado: string
  sugestoes: string
  nota: number | null
  pagina: string
  navegador: string
  temImagem: boolean
  conta: string | null
  criadoEm: string
}

export interface ResumoAdminDTO {
  pedidos: number
  faturamento: number
  ticketMedio: number
  porStatus: Record<StatusPedido, number>
  maisVendidos: { nome: string, quantidade: number }[]
  feedbacks: number
  semEstoque: number
}

export interface ConfigDTO {
  provedores: ('google' | 'github')[]
  etapaMinutos: number
}
