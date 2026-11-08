import { buscarPedido } from '../../../models/pedido'

// Detalhe e rastreamento (CUPC-11). A tela consulta de tempos em tempos para ver a etapa nova.
export default defineEventHandler(async (event) => {
  const usuario = await exigirUsuario(event)
  const pedido = await buscarPedido(idDaRota(event), usuario.id, usuario.perfil === 'admin')
  if (!pedido) falhar(404, 'Pedido não encontrado.')
  return pedido
})
