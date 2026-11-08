import { produtoSchema } from '#shared/schemas'
import { criarProduto } from '../../../models/catalogo'

// Cadastro de produto (CUPC-12, CA-1), com foto opcional (formulário multipart).
export default defineEventHandler(async (event) => {
  await exigirAdmin(event)
  const { campos, arquivo } = await lerFormulario(event)
  const entrada = validar(produtoSchema, campos)
  setResponseStatus(event, 201)
  return semErroDeModelo(criarProduto(entrada, imagemEnviada(arquivo)))
})
