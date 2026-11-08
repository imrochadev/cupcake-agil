import { removerItem } from '../../../models/carrinho'

export default defineEventHandler(async (event) => {
  const usuario = await exigirUsuario(event)
  return removerItem(usuario.id, idDaRota(event))
})
