<script setup lang="ts">
const { usuario, garantir } = useSessao()
const { carregar, esquecer } = useCarrinho()

// Com conta, o contador do carrinho do cabeçalho já vem preenchido.
onMounted(async () => {
  if (await garantir()) carregar().catch(() => {})
})
watch(usuario, (u, antes) => {
  if (u && u.id !== antes?.id) carregar().catch(() => {})
  if (!u) esquecer()
})
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <AppHeader />
    <PedidoAndamento />
    <main class="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28">
      <slot />
    </main>
    <footer class="no-print border-t border-line px-4 pt-6 pb-24 text-center text-sm text-muted sm:pb-6">
      <p>Cupcake Ágil · Projeto Integrador Transdisciplinar em Engenharia de Software II</p>
      <p class="mt-1">
        Loja de demonstração: os pagamentos são simulados e nenhum valor é cobrado.
      </p>
    </footer>
    <FeedbackModal />
    <ToastHost />
  </div>
</template>
