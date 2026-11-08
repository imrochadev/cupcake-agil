import type { TestProject } from 'vitest/node'
import { subirServidor } from '../../scripts/servidor-teste'

// Um servidor (build de produção + MongoDB em memória) para todos os testes de integração.
// Etapa da entrega simulada bem curta (3 s) para testar o rastreamento sem esperar minutos.
export default async function ({ provide }: TestProject) {
  const { base, parar } = await subirServidor(Number(process.env.INTEGRACAO_PORTA ?? 3150), { NUXT_ETAPA_MINUTOS: '0.05' })
  provide('base', base)
  return parar
}

declare module 'vitest' {
  export interface ProvidedContext {
    base: string
  }
}
