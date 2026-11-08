import { Binary, ObjectId } from 'mongodb'
import type { CatalogoDTO, CategoriaDTO, ProdutoDTO } from '#shared/tipos'
import type { ProdutoEntrada } from '#shared/schemas'
import { colecoes, type ProdutoDoc } from './db'

// Model do catálogo (CUPC-8 e CUPC-12): categorias, produtos e fotos.

export function produtoDTO(p: ProdutoDoc): ProdutoDTO {
  return {
    id: p._id.toHexString(),
    nome: p.nome,
    descricao: p.descricao,
    categoriaId: p.categoriaId,
    precoCentavos: p.precoCentavos,
    estoque: p.estoque,
    ativo: p.ativo,
    disponivel: p.ativo && p.estoque > 0 && !p.excluidoEm,
    imagemUrl: p.imagemId ? `/api/imagens/${p.imagemId.toHexString()}` : null,
  }
}

export async function listarCategorias(): Promise<CategoriaDTO[]> {
  const categorias = await colecoes().categorias.find().sort({ ordem: 1 }).toArray()
  return categorias.map(c => ({ id: c._id, nome: c.nome }))
}

/** Cardápio do cliente: só produtos ativos (os esgotados aparecem, marcados como indisponíveis). */
export async function listarCatalogo(): Promise<CatalogoDTO> {
  const [categorias, produtos] = await Promise.all([
    listarCategorias(),
    colecoes().produtos.find({ ativo: true, excluidoEm: null }).sort({ nome: 1 }).toArray(),
  ])
  return { categorias, produtos: produtos.map(produtoDTO) }
}

/** Painel: todos, inclusive os inativos (menos os excluídos). */
export async function listarProdutosAdmin(): Promise<ProdutoDTO[]> {
  const produtos = await colecoes().produtos.find({ excluidoEm: null }).sort({ categoriaId: 1, nome: 1 }).toArray()
  return produtos.map(produtoDTO)
}

export async function buscarProdutos(ids: ObjectId[]): Promise<Map<string, ProdutoDoc>> {
  const produtos = await colecoes().produtos.find({ _id: { $in: ids } }).toArray()
  return new Map(produtos.map(p => [p._id.toHexString(), p]))
}

async function categoriaExiste(id: string): Promise<boolean> {
  return (await colecoes().categorias.countDocuments({ _id: id }, { limit: 1 })) > 0
}

export class ErroCatalogo extends Error {}

export async function salvarImagem(mime: string, dados: Uint8Array, uso: 'produto' | 'feedback'): Promise<ObjectId> {
  const _id = new ObjectId()
  await colecoes().imagens.insertOne({ _id, mime, dados: new Binary(dados), uso, criadoEm: new Date() })
  return _id
}

export async function criarProduto(entrada: ProdutoEntrada, imagem: { mime: string, dados: Uint8Array } | null): Promise<ProdutoDTO> {
  if (!(await categoriaExiste(entrada.categoriaId))) throw new ErroCatalogo('Categoria não encontrada.')
  const agora = new Date()
  const doc: ProdutoDoc = {
    _id: new ObjectId(),
    ...entrada,
    imagemId: imagem ? await salvarImagem(imagem.mime, imagem.dados, 'produto') : null,
    criadoEm: agora,
    atualizadoEm: agora,
    excluidoEm: null,
  }
  await colecoes().produtos.insertOne(doc)
  return produtoDTO(doc)
}

export async function atualizarProduto(id: ObjectId, entrada: ProdutoEntrada, imagem: { mime: string, dados: Uint8Array } | null): Promise<ProdutoDTO | null> {
  if (!(await categoriaExiste(entrada.categoriaId))) throw new ErroCatalogo('Categoria não encontrada.')
  const antigo = await colecoes().produtos.findOne({ _id: id, excluidoEm: null })
  if (!antigo) return null
  const imagemId = imagem ? await salvarImagem(imagem.mime, imagem.dados, 'produto') : antigo.imagemId
  const atualizado = await colecoes().produtos.findOneAndUpdate(
    { _id: id },
    { $set: { ...entrada, imagemId, atualizadoEm: new Date() } },
    { returnDocument: 'after' },
  )
  if (imagem && antigo.imagemId) await colecoes().imagens.deleteOne({ _id: antigo.imagemId })
  return atualizado ? produtoDTO(atualizado) : null
}

/** Exclusão lógica: o produto sai do cardápio e dos carrinhos, mas os pedidos antigos continuam com ele. */
export async function excluirProduto(id: ObjectId): Promise<boolean> {
  const { modifiedCount } = await colecoes().produtos.updateOne({ _id: id, excluidoEm: null }, { $set: { excluidoEm: new Date(), ativo: false } })
  if (modifiedCount) await colecoes().carrinhos.updateMany({}, { $pull: { itens: { produtoId: id } } })
  return modifiedCount > 0
}

/** Foto pública: só as de produtos (capturas de tela dos feedbacks ficam no painel). */
export async function lerImagem(id: ObjectId, uso: 'produto' | 'feedback') {
  return colecoes().imagens.findOne({ _id: id, uso })
}
