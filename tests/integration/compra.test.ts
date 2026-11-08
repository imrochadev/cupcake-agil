import { describe, expect, it } from 'vitest'
import { CARTAO_APROVADO, CARTAO_RECUSADO } from '../../shared/pagamento'
import type { CarrinhoDTO, CatalogoDTO, PaginaDTO, PedidoDTO } from '../../shared/tipos'
import { admin, cliente, ENTREGA, novoProduto } from './cliente'

// Fluxo de compra de ponta a ponta pela API: carrinho (CUPC-9), checkout e pagamento (CUPC-10), histórico (CUPC-15)
// e rastreamento (CUPC-11), conferindo o que ficou gravado (estoque, totais, transações).

const estoqueDe = async (id: string) => {
  const { dados } = await (await admin()).get<{ produtos: { id: string, estoque: number }[] }>('/api/admin/produtos')
  return dados.produtos.find(p => p.id === id)?.estoque
}

describe('carrinho', () => {
  it('soma, troca quantidade, remove e recalcula o total com a entrega', async () => {
    const c = await cliente()
    const a = await novoProduto({ precoCentavos: 1190 })
    const b = await novoProduto({ precoCentavos: 990 })
    await c.post('/api/carrinho/itens', { produtoId: a.id, quantidade: 2 })
    let { dados } = await c.post<CarrinhoDTO>('/api/carrinho/itens', { produtoId: a.id, quantidade: 1 })
    expect(dados.itens[0]!.quantidade).toBe(3)
    ;({ dados } = await c.post<CarrinhoDTO>('/api/carrinho/itens', { produtoId: b.id, quantidade: 1 }))
    expect(dados).toMatchObject({ quantidade: 4, subtotal: 4560, taxaEntrega: 700, total: 5260 })
    ;({ dados } = await c.put<CarrinhoDTO>(`/api/carrinho/itens/${a.id}`, { quantidade: 1 }))
    expect(dados.subtotal).toBe(2180)
    ;({ dados } = await c.delete<CarrinhoDTO>(`/api/carrinho/itens/${b.id}`))
    expect(dados.itens.map(i => i.produto.id)).toEqual([a.id])
    ;({ dados } = await c.put<CarrinhoDTO>(`/api/carrinho/itens/${a.id}`, { quantidade: 0 }))
    expect(dados).toMatchObject({ itens: [], total: 0 })
  })

  it('o carrinho fica guardado na conta (vale em outro aparelho)', async () => {
    const c = await cliente()
    const p = await novoProduto()
    await c.post('/api/carrinho/itens', { produtoId: p.id, quantidade: 2 })
    expect((await c.get<CarrinhoDTO>('/api/carrinho')).dados.quantidade).toBe(2)
  })

  it('não passa do estoque nem aceita produto esgotado ou inexistente', async () => {
    const c = await cliente()
    const p = await novoProduto({ estoque: 2 })
    const acima = await c.post('/api/carrinho/itens', { produtoId: p.id, quantidade: 3 })
    expect(acima.status).toBe(409)
    expect(acima.dados.message).toContain('Só temos 2')
    const { dados } = await c.get<CatalogoDTO>('/api/catalogo')
    const esgotado = dados.produtos.find(x => !x.disponivel)!
    expect((await c.post('/api/carrinho/itens', { produtoId: esgotado.id, quantidade: 1 })).status).toBe(409)
    expect((await c.post('/api/carrinho/itens', { produtoId: '000000000000000000000000', quantidade: 1 })).status).toBe(404)
    expect((await c.post('/api/carrinho/itens', { produtoId: p.id, quantidade: 0 })).status).toBe(400)
  })
})

