<script setup lang="ts">
import type { FeedbackDTO } from '#shared/tipos'

// Respostas do formulário de feedback (PIT II, Situação 3). "Imprimir / salvar PDF" gera o arquivo com as opiniões
// dos testadores pedido na entrega.
definePageMeta({ middleware: 'admin' })
const { data, refresh, status } = useLazyFetch<FeedbackDTO[]>('/api/admin/feedbacks')
const ampliada = ref<string | null>(null)
const data_ = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR')
const linkTeste = computed(() => (import.meta.client ? `${location.origin}/?feedback=1` : ''))
const { avisar } = useToast()
const imprimir = () => window.print()

async function copiarLink() {
  await navigator.clipboard.writeText(linkTeste.value)
  avisar('Link copiado. É só mandar para quem vai testar.')
}
</script>

<template>
  <div>
    <h1 class="mb-3 text-3xl font-semibold">
      <span class="no-print">Painel da loja</span>
      <span class="hidden print:inline">Cupcake Ágil: relatório de testes com usuários</span>
    </h1>
    <AdminNav />

    <div class="no-print mb-4 flex flex-wrap items-center gap-2">
      <button type="button" class="btn-outline" @click="copiarLink">
        <Icon name="lucide:link" /> Copiar link para os testadores
      </button>
      <button type="button" class="btn-outline" @click="refresh()">
        <Icon name="lucide:refresh-cw" /> Atualizar
      </button>
      <button
        type="button"
        class="btn-primary ml-auto"
        :disabled="!data?.length"
        @click="imprimir"
      >
        <Icon name="lucide:printer" /> Imprimir / salvar PDF
      </button>
    </div>

    <div v-if="status === 'pending' && !data" class="card h-32 animate-pulse bg-surface-2" aria-busy="true" />
    <p v-else-if="!data?.length" class="card p-6 text-center text-muted">
      Nenhum feedback ainda. Mande o link para os seus testadores.
    </p>
    <div v-else class="grid gap-4">
      <p class="text-sm text-muted">
        {{ data.length }} feedback(s) recebido(s).
      </p>
      <article v-for="(f, i) in data" :key="f.id" class="card grid gap-3 p-5 text-sm">
        <header class="flex flex-wrap items-baseline justify-between gap-2">
          <h2 class="text-lg font-semibold">
            {{ i + 1 }}. {{ f.nome }}
          </h2>
          <p class="text-muted">
            Testou em {{ data_(f.dataTeste) }}<template v-if="f.nota">
              · nota {{ f.nota }}/5
            </template>
            <template v-if="f.conta">
              · conta {{ f.conta }}
            </template>
          </p>
        </header>
        <dl class="grid gap-3 md:grid-cols-2">
          <div>
            <dt class="font-bold text-ok">
              Testou e funcionou
            </dt>
            <dd class="whitespace-pre-line">
              {{ f.funcionou || '—' }}
            </dd>
          </div>
          <div>
            <dt class="font-bold text-danger">
              Testou e não funcionou (o que corrigir)
            </dt>
            <dd class="whitespace-pre-line">
              {{ f.naoFuncionou || '—' }}
            </dd>
          </div>
          <div>
            <dt class="font-bold text-warn">
              Não testou (e por quê)
            </dt>
            <dd class="whitespace-pre-line">
              {{ f.naoTestado || '—' }}
            </dd>
          </div>
          <div>
            <dt class="font-bold">
              Sugestões
            </dt>
            <dd class="whitespace-pre-line">
              {{ f.sugestoes || '—' }}
            </dd>
          </div>
        </dl>
        <button
          v-if="f.temImagem"
          type="button"
          class="w-fit"
          :aria-label="`Ampliar captura de tela de ${f.nome}`"
          @click="ampliada = ampliada === f.id ? null : f.id"
        >
          <img
            :src="`/api/admin/feedbacks/${f.id}/imagem`"
            alt="Captura de tela enviada pelo testador"
            class="rounded-xl border border-line"
            :class="ampliada === f.id ? 'max-h-none w-full' : 'max-h-40'"
          >
        </button>
        <p class="text-xs text-muted">
          Página: {{ f.pagina || '/' }} · Enviado em {{ new Date(f.criadoEm).toLocaleString('pt-BR') }} · {{ f.navegador }}
        </p>
      </article>
    </div>
  </div>
</template>
