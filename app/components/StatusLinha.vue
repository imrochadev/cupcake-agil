<script setup lang="ts">
import { ETAPAS, STATUS } from '#shared/rastreamento'
import type { PedidoDTO } from '#shared/tipos'

// Etapas do pedido (CUPC-11, CA-4): recebido, em preparo, saiu para entrega e entregue, com o horário de cada uma.
const props = defineProps<{ pedido: PedidoDTO }>()
const icones = { recebido: 'lucide:receipt', em_preparo: 'lucide:chef-hat', saiu_para_entrega: 'lucide:bike', entregue: 'lucide:house' } as const
const atual = computed(() => ETAPAS.indexOf(props.pedido.status as typeof ETAPAS[number]))
const horario = (etapa: string) => {
  const evento = props.pedido.eventos.find(e => e.status === etapa)
  return evento ? new Date(evento.em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null
}
</script>

<template>
  <div v-if="pedido.status === 'cancelado'" class="alerta bg-danger-soft text-danger">
    <Icon name="lucide:circle-x" class="mt-0.5" /> Este pedido foi cancelado. Se o pagamento foi aprovado, o valor é estornado.
  </div>
  <ol v-else class="grid gap-3 sm:grid-cols-4" aria-label="Andamento do pedido">
    <li
      v-for="(etapa, i) in ETAPAS"
      :key="etapa"
      class="flex items-center gap-3 rounded-xl border p-3 sm:flex-col sm:text-center"
      :class="i <= atual ? 'border-brand/30 bg-brand-soft' : 'border-line'"
      :aria-current="i === atual ? 'step' : undefined"
    >
      <span class="grid size-10 shrink-0 place-items-center rounded-full text-lg" :class="i <= atual ? 'bg-brand text-white' : 'bg-surface-2 text-muted'">
        <Icon :name="icones[etapa]" />
      </span>
      <span>
        <span class="block font-bold" :class="{ 'text-muted': i > atual }">{{ STATUS[etapa] }}</span>
        <span class="text-xs text-muted">{{ horario(etapa) ?? (i === atual + 1 ? 'próxima etapa' : '—') }}</span>
      </span>
    </li>
  </ol>
</template>
