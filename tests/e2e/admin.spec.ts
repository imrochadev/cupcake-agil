import { ADMIN_TESTE } from '../../scripts/servidor-teste'
import { criarConta, expect, test } from './ajuda'

// Painel (CUPC-12): só para administradores; cadastra produto, muda etapa de pedido e lê os feedbacks.

test('cliente comum não abre o painel', async ({ page }) => {
  await criarConta(page)
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('link', { name: 'Painel' })).toHaveCount(0)
})

test('administrador cadastra um produto que aparece no cardápio e lê os feedbacks', async ({ page }) => {
  await criarConta(page, ADMIN_TESTE)
  await page.getByRole('link', { name: 'Painel' }).click()
  await expect(page.getByText('Faturamento')).toBeVisible()

  await page.getByRole('button', { name: 'Novo produto' }).click()
  const modal = page.getByRole('dialog', { name: 'Novo produto' })
  await modal.getByLabel('Nome').fill('Cupcake de Paçoca')
  await modal.getByLabel('Descrição').fill('Massa de amendoim com cobertura de paçoca esfarelada.')
  await modal.getByLabel('Categoria').selectOption({ label: 'Especiais' })
  await modal.getByLabel('Preço (R$)').fill('12,50')
  await modal.getByLabel('Estoque').fill('8')
  await modal.getByRole('button', { name: 'Salvar produto' }).click()
  await expect(page.getByText('Cupcake de Paçoca salvo.')).toBeVisible()
  await expect(page.getByRole('row', { name: /Cupcake de Paçoca/ })).toContainText('R$ 12,50')

  await page.goto('/')
  await expect(page.getByRole('article', { name: 'Cupcake de Paçoca' })).toContainText('R$ 12,50')

  await page.goto('/admin/feedbacks')
  await expect(page.getByRole('button', { name: 'Imprimir / salvar PDF' })).toBeVisible()
})
