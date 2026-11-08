import { spawn } from 'node:child_process'
import { MongoMemoryServer } from 'mongodb-memory-server'

// Sobe o build de produção (.output) com um MongoDB em memória, zerado: base dos testes de integração (Vitest) e de
// ponta a ponta (Playwright). Rodar direto (`node scripts/servidor-teste.ts`) deixa o servidor no ar até Ctrl+C.
// Antes: `pnpm build`. Na primeira vez o mongodb-memory-server baixa o binário do MongoDB (fica em cache).

export const ADMIN_TESTE = 'admin@teste.dev'

export async function subirServidor(porta: number, env: Record<string, string> = {}) {
  const mongo = await MongoMemoryServer.create()
  const base = `http://localhost:${porta}`
  const servidor = spawn(process.execPath, ['.output/server/index.mjs'], {
    env: {
      ...process.env,
      PORT: String(porta),
      DATABASE_URL: mongo.getUri('cupcake_teste'),
      BETTER_AUTH_SECRET: 'segredo-so-para-testes-com-mais-de-32-caracteres',
      BETTER_AUTH_URL: base,
      NUXT_ADMIN_EMAILS: ADMIN_TESTE,
      // Os testes fingem clientes diferentes pelo X-Forwarded-For (os limites são por IP).
      NUXT_CONFIAR_PROXY: '1',
      MAIL_HOST: '',
      ...env,
    },
    stdio: ['ignore', 'inherit', 'inherit'],
  })
  const parar = async () => {
    servidor.kill()
    await mongo.stop()
  }
  // Pronto quando o cardápio inicial já foi criado.
  const limite = Date.now() + 60_000
  for (;;) {
    if (servidor.exitCode !== null) {
      await mongo.stop()
      throw new Error(`o servidor saiu com código ${servidor.exitCode}: rodou o \`pnpm build\`?`)
    }
    try {
      const r = await fetch(`${base}/api/catalogo`)
      if (r.ok && (await r.json()).produtos.length) break
    } catch {}
    if (Date.now() > limite) {
      await parar()
      throw new Error('o servidor de teste não respondeu em 60 s')
    }
    await new Promise(ok => setTimeout(ok, 250))
  }
  return { base, parar }
}

if (import.meta.main) {
  const { base, parar } = await subirServidor(Number(process.env.PORT ?? 3200), { NUXT_ETAPA_MINUTOS: process.env.NUXT_ETAPA_MINUTOS ?? '2' })
  console.info(`[teste] servidor em ${base}`)
  for (const sinal of ['SIGINT', 'SIGTERM'] as const) process.on(sinal, () => parar().then(() => process.exit(0)))
}
