<script setup lang="ts">
import { reais } from '#shared/dinheiro'
import { FORMAS } from '#shared/pagamento'
import { ETAPAS, finalizado, proximaEtapa, STATUS, type StatusPedido } from '#shared/rastreamento'
import type { PaginaDTO, PedidoDTO } from '#shared/tipos'

// Pedidos recebidos (CUPC-12, CA-3): filtro por etapa, avançar etapa e cancelar.
definePageMeta({ middleware: 'admin' })
const filtro = ref<StatusPedido | ''>('')
const pagina = ref(1)
watch(filtro, () => (pagina.value = 1))
const { data, refresh, status } = useLazyFetch<PaginaDTO<PedidoDTO>>('/api/admin/pedidos', { query: { status: filtro, pagina } })
const { avisar } = useToast()
const mudando = ref<string | null>(null)

async function mudar(p: PedidoDTO, status: StatusPedido) {
  if (status === 'cancelado' && !confirm(`Cancelar o pedido #${p.numero}? O estoque volta para o cardápio.`)) return
  mudando.value = p.id
  try {
    await api(`/api/admin/pedidos/${p.id}/status`, { method: 'PATCH', body: { status } })
    avisar(`Pedido #${p.numero}: ${STATUS[status]}`)
  } catch (e) {
    avisar(erroDe(e).message, 'erro')
  } finally {
    mudando.value = null
    refresh()
  }
}

const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <div>
    <h1 class="mb-3 text-3xl font-semibold">
      Painel da loja
    </h1>
    <AdminNav />

    <div class="mb-4 flex flex-wrap items-center gap-2">
      <label for="filtro" class="text-sm font-semibold">Etapa:</label>
      <select id="filtro" v-model="filtro" class="input w-auto">
        <option value="">
          Todas
        </option>
        <option v-for="s in [...ETAPAS, 'cancelado' as const]" :key="s" :value="s">
          {{ STATUS[s] }}
        </option>
      </select>
      <button type="button" class="btn-ghost" @click="refresh()">
        <Icon name="lucide:refresh-cw" /> Atualizar
      </button>
      <span class="ml-auto text-sm text-muted">{{ data?.total ?? 0 }} pedido(s)</span>
    </div>

    <div v-if="status === 'pending' && !data" class="card h-32 animate-pulse bg-surface-2" aria-busy="true" />
    <p v-else-if="!data?.itens.length" class="card p-6 text-center text-muted">
      Nenhum pedido nesta etapa.
    </p>
    <ul v-else class="grid gap-3">
      <li v-for="p in data.itens" :key="p.id" class="card grid gap-3 p-4 md:grid-cols-[1fr_auto]">
        <div class="text-sm">
          <p class="text-base font-bold">
            #{{ p.numero }} · {{ p.cliente?.nome }}
            <span class="chip ml-1 bg-brand-soft text-brand">{{ STATUS[p.status] }}</span>
          </p>
          <p class="text-muted">
            {{ quando(p.criadoEm) }} · {{ p.cliente?.email }} · {{ p.telefone }}
          </p>
          <p class="mt-1">
            {{ p.itens.map(i => `${i.quantidade}× ${i.nome}`).join(', ') }}
          </p>
          <p class="mt-1">
            <strong>{{ reais(p.total) }}</strong> · {{ FORMAS[p.pagamento.forma] }} · {{ p.endereco }}
          </p>
          <p v-if="p.observacao" class="text-muted">
            Obs.: {{ p.observacao }}
          </p>
        </div>
        <div v-if="!finalizado(p.status)" class="flex flex-wrap items-start gap-2 md:flex-col md:items-stretch">
          <button
            type="button"
            class="btn-primary"
            :disabled="mudando === p.id"
            @click="mudar(p, proximaEtapa(p.status)!)"
          >
            {{ STATUS[proximaEtapa(p.status)!] }} <Icon name="lucide:arrow-right" />
          </button>
          <button
            type="button"
            class="btn-danger"
            :disabled="mudando === p.id"
            @click="mudar(p, 'cancelado')"
          >
            Cancelar
          </button>
        </div>
      </li>
    </ul>
    <nav v-if="(data?.totalPaginas ?? 1) > 1" class="mt-4 flex items-center justify-center gap-3" aria-label="Páginas">
      <button
        type="button"
        class="btn-outline"
        :disabled="pagina <= 1"
        @click="pagina--"
      >
        Anterior
      </button>
      <span class="text-sm">Página {{ data?.pagina }} de {{ data?.totalPaginas }}</span>
      <button
        type="button"
        class="btn-outline"
        :disabled="pagina >= (data?.totalPaginas ?? 1)"
        @click="pagina++"
      >
        Próxima
      </button>
    </nav>
  </div>
</template>
