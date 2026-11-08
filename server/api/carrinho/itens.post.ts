import { ObjectId } from 'mongodb'
import { itemCarrinhoSchema } from '#shared/schemas'
import { adicionarItem } from '../../models/carrinho'

// Adiciona unidades de um cupcake ao carrinho (soma com o que já tinha).
export default defineEventHandler(async (event) => {
  const usuario = await exigirUsuario(event)
  const { produtoId, quantidade } = await lerCorpo(event, itemCarrinhoSchema)
  return semErroDeModelo(adicionarItem(usuario.id, new ObjectId(produtoId), quantidade))
})
