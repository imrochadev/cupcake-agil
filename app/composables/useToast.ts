// Avisos rápidos no canto da tela (adicionado ao carrinho, pedido mudou de etapa…).
export interface Toast {
  id: number
  texto: string
  tipo: 'ok' | 'erro' | 'info'
}

let proximo = 1

export function useToast() {
  const toasts = useState<Toast[]>('toasts', () => [])
  function avisar(texto: string, tipo: Toast['tipo'] = 'ok') {
    const id = proximo++
    toasts.value = [...toasts.value.slice(-2), { id, texto, tipo }]
    setTimeout(() => fechar(id), tipo === 'erro' ? 6000 : 3500)
  }
  function fechar(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }
  return { toasts, avisar, fechar }
}
