<script setup lang="ts">
// Formulário de feedback dos testadores (PIT II, Situação 3): nome, data do teste, o que funcionou, o que não
// funcionou (e o que corrigir), o que não foi testado (e por quê), sugestões, nota e uma captura de tela opcional.
// Abre pelo botão flutuante ou pelo link com ?feedback=1 (o que se manda para os amigos).
const aberto = ref(false)
const route = useRoute()
const { usuario } = useSessao()
const { avisar } = useToast()

const hoje = () => new Date().toLocaleDateString('sv-SE')
const vazio = () => ({ nome: '', dataTeste: hoje(), funcionou: '', naoFuncionou: '', naoTestado: '', sugestoes: '', nota: 0 })
const form = reactive(vazio())
const imagem = ref<File | null>(null)
const previa = ref('')
const erro = ref('')
const campoErro = ref('')
const enviando = ref(false)
const enviado = ref(false)
const MAX = 3 * 1024 * 1024

onMounted(() => {
  if (route.query.feedback !== undefined) aberto.value = true
})
watch(aberto, (valor) => {
  if (!valor) return
  enviado.value = false
  erro.value = ''
  try {
    form.nome ||= localStorage.getItem('cupcake:testador') ?? ''
  } catch {}
  form.nome ||= usuario.value?.nome ?? ''
})

function escolherImagem(arquivo: File | null | undefined) {
  erro.value = ''
  if (!arquivo) return
  if (!/^image\/(png|jpeg|webp)$/.test(arquivo.type)) {
    erro.value = 'A captura precisa ser PNG, JPEG ou WebP.'
    return
  }
  if (arquivo.size > MAX) {
    erro.value = 'Imagem muito grande: o limite é 3 MB.'
    return
  }
  if (previa.value) URL.revokeObjectURL(previa.value)
  imagem.value = arquivo
  previa.value = URL.createObjectURL(arquivo)
}

function tirarImagem() {
  if (previa.value) URL.revokeObjectURL(previa.value)
  imagem.value = null
  previa.value = ''
}

// Ctrl+V / Cmd+V com uma captura de tela na área de transferência.
function colar(e: ClipboardEvent) {
  const item = [...(e.clipboardData?.items ?? [])].find(i => i.type.startsWith('image/'))
  if (item) escolherImagem(item.getAsFile())
}

async function enviar() {
  erro.value = ''
  campoErro.value = ''
  if (!form.funcionou.trim() && !form.naoFuncionou.trim() && !form.naoTestado.trim() && !form.sugestoes.trim()) {
    erro.value = 'Conte pelo menos o que funcionou, o que não funcionou, o que não testou ou uma sugestão.'
    campoErro.value = 'funcionou'
    return rolarParaErro(document.querySelector('dialog[open]') as HTMLElement)
  }
  const dados = new FormData()
  for (const [chave, valor] of Object.entries(form)) dados.append(chave, chave === 'nota' && !valor ? '' : String(valor))
  dados.append('pagina', route.fullPath.slice(0, 200))
  if (imagem.value) dados.append('imagem', imagem.value)
  enviando.value = true
  try {
    await api('/api/feedbacks', { method: 'POST', body: dados })
    try {
      localStorage.setItem('cupcake:testador', form.nome)
    } catch {}
    Object.assign(form, { ...vazio(), nome: form.nome })
    tirarImagem()
    enviado.value = true
  } catch (e) {
    const falha = erroDe(e)
    erro.value = falha.message
    campoErro.value = falha.campo ?? ''
    rolarParaErro(document.querySelector('dialog[open]') as HTMLElement)
  } finally {
    enviando.value = false
  }
}

function deNovo() {
  enviado.value = false
}

function fecharSeEnviado() {
  if (enviado.value) avisar('Obrigado pelo feedback!')
  aberto.value = false
}
</script>

