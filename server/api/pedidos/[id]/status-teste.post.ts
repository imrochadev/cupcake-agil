import { proximaEtapa } from '#shared/rastreamento'
import { buscarPedido, mudarStatus } from '../../../models/pedido'

// "Alteração de status de teste": o próprio cliente avança o pedido dele para a próxima etapa, para testar o
// rastreamento sem esperar a entrega simulada nem um administrador. Só vale para pedidos da própria conta.
export default defineEventHandler(async (event) => {
  const usuario = await exigirUsuario(event)
  limitar(`status-teste:${usuario.id}`, 30, 10 * 60_000)
  const id = idDaRota(event)
  const pedido = await buscarPedido(id, usuario.id, false)
  if (!pedido) falhar(404, 'Pedido não encontrado.')
  const proxima = proximaEtapa(pedido.status)
  if (!proxima) falhar(409, 'Este pedido já terminou: não há próxima etapa.')
  return semErroDeModelo(mudarStatus(id, proxima))
})
