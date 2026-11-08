<script setup lang="ts">
import { STATUS } from '#shared/rastreamento'
import type { PedidoDTO } from '#shared/tipos'

// Aviso no topo enquanto um pedido não chega: leva direto ao acompanhamento, sem passar por "Meus pedidos" (pedido dos
// testadores Lucas e Ana Clara). Some na própria tela do pedido.
const { usuario } = useSessao()
const route = useRoute()
const pedido = ref<PedidoDTO | null>(null)

async function conferir() {
  if (!usuario.value) {
    pedido.value = null
    return
  }
  pedido.value = await $fetch<PedidoDTO | null>('/api/pedidos/andamento').catch(() => null)
}
watch([() => route.path, () => usuario.value?.id], conferir, { immediate: true })

const visivel = computed(() => pedido.value && route.path !== `/pedidos/${pedido.value.id}`)
const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <div v-if="visivel && pedido" class="no-print border-b border-line bg-brand-soft" role="status">
    <div class="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 text-sm">
      <Icon name="lucide:bike" class="shrink-0 text-xl text-brand" />
      <p class="flex-1">
        <strong>Seu pedido #{{ pedido.numero }} está a caminho:</strong> {{ STATUS[pedido.status] }}.
        Previsão de entrega às {{ hora(pedido.previsaoEntrega) }}.
      </p>
      <NuxtLink :to="`/pedidos/${pedido.id}`" class="btn-primary py-1.5 text-sm">
        Acompanhar pedido <Icon name="lucide:arrow-right" />
      </NuxtLink>
    </div>
  </div>
</template>
