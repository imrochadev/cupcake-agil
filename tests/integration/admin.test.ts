import { describe, expect, it } from 'vitest'
import type { CatalogoDTO, PaginaDTO, PedidoDTO, ProdutoDTO, ResumoAdminDTO } from '../../shared/tipos'
import { admin, cliente, ENTREGA, novoProduto } from './cliente'

// CUPC-12: painel com controle por perfil, CRUD de produtos, pedidos, etapas e resumo.
const PNG_1PX = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg=='), c => c.charCodeAt(0))

function formulario(campos: Record<string, string>, imagem?: { dados: Uint8Array, tipo: string }) {
  const f = new FormData()
  for (const [k, v] of Object.entries(campos)) f.append(k, v)
  if (imagem) f.append('imagem', new Blob([imagem.dados], { type: imagem.tipo }), 'foto')
  return f
}

const PRODUTO = { nome: 'Cupcake de Café', descricao: 'Massa de café coado com cobertura de mascarpone.', categoriaId: 'especiais', precoCentavos: '1350', estoque: '12' }

describe('acesso ao painel', () => {
  it('cliente comum e visitante não entram em nenhuma rota /api/admin', async () => {
    const c = await cliente()
    const rotas = ['/api/admin/resumo', '/api/admin/produtos', '/api/admin/pedidos', '/api/admin/feedbacks']
    for (const rota of rotas) expect((await c.get(rota)).status).toBe(403)
    expect((await c.post('/api/admin/produtos', formulario(PRODUTO))).status).toBe(403)
    expect((await c.patch('/api/admin/pedidos/000000000000000000000000/status', { status: 'em_preparo' })).status).toBe(403)
  })

  it('o e-mail de NUXT_ADMIN_EMAILS vira administrador', async () => {
    expect((await (await admin()).get('/api/eu')).dados.perfil).toBe('admin')
  })
})

describe('produtos', () => {
  it('cadastra com foto, edita preço e disponibilidade e exclui', async () => {
    const a = await admin()
    const criado = await a.post<ProdutoDTO>('/api/admin/produtos', formulario(PRODUTO, { dados: PNG_1PX, tipo: 'image/png' }))
    expect(criado.status).toBe(201)
    expect(criado.dados).toMatchObject({ nome: 'Cupcake de Café', precoCentavos: 1350, estoque: 12, disponivel: true })
    const foto = await fetch(a.base + criado.dados.imagemUrl)
    expect(foto.headers.get('content-type')).toBe('image/png')

    const editado = await a.put<ProdutoDTO>(`/api/admin/produtos/${criado.dados.id}`, formulario({ ...PRODUTO, precoCentavos: '1490', ativo: 'false' }))
    expect(editado.dados).toMatchObject({ precoCentavos: 1490, ativo: false, disponivel: false, imagemUrl: criado.dados.imagemUrl })
    let catalogo = (await a.get<CatalogoDTO>('/api/catalogo')).dados
    expect(catalogo.produtos.some(p => p.id === criado.dados.id)).toBe(false)

    await a.put(`/api/admin/produtos/${criado.dados.id}`, formulario({ ...PRODUTO, ativo: 'true' }))
    catalogo = (await a.get<CatalogoDTO>('/api/catalogo')).dados
    expect(catalogo.produtos.some(p => p.id === criado.dados.id)).toBe(true)

    expect((await a.delete(`/api/admin/produtos/${criado.dados.id}`)).status).toBe(204)
    expect((await a.delete(`/api/admin/produtos/${criado.dados.id}`)).status).toBe(404)
    catalogo = (await a.get<CatalogoDTO>('/api/catalogo')).dados
    expect(catalogo.produtos.some(p => p.id === criado.dados.id)).toBe(false)
  })

  it('valida os campos, a categoria e o tipo da foto (SVG enviado é recusado)', async () => {
    const a = await admin()
    const curto = await a.post('/api/admin/produtos', formulario({ ...PRODUTO, nome: 'X' }))
    expect(curto.status).toBe(400)
    expect(curto.dados.data.campo).toBe('nome')
    expect((await a.post('/api/admin/produtos', formulario({ ...PRODUTO, precoCentavos: '0' }))).status).toBe(400)
    expect((await a.post('/api/admin/produtos', formulario({ ...PRODUTO, categoriaId: 'nao-existe' }))).status).toBe(400)
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
    expect((await a.post('/api/admin/produtos', formulario(PRODUTO, { dados: svg, tipo: 'image/png' }))).status).toBe(415)
  })

  it('excluir tira o produto dos carrinhos, mas o pedido antigo continua com ele', async () => {
    const c = await cliente()
    const p = await novoProduto({ estoque: 5 })
    await c.post('/api/carrinho/itens', { produtoId: p.id, quantidade: 1 })
    const { dados: pedido } = await c.post<PedidoDTO>('/api/pedidos', { ...ENTREGA, pagamento: { forma: 'pix' } })
    await c.post('/api/carrinho/itens', { produtoId: p.id, quantidade: 1 })
    await (await admin()).delete(`/api/admin/produtos/${p.id}`)
    expect((await c.get('/api/carrinho')).dados.itens).toEqual([])
    expect((await c.get<PedidoDTO>(`/api/pedidos/${pedido.id}`)).dados.itens[0]!.nome).toBe(p.nome)
  })
})

