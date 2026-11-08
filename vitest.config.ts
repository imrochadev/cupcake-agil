import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Dois grupos de teste:
// - unit: regras puras de shared/ (preço, pagamento, etapas do pedido, validações), sem banco nem servidor;
// - integration: a API de verdade (build de produção + MongoDB em memória), pelo HTTP, como as telas usam.
// Os de ponta a ponta, no navegador, ficam em tests/e2e (Playwright).
const shared = fileURLToPath(new URL('./shared', import.meta.url))

export default defineConfig({
  resolve: { alias: { '#shared': shared } },
  test: {
    projects: [
      {
        resolve: { alias: { '#shared': shared } },
        test: { name: 'unit', include: ['tests/unit/**/*.test.ts'], environment: 'node' },
      },
      {
        resolve: { alias: { '#shared': shared } },
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          environment: 'node',
          globalSetup: ['tests/integration/setup.ts'],
          // Um arquivo por vez: o banco é um só.
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 120_000,
        },
      },
    ],
  },
})
