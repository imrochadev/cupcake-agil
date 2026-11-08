import { waitUntil } from '@vercel/functions'
import { checkoutSchema } from '#shared/schemas'
import { finalizarCompra } from '../../models/pedido'

// Checkout (CUPC-10): endereço, telefone e forma de pagamento. O pagamento é simulado (shared/pagamento.ts).
export default defineEventHandler(async (event) => {
  const usuario = await exigirUsuario(event)
  limitar(`checkout:${usuario.id}`, 20, 10 * 60_000)
  const entrada = await lerCorpo(event, checkoutSchema)
  const pedido = await semErroDeModelo(finalizarCompra(usuario.id, entrada))
  // "Salvar como meu endereço padrão": vai para a conta pelo próprio login, que confere o formato. Se falhar, o pedido
  // já foi feito e não volta atrás.
  if (entrada.salvarEndereco) {
    await auth().api.updateUser({ headers: event.headers, body: { endereco: JSON.stringify(entrada.endereco), telefone: entrada.telefone } })
      .catch(erro => console.warn('[pedido] endereço padrão não salvo:', erro instanceof Error ? erro.message : erro))
  }
  // O e-mail sai depois da resposta (o cliente não espera o SMTP). É o waitUntil da própria Vercel que segura a função
  // até o envio terminar: o event.waitUntil do Nitro, no runtime Node da Vercel, só guarda a promessa (a função podia
  // congelar antes de enviar). Fora da Vercel (testes, local), a promessa só corre normalmente.
  waitUntil(enviarPedidoConfirmado(event, usuario.email, usuario.nome, pedido))
  setResponseStatus(event, 201)
  return pedido
})
