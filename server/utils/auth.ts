import type { H3Event } from 'h3'
import { betterAuth } from 'better-auth'
import { mongodbAdapter } from 'better-auth/adapters/mongodb'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { telefoneSchema } from '#shared/schemas'
import { lerEnderecoSalvo } from '#shared/endereco'
import type { Perfil, UsuarioDTO } from '#shared/tipos'
import { getDb } from '../models/db'

// Contas (Better Auth, CUPC-6 e CUPC-7): e-mail e senha, Google e GitHub. Rotas em /api/auth/* (server/api/auth/
// [...all].ts), retorno do OAuth em /api/auth/callback/<provedor>. Usa o mesmo MongoDB (user, session, account,
// verification). A senha é guardada com hash (scrypt) pelo próprio Better Auth; a sessão vai num cookie httpOnly.
//
// Variáveis: BETTER_AUTH_SECRET (obrigatória em produção), BETTER_AUTH_URL, GOOGLE_CLIENT_ID/SECRET e
// GITHUB_CLIENT_ID/SECRET (cada botão só aparece com as duas do provedor) e NUXT_ADMIN_EMAILS.

/** Cabeçalho com o IP em que o app confia, reescrito em toda requisição (o limite de tentativas conta por ele). */
export const IP_CONFIAVEL = 'x-cupcake-client-ip'

function provedores() {
  const env = process.env
  return {
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, prompt: 'select_account' as const } }
      : {}),
    ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
      ? { github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET } }
      : {}),
  }
}

export function provedoresSociais(): ('google' | 'github')[] {
  return Object.keys(provedores()) as ('google' | 'github')[]
}

function emailsAdmin(): string[] {
  return String(useRuntimeConfig().adminEmails || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
}

function criarAuth() {
  return betterAuth({
    appName: 'Cupcake Ágil',
    basePath: '/api/auth',
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? '').split(',').map(o => o.trim()).filter(Boolean),
    database: mongodbAdapter(getDb()),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      autoSignIn: true,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      sendResetPassword: async ({ user, url }) => {
        await enviarLinkDeSenha(user.email, user.name, url)
      },
      // Aviso de segurança depois que a senha foi trocada pelo link.
      onPasswordReset: async ({ user }) => {
        await enviarSenhaAlterada(user.email, user.name)
      },
    },
    socialProviders: provedores(),
    // Entrar com Google e GitHub do mesmo e-mail cai na mesma conta.
    account: { accountLinking: { enabled: true, trustedProviders: ['google', 'github'] } },
    user: {
      additionalFields: {
        /** 'admin' abre o painel. Ninguém se promove pela API: vem de NUXT_ADMIN_EMAILS na criação da conta. */
        role: { type: 'string', required: false, input: false, defaultValue: 'cliente' },
        telefone: { type: 'string', required: false, input: true },
        endereco: { type: 'string', required: false, input: true },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async user => ({ data: { ...user, role: emailsAdmin().includes(user.email.toLowerCase()) ? 'admin' : 'cliente' } }),
          // Boas-vindas (e-mail e senha, Google ou GitHub). Falha no envio não impede a conta de ser criada.
          after: async (user) => {
            await enviarBoasVindas(user.email, user.name)
          },
        },
      },
    },
    hooks: {
      // Cadastro e edição da conta: telefone e endereço no formato certo (CUPC-6, CA-5).
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== '/sign-up/email' && ctx.path !== '/update-user') return
        const body = (ctx.body ?? {}) as Record<string, unknown>
        if (body.telefone && !telefoneSchema.safeParse(body.telefone).success) {
          throw new APIError('BAD_REQUEST', { message: 'Telefone inválido: use DDD + número, ex.: (11) 91234-5678.' })
        }
        // Endereço vem como JSON com os campos separados (CEP, rua, número…), igual ao do checkout.
        if (body.endereco !== undefined && body.endereco !== null && (typeof body.endereco !== 'string' || body.endereco.length > 600 || !lerEnderecoSalvo(body.endereco))) {
          throw new APIError('BAD_REQUEST', { message: 'Endereço incompleto: confira CEP, rua, número, bairro, cidade e UF.' })
        }
        if (typeof body.name === 'string' && (body.name.trim().length < 2 || body.name.length > 80)) {
          throw new APIError('BAD_REQUEST', { message: 'Nome: entre 2 e 80 caracteres.' })
        }
      }),
    },
    // Proteção contra tentativas repetidas (CUPC-7, CT-4): por IP, 5 logins e 5 cadastros por minuto; o resto, 30.
    rateLimit: {
      enabled: true,
      window: 60,
      max: 30,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 60, max: 5 },
        '/request-password-reset': { window: 60 * 10, max: 3 },
      },
    },
    advanced: { cookiePrefix: 'cupcake', ipAddress: { ipAddressHeaders: [IP_CONFIAVEL] } },
  })
}

const g = globalThis as { __cupcakeAuth?: ReturnType<typeof criarAuth> }

export function auth() {
  g.__cupcakeAuth ??= criarAuth()
  return g.__cupcakeAuth
}

export async function usuarioDa(event: H3Event): Promise<UsuarioDTO | null> {
  const sessao = await auth().api.getSession({ headers: event.headers })
  if (!sessao) return null
  const u = sessao.user as typeof sessao.user & { role?: string, telefone?: string | null, endereco?: string | null }
  return {
    id: u.id,
    nome: u.name,
    email: u.email,
    telefone: u.telefone ?? null,
    endereco: lerEnderecoSalvo(u.endereco),
    perfil: (u.role === 'admin' ? 'admin' : 'cliente') satisfies Perfil,
  }
}

export async function exigirUsuario(event: H3Event): Promise<UsuarioDTO> {
  const usuario = await usuarioDa(event)
  if (!usuario) falhar(401, 'Entre na sua conta para continuar.')
  return usuario
}

export async function exigirAdmin(event: H3Event): Promise<UsuarioDTO> {
  const usuario = await exigirUsuario(event)
  if (usuario.perfil !== 'admin') falhar(403, 'Área restrita aos administradores da loja.')
  return usuario
}