<template>
  <button
    type="button"
    class="no-print btn-primary fixed right-4 bottom-4 z-30 rounded-full px-4 py-3 shadow-lg sm:right-6 sm:bottom-6"
    @click="aberto = true"
  >
    <Icon name="lucide:message-square-heart" class="text-lg" />
    <span>Avaliar o site</span>
  </button>

  <BaseDialog
    v-model:aberto="aberto"
    titulo="Avalie a Cupcake Ágil"
    descricao="Você está testando um projeto da faculdade. Nada é cobrado: use os cartões de teste no checkout. Conte o que funcionou e o que deu errado, sem dó."
    largo
  >
    <div v-if="enviado" class="py-6 text-center">
      <Icon name="lucide:party-popper" class="text-5xl text-brand" />
      <p class="mt-3 text-lg font-bold">
        Feedback enviado. Muito obrigado!
      </p>
      <p class="mt-1 text-sm text-muted">
        Achou mais alguma coisa? Pode mandar quantos quiser.
      </p>
      <div class="mt-5 flex justify-center gap-2">
        <button type="button" class="btn-outline" @click="deNovo">
          Enviar outro
        </button>
        <button type="button" class="btn-primary" @click="fecharSeEnviado">
          Fechar
        </button>
      </div>
    </div>

    <form
      v-else
      class="grid gap-4"
      novalidate
      @submit.prevent="enviar"
      @paste="colar"
    >
      <div class="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div>
          <label class="label" for="fb-nome">Seu nome *</label>
          <input
            id="fb-nome"
            v-model="form.nome"
            class="input"
            autofocus
            required
            minlength="2"
            maxlength="80"
            autocomplete="name"
            :aria-invalid="campoErro === 'nome'"
          >
        </div>
        <div>
          <label class="label" for="fb-data">Data do teste *</label>
          <input
            id="fb-data"
            v-model="form.dataTeste"
            type="date"
            class="input"
            required
            :max="hoje()"
          >
        </div>
      </div>

      <div>
        <label class="label" for="fb-ok">O que você testou e funcionou</label>
        <textarea
          id="fb-ok"
          v-model="form.funcionou"
          class="input min-h-20"
          maxlength="2000"
          placeholder="Ex.: criei a conta, adicionei 3 cupcakes e paguei com PIX sem problemas."
          :aria-invalid="campoErro === 'funcionou'"
        />
      </div>
      <div>
        <label class="label" for="fb-bug">O que testou e não funcionou (e o que deve ser corrigido)</label>
        <textarea
          id="fb-bug"
          v-model="form.naoFuncionou"
          class="input min-h-20"
          maxlength="2000"
          placeholder="Ex.: no celular, o botão de finalizar ficou atrás do teclado."
        />
      </div>
      <div>
        <label class="label" for="fb-nt">O que não testou (e por quê)</label>
        <textarea
          id="fb-nt"
          v-model="form.naoTestado"
          class="input min-h-16"
          maxlength="2000"
          placeholder="Ex.: não testei a recuperação de senha porque não recebi o e-mail."
        />
      </div>
      <div>
        <label class="label" for="fb-sug">Sugestões de melhoria</label>
        <textarea
          id="fb-sug"
          v-model="form.sugestoes"
          class="input min-h-16"
          maxlength="2000"
        />
      </div>

      <fieldset>
        <legend class="label">
          Nota geral
        </legend>
        <div class="flex gap-1">
          <button
            v-for="n in 5"
            :key="n"
            type="button"
            class="rounded-lg p-1 text-3xl transition hover:scale-110"
            :class="n <= form.nota ? 'text-accent' : 'text-line'"
            :aria-label="`${n} de 5`"
            :aria-pressed="n === form.nota"
            @click="form.nota = form.nota === n ? 0 : n"
          >
            <Icon name="lucide:star" :class="{ '[&_path]:fill-current': n <= form.nota }" />
          </button>
        </div>
      </fieldset>

      <div>
        <span class="label">Captura de tela (opcional)</span>
        <div v-if="previa" class="flex items-center gap-3">
          <img
            :src="previa"
            alt="Prévia da captura de tela"
            class="h-20 rounded-lg border border-line object-cover"
          >
          <button type="button" class="btn-ghost" @click="tirarImagem">
            <Icon name="lucide:trash-2" /> Remover
          </button>
        </div>
        <label v-else class="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-line p-3 text-sm text-muted hover:border-brand">
          <Icon name="lucide:image-plus" class="text-2xl" />
          <span>Escolha uma imagem (PNG, JPEG ou WebP, até 3 MB) ou cole com Ctrl+V.</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            class="sr-only"
            @change="escolherImagem(($event.target as HTMLInputElement).files?.[0])"
          >
        </label>
      </div>

      <p v-if="erro" class="alerta bg-danger-soft text-danger" role="alert">
        <Icon name="lucide:circle-alert" class="mt-0.5 shrink-0" /> {{ erro }}
      </p>

      <div class="flex justify-end gap-2">
        <button type="button" class="btn-ghost" @click="aberto = false">
          Cancelar
        </button>
        <button type="submit" class="btn-primary" :disabled="enviando">
          <Icon :name="enviando ? 'lucide:loader-circle' : 'lucide:send'" :class="{ 'animate-spin': enviando }" />
          Enviar feedback
        </button>
      </div>
    </form>
  </BaseDialog>
</template>
