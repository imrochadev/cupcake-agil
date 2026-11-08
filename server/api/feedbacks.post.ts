import { feedbackSchema } from '#shared/schemas'
import { registrarFeedback } from '../models/feedback'

// Formulário de feedback dos testadores (com ou sem conta), com captura de tela opcional.
export default defineEventHandler(async (event) => {
  limitar(`feedback:${ipDo(event)}`, 10, 60 * 60_000)
  const { campos, arquivo } = await lerFormulario(event)
  const entrada = validar(feedbackSchema, campos)
  const imagem = imagemEnviada(arquivo)
  const usuario = await usuarioDa(event)
  const id = await registrarFeedback(entrada, {
    navegador: getRequestHeader(event, 'user-agent') ?? '',
    userId: usuario?.id ?? null,
    imagem,
  })
  setResponseStatus(event, 201)
  return { id }
})
