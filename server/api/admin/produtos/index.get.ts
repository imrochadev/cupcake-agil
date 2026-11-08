import { listarCategorias, listarProdutosAdmin } from '../../../models/catalogo'

export default defineEventHandler(async (event) => {
  await exigirAdmin(event)
  const [categorias, produtos] = await Promise.all([listarCategorias(), listarProdutosAdmin()])
  return { categorias, produtos }
})
