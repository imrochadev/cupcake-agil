import { statusSchema } from '#shared/schemas'
import { mudarStatus } from '../../../../models/pedido'

// Avança a etapa do pedido ou cancela (o cliente vê na hora seguinte em que a tela dele consultar).
export default defineEventHandler(async (event) => {
  await exigirAdmin(event)
  const id = idDaRota(event)
  const { status } = await lerCorpo(event, statusSchema)
  return semErroDeModelo(mudarStatus(id, status))
})
