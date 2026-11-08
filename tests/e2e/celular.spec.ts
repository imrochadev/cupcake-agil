import { adicionar, criarConta, expect, test } from './ajuda'

// No celular: menu da conta, cardápio em uma coluna e checkout sem rolagem lateral.
test('fluxo no celular cabe na tela', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Menu da conta' }).click()
  await expect(page.getByRole('link', { name: 'Criar conta' })).toBeVisible()

  await criarConta(page)
  await adicionar(page, 'Limão Siciliano')
  for (const caminho of ['/', '/carrinho', '/checkout']) {
    await page.goto(caminho)
    await page.waitForLoadState('networkidle')
    const larguras = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
    expect(larguras[0], `rolagem lateral em ${caminho}`).toBeLessThanOrEqual(larguras[1]!)
  }
})