describe('pedidos no painel', () => {
  async function pedidoNovo(quantidade = 2) {
    const c = await cliente()
    const p = await novoProduto({ estoque: 5 })
    await c.post('/api/carrinho/itens', { produtoId: p.id, quantidade })
    const { dados } = await c.post<PedidoDTO>('/api/pedidos', { ...ENTREGA, pagamento: { forma: 'pix' } })
    return { c, p, pedido: dados }
  }

  it('lista com o cliente e avança uma etapa por vez; o cliente vê a mudança', async () => {
    const a = await admin()
    const { c, pedido } = await pedidoNovo()
    const lista = await a.get<PaginaDTO<PedidoDTO>>('/api/admin/pedidos?status=recebido')
    const noPainel = lista.dados.itens.find(x => x.id === pedido.id)
    expect(noPainel?.cliente).toMatchObject({ nome: 'Cliente Teste' })

    expect((await a.patch(`/api/admin/pedidos/${pedido.id}/status`, { status: 'entregue' })).status).toBe(409)
    expect((await a.patch<PedidoDTO>(`/api/admin/pedidos/${pedido.id}/status`, { status: 'em_preparo' })).dados.status).toBe('em_preparo')
    expect((await c.get<PedidoDTO>(`/api/pedidos/${pedido.id}`)).dados.status).toBe('em_preparo')
    expect((await a.patch(`/api/admin/pedidos/${pedido.id}/status`, { status: 'qualquer' })).status).toBe(400)
  })

  it('mexer no pedido desliga a entrega simulada dele', async () => {
    const a = await admin()
    const { c, pedido } = await pedidoNovo()
    await a.patch(`/api/admin/pedidos/${pedido.id}/status`, { status: 'em_preparo' })
    await new Promise(ok => setTimeout(ok, 7000))
    expect((await c.get<PedidoDTO>(`/api/pedidos/${pedido.id}`)).dados.status).toBe('em_preparo')
  })

  it('cancelar devolve o estoque e encerra o pedido', async () => {
    const a = await admin()
    const { p, pedido } = await pedidoNovo(3)
    await a.patch(`/api/admin/pedidos/${pedido.id}/status`, { status: 'cancelado' })
    const { dados } = await a.get<{ produtos: ProdutoDTO[] }>('/api/admin/produtos')
    expect(dados.produtos.find(x => x.id === p.id)?.estoque).toBe(5)
    expect((await a.patch(`/api/admin/pedidos/${pedido.id}/status`, { status: 'em_preparo' })).status).toBe(409)
  })

  it('resumo soma as vendas sem os cancelados', async () => {
    const a = await admin()
    const antes = (await a.get<ResumoAdminDTO>('/api/admin/resumo')).dados
    const { pedido } = await pedidoNovo(1)
    const depois = (await a.get<ResumoAdminDTO>('/api/admin/resumo')).dados
    expect(depois.pedidos).toBe(antes.pedidos + 1)
    expect(depois.faturamento).toBe(antes.faturamento + pedido.total)
    await a.patch(`/api/admin/pedidos/${pedido.id}/status`, { status: 'cancelado' })
    expect((await a.get<ResumoAdminDTO>('/api/admin/resumo')).dados.faturamento).toBe(antes.faturamento)
  })
})
