// Depois de uma validação que falhou: rola até o primeiro campo com erro (ou o primeiro aviso) e põe o foco nele,
// para a pessoa não ficar procurando o que corrigir (no celular o erro costuma estar fora da tela).
export async function rolarParaErro(raiz?: HTMLElement | null) {
  await nextTick()
  const base = raiz ?? document
  const alvo = base.querySelector<HTMLElement>('[aria-invalid="true"]') ?? base.querySelector<HTMLElement>('[role="alert"]')
  if (!alvo) return
  alvo.scrollIntoView({ behavior: 'smooth', block: 'center' })
  if (alvo.matches('input, select, textarea')) alvo.focus({ preventScroll: true })
}
