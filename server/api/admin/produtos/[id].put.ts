import { produtoSchema } from '#shared/schemas'
import { atualizarProduto } from '../../../models/catalogo'

// Edição de produto: preço, estoque, disponibilidade e foto (CUPC-12, CA-2 e CA-4).
export default defineEventHandler(async (event) => {
  await exigirAdmin(event)
  const id = idDaRota(event)
  const { campos, arquivo } = await lerFormulario(event)
  const entrada = validar(produtoSchema, campos)
  const produto = await semErroDeModelo(atualizarProduto(id, entrada, imagemEnviada(arquivo)))
  if (!produto) falhar(404, 'Produto não encontrado.')
  return produto
})
