import type { ObjectId } from 'mongodb'
import { calcularTotais, QUANTIDADE_MAXIMA } from '#shared/carrinho'
import type { CarrinhoDTO, ItemCarrinhoDTO } from '#shared/tipos'
import { colecoes } from './db'
import { buscarProdutos, produtoDTO } from './catalogo'

// Model do carrinho (CUPC-9): um por conta, guardado no banco (vale em qualquer aparelho até finalizar a compra).

export class ErroCarrinho extends Error {
  constructor(message: string, readonly status = 409) {
    super(message)
  }
}

/** Carrinho com os produtos atuais. Item cujo produto saiu do cardápio, esgotou ou baixou o estoque vem com aviso. */
export async function lerCarrinho(userId: string): Promise<CarrinhoDTO> {
  const carrinho = await colecoes().carrinhos.findOne({ _id: userId })
  const itensDoc = carrinho?.itens ?? []
  const produtos = await buscarProdutos(itensDoc.map(i => i.produtoId))
  const itens: ItemCarrinhoDTO[] = []
  for (const item of itensDoc) {
    const doc = produtos.get(item.produtoId.toHexString())
    if (!doc || doc.excluidoEm) continue
    const produto = produtoDTO(doc)
    let aviso: string | null = null
    if (!produto.disponivel) aviso = 'Esgotado no momento. Remova para finalizar a compra.'
    else if (item.quantidade > produto.estoque) aviso = `Só temos ${produto.estoque} unidade(s) agora. Ajuste a quantidade.`
    itens.push({ produto, quantidade: item.quantidade, aviso })
  }
  return { itens, ...calcularTotais(itens.map(i => ({ precoCentavos: i.produto.precoCentavos, quantidade: i.quantidade }))) }
}

async function produtoDisponivel(produtoId: ObjectId) {
  const produto = (await buscarProdutos([produtoId])).get(produtoId.toHexString())
  if (!produto || produto.excluidoEm || !produto.ativo) throw new ErroCarrinho('Este cupcake não está mais no cardápio.', 404)
  if (produto.estoque <= 0) throw new ErroCarrinho(`${produto.nome} está esgotado no momento.`)
  return produto
}

/** Soma `quantidade` ao que já está no carrinho. */
export async function adicionarItem(userId: string, produtoId: ObjectId, quantidade: number): Promise<CarrinhoDTO> {
  const produto = await produtoDisponivel(produtoId)
  const atual = (await colecoes().carrinhos.findOne({ _id: userId }))?.itens.find(i => i.produtoId.equals(produtoId))?.quantidade ?? 0
  return definirQuantidade(userId, produtoId, atual + quantidade, produto)
}

/** Troca a quantidade do item; 0 remove. Acima do estoque ou do limite por item é recusado com a explicação. */
export async function definirQuantidade(userId: string, produtoId: ObjectId, quantidade: number, conhecido?: Awaited<ReturnType<typeof produtoDisponivel>>): Promise<CarrinhoDTO> {
  if (quantidade <= 0) return removerItem(userId, produtoId)
  const produto = conhecido ?? await produtoDisponivel(produtoId)
  if (quantidade > QUANTIDADE_MAXIMA) throw new ErroCarrinho(`Máximo de ${QUANTIDADE_MAXIMA} unidades de cada cupcake por pedido.`)
  if (quantidade > produto.estoque) throw new ErroCarrinho(`Só temos ${produto.estoque} unidade(s) de ${produto.nome} agora.`)
  const c = colecoes().carrinhos
  const agora = new Date()
  const { matchedCount } = await c.updateOne({ '_id': userId, 'itens.produtoId': produtoId }, { $set: { 'itens.$.quantidade': quantidade, 'atualizadoEm': agora } })
  if (!matchedCount) {
    await c.updateOne({ _id: userId }, { $push: { itens: { produtoId, quantidade } }, $set: { atualizadoEm: agora } }, { upsert: true })
  }
  return lerCarrinho(userId)
}

export async function removerItem(userId: string, produtoId: ObjectId): Promise<CarrinhoDTO> {
  await colecoes().carrinhos.updateOne({ _id: userId }, { $pull: { itens: { produtoId } }, $set: { atualizadoEm: new Date() } })
  return lerCarrinho(userId)
}

export async function esvaziarCarrinho(userId: string): Promise<void> {
  await colecoes().carrinhos.updateOne({ _id: userId }, { $set: { itens: [], atualizadoEm: new Date() } })
}
