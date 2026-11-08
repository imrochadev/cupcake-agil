<script setup lang="ts">
import { reais } from '#shared/dinheiro'
import { bandeira, CARTAO_APROVADO, CARTAO_RECUSADO, FORMAS, luhnValido, validadeOk, type FormaPagamento } from '#shared/pagamento'
import { telefoneSchema } from '#shared/schemas'
import { enderecoSchema, enderecoVazio, formatarEndereco, type Endereco } from '#shared/endereco'
import { formatar, MASCARAS } from '#shared/mascaras'
import type { PedidoDTO } from '#shared/tipos'

// Checkout (CUPC-10): endereço, contato e forma de pagamento (PIX, cartão ou dinheiro). Pagamento simulado.
definePageMeta({ middleware: 'conta' })
const { usuario, atualizar } = useSessao()
const { carrinho, carregar, esquecer } = useCarrinho()
const { avisar } = useToast()

const forma = ref<FormaPagamento>('pix')
const entrega = reactive({
  endereco: usuario.value?.endereco ?? enderecoVazio(),
  telefone: formatar.telefone(usuario.value?.telefone ?? ''),
  observacao: '',
})
// Endereços dos pedidos anteriores e a opção de guardar este como padrão da conta (pedido do testador Mateus).
const { data: anteriores } = useLazyFetch<Endereco[]>('/api/pedidos/enderecos', { default: () => [] })
const salvarEndereco = ref(true)
const linha = (e: Endereco) => formatarEndereco(e)
function usarAnterior(e: Endereco) {
  entrega.endereco = { ...e }
  for (const chave of Object.keys(errosEndereco)) Reflect.deleteProperty(errosEndereco, chave)
}
const errosEndereco = reactive<Record<string, string>>({})
const formulario = ref<HTMLFormElement>()
const cartao = reactive({ numero: '', nome: '', validade: '', cvv: '' })
const troco = ref('')
const erros = reactive<Record<string, string>>({})
const erroGeral = ref('')
const enviando = ref(false)

onMounted(async () => {
  const atual = await carregar().catch(() => null)
  if (!atual?.itens.length) await navigateTo('/carrinho')
})

function mascaraCartao(valor: string) {
  cartao.numero = valor.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ')
}
function mascaraValidade(valor: string) {
  const d = valor.replace(/\D/g, '').slice(0, 4)
  cartao.validade = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
}
function usarCartaoTeste(numero: string) {
  mascaraCartao(numero)
  cartao.nome ||= usuario.value?.nome ?? 'Cliente Teste'
  const ano = String((new Date().getFullYear() + 3) % 100).padStart(2, '0')
  cartao.validade = `12/${ano}`
  cartao.cvv = '123'
}

const trocoCentavos = computed(() => {
  const limpo = troco.value.replace(/[^\d,]/g, '').replace(',', '.')
  return limpo ? Math.round(Number(limpo) * 100) : null
})

// Mesmas regras do servidor (shared/), conferidas antes de enviar para a pessoa corrigir na hora.
function validar(): boolean {
  for (const chave of Object.keys(erros)) Reflect.deleteProperty(erros, chave)
  for (const chave of Object.keys(errosEndereco)) Reflect.deleteProperty(errosEndereco, chave)
  const end = enderecoSchema.safeParse(entrega.endereco)
  if (!end.success) for (const issue of end.error.issues) errosEndereco[String(issue.path[0])] ??= issue.message
  if (!telefoneSchema.safeParse(entrega.telefone).success) erros.telefone = 'Use DDD + número, ex.: (11) 91234-5678.'
  if (forma.value === 'cartao') {
    if (!luhnValido(cartao.numero)) erros.numero = 'Número do cartão inválido. Confira os dígitos.'
    if (cartao.nome.trim().length < 3) erros.nome = 'Informe o nome impresso no cartão.'
    if (!validadeOk(cartao.validade, new Date())) erros.validade = 'Validade inválida ou cartão vencido (MM/AA).'
    if (!/^\d{3,4}$/.test(cartao.cvv)) erros.cvv = '3 ou 4 dígitos.'
  }
  if (forma.value === 'dinheiro' && trocoCentavos.value !== null && carrinho.value && trocoCentavos.value < carrinho.value.total) {
    erros.trocoPara = 'O troco precisa ser para um valor maior ou igual ao total.'
  }
  return !Object.keys(erros).length && !Object.keys(errosEndereco).length
}

