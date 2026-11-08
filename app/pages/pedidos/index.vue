<script setup lang="ts">
import { reais } from '#shared/dinheiro'
import { STATUS } from '#shared/rastreamento'
import type { CarrinhoDTO, PaginaDTO, PedidoDTO } from '#shared/tipos'

// Histórico (CUPC-15): pedidos com data, status e total; abre o detalhe ou repete o pedido.
definePageMeta({ middleware: 'conta' })
const pagina = ref(1)
const { data, error, status, refresh } = useLazyFetch<PaginaDTO<PedidoDTO>>('/api/pedidos', { query: { pagina } })
const { carrinho } = useCarrinho()
const { avisar } = useToast()
const repetindo = ref<string | null>(null)

const data_ = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

async function repetir(id: string) {
  repetindo.value = id
  try {
    const r = await api<{ carrinho: CarrinhoDTO, avisos: string[] }>(`/api/pedidos/${id}/repetir`, { method: 'POST' })
    carrinho.value = r.carrinho
    for (const aviso of r.avisos) avisar(aviso, 'info')
    await navigateTo('/carrinho')
  } catch (e) {
    avisar(erroDe(e).message, 'erro')
  } finally {
    repetindo.value = null
  }
}
</script>

<template>
  <div>
    <h1 class="mb-4 text-3xl font-semibold">
      Meus pedidos
    </h1>

    <div v-if="status === 'pending' && !data" class="card h-40 animate-pulse bg-surface-2" />
    <div v-else-if="error" class="card p-6 text-center" role="alert">
      <p>{{ erroDe(error).message }}</p>
      <button type="button" class="btn-primary mt-3" @click="refresh()">
        Tentar de novo
      </button>
    </div>
    <div v-else-if="!data?.itens.length" class="card p-8 text-center">
      <Icon name="lucide:receipt" class="text-5xl text-muted" />
      <p class="mt-3 text-lg font-bold">
        Você ainda não fez pedidos
      </p>
      <NuxtLink to="/" class="btn-primary mt-5">
        Ver o cardápio
      </NuxtLink>
    </div>

    <template v-else>
      <ul class="grid gap-3">
        <li v-for="p in data.itens" :key="p.id" class="card grid gap-3 p-4 sm:flex sm:items-center">
          <div class="min-w-0 sm:flex-1">
            <p class="flex flex-wrap items-center gap-2 font-bold">
              <span class="whitespace-nowrap">Pedido #{{ p.numero }}</span>
              <span
                class="chip whitespace-nowrap"
                :class="p.status === 'entregue' ? 'bg-ok-soft text-ok' : p.status === 'cancelado' ? 'bg-danger-soft text-danger' : 'bg-brand-soft text-brand'"
              >{{ STATUS[p.status] }}</span>
            </p>
            <p class="text-sm text-muted">
              {{ data_(p.criadoEm) }} · {{ p.itens.reduce((s, i) => s + i.quantidade, 0) }} cupcake(s) · {{ reais(p.total) }}
            </p>
          </div>
          <!-- No celular os botões vão para uma linha própria, cada um com metade da largura. -->
          <div class="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              class="btn-outline px-3"
              :disabled="repetindo === p.id"
              @click="repetir(p.id)"
            >
              <Icon name="lucide:repeat" /> Pedir de novo
            </button>
            <NuxtLink :to="`/pedidos/${p.id}`" class="btn-primary px-3">
              Detalhes
            </NuxtLink>
          </div>
        </li>
      </ul>
      <nav v-if="data.totalPaginas > 1" class="mt-4 flex items-center justify-center gap-3" aria-label="Páginas">
        <button
          type="button"
          class="btn-outline"
          :disabled="pagina <= 1"
          @click="pagina--"
        >
          Anterior
        </button>
        <span class="text-sm">Página {{ data.pagina }} de {{ data.totalPaginas }}</span>
        <button
          type="button"
          class="btn-outline"
          :disabled="pagina >= data.totalPaginas"
          @click="pagina++"
        >
          Próxima
        </button>
      </nav>
    </template>
  </div>
</template>
