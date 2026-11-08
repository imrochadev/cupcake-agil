import { resumoAdmin } from '../../models/pedido'

export default defineEventHandler(async (event) => {
  await exigirAdmin(event)
  return resumoAdmin()
})
