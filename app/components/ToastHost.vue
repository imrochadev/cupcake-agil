<script setup lang="ts">
const { toasts, fechar } = useToast()
const icone = { ok: 'lucide:circle-check', erro: 'lucide:circle-alert', info: 'lucide:info' } as const
</script>

<template>
  <div class="no-print pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-3" aria-live="polite">
    <div
      v-for="t in toasts"
      :key="t.id"
      class="pointer-events-auto flex max-w-md animate-fade-up items-start gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg"
      :class="{ 'bg-ok text-white': t.tipo === 'ok', 'bg-danger text-white': t.tipo === 'erro', 'bg-text text-white': t.tipo === 'info' }"
      :role="t.tipo === 'erro' ? 'alert' : 'status'"
    >
      <Icon :name="icone[t.tipo]" class="mt-0.5 shrink-0 text-base" />
      <span>{{ t.texto }}</span>
      <button
        type="button"
        class="-mr-1 ml-1 opacity-80 hover:opacity-100"
        aria-label="Fechar aviso"
        @click="fechar(t.id)"
      >
        <Icon name="lucide:x" />
      </button>
    </div>
  </div>
</template>
