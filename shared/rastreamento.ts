// Etapas do pedido (CUPC-11). A entrega é simulada: enquanto o administrador não mexe no pedido, ele anda sozinho uma
// etapa a cada `passoMs`. Quando o administrador muda o status, a simulação daquele pedido para.

export const ETAPAS = ['recebido', 'em_preparo', 'saiu_para_entrega', 'entregue'] as const
export type Etapa = typeof ETAPAS[number]
export type StatusPedido = Etapa | 'cancelado'

export const STATUS: Record<StatusPedido, string> = {
  recebido: 'Pedido recebido',
  em_preparo: 'Em preparo',
  saiu_para_entrega: 'Saiu para entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

export interface EventoPedido {
  status: StatusPedido
  em: Date
}

export function finalizado(status: StatusPedido): boolean {
  return status === 'entregue' || status === 'cancelado'
}

export function proximaEtapa(status: StatusPedido): Etapa | null {
  if (status === 'cancelado') return null
  return ETAPAS[ETAPAS.indexOf(status as Etapa) + 1] ?? null
}

/** O administrador só avança uma etapa por vez, ou cancela o que ainda não foi entregue. */
export function podeMudar(atual: StatusPedido, novo: StatusPedido): boolean {
  if (finalizado(atual)) return false
  if (novo === 'cancelado') return true
  return proximaEtapa(atual) === novo
}

/** Previsão de entrega: as três etapas depois do recebimento. */
export function previsaoEntrega(criadoEm: Date, passoMs: number): Date {
  return new Date(criadoEm.getTime() + passoMs * (ETAPAS.length - 1))
}

/**
 * Eventos que faltam na entrega simulada até `agora`, cada um no horário em que a etapa teria acontecido.
 * Vazio se o pedido não é simulado, já terminou ou ainda não chegou a hora da próxima etapa.
 */
export function eventosSimulados(pedido: { status: StatusPedido, criadoEm: Date, simulado: boolean }, agora: Date, passoMs: number): EventoPedido[] {
  if (!pedido.simulado || finalizado(pedido.status) || passoMs <= 0) return []
  const decorridas = Math.floor((agora.getTime() - pedido.criadoEm.getTime()) / passoMs)
  const alvo = Math.min(ETAPAS.length - 1, Math.max(0, decorridas))
  const eventos: EventoPedido[] = []
  for (let i = ETAPAS.indexOf(pedido.status as Etapa) + 1; i <= alvo; i++) {
    eventos.push({ status: ETAPAS[i]!, em: new Date(pedido.criadoEm.getTime() + passoMs * i) })
  }
  return eventos
}
