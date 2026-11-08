import { randomInt, randomUUID } from 'node:crypto'
import { expect, test as base, type Page } from '@playwright/test'

// Cada teste finge um IP próprio (os limites de cadastro e login são por IP) e começa sem sessão.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}` })
    // BrasilAPI de mentira: o teste não depende da internet nem do serviço de CEP estar no ar.
    await page.route('https://brasilapi.com.br/api/cep/**', route => route.fulfill({
      json: { cep: '01310100', state: 'SP', city: 'São Paulo', neighborhood: 'Bela Vista', street: 'Avenida Paulista' },
    }))
    await use(page)
  },
})
export { expect }

export async function criarConta(page: Page, email = `e2e-${randomUUID().slice(0, 8)}@teste.dev`) {
  await page.goto('/cadastro')
  await page.getByLabel('Nome *', { exact: true }).fill('Joana Teste')
  await page.getByLabel('E-mail *', { exact: true }).fill(email)
  await page.getByLabel('Senha *', { exact: true }).fill('senha-forte-123')
  await page.getByLabel('Confirme a senha *').fill('senha-forte-123')
  await page.getByLabel('Telefone', { exact: true }).pressSequentially('11912345678')
  await expect(page.getByLabel('Telefone', { exact: true })).toHaveValue('(11) 91234-5678')
  // CEP preenche rua, bairro, cidade e UF; falta o número.
  await page.getByLabel('CEP *').pressSequentially('01310100')
  await expect(page.getByLabel('Rua *')).toHaveValue('Avenida Paulista')
  await page.getByLabel('Número *', { exact: true }).fill('1000')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByText('Conta criada!')).toBeVisible()
  return email
}

export async function adicionar(page: Page, produto: string, vezes = 1) {
  await page.goto('/')
  for (let i = 0; i < vezes; i++) {
    await page.getByRole('button', { name: `Adicionar ${produto} ao carrinho` }).click()
    await expect(page.getByText(`${produto} no carrinho!`).last()).toBeVisible()
  }
}
