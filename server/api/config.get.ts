import type { ConfigDTO } from '#shared/tipos'

// O que as telas precisam saber do servidor: botões de login social configurados e o ritmo da entrega simulada.
export default defineEventHandler((): ConfigDTO => ({
  provedores: provedoresSociais(),
  etapaMinutos: Number(useRuntimeConfig().etapaMinutos) || 0,
}))
