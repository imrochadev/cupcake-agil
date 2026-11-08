import { repetirPedido } from '../../../models/pedido'

// "Pedir de novo" (CUPC-15): os itens de um pedido antigo voltam para o carrinho.
export default defineEventHandler(async (event) => {
  const usuario = await exigirUsuario(event)
  const resultado = await semErroDeModelo(repetirPedido(idDaRota(event), usuario.id))
  if (!resultado) falhar(404, 'Pedido não encontrado.')
  return resultado
})
