import { lerImagem } from '../../models/catalogo'

// Foto de produto. Cada imagem nova ganha um id novo, então pode ficar em cache por muito tempo.
export default defineEventHandler(async (event) => {
  const imagem = await lerImagem(idDaRota(event), 'produto')
  if (!imagem) falhar(404, 'Imagem não encontrada.')
  return responderImagem(event, imagem, 'public, max-age=31536000, immutable')
})