describe('checkout', () => {
  it('PIX: cria o pedido, baixa o estoque, esvazia o carrinho e aparece no histórico', async () => {
    const c = await cliente()
    const p = await novoProduto({ estoque: 10, precoCentavos: 2000 })
    await c.post('/api/carrinho/itens', { produtoId: p.id, quantidade: 4 })
    const { status, dados: pedido } = await c.post<PedidoDTO>('/api/pedidos', { ...ENTREGA, observacao: 'Portão azul', pagamento: { forma: 'pix' } })
    expect(status).toBe(201)
    expect(pedido).toMatchObject({ status: 'recebido', subtotal: 8000, taxaEntrega: 0, total: 8000, observacao: 'Portão azul' })
    expect(pedido.endereco).toBe('Avenida Paulista, 1000 - Apto 12, Bela Vista, São Paulo/SP, CEP 01310-100')
    expect(pedido.pagamento).toMatchObject({ forma: 'pix', status: 'aprovado' })
    expect(pedido.pagamento.pixCopiaECola).toContain('80.00')
    expect(pedido.numero).toMatch(/^[A-F\d]{6}$/)
    expect(await estoqueDe(p.id)).toBe(6)
    expect((await c.get<CarrinhoDTO>('/api/carrinho')).dados.itens).toEqual([])

    const historico = await c.get<PaginaDTO<PedidoDTO>>('/api/pedidos')
    expect(historico.dados.itens.map(x => x.id)).toEqual([pedido.id])
    expect((await c.get<PedidoDTO>(`/api/pedidos/${pedido.id}`)).dados.itens).toEqual([{ produtoId: p.id, nome: p.nome, precoCentavos: 2000, quantidade: 4 }])
  })

  it('cartão: guarda só bandeira e final; o cartão de recusa não cria pedido nem mexe no estoque', async () => {
    const c = await cliente()
    const p = await novoProduto({ estoque: 5 })
    await c.post('/api/carrinho/itens', { produtoId: p.id, quantidade: 2 })
    const cartao = { nome: 'Maria Teste', validade: '12/35', cvv: '123' }

    const recusado = await c.post('/api/pedidos', { ...ENTREGA, pagamento: { forma: 'cartao', cartao: { ...cartao, numero: CARTAO_RECUSADO } } })
    expect(recusado.status).toBe(402)
    expect(recusado.dados.message).toMatch(/recusado/i)
    expect(await estoqueDe(p.id)).toBe(5)
    expect((await c.get<CarrinhoDTO>('/api/carrinho')).dados.quantidade).toBe(2)

    const invalido = await c.post('/api/pedidos', { ...ENTREGA, pagamento: { forma: 'cartao', cartao: { ...cartao, numero: '4242424242424241' } } })
    expect(invalido.status).toBe(402)
    expect(invalido.dados.data.campo).toBe('numero')

    const { status, dados } = await c.post<PedidoDTO>('/api/pedidos', { ...ENTREGA, pagamento: { forma: 'cartao', cartao: { ...cartao, numero: CARTAO_APROVADO } } })
    expect(status).toBe(201)
    expect(dados.pagamento).toMatchObject({ forma: 'cartao', status: 'aprovado', cartaoFinal: '4242', bandeira: 'Visa' })
    expect(JSON.stringify(dados)).not.toContain(CARTAO_APROVADO)
    expect(await estoqueDe(p.id)).toBe(3)
  })

  it('dinheiro na entrega com troco', async () => {
    const c = await cliente()
    const p = await novoProduto({ precoCentavos: 1500 })
    await c.post('/api/carrinho/itens', { produtoId: p.id, quantidade: 1 })
    const pouco = await c.post('/api/pedidos', { ...ENTREGA, pagamento: { forma: 'dinheiro', trocoParaCentavos: 1000 } })
    expect(pouco.status).toBe(402)
    const { dados } = await c.post<PedidoDTO>('/api/pedidos', { ...ENTREGA, pagamento: { forma: 'dinheiro', trocoParaCentavos: 5000 } })
    expect(dados.pagamento).toMatchObject({ forma: 'dinheiro', status: 'na_entrega', trocoParaCentavos: 5000 })
  })

  it('valida carrinho vazio, endereço e telefone', async () => {
    const c = await cliente()
    expect((await c.post('/api/pedidos', { ...ENTREGA, pagamento: { forma: 'pix' } })).status).toBe(400)
    const p = await novoProduto()
    await c.post('/api/carrinho/itens', { produtoId: p.id, quantidade: 1 })
    const cepRuim = await c.post('/api/pedidos', { ...ENTREGA, endereco: { ...ENTREGA.endereco, cep: '123' }, pagamento: { forma: 'pix' } })
    expect(cepRuim.status).toBe(400)
    expect(cepRuim.dados.data.campo).toBe('endereco.cep')
    const semNumero = await c.post('/api/pedidos', { ...ENTREGA, endereco: { ...ENTREGA.endereco, numero: '' }, pagamento: { forma: 'pix' } })
    expect(semNumero.dados.data.campo).toBe('endereco.numero')
    expect((await c.post('/api/pedidos', { ...ENTREGA, endereco: { ...ENTREGA.endereco, uf: 'XX' }, pagamento: { forma: 'pix' } })).status).toBe(400)
    expect((await c.post('/api/pedidos', { ...ENTREGA, telefone: '12', pagamento: { forma: 'pix' } })).status).toBe(400)
  })

  it('quem chega por último quando o estoque acaba recebe aviso, não um pedido', async () => {
    const [ana, bia] = await Promise.all([cliente(), cliente()])
    const p = await novoProduto({ estoque: 3 })
    await ana.post('/api/carrinho/itens', { produtoId: p.id, quantidade: 3 })
    await bia.post('/api/carrinho/itens', { produtoId: p.id, quantidade: 3 })
    const [r1, r2] = await Promise.all([
      ana.post('/api/pedidos', { ...ENTREGA, pagamento: { forma: 'pix' } }),
      bia.post('/api/pedidos', { ...ENTREGA, pagamento: { forma: 'pix' } }),
    ])
    expect([r1.status, r2.status].sort()).toEqual([201, 409])
    expect(await estoqueDe(p.id)).toBe(0)
  })
})

