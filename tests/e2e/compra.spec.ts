import { adicionar, criarConta, expect, test } from './ajuda'

// Jornada principal do cliente: conta, cardápio, carrinho, checkout, rastreamento e histórico.

test('visitante vê o cardápio e precisa entrar para comprar', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Clássicos' })).toBeVisible()
  await expect(page.getByRole('article', { name: 'Pistache' }).getByText('Esgotado')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Adicionar Pistache ao carrinho' })).toBeDisabled()
  await page.getByRole('button', { name: 'Adicionar Red Velvet ao carrinho' }).click()
  await expect(page).toHaveURL(/\/entrar\?voltar=/)
})

test('compra com PIX e leva o pedido até a entrega pela alteração de status de teste', async ({ page }) => {
  await criarConta(page)
  await adicionar(page, 'Red Velvet', 2)
  await adicionar(page, 'Baunilha Clássico')
  await expect(page.getByRole('link', { name: 'Carrinho, 3 item(ns)' })).toBeVisible()

  await page.getByRole('link', { name: /Carrinho/ }).click()
  await expect(page.getByTestId('total-carrinho')).toHaveText('R$ 42,70')
  await page.getByRole('button', { name: 'Aumentar Baunilha Clássico' }).click()
  await expect(page.getByTestId('total-carrinho')).toHaveText('R$ 52,60')
  await page.getByRole('link', { name: 'Finalizar compra' }).click()

  // O endereço e o telefone do cadastro já vêm preenchidos.
  await expect(page.getByLabel('Rua *')).toHaveValue('Avenida Paulista')
  await expect(page.getByLabel('Número *', { exact: true })).toHaveValue('1000')
  await expect(page.getByLabel('Telefone *')).toHaveValue('(11) 91234-5678')
  await page.getByRole('button', { name: 'Pagar R$ 52,60' }).click()

  await expect(page.getByText('Pedido confirmado!').first()).toBeVisible()
  await expect(page.getByText('PIX (simulado)')).toBeVisible()
  await expect(page.getByTestId('status-pedido')).toHaveText('Pedido recebido')
  // "Alteração de status de teste": o cliente avança o próprio pedido até a entrega.
  const botao = page.getByRole('button', { name: 'Alteração de status de teste' })
  for (const etapa of ['Em preparo', 'Saiu para entrega', 'Entregue']) {
    await botao.click()
    await expect(page.getByTestId('status-pedido')).toHaveText(etapa)
  }
  await expect(botao).toBeHidden()

  await page.getByRole('link', { name: '← Meus pedidos' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: /Pedido #[A-F\d]{6}/ })).toHaveCount(1)
  await page.getByRole('button', { name: 'Pedir de novo' }).click()
  await expect(page).toHaveURL(/\/carrinho$/)
  await expect(page.getByTestId('total-carrinho')).toHaveText('R$ 52,60')
})

test('erro no checkout leva até o campo, com o endereço em campos separados', async ({ page }) => {
  await criarConta(page)
  await adicionar(page, 'Red Velvet')
  await page.goto('/checkout')
  await page.getByLabel('Número *', { exact: true }).fill('')
  await page.getByRole('button', { name: /Pagar/ }).click()
  await expect(page.getByText('Número: obrigatório.')).toBeVisible()
  await expect(page.getByLabel('Número *', { exact: true })).toBeFocused()
  await expect(page.getByLabel('Número *', { exact: true })).toBeInViewport()
})

test('cartão recusado mostra o motivo e o carrinho continua lá', async ({ page }) => {
  await criarConta(page)
  await adicionar(page, 'Chocolate Belga')
  await page.goto('/checkout')
  await page.getByText('Cartão de crédito').click()

  // Validação na tela antes de enviar.
  await page.getByLabel('Número do cartão').fill('1234 5678')
  await page.getByRole('button', { name: /Pagar/ }).click()
  await expect(page.getByText('Número do cartão inválido. Confira os dígitos.')).toBeVisible()

  await page.getByRole('button', { name: '4000… 0002 recusado' }).click()
  await page.getByRole('button', { name: /Pagar/ }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Pagamento recusado pela operadora' })).toBeVisible()

  await page.getByRole('button', { name: '4242… aprovado' }).click()
  await page.getByRole('button', { name: /Pagar/ }).click()
  await expect(page.getByText('Pedido confirmado!').first()).toBeVisible()
  await expect(page.getByText(/Visa final 4242/)).toBeVisible()
})

test('login com senha errada mostra o erro', async ({ page }) => {
  const email = await criarConta(page)
  await page.getByRole('button', { name: 'Menu da conta' }).click()
  await page.getByRole('button', { name: 'Sair' }).click()
  await page.goto('/entrar')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill('senha-errada')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByText('E-mail ou senha incorretos.')).toBeVisible()
  await page.getByLabel('Senha', { exact: true }).fill('senha-forte-123')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByText('Que bom te ver, Joana!')).toBeVisible()
})

test('melhorias da validação: QR Code do PIX, aviso do pedido a caminho e endereço salvo na conta', async ({ page }) => {
  await page.goto('/cadastro')
  await page.getByLabel('Nome *', { exact: true }).fill('Mateus Teste')
  await page.getByLabel('E-mail *', { exact: true }).fill(`e2e-melhorias-${Date.now()}@teste.dev`)
  await page.getByLabel('Senha *', { exact: true }).fill('senha-forte-123')
  await page.getByLabel('Confirme a senha *').fill('senha-forte-123')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByText('Conta criada!')).toBeVisible()

  // Conta sem endereço: digita no checkout e marca "salvar como padrão" (já vem marcado).
  await adicionar(page, 'Red Velvet')
  await page.goto('/checkout')
  await expect(page.getByText('Usar um endereço anterior')).toBeHidden()
  await page.getByLabel('CEP *').pressSequentially('01310100')
  await expect(page.getByLabel('Rua *')).toHaveValue('Avenida Paulista')
  await page.getByLabel('Número *', { exact: true }).fill('1578')
  await page.getByLabel('Telefone *').pressSequentially('11912345678')
  await expect(page.getByLabel(/Salvar este endereço/)).toBeChecked()
  await page.getByRole('button', { name: /Pagar/ }).click()

  await expect(page.getByRole('img', { name: 'QR Code do PIX' }).locator('svg')).toBeVisible()
  // Fora da tela do pedido, o aviso leva de volta a ele.
  await page.getByRole('link', { name: 'Cardápio' }).first().click()
  await expect(page.getByText(/Seu pedido #[A-F\d]{6} está a caminho/)).toBeVisible()
  await page.getByRole('link', { name: 'Acompanhar pedido' }).click()
  await expect(page.getByTestId('status-pedido')).toHaveText('Pedido recebido')

  // O endereço ficou na conta e volta na próxima compra, junto com a lista de anteriores.
  await page.getByRole('button', { name: 'Menu da conta' }).click()
  await page.getByRole('link', { name: 'Minha conta' }).click()
  await expect(page.getByLabel('Número *', { exact: true })).toHaveValue('1578')
  await expect(page.getByLabel('Telefone')).toHaveValue('(11) 91234-5678')
  await adicionar(page, 'Baunilha Clássico')
  await page.goto('/checkout')
  await expect(page.getByLabel('Número *', { exact: true })).toHaveValue('1578')
  await expect(page.getByRole('button', { name: /Avenida Paulista, 1578/ })).toBeVisible()
})
