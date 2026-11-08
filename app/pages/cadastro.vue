<script setup lang="ts">
import { telefoneSchema } from '#shared/schemas'
import { enderecoSchema, enderecoVazio } from '#shared/endereco'
import { MASCARAS } from '#shared/mascaras'

// Cadastro (CUPC-6): nome, e-mail e senha obrigatórios; telefone e endereço opcionais (já preenchem o checkout).
const route = useRoute()
const { atualizar } = useSessao()
const { avisar } = useToast()

const form = reactive({ nome: '', email: '', senha: '', confirmar: '', telefone: '' })
// Endereço opcional: só é conferido (e salvo) se a pessoa começar a preencher.
const endereco = ref(enderecoVazio())
const errosEndereco = reactive<Record<string, string>>({})
const comEndereco = computed(() => Object.values(endereco.value).some(v => v.trim()))
const formulario = ref<HTMLFormElement>()
const erros = reactive<Record<string, string>>({})
const erroGeral = ref('')
const enviando = ref(false)

function validar(): boolean {
  for (const chave of Object.keys(erros)) Reflect.deleteProperty(erros, chave)
  if (form.nome.trim().length < 2) erros.nome = 'Informe seu nome.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) erros.email = 'E-mail inválido.'
  if (form.senha.length < 8) erros.senha = 'A senha precisa de pelo menos 8 caracteres.'
  else if (form.senha !== form.confirmar) erros.confirmar = 'As senhas não são iguais.'
  if (form.telefone.trim() && !telefoneSchema.safeParse(form.telefone).success) erros.telefone = 'Use DDD + número, ex.: (11) 91234-5678.'
  for (const chave of Object.keys(errosEndereco)) Reflect.deleteProperty(errosEndereco, chave)
  const end = enderecoSchema.safeParse(endereco.value)
  if (comEndereco.value && !end.success) for (const issue of end.error.issues) errosEndereco[String(issue.path[0])] ??= issue.message
  return !Object.keys(erros).length && !Object.keys(errosEndereco).length
}

async function cadastrar() {
  erroGeral.value = ''
  if (!validar()) return rolarParaErro(formulario.value)
  enviando.value = true
  const { error } = await authClient.signUp.email({
    name: form.nome.trim(),
    email: form.email.trim(),
    password: form.senha,
    ...(form.telefone.trim() ? { telefone: form.telefone.trim() } : {}),
    ...(comEndereco.value ? { endereco: JSON.stringify(enderecoSchema.parse(endereco.value)) } : {}),
  } as Parameters<typeof authClient.signUp.email>[0])
  enviando.value = false
  if (error) {
    erroGeral.value = erroDeConta(error)
    return rolarParaErro(formulario.value)
  }
  await atualizar()
  avisar('Conta criada! Agora é só escolher seus cupcakes.')
  await navigateTo(caminhoSeguro(route.query.voltar))
}
</script>

<template>
  <div class="mx-auto max-w-md">
    <div class="card p-6">
      <h1 class="text-2xl font-semibold">
        Criar conta
      </h1>
      <form
        ref="formulario"
        class="mt-5 grid gap-4"
        novalidate
        @submit.prevent="cadastrar"
      >
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
          <label class="label" for="email">E-mail *</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            class="input"
            autocomplete="email"
            :aria-invalid="!!erros.email"
            aria-describedby="email-erro"
          >
          <p v-if="erros.email" id="email-erro" class="erro">
            {{ erros.email }}
          </p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="label" for="senha">Senha *</label>
            <input
              id="senha"
              v-model="form.senha"
              type="password"
              class="input"
              autocomplete="new-password"
              :aria-invalid="!!erros.senha"
              aria-describedby="senha-erro senha-dica"
            >
            <p id="senha-dica" class="hint">
              Mínimo de 8 caracteres.
            </p>
            <p v-if="erros.senha" id="senha-erro" class="erro">
              {{ erros.senha }}
            </p>
          </div>
          <div>
            <label class="label" for="confirmar">Confirme a senha *</label>
            <input
              id="confirmar"
              v-model="form.confirmar"
              type="password"
              class="input"
              autocomplete="new-password"
              :aria-invalid="!!erros.confirmar"
              aria-describedby="confirmar-erro"
            >
            <p v-if="erros.confirmar" id="confirmar-erro" class="erro">
              {{ erros.confirmar }}
            </p>
          </div>
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
        <fieldset class="grid gap-3">
          <legend class="label">
            Endereço de entrega <span class="font-normal text-muted">(opcional, já preenche o checkout)</span>
          </legend>
          <EnderecoCampos v-model="endereco" :erros="errosEndereco" prefixo="cadastro" />
        </fieldset>
        <p v-if="erroGeral" class="alerta bg-danger-soft text-danger" role="alert">
          <Icon name="lucide:circle-alert" class="mt-0.5 shrink-0" /> {{ erroGeral }}
        </p>
        <button type="submit" class="btn-primary" :disabled="enviando">
          {{ enviando ? 'Criando…' : 'Criar conta' }}
        </button>
      </form>
    </div>
    <p class="mt-4 text-center text-sm">
      Já tem conta?
      <NuxtLink :to="{ path: '/entrar', query: route.query }" class="font-bold text-brand hover:underline">
        Entrar
      </NuxtLink>
    </p>
  </div>
</template>