async function finalizar() {
  erroGeral.value = ''
  if (!validar()) return rolarParaErro(formulario.value)
  const pagamento = forma.value === 'pix'
    ? { forma: 'pix' }
    : forma.value === 'cartao'
      ? { forma: 'cartao', cartao: { ...cartao } }
      : { forma: 'dinheiro', trocoParaCentavos: trocoCentavos.value }
  enviando.value = true
  try {
    const pedido = await api<PedidoDTO>('/api/pedidos', { method: 'POST', body: { ...entrega, pagamento, salvarEndereco: salvarEndereco.value } })
    esquecer()
    carregar().catch(() => {})
    if (salvarEndereco.value) atualizar().catch(() => {})
    avisar('Pedido confirmado!')
    await navigateTo(`/pedidos/${pedido.id}?novo=1`)
  } catch (e) {
    const falha = erroDe(e)
    const campo = falha.campo?.split('.').pop()
    if (campo) (falha.campo!.startsWith('endereco.') ? errosEndereco : erros)[campo] = falha.message
    erroGeral.value = falha.message
    rolarParaErro(formulario.value)
    if (falha.status === 409) carregar().catch(() => {})
  } finally {
    enviando.value = false
  }
}

const icones: Record<FormaPagamento, string> = { pix: 'lucide:qr-code', cartao: 'lucide:credit-card', dinheiro: 'lucide:banknote' }
</script>

