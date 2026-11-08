<script setup lang="ts">
import { reais } from '#shared/dinheiro'
import type { ProdutoDTO } from '#shared/tipos'

const props = defineProps<{ produto: ProdutoDTO, adicionando?: boolean }>()
defineEmits<{ adicionar: [] }>()
const poucos = computed(() => props.produto.disponivel && props.produto.estoque <= 5)
</script>

<template>
  <article class="card flex flex-col overflow-hidden" :aria-label="produto.nome">
    <div class="relative aspect-square bg-white">
      <img
        v-if="produto.imagemUrl"
        :src="produto.imagemUrl"
        :alt="`Foto do cupcake ${produto.nome}`"
        class="size-full object-cover"
        :class="{ 'opacity-50 grayscale': !produto.disponivel }"
        loading="lazy"
      >
      <span v-if="!produto.disponivel" class="chip absolute top-3 left-3 bg-text text-white">Esgotado</span>
      <span v-else-if="poucos" class="chip absolute top-3 left-3 bg-warn-soft text-warn">Últimas {{ produto.estoque }}</span>
    </div>
    <div class="flex flex-1 flex-col p-4">
      <h3 class="text-lg leading-tight font-semibold">
        {{ produto.nome }}
      </h3>
      <p class="mt-1 flex-1 text-sm text-muted">
        {{ produto.descricao }}
      </p>
      <div class="mt-4 flex items-center justify-between gap-2">
        <span class="text-lg font-extrabold">{{ reais(produto.precoCentavos) }}</span>
        <button
          type="button"
          class="btn-primary px-3 py-2"
          :disabled="!produto.disponivel || adicionando"
          :aria-label="`Adicionar ${produto.nome} ao carrinho`"
          @click="$emit('adicionar')"
        >
          <Icon :name="adicionando ? 'lucide:loader-circle' : 'lucide:plus'" :class="{ 'animate-spin': adicionando }" />
          {{ produto.disponivel ? 'Adicionar' : 'Indisponível' }}
        </button>
      </div>
    </div>
  </article>
</template>
