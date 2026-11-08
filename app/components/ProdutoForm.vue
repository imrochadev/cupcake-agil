<script setup lang="ts">
import type { CategoriaDTO, ProdutoDTO } from '#shared/tipos'

// Cadastro e edição de produto no painel (CUPC-12): nome, descrição, categoria, preço, estoque, disponibilidade e foto.
const props = defineProps<{ produto: ProdutoDTO | null, categorias: CategoriaDTO[] }>()
const emit = defineEmits<{ salvo: [produto: ProdutoDTO] }>()

const form = reactive({
  nome: props.produto?.nome ?? '',
  descricao: props.produto?.descricao ?? '',
  categoriaId: props.produto?.categoriaId ?? props.categorias[0]?.id ?? '',
  preco: props.produto ? (props.produto.precoCentavos / 100).toFixed(2).replace('.', ',') : '',
  estoque: props.produto?.estoque ?? 10,
  ativo: props.produto?.ativo ?? true,
})
const arquivo = ref<File | null>(null)
const previa = ref(props.produto?.imagemUrl ?? '')
const erro = ref('')
const campo = ref('')
const salvando = ref(false)

function escolher(f: File | undefined) {
  if (!f) return
  arquivo.value = f
  previa.value = URL.createObjectURL(f)
}

async function salvar() {
  erro.value = ''
  campo.value = ''
  const centavos = Math.round(Number(form.preco.replace(/\./g, '').replace(',', '.')) * 100)
  if (!Number.isFinite(centavos)) {
    erro.value = 'Preço inválido. Use, por exemplo, 12,90.'
    campo.value = 'precoCentavos'
    return
  }
  const dados = new FormData()
  dados.append('nome', form.nome)
  dados.append('descricao', form.descricao)
  dados.append('categoriaId', form.categoriaId)
  dados.append('precoCentavos', String(centavos))
  dados.append('estoque', String(form.estoque))
  dados.append('ativo', String(form.ativo))
  if (arquivo.value) dados.append('imagem', arquivo.value)
  salvando.value = true
  try {
    const salvo = props.produto
      ? await api<ProdutoDTO>(`/api/admin/produtos/${props.produto.id}`, { method: 'PUT', body: dados })
      : await api<ProdutoDTO>('/api/admin/produtos', { method: 'POST', body: dados })
    emit('salvo', salvo)
  } catch (e) {
    const falha = erroDe(e)
    erro.value = falha.message
    campo.value = falha.campo ?? ''
    rolarParaErro(document.querySelector('dialog[open]') as HTMLElement)
  } finally {
    salvando.value = false
  }
}
</script>

<template>
  <form class="grid gap-4" novalidate @submit.prevent="salvar">
    <div>
      <label class="label" for="p-nome">Nome</label>
      <input
        id="p-nome"
        v-model="form.nome"
        class="input"
        maxlength="60"
        required
        :aria-invalid="campo === 'nome'"
      >
    </div>
    <div>
      <label class="label" for="p-desc">Descrição</label>
      <textarea
        id="p-desc"
        v-model="form.descricao"
        class="input min-h-20"
        maxlength="300"
        :aria-invalid="campo === 'descricao'"
      />
    </div>
    <div class="grid gap-4 sm:grid-cols-3">
      <div>
        <label class="label" for="p-cat">Categoria</label>
        <select
          id="p-cat"
          v-model="form.categoriaId"
          class="input"
          :aria-invalid="campo === 'categoriaId'"
        >
          <option v-for="c in categorias" :key="c.id" :value="c.id">
            {{ c.nome }}
          </option>
        </select>
      </div>
      <div>
        <label class="label" for="p-preco">Preço (R$)</label>
        <input
          id="p-preco"
          v-model="form.preco"
          class="input"
          inputmode="decimal"
          placeholder="12,90"
          :aria-invalid="campo === 'precoCentavos'"
        >
      </div>
      <div>
        <label class="label" for="p-estoque">Estoque</label>
        <input
          id="p-estoque"
          v-model.number="form.estoque"
          type="number"
          min="0"
          max="9999"
          class="input"
          :aria-invalid="campo === 'estoque'"
        >
      </div>
    </div>
    <label class="flex items-center gap-2 font-semibold">
      <input v-model="form.ativo" type="checkbox" class="size-5 accent-brand">
      Disponível no cardápio
    </label>
    <div class="flex items-center gap-3">
      <img
        v-if="previa"
        :src="previa"
        alt="Foto atual do produto"
        class="size-20 rounded-xl border border-line object-cover"
      >
      <label class="btn-outline cursor-pointer">
        <Icon name="lucide:image-up" /> {{ previa ? 'Trocar foto' : 'Enviar foto' }}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          class="sr-only"
          @change="escolher(($event.target as HTMLInputElement).files?.[0])"
        >
      </label>
    </div>
    <p v-if="erro" class="alerta bg-danger-soft text-danger" role="alert">
      <Icon name="lucide:circle-alert" class="mt-0.5 shrink-0" /> {{ erro }}
    </p>
    <button type="submit" class="btn-primary" :disabled="salvando">
      {{ salvando ? 'Salvando…' : 'Salvar produto' }}
    </button>
  </form>
</template>
