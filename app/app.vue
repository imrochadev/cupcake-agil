<script setup lang="ts">
// Título da aba ao navegar dentro do app; o da primeira página (e as prévias de link) vem do servidor (server/utils/seo.ts).
const TITULOS: Record<string, string> = {
  '/': 'Cupcake Ágil: cupcakes artesanais na sua porta',
  '/entrar': 'Entrar',
  '/cadastro': 'Criar conta',
  '/carrinho': 'Carrinho',
  '/checkout': 'Finalizar compra',
  '/pedidos': 'Meus pedidos',
  '/conta': 'Minha conta',
  '/recuperar-senha': 'Recuperar senha',
  '/redefinir-senha': 'Criar senha nova',
  '/admin': 'Painel da loja',
}
const route = useRoute()
useHead({
  title: () => {
    const caminho = route.path.replace(/\/+$/, '') || '/'
    if (caminho === '/') return TITULOS['/']!
    const chave = Object.keys(TITULOS).find(p => p !== '/' && (caminho === p || caminho.startsWith(`${p}/`)))
    const titulo = caminho.startsWith('/pedidos/') ? 'Acompanhar pedido' : chave ? TITULOS[chave]! : 'Cupcake Ágil'
    return `${titulo} · Cupcake Ágil`
  },
})
</script>

<template>
  <!-- Barra no topo enquanto a próxima página carrega (ex.: abrir "Meus pedidos"). -->
  <NuxtLoadingIndicator color="#b8245a" :height="3" :throttle="100" />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
