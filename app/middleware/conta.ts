// Páginas que pedem login: sem conta, vai para /entrar e volta para cá depois.
export default defineNuxtRouteMiddleware(async (to) => {
  if (!(await useSessao().garantir())) return navigateTo({ path: '/entrar', query: { voltar: to.fullPath } })
})
