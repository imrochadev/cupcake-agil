import { createAuthClient } from 'better-auth/vue'
import type { UsuarioDTO } from '#shared/tipos'

// Conta de quem está usando (Better Auth em /api/auth) e o perfil completo vindo de /api/eu.
export const authClient = createAuthClient({ basePath: '/api/auth' })

export function useSessao() {
  const usuario = useState<UsuarioDTO | null>('usuario', () => null)
  const carregado = useState('usuario:carregado', () => false)

  async function atualizar(): Promise<UsuarioDTO | null> {
    try {
      usuario.value = await $fetch<UsuarioDTO | null>('/api/eu')
    } catch {
      usuario.value = null
    }
    carregado.value = true
    return usuario.value
  }

  async function garantir(): Promise<UsuarioDTO | null> {
    return carregado.value ? usuario.value : atualizar()
  }

  async function sair() {
    await authClient.signOut().catch(() => {})
    usuario.value = null
    useCarrinho().esquecer()
    await navigateTo('/')
  }

  return { usuario, carregado, atualizar, garantir, sair }
}

/** Mensagem de um erro do Better Auth em português (pelo código; senão, a do servidor ou uma genérica). */
export function erroDeConta(erro: { code?: string, status?: number, message?: string } | null | undefined): string {
  const porCodigo: Record<string, string> = {
    INVALID_EMAIL_OR_PASSWORD: 'E-mail ou senha incorretos.',
    USER_ALREADY_EXISTS: 'Já existe uma conta com este e-mail. Entre ou recupere a senha.',
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Já existe uma conta com este e-mail. Entre ou recupere a senha.',
    PASSWORD_TOO_SHORT: 'A senha precisa de pelo menos 8 caracteres.',
    PASSWORD_TOO_LONG: 'Senha longa demais.',
    INVALID_EMAIL: 'E-mail inválido.',
    INVALID_TOKEN: 'Este link de senha nova expirou ou já foi usado. Peça outro.',
  }
  if (erro?.status === 429) return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.'
  if (erro?.code && porCodigo[erro.code]) return porCodigo[erro.code]!
  if (erro?.status === 400 && erro.message) return erro.message
  return 'Não foi possível concluir agora. Tente de novo.'
}

/** Só caminhos do próprio site (o "voltar" do login nunca leva para fora). */
export function caminhoSeguro(valor: unknown): string {
  return typeof valor === 'string' && valor.startsWith('/') && !valor.startsWith('//') ? valor : '/'
}