describe('pedidos', () => {
  it('um cliente não vê o pedido do outro', async () => {
    const [dono, outro] = await Promise.all([cliente(), cliente()])
    const p = await novoProduto()
    await dono.post('/api/carrinho/itens', { produtoId: p.id, quantidade: 1 })
    const { dados } = await dono.post<PedidoDTO>('/api/pedidos', { ...ENTREGA, pagamento: { forma: 'pix' } })
    expect((await outro.get(`/api/pedidos/${dados.id}`)).status).toBe(404)
    expect((await outro.post(`/api/pedidos/${dados.id}/repetir`)).status).toBe(404)
    expect((await outro.get<PaginaDTO<PedidoDTO>>('/api/pedidos')).dados.total).toBe(0)
  })

  it('a entrega simulada anda sozinha até "entregue", com horário em cada etapa', async () => {
    const c = await cliente()
    const p = await novoProduto()
    await c.post('/api/carrinho/itens', { produtoId: p.id, quantidade: 1 })
    const { dados: pedido } = await c.post<PedidoDTO>('/api/pedidos', { ...ENTREGA, pagamento: { forma: 'pix' } })
    expect(new Date(pedido.previsaoEntrega).getTime() - new Date(pedido.criadoEm).getTime()).toBe(9000)
    await new Promise(ok => setTimeout(ok, 9500))
    const { dados } = await c.get<PedidoDTO>(`/api/pedidos/${pedido.id}`)
    expect(dados.status).toBe('entregue')
    expect(dados.eventos.map(e => e.status)).toEqual(['recebido', 'em_preparo', 'saiu_para_entrega', 'entregue'])
  })

  it('"alteração de status de teste": o próprio cliente avança o pedido dele, uma etapa por vez', async () => {
    const [dono, outro] = await Promise.all([cliente(), cliente()])
    const p = await novoProduto()
    await dono.post('/api/carrinho/itens', { produtoId: p.id, quantidade: 1 })
    const { dados: pedido } = await dono.post<PedidoDTO>('/api/pedidos', { ...ENTREGA, pagamento: { forma: 'pix' } })
    expect((await outro.post(`/api/pedidos/${pedido.id}/status-teste`)).status).toBe(404)
    const etapas: string[] = []
    for (let i = 0; i < 3; i++) etapas.push((await dono.post<PedidoDTO>(`/api/pedidos/${pedido.id}/status-teste`)).dados.status)
    expect(etapas).toEqual(['em_preparo', 'saiu_para_entrega', 'entregue'])
    const depois = await dono.post(`/api/pedidos/${pedido.id}/status-teste`)
    expect(depois.status).toBe(409)
    expect(depois.dados.message).toMatch(/já terminou/)
  })

  it('"pedir de novo" devolve os itens ao carrinho até onde o estoque deixa', async () => {
    const c = await cliente()
    const p = await novoProduto({ estoque: 5 })
    await c.post('/api/carrinho/itens', { produtoId: p.id, quantidade: 4 })
    const { dados: pedido } = await c.post<PedidoDTO>('/api/pedidos', { ...ENTREGA, pagamento: { forma: 'pix' } })
    const { status, dados } = await c.post<{ carrinho: CarrinhoDTO, avisos: string[] }>(`/api/pedidos/${pedido.id}/repetir`)
    expect(status).toBe(200)
    expect(dados.carrinho.itens[0]).toMatchObject({ quantidade: 1 })
    expect(dados.avisos[0]).toContain('só coube 1')
  })

  it('histórico paginado de 10 em 10, do mais novo para o mais antigo', async () => {
    const c = await cliente()
    const p = await novoProduto({ estoque: 20 })
    const ids: string[] = []
    for (let i = 0; i < 11; i++) {
      await c.post('/api/carrinho/itens', { produtoId: p.id, quantidade: 1 })
      ids.push((await c.post<PedidoDTO>('/api/pedidos', { ...ENTREGA, pagamento: { forma: 'pix' } })).dados.id)
    }
    const pag1 = (await c.get<PaginaDTO<PedidoDTO>>('/api/pedidos')).dados
    const pag2 = (await c.get<PaginaDTO<PedidoDTO>>('/api/pedidos?pagina=2')).dados
    expect(pag1).toMatchObject({ total: 11, totalPaginas: 2 })
    expect(pag1.itens).toHaveLength(10)
    expect(pag1.itens[0]!.id).toBe(ids.at(-1))
    expect(pag2.itens.map(x => x.id)).toEqual([ids[0]])
  })
})

