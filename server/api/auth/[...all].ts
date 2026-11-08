// Rotas das contas (Better Auth): cadastro, login, sair, senha nova e retorno do Google/GitHub. Ver server/utils/auth.ts.
export default defineEventHandler((event) => {
  const request = toWebRequest(event)
  const headers = new Headers(request.headers)
  // O limite de tentativas conta pelo IP em que o app confia, nunca por um cabeçalho escolhido pelo cliente.
  headers.set(IP_CONFIAVEL, ipDo(event))
  return auth().handler(new Request(request, { headers }))
})
