<script setup lang="ts">
const { usuario, sair } = useSessao()
const { quantidade } = useCarrinho()
const menu = ref(false)
const route = useRoute()
watch(() => route.fullPath, () => (menu.value = false))
</script>

<template>
  <header class="no-print sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
    <div class="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
      <NuxtLink to="/" class="flex items-center gap-2 font-display text-xl font-semibold text-brand">
        <img
          src="/favicon.svg"
          alt=""
          class="size-8"
        >
        Cupcake Ágil
      </NuxtLink>

      <nav class="ml-auto hidden items-center gap-1 sm:flex" aria-label="Principal">
        <NuxtLink to="/" class="btn-ghost" active-class="!text-brand">
          Cardápio
        </NuxtLink>
        <NuxtLink
          v-if="usuario"
          to="/pedidos"
          class="btn-ghost"
          active-class="!text-brand"
        >
          Meus pedidos
        </NuxtLink>
        <NuxtLink
          v-if="usuario?.perfil === 'admin'"
          to="/admin"
          class="btn-ghost"
          active-class="!text-brand"
        >
          Painel
        </NuxtLink>
      </nav>

      <NuxtLink to="/carrinho" class="btn-outline relative ml-auto px-3 sm:ml-0" :aria-label="`Carrinho, ${quantidade} item(ns)`">
        <Icon name="lucide:shopping-bag" class="text-lg" />
        <span v-if="quantidade" class="absolute -top-1.5 -right-1.5 grid min-w-5 place-items-center rounded-full bg-brand px-1 text-xs font-bold text-white">
          {{ quantidade }}
        </span>
      </NuxtLink>

      <div class="relative">
        <NuxtLink v-if="!usuario" to="/entrar" class="btn-primary hidden sm:inline-flex">
          Entrar
        </NuxtLink>
        <button
          type="button"
          class="btn-outline px-3"
          :class="{ 'sm:hidden': !usuario }"
          :aria-expanded="menu"
          aria-label="Menu da conta"
          @click="menu = !menu"
        >
          <Icon name="lucide:user-round" class="text-lg" />
          <span v-if="usuario" class="hidden max-w-32 truncate sm:inline">{{ usuario.nome.split(' ')[0] }}</span>
        </button>
        <div v-if="menu" class="card absolute right-0 mt-2 w-56 animate-pop p-2">
          <template v-if="usuario">
            <p class="truncate px-3 py-2 text-sm text-muted">
              {{ usuario.email }}
            </p>
            <NuxtLink to="/" class="btn-ghost w-full justify-start sm:hidden">
              Cardápio
            </NuxtLink>
            <NuxtLink to="/pedidos" class="btn-ghost w-full justify-start sm:hidden">
              Meus pedidos
            </NuxtLink>
            <NuxtLink v-if="usuario.perfil === 'admin'" to="/admin" class="btn-ghost w-full justify-start sm:hidden">
              Painel
            </NuxtLink>
            <NuxtLink to="/conta" class="btn-ghost w-full justify-start">
              <Icon name="lucide:user-round-pen" /> Minha conta
            </NuxtLink>
            <button type="button" class="btn-ghost w-full justify-start" @click="sair">
              <Icon name="lucide:log-out" /> Sair
            </button>
          </template>
          <template v-else>
            <NuxtLink to="/entrar" class="btn-ghost w-full justify-start">
              Entrar
            </NuxtLink>
            <NuxtLink to="/cadastro" class="btn-ghost w-full justify-start">
              Criar conta
            </NuxtLink>
          </template>
        </div>
      </div>
    </div>
  </header>
</template>
