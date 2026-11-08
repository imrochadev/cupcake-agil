import { lerCarrinho } from '../../models/carrinho'

export default defineEventHandler(async (event) => {
  const usuario = await exigirUsuario(event)
  return lerCarrinho(usuario.id)
})
