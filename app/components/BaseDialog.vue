<script setup lang="ts">
// Diálogo modal nativo (<dialog>): o navegador já prende o foco dentro, fecha no Esc e devolve o foco ao sair.
defineProps<{ titulo: string, descricao?: string, largo?: boolean }>()
const aberto = defineModel<boolean>('aberto', { required: true })
const dialog = ref<HTMLDialogElement>()
const tituloId = useId()

watch(aberto, (valor) => {
  if (valor && !dialog.value?.open) dialog.value?.showModal()
  if (!valor && dialog.value?.open) dialog.value.close()
}, { flush: 'post' })
onMounted(() => aberto.value && dialog.value?.showModal())

function cliqueFora(e: MouseEvent) {
  if (e.target === dialog.value) aberto.value = false
}
</script>

<template>
  <dialog
    ref="dialog"
    :aria-labelledby="tituloId"
    class="m-auto max-h-[92dvh] w-[calc(100%-1.5rem)] animate-pop overflow-y-auto rounded-2xl border border-line bg-surface p-0 text-text shadow-2xl"
    :class="largo ? 'max-w-2xl' : 'max-w-md'"
    @close="aberto = false"
    @click="cliqueFora"
  >
    <div class="p-5 sm:p-6">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 :id="tituloId" class="text-xl font-semibold">
            {{ titulo }}
          </h2>
          <p v-if="descricao" class="mt-1 text-sm text-muted">
            {{ descricao }}
          </p>
        </div>
        <button
          type="button"
          class="btn-ghost -mt-1 -mr-2 px-2 py-1"
          aria-label="Fechar"
          @click="aberto = false"
        >
          <Icon name="lucide:x" class="text-xl" />
        </button>
      </div>
      <div class="mt-4">
        <slot />
      </div>
    </div>
  </dialog>
</template>
