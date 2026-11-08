<script setup lang="ts">
const props = defineProps<{ valor: number, maximo: number, nome: string, desabilitado?: boolean }>()
const emit = defineEmits<{ mudar: [quantidade: number] }>()
const pode = computed(() => ({ menos: props.valor > 1, mais: props.valor < props.maximo }))
</script>

<template>
  <div class="inline-flex items-center rounded-xl border border-line" role="group" :aria-label="`Quantidade de ${nome}`">
    <button
      type="button"
      class="grid size-9 place-items-center rounded-l-xl hover:bg-surface-2 disabled:opacity-40"
      :disabled="desabilitado || !pode.menos"
      :aria-label="`Diminuir ${nome}`"
      @click="emit('mudar', valor - 1)"
    >
      <Icon name="lucide:minus" />
    </button>
    <span class="w-8 text-center font-bold tabular-nums" aria-live="polite">{{ valor }}</span>
    <button
      type="button"
      class="grid size-9 place-items-center rounded-r-xl hover:bg-surface-2 disabled:opacity-40"
      :disabled="desabilitado || !pode.mais"
      :aria-label="`Aumentar ${nome}`"
      @click="emit('mudar', valor + 1)"
    >
      <Icon name="lucide:plus" />
    </button>
  </div>
</template>
