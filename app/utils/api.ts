// Chamadas à API com a mensagem de erro que o servidor mandou (server/utils/http.ts, `falhar`), pronta para a tela.

export class ErroApi extends Error {
  constructor(message: string, readonly status: number, readonly campo?: string) {
    super(message)
  }
}

interface ErroFetch {
  status?: number
  statusCode?: number
  data?: { mensagem?: string, message?: string, campo?: string, data?: { mensagem?: string, campo?: string } }
}

export function erroDe(e: unknown): ErroApi {
  if (e instanceof ErroApi) return e
  const f = (e ?? {}) as ErroFetch
  const status = f.status ?? f.statusCode ?? 0
  const dados = f.data?.data ?? f.data
  const mensagem = dados?.mensagem ?? f.data?.message
    ?? (status === 0 ? 'Sem conexão com a loja. Confira sua internet e tente de novo.' : 'Algo deu errado do nosso lado. Tente de novo em instantes.')
  return new ErroApi(mensagem, status, dados?.campo)
}

type Opcoes = { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', body?: Record<string, unknown> | FormData, query?: Record<string, unknown> }

export async function api<T>(url: string, opcoes: Opcoes = {}): Promise<T> {
  try {
    return (await $fetch<T>(url, opcoes)) as T
  } catch (e) {
    throw erroDe(e)
  }
}
