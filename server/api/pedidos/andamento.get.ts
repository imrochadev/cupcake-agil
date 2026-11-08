import { pedidoEmAndamento } from '../../models/pedido'

// O pedido que ainda não chegou, para o aviso no topo do site (pedido dos testadores Lucas e Ana Clara).
export default defineEventHandler(async (event) => {
  const usuario = await exigirUsuario(event)
  return pedidoEmAndamento(usuario.id)
})
