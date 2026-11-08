import type { CarrinhoDTO } from '#shared/tipos'

// Carrinho da conta (guardado no servidor). O contador do cabeçalho lê daqui.
export function useCarrinho() {
  const carrinho = useState<CarrinhoDTO | null>('carrinho', () => null)
  const quantidade = computed(() => carrinho.value?.quantidade ?? 0)

  async function carregar() {
    carrinho.value = await api<CarrinhoDTO>('/api/carrinho')
    return carrinho.value
  }
  async function adicionar(produtoId: string, quantidade = 1) {
    carrinho.value = await api<CarrinhoDTO>('/api/carrinho/itens', { method: 'POST', body: { produtoId, quantidade } })
  }
  async function definir(produtoId: string, quantidade: number) {
    carrinho.value = await api<CarrinhoDTO>(`/api/carrinho/itens/${produtoId}`, { method: 'PUT', body: { quantidade } })
  }
  async function remover(produtoId: string) {
    carrinho.value = await api<CarrinhoDTO>(`/api/carrinho/itens/${produtoId}`, { method: 'DELETE' })
  }
  function esquecer() {
    carrinho.value = null
  }

  return { carrinho, quantidade, carregar, adicionar, definir, remover, esquecer }
}
