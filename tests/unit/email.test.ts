import { describe, expect, it } from 'vitest'
import { emailBoasVindas, emailPedidoConfirmado, emailSenhaAlterada, emailSenhaNova, LOGO_CID } from '../../server/utils/email-modelos'
import type { PedidoDTO } from '#shared/tipos'

const SITE = 'https://cupcake-store.imrocha.dev'
const PEDIDO: PedidoDTO = {
  id: '6aef970b187e9e9da24ed212',
  numero: '4ED212',
  status: 'recebido',
  itens: [{ produtoId: 'p1', nome: 'Red Velvet', precoCentavos: 1290, quantidade: 2 }, { produtoId: 'p2', nome: 'Coco <Vegano>', precoCentavos: 1150, quantidade: 1 }],
  subtotal: 3730,
  taxaEntrega: 700,
  total: 4430,
  endereco: 'Avenida Paulista, 1000, Bela Vista, São Paulo/SP, CEP 01310-100',
  telefone: '(11) 91234-5678',
  observacao: '',
  pagamento: { forma: 'cartao', status: 'aprovado', codigo: 'ABC', valorCentavos: 4430, cartaoFinal: '4242', bandeira: 'Visa' },
  eventos: [],
  previsaoEntrega: '2026-11-07T22:30:00.000Z',
  criadoEm: '2026-11-07T22:24:00.000Z',
}

describe('e-mails', () => {
  it('todos têm o logo embutido, a moldura da loja e versão em texto', () => {
    for (const e of [emailBoasVindas('Ana Souza', SITE), emailSenhaNova('Ana', `${SITE}/x`), emailSenhaAlterada('Ana', SITE), emailPedidoConfirmado('Ana', PEDIDO, SITE)]) {
      expect(e.html).toContain(`cid:${LOGO_CID}`)
      expect(e.html).toContain('Cupcake Ágil')
      expect(e.texto.length).toBeGreaterThan(20)
      expect(e.assunto).toMatch(/Cupcake Ágil/)
    }
  })

  it('boas-vindas chama pelo primeiro nome e leva ao cardápio', () => {
    const e = emailBoasVindas('Ana Souza', SITE)
    expect(e.html).toContain('Que bom ter você aqui, Ana!')
    expect(e.html).toContain(`href="${SITE}"`)
  })

  it('senha nova leva o link no botão e no texto', () => {
    const url = `${SITE}/api/auth/reset-password/tok?callbackURL=%2Fredefinir-senha`
    const e = emailSenhaNova('Ana', url)
    expect(e.texto).toContain(url)
    expect(e.html).toContain('Criar senha nova')
  })

  it('pedido traz itens, total, endereço, pagamento sem o número do cartão e o link de acompanhar', () => {
    const e = emailPedidoConfirmado('Ana', PEDIDO, SITE)
    expect(e.assunto).toBe('Cupcake Ágil: pedido #4ED212 confirmado')
    expect(e.html).toContain('2× Red Velvet')
    expect(e.html).toContain('R$ 44,30')
    expect(e.html).toContain('Visa final 4242')
    expect(e.html).toContain(`${SITE}/pedidos/${PEDIDO.id}`)
    expect(e.texto).toContain('Previsão de entrega: 19:30')
  })

  it('escapa o que vem do usuário (nome de produto, nome da pessoa)', () => {
    const e = emailPedidoConfirmado('<script>', PEDIDO, SITE)
    expect(e.html).toContain('Coco &lt;Vegano&gt;')
    expect(e.html).not.toContain('<script>')
  })
})
