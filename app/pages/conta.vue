<script setup lang="ts">
import { telefoneSchema } from '#shared/schemas'
import { enderecoSchema, enderecoVazio } from '#shared/endereco'
import { formatar, MASCARAS } from '#shared/mascaras'

// Minha conta: nome, telefone e endereço padrão, que já vêm preenchidos ao finalizar a compra (pedido do testador
// Mateus, que precisava digitar o endereço a cada pedido).
definePageMeta({ middleware: 'conta' })
const { usuario, atualizar } = useSessao()
const { avisar } = useToast()

const form = reactive({ nome: usuario.value?.nome ?? '', telefone: formatar.telefone(usuario.value?.telefone ?? '') })
const endereco = ref(usuario.value?.endereco ? { ...usuario.value.endereco } : enderecoVazio())
const comEndereco = computed(() => Object.values(endereco.value).some(v => v.trim()))
const erros = reactive<Record<string, string>>({})
const errosEndereco = reactive<Record<string, string>>({})
const formulario = ref<HTMLFormElement>()
const erroGeral = ref('')
const salvando = ref(false)

function validar(): boolean {
  for (const chave of Object.keys(erros)) Reflect.deleteProperty(erros, chave)
  for (const chave of Object.keys(errosEndereco)) Reflect.deleteProperty(errosEndereco, chave)
  if (form.nome.trim().length < 2) erros.nome = 'Informe seu nome.'
  if (form.telefone.trim() && !telefoneSchema.safeParse(form.telefone).success) erros.telefone = 'Use DDD + número, ex.: (11) 91234-5678.'
  const end = enderecoSchema.safeParse(endereco.value)
  if (comEndereco.value && !end.success) for (const issue of end.error.issues) errosEndereco[String(issue.path[0])] ??= issue.message
  return !Object.keys(erros).length && !Object.keys(errosEndereco).length
}

async function salvar() {
  erroGeral.value = ''
  if (!validar()) return rolarParaErro(formulario.value)
  salvando.value = true
  const { error } = await authClient.updateUser({
    name: form.nome.trim(),
    telefone: form.telefone.trim() || null,
    endereco: comEndereco.value ? JSON.stringify(enderecoSchema.parse(endereco.value)) : null,
  } as Parameters<typeof authClient.updateUser>[0])
  salvando.value = false
  if (error) {
    erroGeral.value = erroDeConta(error)
    return rolarParaErro(formulario.value)
  }
  await atualizar()
  avisar('Dados salvos! Eles já vêm preenchidos na próxima compra.')
}
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <h1 class="text-3xl font-semibold">
      Minha conta
    </h1>
    <p class="mt-1 text-muted">
      {{ usuario?.email }}
    </p>
    <form
      ref="formulario"
      class="card mt-5 grid gap-4 p-6"
      novalidate
      @submit.prevent="salvar"
    >
      <div v-if="erroGeral" class="alerta bg-danger-soft text-danger" role="alert">
        <Icon name="lucide:circle-alert" class="mt-0.5 shrink-0" /> {{ erroGeral }}
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="label" for="nome">Nome *</label>
          <input
            id="nome"
            v-model="form.nome"
            class="input"
            autocomplete="name"
            maxlength="80"
            :aria-invalid="!!erros.nome"
            aria-describedby="nome-erro"
          >
          <p v-if="erros.nome" id="nome-erro" class="erro">
            {{ erros.nome }}
          </p>
        </div>
        <div>
          <label class="label" for="telefone">Telefone</label>
          <input
            id="telefone"
            v-model="form.telefone"
            v-maska
            :data-maska="MASCARAS.telefone"
            type="tel"
            class="input"
            autocomplete="tel"
            placeholder="(11) 91234-5678"
            :aria-invalid="!!erros.telefone"
            aria-describedby="telefone-erro"
          >
          <p v-if="erros.telefone" id="telefone-erro" class="erro">
            {{ erros.telefone }}
          </p>
        </div>
      </div>
      <div>
        <h2 class="text-xl font-semibold">
          Endereço padrão
        </h2>
        <p class="hint mb-3">
          Ele já vem preenchido quando você finaliza uma compra.
        </p>
        <EnderecoCampos v-model="endereco" :erros="errosEndereco" prefixo="conta" />
      </div>
      <button type="submit" class="btn-primary justify-self-start" :disabled="salvando">
        <Icon :name="salvando ? 'lucide:loader-circle' : 'lucide:save'" :class="{ 'animate-spin': salvando }" />
        Salvar
      </button>
    </form>
  </div>
</template>
