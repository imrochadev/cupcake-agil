import { quantidadeSchema } from '#shared/schemas'
import { definirQuantidade } from '../../../models/carrinho'

// Troca a quantidade de um item (0 remove).
export default defineEventHandler(async (event) => {
  const usuario = await exigirUsuario(event)
  const id = idDaRota(event)
  const { quantidade } = await lerCorpo(event, quantidadeSchema)
  return semErroDeModelo(definirQuantidade(usuario.id, id, quantidade))
})
