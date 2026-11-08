import { enderecosUsados } from '../../models/pedido'

// Endereços dos últimos pedidos, para escolher um no checkout sem digitar de novo (pedido do testador Mateus).
export default defineEventHandler(async (event) => {
  const usuario = await exigirUsuario(event)
  return enderecosUsados(usuario.id)
})
