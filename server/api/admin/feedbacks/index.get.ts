import { listarFeedbacks } from '../../../models/feedback'

export default defineEventHandler(async (event) => {
  await exigirAdmin(event)
  return listarFeedbacks()
})
