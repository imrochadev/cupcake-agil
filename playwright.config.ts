import { defineConfig, devices } from '@playwright/test'

// Testes de ponta a ponta (tests/e2e): o navegador usando a loja como uma pessoa usaria. Sobem o build de produção
// com um MongoDB em memória (scripts/servidor-teste.ts) e a entrega simulada com etapas de 3 s.
// Antes da primeira vez: `pnpm build` e `pnpm exec playwright install chromium`. E2E_BASE_URL testa outro servidor.
const PORT = Number(process.env.E2E_PORT ?? 3200)
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    locale: 'pt-BR',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', testIgnore: /celular/ },
    { name: 'celular', testMatch: /celular/, use: { ...devices['Pixel 7'] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'node scripts/servidor-teste.ts',
        url: `${baseURL}/api/config`,
        env: { PORT: String(PORT), NUXT_ETAPA_MINUTOS: '0.05' },
        reuseExistingServer: false,
        timeout: 120_000,
      },
})
