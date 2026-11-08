import { describe, expect, it } from 'vitest'
import { eventosSimulados, podeMudar, previsaoEntrega, proximaEtapa } from '#shared/rastreamento'

const MIN = 60_000
const criadoEm = new Date('2026-11-07T12:00:00Z')
const depois = (minutos: number) => new Date(criadoEm.getTime() + minutos * MIN)

describe('etapas do pedido', () => {
  it('segue recebido → em preparo → saiu para entrega → entregue', () => {
    expect(proximaEtapa('recebido')).toBe('em_preparo')
    expect(proximaEtapa('em_preparo')).toBe('saiu_para_entrega')
    expect(proximaEtapa('saiu_para_entrega')).toBe('entregue')
    expect(proximaEtapa('entregue')).toBeNull()
    expect(proximaEtapa('cancelado')).toBeNull()
  })

  it('o administrador avança uma etapa por vez ou cancela antes da entrega', () => {
    expect(podeMudar('recebido', 'em_preparo')).toBe(true)
    expect(podeMudar('recebido', 'entregue')).toBe(false)
    expect(podeMudar('em_preparo', 'recebido')).toBe(false)
    expect(podeMudar('saiu_para_entrega', 'cancelado')).toBe(true)
    expect(podeMudar('entregue', 'cancelado')).toBe(false)
    expect(podeMudar('cancelado', 'em_preparo')).toBe(false)
  })

  it('previsão de entrega: três etapas depois do pedido', () => {
    expect(previsaoEntrega(criadoEm, 2 * MIN)).toEqual(depois(6))
  })
})

describe('eventosSimulados', () => {
  const pedido = { status: 'recebido' as const, criadoEm, simulado: true }

  it('nada antes da hora da próxima etapa', () => {
    expect(eventosSimulados(pedido, depois(1.9), 2 * MIN)).toEqual([])
  })

  it('cria as etapas que faltam, cada uma no seu horário', () => {
    expect(eventosSimulados(pedido, depois(4.5), 2 * MIN)).toEqual([
      { status: 'em_preparo', em: depois(2) },
      { status: 'saiu_para_entrega', em: depois(4) },
    ])
  })

  it('para em entregue, mesmo muito tempo depois', () => {
    const eventos = eventosSimulados(pedido, depois(500), 2 * MIN)
    expect(eventos.map(e => e.status)).toEqual(['em_preparo', 'saiu_para_entrega', 'entregue'])
  })

  it('continua de onde o pedido está', () => {
    expect(eventosSimulados({ ...pedido, status: 'em_preparo' }, depois(5), 2 * MIN).map(e => e.status)).toEqual(['saiu_para_entrega'])
  })

  it('não mexe em pedido controlado pelo administrador, terminado ou com simulação desligada', () => {
    expect(eventosSimulados({ ...pedido, simulado: false }, depois(10), 2 * MIN)).toEqual([])
    expect(eventosSimulados({ ...pedido, status: 'cancelado' }, depois(10), 2 * MIN)).toEqual([])
    expect(eventosSimulados(pedido, depois(10), 0)).toEqual([])
  })
})
