import { expect, test } from './ajuda'

// Modal de feedback dos testadores: abre pelo link que vai para os amigos (?feedback=1) e pelo botão.
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==', 'base64')

test('envia o feedback com captura de tela, sem precisar de conta', async ({ page }) => {
  await page.goto('/?feedback=1')
  const modal = page.getByRole('dialog', { name: 'Avalie a Cupcake Ágil' })
  await expect(modal).toBeVisible()

  await modal.getByRole('button', { name: 'Enviar feedback' }).click()
  await expect(modal.getByRole('alert')).toContainText('Conte pelo menos')

  await modal.getByLabel('Seu nome *').fill('Carlos Amigo')
  await modal.getByLabel('O que você testou e funcionou').fill('Criei a conta e paguei com PIX.')
  await modal.getByLabel('O que testou e não funcionou (e o que deve ser corrigido)').fill('Nada travou.')
  await modal.getByLabel('O que não testou (e por quê)').fill('Login com Google: não tinha o botão.')
  await modal.getByRole('button', { name: '4 de 5' }).click()
  await modal.locator('input[type=file]').setInputFiles({ name: 'tela.png', mimeType: 'image/png', buffer: PNG_1PX })
  await expect(modal.getByAltText('Prévia da captura de tela')).toBeVisible()
  await modal.getByRole('button', { name: 'Enviar feedback' }).click()

  await expect(modal.getByText('Feedback enviado. Muito obrigado!')).toBeVisible()
  await modal.getByRole('button', { name: 'Fechar', exact: true }).last().click()
  await expect(modal).toBeHidden()

  // O nome fica lembrado para o próximo envio.
  await page.getByRole('button', { name: 'Avaliar o site' }).click()
  await expect(modal.getByLabel('Seu nome *')).toHaveValue('Carlos Amigo')
  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()
})