<template>
  <div>
    <h1 class="mb-1 text-3xl font-semibold">
      Finalizar compra
    </h1>
    <p class="mb-5 alerta bg-warn-soft text-warn">
      <Icon name="lucide:flask-conical" class="mt-0.5 shrink-0" />
      Checkout de demonstração: nenhum valor é cobrado. Não use um cartão de verdade.
    </p>

    <form
      v-if="carrinho?.itens.length"
      ref="formulario"
      class="grid gap-6 lg:grid-cols-[1fr_340px]"
      novalidate
      @submit.prevent="finalizar"
    >
      <div class="grid gap-6">
        <section class="card p-5">
          <h2 class="text-xl font-semibold">
            Entrega
          </h2>
          <div class="mt-4 grid gap-4">
            <div v-if="anteriores?.length" class="grid gap-2">
              <p class="label mb-0">
                Usar um endereço anterior
              </p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="e in anteriores"
                  :key="linha(e)"
                  type="button"
                  class="btn-outline justify-start py-2 text-left text-sm"
                  :class="{ '!border-brand !text-brand': linha(e) === linha(entrega.endereco) }"
                  @click="usarAnterior(e)"
                >
                  <Icon name="lucide:map-pin" class="shrink-0" /> {{ linha(e) }}
                </button>
              </div>
            </div>
            <EnderecoCampos v-model="entrega.endereco" :erros="errosEndereco" prefixo="entrega" />
            <label class="flex items-center gap-2 text-sm font-semibold">
              <input v-model="salvarEndereco" type="checkbox" class="size-4 accent-brand">
              Salvar este endereço e o telefone como padrão da minha conta
            </label>
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="label" for="telefone">Telefone *</label>
                <input
                  id="telefone"
                  v-model="entrega.telefone"
                  v-maska
                  :data-maska="MASCARAS.telefone"
                  type="tel"
                  class="input"
                  autocomplete="tel"
                  placeholder="(11) 91234-5678"
                  :aria-invalid="!!erros.telefone"
                >
                <p v-if="erros.telefone" class="erro">
                  {{ erros.telefone }}
                </p>
              </div>
              <div>
                <label class="label" for="obs">Observação</label>
                <input
                  id="obs"
                  v-model="entrega.observacao"
                  class="input"
                  maxlength="300"
                  placeholder="Ex.: portão azul"
                >
              </div>
            </div>
          </div>
        </section>

        <section class="card p-5">
          <h2 class="text-xl font-semibold">
            Pagamento
          </h2>
          <div class="mt-4 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Forma de pagamento">
            <label
              v-for="(rotulo, f) in FORMAS"
              :key="f"
              class="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 p-3 text-center text-sm font-bold transition"
              :class="forma === f ? 'border-brand bg-brand-soft text-brand' : 'border-line hover:border-brand/50'"
            >
              <input
                v-model="forma"
                type="radio"
                name="forma"
                :value="f"
                class="sr-only"
              >
              <Icon :name="icones[f]" class="text-2xl" />
              {{ rotulo }}
            </label>
          </div>

          <p v-if="forma === 'pix'" class="mt-4 text-sm text-muted">
            Ao confirmar, mostramos o código PIX copia e cola. Nesta demonstração o pagamento é aprovado na hora.
          </p>

          <div v-else-if="forma === 'cartao'" class="mt-4 grid gap-4">
            <div class="flex flex-wrap gap-2 text-xs">
              <span class="text-muted">Cartões de teste:</span>
              <button type="button" class="chip bg-ok-soft text-ok hover:underline" @click="usarCartaoTeste(CARTAO_APROVADO)">
                4242… aprovado
              </button>
              <button type="button" class="chip bg-danger-soft text-danger hover:underline" @click="usarCartaoTeste(CARTAO_RECUSADO)">
                4000… 0002 recusado
              </button>
            </div>
            <div>
              <label class="label" for="numero">Número do cartão</label>
              <div class="relative">
                <input
                  id="numero"
                  :value="cartao.numero"
                  class="input pr-28 tabular-nums"
                  inputmode="numeric"
                  autocomplete="cc-number"
                  placeholder="0000 0000 0000 0000"
                  :aria-invalid="!!erros.numero"
                  @input="mascaraCartao(($event.target as HTMLInputElement).value)"
                >
                <span v-if="cartao.numero.length > 1" class="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-bold text-muted">{{ bandeira(cartao.numero) }}</span>
              </div>
              <p v-if="erros.numero" class="erro">
                {{ erros.numero }}
              </p>
            </div>
            <div>
              <label class="label" for="nome-cartao">Nome impresso no cartão</label>
              <input
                id="nome-cartao"
                v-model="cartao.nome"
                class="input uppercase"
                autocomplete="cc-name"
                maxlength="80"
                :aria-invalid="!!erros.nome"
              >
              <p v-if="erros.nome" class="erro">
                {{ erros.nome }}
              </p>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="label" for="validade">Validade</label>
                <input
                  id="validade"
                  :value="cartao.validade"
                  class="input tabular-nums"
                  inputmode="numeric"
                  autocomplete="cc-exp"
                  placeholder="MM/AA"
                  :aria-invalid="!!erros.validade"
                  @input="mascaraValidade(($event.target as HTMLInputElement).value)"
                >
                <p v-if="erros.validade" class="erro">
                  {{ erros.validade }}
                </p>
              </div>
              <div>
                <label class="label" for="cvv">CVV</label>
                <input
                  id="cvv"
                  v-model="cartao.cvv"
                  class="input tabular-nums"
                  inputmode="numeric"
                  autocomplete="cc-csc"
                  maxlength="4"
                  placeholder="123"
                  :aria-invalid="!!erros.cvv"
                >
                <p v-if="erros.cvv" class="erro">
                  {{ erros.cvv }}
                </p>
              </div>
            </div>
          </div>

          <div v-else class="mt-4">
            <label class="label" for="troco">Troco para (opcional)</label>
            <input
              id="troco"
              v-model="troco"
              class="input max-w-48"
              inputmode="decimal"
              placeholder="Ex.: 100,00"
              :aria-invalid="!!erros.trocoPara"
            >
            <p v-if="erros.trocoPara" class="erro">
              {{ erros.trocoPara }}
            </p>
            <p class="hint">
              O entregador leva o troco. Você paga quando receber.
            </p>
          </div>
        </section>
      </div>

      <aside class="card h-fit p-5 lg:sticky lg:top-24">
        <h2 class="text-xl font-semibold">
          Seu pedido
        </h2>
        <ul class="mt-3 grid gap-1 text-sm">
          <li v-for="item in carrinho.itens" :key="item.produto.id" class="flex justify-between gap-2">
            <span>{{ item.quantidade }}× {{ item.produto.nome }}</span>
            <span class="tabular-nums">{{ reais(item.produto.precoCentavos * item.quantidade) }}</span>
          </li>
        </ul>
        <dl class="mt-3 grid gap-1 border-t border-line pt-3 text-sm">
          <div class="flex justify-between">
            <dt>Entrega</dt>
            <dd>{{ carrinho.taxaEntrega ? reais(carrinho.taxaEntrega) : 'Grátis' }}</dd>
          </div>
          <div class="flex justify-between text-lg font-extrabold">
            <dt>Total</dt>
            <dd class="tabular-nums">
              {{ reais(carrinho.total) }}
            </dd>
          </div>
        </dl>
        <p v-if="erroGeral" class="mt-4 alerta bg-danger-soft text-danger" role="alert">
          <Icon name="lucide:circle-alert" class="mt-0.5 shrink-0" /> {{ erroGeral }}
        </p>
        <button type="submit" class="btn-primary mt-5 w-full" :disabled="enviando">
          <Icon :name="enviando ? 'lucide:loader-circle' : 'lucide:lock'" :class="{ 'animate-spin': enviando }" />
          {{ enviando ? 'Processando…' : `Pagar ${reais(carrinho.total)}` }}
        </button>
      </aside>
    </form>
  </div>
</template>
