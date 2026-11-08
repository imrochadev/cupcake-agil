<script setup lang="ts">
import { reais } from '#shared/dinheiro'
import { STATUS, type StatusPedido } from '#shared/rastreamento'
import type { CategoriaDTO, ProdutoDTO, ResumoAdminDTO } from '#shared/tipos'

// Painel (CUPC-12): resumo das vendas e o CRUD de produtos.
definePageMeta({ middleware: 'admin' })
const { data, refresh, status } = useLazyFetch<{ categorias: CategoriaDTO[], produtos: ProdutoDTO[] }>('/api/admin/produtos')
const { data: resumo, refresh: refreshResumo } = useLazyFetch<ResumoAdminDTO>('/api/admin/resumo')
const { avisar } = useToast()

const editando = ref<ProdutoDTO | null>(null)
const formAberto = ref(false)
const chaveForm = ref(0)

function abrir(produto: ProdutoDTO | null) {
  editando.value = produto
  chaveForm.value++
  formAberto.value = true
}

function salvo(produto: ProdutoDTO) {
  formAberto.value = false
  avisar(`${produto.nome} salvo.`)
  refresh()
  refreshResumo()
}

async function excluir(produto: ProdutoDTO) {
  if (!confirm(`Excluir "${produto.nome}"? Ele sai do cardápio e dos carrinhos (os pedidos antigos continuam).`)) return
  try {
    await api(`/api/admin/produtos/${produto.id}`, { method: 'DELETE' })
    avisar(`${produto.nome} excluído.`, 'info')
    refresh()
  } catch (e) {
    avisar(erroDe(e).message, 'erro')
  }
}

const nomeCategoria = (id: string) => data.value?.categorias.find(c => c.id === id)?.nome ?? id
</script>

<template>
  <div>
    <h1 class="mb-3 text-3xl font-semibold">
      Painel da loja
    </h1>
    <AdminNav />

    <section v-if="resumo" class="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
      <div class="card p-4">
        <p class="text-sm text-muted">
          Pedidos (sem cancelados)
        </p>
        <p class="text-2xl font-extrabold">
          {{ resumo.pedidos }}
        </p>
      </div>
      <div class="card p-4">
        <p class="text-sm text-muted">
          Faturamento
        </p>
        <p class="text-2xl font-extrabold">
          {{ reais(resumo.faturamento) }}
        </p>
      </div>
      <div class="card p-4">
        <p class="text-sm text-muted">
          Ticket médio
        </p>
        <p class="text-2xl font-extrabold">
          {{ reais(resumo.ticketMedio) }}
        </p>
      </div>
      <div class="card p-4">
        <p class="text-sm text-muted">
          Feedbacks recebidos
        </p>
        <p class="text-2xl font-extrabold">
          {{ resumo.feedbacks }}
        </p>
      </div>
      <div class="card p-4 md:col-span-2">
        <p class="mb-2 text-sm font-bold">
          Pedidos por etapa
        </p>
        <ul class="grid grid-cols-2 gap-1 text-sm">
          <li v-for="(n, s) in resumo.porStatus" :key="s" class="flex justify-between">
            <span>{{ STATUS[s as StatusPedido] }}</span><strong>{{ n }}</strong>
          </li>
        </ul>
      </div>
      <div class="card p-4 md:col-span-2">
        <p class="mb-2 text-sm font-bold">
          Mais vendidos
        </p>
        <ol v-if="resumo.maisVendidos.length" class="grid gap-1 text-sm">
          <li v-for="m in resumo.maisVendidos" :key="m.nome" class="flex justify-between">
            <span>{{ m.nome }}</span><strong>{{ m.quantidade }}</strong>
          </li>
        </ol>
        <p v-else class="text-sm text-muted">
          Ainda sem vendas.
        </p>
      </div>
    </section>

    <div class="mb-3 flex items-center justify-between gap-2">
      <h2 class="text-2xl font-semibold">
        Produtos
      </h2>
      <button type="button" class="btn-primary" @click="abrir(null)">
        <Icon name="lucide:plus" /> Novo produto
      </button>
    </div>

    <div class="card overflow-x-auto">
      <table class="w-full min-w-[640px] text-left text-sm">
        <thead class="border-b border-line text-muted">
          <tr>
            <th class="p-3">
              Produto
            </th>
            <th class="p-3">
              Categoria
            </th>
            <th class="p-3 text-right">
              Preço
            </th>
            <th class="p-3 text-right">
              Estoque
            </th>
            <th class="p-3">
              Situação
            </th>
            <th class="p-3">
              <span class="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody v-if="status === 'pending' && !data" aria-busy="true">
          <tr v-for="n in 4" :key="n">
            <td colspan="6" class="p-3">
              <div class="h-10 animate-pulse rounded-lg bg-surface-2" />
            </td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr v-for="p in data?.produtos" :key="p.id" class="border-b border-line last:border-0">
            <td class="p-3">
              <div class="flex items-center gap-3">
                <img
                  v-if="p.imagemUrl"
                  :src="p.imagemUrl"
                  alt=""
                  class="size-10 rounded-lg object-cover"
                >
                <span class="font-bold">{{ p.nome }}</span>
              </div>
            </td>
            <td class="p-3">
              {{ nomeCategoria(p.categoriaId) }}
            </td>
            <td class="p-3 text-right tabular-nums">
              {{ reais(p.precoCentavos) }}
            </td>
            <td class="p-3 text-right tabular-nums" :class="{ 'font-bold text-danger': !p.estoque }">
              {{ p.estoque }}
            </td>
            <td class="p-3">
              <span class="chip" :class="p.disponivel ? 'bg-ok-soft text-ok' : 'bg-surface-2 text-muted'">
                {{ !p.ativo ? 'Fora do cardápio' : p.estoque ? 'À venda' : 'Esgotado' }}
              </span>
            </td>
            <td class="p-3 text-right whitespace-nowrap">
              <button
                type="button"
                class="btn-ghost px-2"
                :aria-label="`Editar ${p.nome}`"
                @click="abrir(p)"
              >
                <Icon name="lucide:pencil" />
              </button>
              <button
                type="button"
                class="btn-ghost px-2 text-danger"
                :aria-label="`Excluir ${p.nome}`"
                @click="excluir(p)"
              >
                <Icon name="lucide:trash-2" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <BaseDialog v-model:aberto="formAberto" :titulo="editando ? `Editar ${editando.nome}` : 'Novo produto'" largo>
      <ProdutoForm
        v-if="data"
        :key="chaveForm"
        :produto="editando"
        :categorias="data.categorias"
        @salvo="salvo"
      />
    </BaseDialog>
  </div>
</template>
