import { randomInt } from 'node:crypto'
import { ObjectId } from 'mongodb'
import { processarPagamento } from '#shared/pagamento'
import { eventosSimulados, finalizado, podeMudar, previsaoEntrega, ETAPAS, type StatusPedido } from '#shared/rastreamento'
import { quantidadePermitida } from '#shared/carrinho'
import type { CheckoutEntrada } from '#shared/schemas'
import { formatarEndereco, type Endereco } from '#shared/endereco'
import type { CarrinhoDTO, PaginaDTO, PedidoDTO, ResumoAdminDTO } from '#shared/tipos'
import { colecoes, type PedidoDoc } from './db'
import { buscarProdutos } from './catalogo'
import { definirQuantidade, esvaziarCarrinho, lerCarrinho } from './carrinho'

// Model dos pedidos: checkout (CUPC-10), histórico (CUPC-15), rastreamento (CUPC-11) e gestão no painel (CUPC-12).

export class ErroPedido extends Error {
  constructor(message: string, readonly status: number, readonly campo?: string) {
    super(message)
  }
}

const POR_PAGINA = 10
const SEM_AMBIGUIDADE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function codigoTransacao(): string {
  return Array.from({ length: 10 }, () => SEM_AMBIGUIDADE[randomInt(SEM_AMBIGUIDADE.length)]).join('')
}

export function numeroPedido(id: ObjectId): string {
  return id.toHexString().slice(-6).toUpperCase()
}

export function pedidoDTO(p: PedidoDoc, cliente?: { nome: string, email: string }): PedidoDTO {
  return {
    id: p._id.toHexString(),
    numero: numeroPedido(p._id),
    status: p.status,
    itens: p.itens.map(i => ({ ...i, produtoId: i.produtoId.toHexString() })),
    subtotal: p.subtotal,
    taxaEntrega: p.taxaEntrega,
    total: p.total,
    endereco: p.endereco,
    telefone: p.telefone,
    observacao: p.observacao,
    pagamento: p.pagamento,
    eventos: p.eventos.map(e => ({ status: e.status, em: e.em.toISOString() })),
    previsaoEntrega: p.previsaoEntrega.toISOString(),
    criadoEm: p.criadoEm.toISOString(),
    ...(cliente ? { cliente } : {}),
  }
}

function passoMs(): number {
  return Math.max(0, Number(useRuntimeConfig().etapaMinutos) || 0) * 60_000
}

/** Aplica as etapas da entrega simulada que já deviam ter acontecido. */
async function sincronizar(p: PedidoDoc, agora = new Date()): Promise<PedidoDoc> {
  const novos = eventosSimulados(p, agora, passoMs())
  if (!novos.length) return p
  const status = novos.at(-1)!.status
  // Só grava se ninguém mudou o status no meio do caminho (outra requisição ou o administrador).
  const atualizado = await colecoes().pedidos.findOneAndUpdate(
    { _id: p._id, status: p.status, simulado: true },
    { $set: { status }, $push: { eventos: { $each: novos } } },
    { returnDocument: 'after' },
  )
  return atualizado ?? (await colecoes().pedidos.findOne({ _id: p._id })) ?? p
}

async function devolverEstoque(itens: { produtoId: ObjectId, quantidade: number }[]): Promise<void> {
  if (!itens.length) return
  await colecoes().produtos.bulkWrite(itens.map(i => ({ updateOne: { filter: { _id: i.produtoId }, update: { $inc: { estoque: i.quantidade } } } })))
}

/**
 * Finaliza a compra: confere o carrinho, reserva o estoque, processa o pagamento (simulado) e grava o pedido.
 * Sem transação do MongoDB (funciona num servidor sozinho): cada baixa de estoque só acontece se ainda houver unidades,
 * e qualquer falha depois disso devolve o que foi reservado.
 */
