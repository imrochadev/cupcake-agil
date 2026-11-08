<script setup lang="ts">
import { reais } from '#shared/dinheiro'
import { QUANTIDADE_MAXIMA } from '#shared/carrinho'

// Carrinho (CUPC-9): quantidades, remoção, subtotal, entrega e total, sempre recalculados pelo servidor.
definePageMeta({ middleware: 'conta' })
const { carrinho, carregar, definir, remover } = useCarrinho()
const { avisar } = useToast()
const ocupado = ref<string | null>(null)
const carregando = ref(true)
onMounted(() => carregar().catch(e => avisar(erroDe(e).message, 'erro')).finally(() => (carregando.value = false)))

async function mudar(produtoId: string, quantidade: number) {
  ocupado.value = produtoId
  try {
    await definir(produtoId, quantidade)
  } catch (e) {
    avisar(erroDe(e).message, 'erro')
  } finally {
    ocupado.value = null
  }
}

async function tirar(produtoId: string, nome: string) {
  ocupado.value = produtoId
  try {
    await remover(produtoId)
    avisar(`${nome} saiu do carrinho.`, 'info')
  } catch (e) {
    avisar(erroDe(e).message, 'erro')
  } finally {
    ocupado.value = null
  }
}

const temAviso = computed(() => carrinho.value?.itens.some(i => i.aviso) ?? false)
</script>

<template>
  <div>
    <h1 class="mb-4 text-3xl font-semibold">
      Seu carrinho
    </h1>

    <div v-if="carregando && !carrinho" class="card h-40 animate-pulse bg-surface-2" />

    <div v-else-if="!carrinho?.itens.length" class="card p-8 text-center">
      <Icon name="lucide:shopping-bag" class="text-5xl text-muted" />
      <p class="mt-3 text-lg font-bold">
        Seu carrinho está vazio
      </p>
      <p class="mt-1 text-muted">
        Que tal um Red Velvet para começar?
      </p>
      <NuxtLink to="/" class="btn-primary mt-5">
        Ver o cardápio
      </NuxtLink>
    </div>

    <div v-else class="grid gap-6 lg:grid-cols-[1fr_340px]">
      <ul class="grid gap-3">
        <li v-for="item in carrinho.itens" :key="item.produto.id" class="card flex gap-4 p-3">
          <img
            v-if="item.produto.imagemUrl"
            :src="item.produto.imagemUrl"
            alt=""
            class="size-20 shrink-0 rounded-xl object-cover sm:size-24"
          >
          <div class="flex min-w-0 flex-1 flex-col gap-2">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="font-bold">
                  {{ item.produto.nome }}
                </p>
                <p class="text-sm text-muted">
                  {{ reais(item.produto.precoCentavos) }} cada
                </p>
              </div>
              <p class="font-extrabold tabular-nums">
                {{ reais(item.produto.precoCentavos * item.quantidade) }}
              </p>
            </div>
            <p v-if="item.aviso" class="alerta bg-warn-soft py-1.5 text-warn">
              <Icon name="lucide:triangle-alert" class="mt-0.5 shrink-0" /> {{ item.aviso }}
            </p>
            <div class="mt-auto flex items-center justify-between gap-2">
              <QuantidadeInput
                :valor="item.quantidade"
                :maximo="Math.min(item.produto.estoque, QUANTIDADE_MAXIMA)"
                :nome="item.produto.nome"
                :desabilitado="ocupado === item.produto.id || !item.produto.disponivel"
                @mudar="mudar(item.produto.id, $event)"
              />
              <button
                type="button"
                class="btn-ghost px-2 text-danger"
                :disabled="ocupado === item.produto.id"
                :aria-label="`Remover ${item.produto.nome}`"
                @click="tirar(item.produto.id, item.produto.nome)"
              >
                <Icon name="lucide:trash-2" /> <span class="hidden sm:inline">Remover</span>
              </button>
            </div>
          </div>
        </li>
      </ul>

      <aside class="card h-fit p-5 lg:sticky lg:top-24">
        <h2 class="text-xl font-semibold">
          Resumo
        </h2>
        <dl class="mt-4 grid gap-2 text-sm">
          <div class="flex justify-between">
            <dt>Subtotal ({{ carrinho.quantidade }} {{ carrinho.quantidade === 1 ? 'item' : 'itens' }})</dt>
            <dd class="tabular-nums">
              {{ reais(carrinho.subtotal) }}
            </dd>
          </div>
          <div class="flex justify-between">
            <dt>Entrega</dt>
            <dd class="tabular-nums" :class="{ 'font-bold text-ok': !carrinho.taxaEntrega }">
              {{ carrinho.taxaEntrega ? reais(carrinho.taxaEntrega) : 'Grátis' }}
            </dd>
          </div>
          <div class="mt-2 flex justify-between border-t border-line pt-3 text-lg font-extrabold">
            <dt>Total</dt>
            <dd class="tabular-nums" data-testid="total-carrinho">
              {{ reais(carrinho.total) }}
            </dd>
          </div>
        </dl>
        <p v-if="carrinho.faltaFreteGratis" class="mt-3 text-sm text-muted">
          Faltam <strong>{{ reais(carrinho.faltaFreteGratis) }}</strong> para a entrega grátis.
        </p>
        <NuxtLink
          to="/checkout"
          class="btn-primary mt-5 w-full"
          :class="{ 'pointer-events-none opacity-55': temAviso }"
          :aria-disabled="temAviso"
        >
          Finalizar compra
        </NuxtLink>
        <p v-if="temAviso" class="hint text-center">
          Ajuste os itens com aviso para continuar.
        </p>
      </aside>
    </div>
  </div>
</template>
