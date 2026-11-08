<script setup lang="ts">
// Destino do link do e-mail: cria a senha nova (o token vem na URL) e encerra as outras sessões da conta.
const route = useRoute()
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const linkInvalido = computed(() => !token.value || route.query.error === 'INVALID_TOKEN')
const { avisar } = useToast()

const senha = ref('')
const confirmar = ref('')
const erro = ref('')
const enviando = ref(false)

async function salvar() {
  erro.value = ''
  if (senha.value.length < 8) {
    erro.value = 'A senha precisa de pelo menos 8 caracteres.'
    return
  }
  if (senha.value !== confirmar.value) {
    erro.value = 'As senhas não são iguais.'
    return
  }
  enviando.value = true
  const { error } = await authClient.resetPassword({ newPassword: senha.value, token: token.value })
  enviando.value = false
  if (error) {
    erro.value = erroDeConta(error)
    return
  }
  avisar('Senha alterada. Entre com a senha nova.')
  await navigateTo('/entrar')
}
</script>

<template>
  <div class="mx-auto max-w-md">
    <div class="card p-6">
      <h1 class="text-2xl font-semibold">
        Criar senha nova
      </h1>
      <div v-if="linkInvalido" class="mt-4 grid gap-3">
        <p class="alerta bg-danger-soft text-danger" role="alert">
          <Icon name="lucide:link-2-off" class="mt-0.5 shrink-0" /> Este link expirou ou já foi usado.
        </p>
        <NuxtLink to="/recuperar-senha" class="btn-primary">
          Pedir outro link
        </NuxtLink>
      </div>
      <form
        v-else
        class="mt-4 grid gap-4"
        novalidate
        @submit.prevent="salvar"
      >
        <div>
          <label class="label" for="senha">Senha nova</label>
          <input
            id="senha"
            v-model="senha"
            type="password"
            class="input"
            autocomplete="new-password"
          >
        </div>
        <div>
          <label class="label" for="confirmar">Confirme a senha nova</label>
          <input
            id="confirmar"
            v-model="confirmar"
            type="password"
            class="input"
            autocomplete="new-password"
          >
        </div>
        <p v-if="erro" class="alerta bg-danger-soft text-danger" role="alert">
          <Icon name="lucide:circle-alert" class="mt-0.5 shrink-0" /> {{ erro }}
        </p>
        <button type="submit" class="btn-primary" :disabled="enviando">
          Salvar senha
        </button>
      </form>
    </div>
  </div>
</template>
