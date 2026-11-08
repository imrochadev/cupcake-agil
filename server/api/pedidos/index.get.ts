import { listarPedidosDoCliente } from '../../models/pedido'

// Histórico de pedidos (CUPC-15), do mais novo para o mais antigo, 10 por página.
export default defineEventHandler(async (event) => {
  const usuario = await exigirUsuario(event)
  const pagina = Math.max(1, Math.floor(Number(getQuery(event).pagina)) || 1)
  return listarPedidosDoCliente(usuario.id, pagina)
})
