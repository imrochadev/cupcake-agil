<template>
  <nav class="no-print mb-5 flex gap-1 overflow-x-auto" aria-label="Painel">
    <NuxtLink
      v-for="l in [{ to: '/admin', t: 'Produtos e resumo', i: 'lucide:layout-dashboard' }, { to: '/admin/pedidos', t: 'Pedidos', i: 'lucide:receipt' }, { to: '/admin/feedbacks', t: 'Feedbacks', i: 'lucide:message-square-heart' }]"
      :key="l.to"
      :to="l.to"
      class="btn-ghost shrink-0"
      exact-active-class="!bg-brand-soft !text-brand"
    >
      <Icon :name="l.i" /> {{ l.t }}
    </NuxtLink>
  </nav>
</template>
