import { excluirProduto } from '../../../models/catalogo'

export default defineEventHandler(async (event) => {
  await exigirAdmin(event)
  if (!(await excluirProduto(idDaRota(event)))) falhar(404, 'Produto não encontrado.')
  setResponseStatus(event, 204)
  return null
})
