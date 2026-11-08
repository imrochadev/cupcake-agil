import { conectar } from '../models/db'

// Conecta ao MongoDB antes de qualquer rota da API; sem banco, responde 503 com uma mensagem clara.
export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/api/')) return
  try {
    await conectar()
  } catch (erro) {
    console.error('[banco] sem conexão:', erro instanceof Error ? erro.message : erro)
    falhar(503, 'A loja está fora do ar por um instante. Tente de novo em alguns segundos.')
  }
})
