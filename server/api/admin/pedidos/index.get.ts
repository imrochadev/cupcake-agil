import { ETAPAS, type StatusPedido } from '#shared/rastreamento'
import { listarPedidosAdmin } from '../../../models/pedido'

// Pedidos recebidos (CUPC-12, CA-3), filtráveis por status.
export default defineEventHandler(async (event) => {
  await exigirAdmin(event)
  const query = getQuery(event)
  const status = [...ETAPAS, 'cancelado'].includes(String(query.status)) ? (query.status as StatusPedido) : null
  const pagina = Math.max(1, Math.floor(Number(query.pagina)) || 1)
  return listarPedidosAdmin(status, pagina)
})
