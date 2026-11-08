<script setup lang="ts">
import type { CatalogoDTO } from '#shared/tipos'

// Cardápio (CUPC-8): cupcakes por categoria, com foto, preço, descrição e disponibilidade.
const { data: catalogo, error, status, refresh } = useLazyFetch<CatalogoDTO>('/api/catalogo')
const { usuario } = useSessao()
const { adicionar } = useCarrinho()
const { avisar } = useToast()
const adicionando = ref<string | null>(null)
const vitrine = computed(() => (catalogo.value?.produtos ?? []).filter(p => p.imagemUrl && p.disponivel).slice(0, 3))

const secoes = computed(() => (catalogo.value?.categorias ?? [])
  .map(c => ({ ...c, produtos: catalogo.value!.produtos.filter(p => p.categoriaId === c.id) }))
  .filter(c => c.produtos.length))

async function aoAdicionar(id: string, nome: string) {
  if (!usuario.value) {
    avisar('Entre na sua conta para montar o carrinho.', 'info')
    return navigateTo({ path: '/entrar', query: { voltar: '/' } })
  }
  adicionando.value = id
  try {
    await adicionar(id)
    avisar(`${nome} no carrinho!`)
  } catch (e) {
    avisar(erroDe(e).message, 'erro')
    refresh()
  } finally {
    adicionando.value = null
  }
}
</script>

<template>
  <div>
    <section class="mb-6 flex items-center gap-6 overflow-hidden rounded-3xl bg-brand-soft p-6 sm:p-10">
      <div class="flex-1">
        <p class="font-bold text-brand">
          Feitos hoje, entregues quentinhos
        </p>
        <h1 class="mt-1 max-w-xl text-3xl font-semibold sm:text-5xl">
          Cupcakes artesanais na sua porta
        </h1>
        <p class="mt-3 max-w-lg text-muted">
          Escolha seus sabores, pague com PIX, cartão ou dinheiro na entrega e acompanhe o pedido até chegar. Entrega grátis acima de R$ 80,00.
        </p>
      </div>
      <div class="hidden shrink-0 -space-x-10 md:flex" aria-hidden="true">
        <img
          v-for="(p, i) in vitrine"
          :key="p.id"
          :src="p.imagemUrl!"
          alt=""
          class="size-40 rounded-full border-4 border-white object-cover shadow-lg lg:size-48"
          :class="i === 1 ? 'z-10 -translate-y-4' : ''"
        >
      </div>
    </section>

    <nav
      v-if="secoes.length"
      class="sticky top-[61px] z-30 -mx-4 mb-4 flex gap-2 overflow-x-auto bg-bg/90 px-4 py-2 backdrop-blur"
      aria-label="Categorias"
    >
      <a
        v-for="s in secoes"
        :key="s.id"
        :href="`#${s.id}`"
        class="chip shrink-0 border border-line bg-surface px-4 py-2 text-sm hover:border-brand hover:text-brand"
      >{{ s.nome }}</a>
    </nav>

    <div v-if="status === 'pending'" class="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-busy="true">
      <div v-for="n in 8" :key="n" class="card aspect-[3/4] animate-pulse bg-surface-2" />
    </div>

    <div v-else-if="error" class="card p-6 text-center" role="alert">
      <p class="font-bold">
        Não conseguimos carregar o cardápio.
      </p>
      <p class="mt-1 text-sm text-muted">
        {{ erroDe(error).message }}
      </p>
      <button type="button" class="btn-primary mt-4" @click="refresh()">
        Tentar de novo
      </button>
    </div>

    <section
      v-for="s in secoes"
      v-else
      :id="s.id"
      :key="s.id"
      class="mb-10 scroll-mt-32"
    >
      <h2 class="mb-3 text-2xl font-semibold">
        {{ s.nome }}
      </h2>
      <div class="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
        <CupcakeCard
          v-for="p in s.produtos"
          :key="p.id"
          :produto="p"
          :adicionando="adicionando === p.id"
          @adicionar="aoAdicionar(p.id, p.nome)"
        />
      </div>
    </section>
  </div>
</template>