// Melhorias pedidas pelos testadores na validação (Situação 3).
describe('melhorias da validação', () => {
  it('"salvar como padrão" guarda o endereço e o telefone na conta, e o endereço aparece nos anteriores', async () => {
    const c = await cliente()
    expect((await c.get('/api/eu')).dados.endereco).toBeNull()
    expect((await c.get('/api/pedidos/enderecos')).dados).toEqual([])
    const p = await novoProduto()
    await c.post('/api/carrinho/itens', { produtoId: p.id, quantidade: 1 })
    expect((await c.post('/api/pedidos', { ...ENTREGA, salvarEndereco: true, pagamento: { forma: 'pix' } })).status).toBe(201)
    const eu = (await c.get('/api/eu')).dados
    expect(eu.endereco).toMatchObject(ENTREGA.endereco)
    expect(eu.telefone).toBe(ENTREGA.telefone)
    expect((await c.get('/api/pedidos/enderecos')).dados).toEqual([ENTREGA.endereco])
  })

  it('sem marcar "salvar", a conta não muda; endereços repetidos aparecem uma vez só', async () => {
    const c = await cliente()
    const p = await novoProduto()
    for (let i = 0; i < 2; i++) {
      await c.post('/api/carrinho/itens', { produtoId: p.id, quantidade: 1 })
      await c.post('/api/pedidos', { ...ENTREGA, pagamento: { forma: 'pix' } })
    }
    expect((await c.get('/api/eu')).dados.endereco).toBeNull()
    expect((await c.get('/api/pedidos/enderecos')).dados).toHaveLength(1)
    expect((await (await cliente()).get('/api/pedidos/enderecos')).dados).toEqual([])
  })

  it('o pedido em andamento aparece até ser entregue, e só para o dono', async () => {
    const c = await cliente()
    expect((await c.get('/api/pedidos/andamento')).dados).toBeNull()
    const p = await novoProduto()
    await c.post('/api/carrinho/itens', { produtoId: p.id, quantidade: 1 })
    const { dados: pedido } = await c.post<PedidoDTO>('/api/pedidos', { ...ENTREGA, pagamento: { forma: 'pix' } })
    expect((await c.get<PedidoDTO>('/api/pedidos/andamento')).dados.id).toBe(pedido.id)
    expect((await (await cliente()).get('/api/pedidos/andamento')).dados).toBeNull()
    for (let i = 0; i < 3; i++) await c.post(`/api/pedidos/${pedido.id}/status-teste`)
    expect((await c.get('/api/pedidos/andamento')).dados).toBeNull()
  })

  it('sem login, as duas rotas novas pedem para entrar', async () => {
    const { Cliente } = await import('./cliente')
    const anonimo = new Cliente()
    expect((await anonimo.get('/api/pedidos/enderecos')).status).toBe(401)
    expect((await anonimo.get('/api/pedidos/andamento')).status).toBe(401)
  })
})