export async function finalizarCompra(userId: string, entrada: CheckoutEntrada): Promise<PedidoDTO> {
  const carrinho = await lerCarrinho(userId)
  if (!carrinho.itens.length) throw new ErroPedido('Seu carrinho está vazio.', 400)
  const comAviso = carrinho.itens.find(i => i.aviso)
  if (comAviso) throw new ErroPedido(`${comAviso.produto.nome}: ${comAviso.aviso}`, 409)

  const c = colecoes()
  const reservados: { produtoId: ObjectId, quantidade: number }[] = []
  for (const item of carrinho.itens) {
    const produtoId = new ObjectId(item.produto.id)
    const { modifiedCount } = await c.produtos.updateOne(
      { _id: produtoId, ativo: true, excluidoEm: null, estoque: { $gte: item.quantidade } },
      { $inc: { estoque: -item.quantidade } },
    )
    if (!modifiedCount) {
      await devolverEstoque(reservados)
      throw new ErroPedido(`${item.produto.nome} acabou de esgotar. Atualize o carrinho.`, 409)
    }
    reservados.push({ produtoId, quantidade: item.quantidade })
  }

  const codigo = codigoTransacao()
  const pedidoId = new ObjectId()
  const resultado = processarPagamento(entrada.pagamento, carrinho.total, codigo)
  const agora = new Date()
  await c.transacoes.insertOne({
    _id: new ObjectId(),
    userId,
    pedidoId: resultado.ok ? pedidoId : null,
    forma: entrada.pagamento.forma,
    status: resultado.ok ? resultado.pagamento.status : 'recusado',
    valorCentavos: carrinho.total,
    codigo,
    cartaoFinal: resultado.ok ? resultado.pagamento.cartaoFinal ?? null : null,
    motivo: resultado.ok ? null : resultado.erro,
    criadoEm: agora,
  })
  if (!resultado.ok) {
    await devolverEstoque(reservados)
    throw new ErroPedido(resultado.erro, 402, resultado.campo)
  }

  const pedido: PedidoDoc = {
    _id: pedidoId,
    userId,
    status: 'recebido',
    itens: carrinho.itens.map(i => ({ produtoId: new ObjectId(i.produto.id), nome: i.produto.nome, precoCentavos: i.produto.precoCentavos, quantidade: i.quantidade })),
    subtotal: carrinho.subtotal,
    taxaEntrega: carrinho.taxaEntrega,
    total: carrinho.total,
    // Guardado já formatado: o pedido só precisa mostrar o endereço (os campos são conferidos na entrada).
    endereco: formatarEndereco(entrada.endereco),
    enderecoDados: entrada.endereco,
    telefone: entrada.telefone,
    observacao: entrada.observacao,
    pagamento: resultado.pagamento,
    eventos: [{ status: 'recebido', em: agora }],
    previsaoEntrega: previsaoEntrega(agora, passoMs()),
    simulado: true,
    criadoEm: agora,
  }
  try {
    await c.pedidos.insertOne(pedido)
  } catch (erro) {
    await devolverEstoque(reservados)
    throw erro
  }
  await esvaziarCarrinho(userId)
  return pedidoDTO(pedido)
}

export async function listarPedidosDoCliente(userId: string, pagina: number): Promise<PaginaDTO<PedidoDTO>> {
  const filtro = { userId }
  const total = await colecoes().pedidos.countDocuments(filtro)
  const docs = await colecoes().pedidos.find(filtro).sort({ criadoEm: -1 }).skip((pagina - 1) * POR_PAGINA).limit(POR_PAGINA).toArray()
  const itens = await Promise.all(docs.map(d => sincronizar(d)))
  return { itens: itens.map(p => pedidoDTO(p)), pagina, totalPaginas: Math.max(1, Math.ceil(total / POR_PAGINA)), total }
}

/** Até 3 endereços diferentes dos últimos pedidos, do mais recente para o mais antigo. */
export async function enderecosUsados(userId: string): Promise<Endereco[]> {
  const docs = await colecoes().pedidos.find({ userId, enderecoDados: { $exists: true } }, { projection: { enderecoDados: 1 } })
    .sort({ criadoEm: -1 }).limit(30).toArray()
  const vistos = new Map<string, Endereco>()
  for (const d of docs) if (d.enderecoDados && vistos.size < 3) vistos.set(formatarEndereco(d.enderecoDados), d.enderecoDados)
  return [...vistos.values()]
}

/** O pedido mais recente que ainda não terminou (para o aviso "seu pedido está a caminho"), ou null. */
export async function pedidoEmAndamento(userId: string): Promise<PedidoDTO | null> {
  const docs = await colecoes().pedidos.find({ userId, status: { $nin: ['entregue', 'cancelado'] } }).sort({ criadoEm: -1 }).limit(5).toArray()
  for (const doc of docs) {
    const atual = await sincronizar(doc)
    if (!finalizado(atual.status)) return pedidoDTO(atual)
  }
  return null
}

/** Pedido do cliente (ou qualquer um, para o administrador). Null se não existe ou é de outra pessoa. */
export async function buscarPedido(id: ObjectId, userId: string, admin: boolean): Promise<PedidoDTO | null> {
  const doc = await colecoes().pedidos.findOne(admin ? { _id: id } : { _id: id, userId })
  return doc ? pedidoDTO(await sincronizar(doc)) : null
}

