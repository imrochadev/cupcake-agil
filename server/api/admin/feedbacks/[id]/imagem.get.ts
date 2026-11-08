import { imagemDoFeedback } from '../../../../models/feedback'

// Captura de tela de um feedback: só para administradores.
export default defineEventHandler(async (event) => {
  await exigirAdmin(event)
  const imagem = await imagemDoFeedback(idDaRota(event))
  if (!imagem) falhar(404, 'Imagem não encontrada.')
  return responderImagem(event, imagem, 'private, max-age=3600')
})
