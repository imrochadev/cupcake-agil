// Painel: só administradores (o servidor confere de novo em toda rota /api/admin).
export default defineNuxtRouteMiddleware(async (to) => {
  const usuario = await useSessao().garantir()
  if (!usuario) return navigateTo({ path: '/entrar', query: { voltar: to.fullPath } })
  if (usuario.perfil !== 'admin') return navigateTo('/')
})