/** "Pedir de novo": põe os itens de um pedido antigo no carrinho, até onde o estoque deixar. */
export async function repetirPedido(id: ObjectId, userId: string): Promise<{ carrinho: CarrinhoDTO, avisos: string[] } | null> {
  const doc = await colecoes().pedidos.findOne({ _id: id, userId })
  if (!doc) return null
  const produtos = await buscarProdutos(doc.itens.map(i => i.produtoId))
  const atual = await lerCarrinho(userId)
  const avisos: string[] = []
  for (const item of doc.itens) {
    const produto = produtos.get(item.produtoId.toHexString())
    if (!produto || produto.excluidoEm || !produto.ativo || produto.estoque <= 0) {
      avisos.push(`${item.nome} não está disponível agora.`)
      continue
    }
    const noCarrinho = atual.itens.find(i => i.produto.id === produto._id.toHexString())?.quantidade ?? 0
    const quantidade = quantidadePermitida(noCarrinho + item.quantidade, produto.estoque)
    if (quantidade < noCarrinho + item.quantidade) avisos.push(`${item.nome}: só coube ${quantidade} unidade(s) no carrinho.`)
    if (quantidade > noCarrinho) await definirQuantidade(userId, produto._id, quantidade, produto)
  }
  return { carrinho: await lerCarrinho(userId), avisos }
}

async function clientes(userIds: string[]): Promise<Map<string, { nome: string, email: string }>> {
  const ids = [...new Set(userIds)].filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id))
  const usuarios = await colecoes().usuarios.find({ _id: { $in: ids } }, { projection: { name: 1, email: 1 } }).toArray()
  return new Map(usuarios.map(u => [u._id.toHexString(), { nome: u.name, email: u.email }]))
}

export async function listarPedidosAdmin(status: StatusPedido | null, pagina: number): Promise<PaginaDTO<PedidoDTO>> {
  const filtro = status ? { status } : {}
  const total = await colecoes().pedidos.countDocuments(filtro)
  const docs = await colecoes().pedidos.find(filtro).sort({ criadoEm: -1 }).skip((pagina - 1) * 20).limit(20).toArray()
  const atuais = await Promise.all(docs.map(d => sincronizar(d)))
  const quem = await clientes(atuais.map(p => p.userId))
  return {
    itens: atuais.map(p => pedidoDTO(p, quem.get(p.userId) ?? { nome: 'Conta removida', email: '' })),
    pagina,
    totalPaginas: Math.max(1, Math.ceil(total / 20)),
    total,
  }
}

/** Administrador muda a etapa: a entrega simulada daquele pedido para. Cancelar devolve o estoque. */
export async function mudarStatus(id: ObjectId, novo: StatusPedido): Promise<PedidoDTO> {
  const doc = await colecoes().pedidos.findOne({ _id: id })
  if (!doc) throw new ErroPedido('Pedido não encontrado.', 404)
  const atual = await sincronizar(doc)
  if (!podeMudar(atual.status, novo)) {
    throw new ErroPedido(`Não dá para ir de "${atual.status}" para "${novo}": avance uma etapa por vez ou cancele antes da entrega.`, 409)
  }
  const atualizado = await colecoes().pedidos.findOneAndUpdate(
    { _id: id, status: atual.status },
    { $set: { status: novo, simulado: false }, $push: { eventos: { status: novo, em: new Date() } } },
    { returnDocument: 'after' },
  )
  if (!atualizado) throw new ErroPedido('O pedido mudou enquanto você editava. Atualize a lista.', 409)
  if (novo === 'cancelado') await devolverEstoque(atualizado.itens)
  return pedidoDTO(atualizado)
}

/** Base para relatórios (CUPC-12, CT-4): vendas sem os cancelados, mais vendidos e situação do estoque. */
export async function resumoAdmin(): Promise<ResumoAdminDTO> {
  const c = colecoes()
  const [vendas, porStatusLista, maisVendidos, feedbacks, semEstoque] = await Promise.all([
    c.pedidos.aggregate<{ pedidos: number, faturamento: number }>([
      { $match: { status: { $ne: 'cancelado' } } },
      { $group: { _id: null, pedidos: { $sum: 1 }, faturamento: { $sum: '$total' } } },
    ]).toArray(),
    c.pedidos.aggregate<{ _id: StatusPedido, n: number }>([{ $group: { _id: '$status', n: { $sum: 1 } } }]).toArray(),
    c.pedidos.aggregate<{ _id: string, quantidade: number }>([
      { $match: { status: { $ne: 'cancelado' } } },
      { $unwind: '$itens' },
      { $group: { _id: '$itens.nome', quantidade: { $sum: '$itens.quantidade' } } },
      { $sort: { quantidade: -1, _id: 1 } },
      { $limit: 5 },
    ]).toArray(),
    c.feedbacks.countDocuments(),
    c.produtos.countDocuments({ excluidoEm: null, ativo: true, estoque: 0 }),
  ])
  const porStatus = Object.fromEntries([...ETAPAS, 'cancelado'].map(s => [s, 0])) as Record<StatusPedido, number>
  for (const s of porStatusLista) porStatus[s._id] = s.n
  const { pedidos = 0, faturamento = 0 } = vendas[0] ?? {}
  return {
    pedidos,
    faturamento,
    ticketMedio: pedidos ? Math.round(faturamento / pedidos) : 0,
    porStatus,
    maisVendidos: maisVendidos.map(m => ({ nome: m._id, quantidade: m.quantidade })),
    feedbacks,
    semEstoque,
  }
}
