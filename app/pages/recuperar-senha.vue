<script setup lang="ts">
// Recuperação de senha (CUPC-7, CA-3): manda um link para o e-mail. A resposta é a mesma com ou sem conta.
const email = ref('')
const erro = ref('')
const enviado = ref(false)
const enviando = ref(false)

async function pedir() {
  erro.value = ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    erro.value = 'Informe um e-mail válido.'
    return
  }
  enviando.value = true
  const { error } = await authClient.requestPasswordReset({ email: email.value.trim(), redirectTo: '/redefinir-senha' })
  enviando.value = false
  if (error) erro.value = erroDeConta(error)
  else enviado.value = true
}
</script>

<template>
  <div class="mx-auto max-w-md">
    <div class="card p-6">
      <h1 class="text-2xl font-semibold">
        Recuperar senha
      </h1>
      <div v-if="enviado" class="mt-4 alerta bg-ok-soft text-ok" role="status">
        <Icon name="lucide:mail-check" class="mt-0.5 shrink-0" />
        Se existir uma conta com esse e-mail, enviamos um link para criar uma senha nova. Ele vale por 1 hora.
      </div>
      <form
        v-else
        class="mt-4 grid gap-4"
        novalidate
        @submit.prevent="pedir"
      >
        <p class="text-sm text-muted">
          Informe o e-mail da conta e enviaremos um link para criar uma senha nova.
        </p>
        <div>
          <label class="label" for="email">E-mail</label>
          <input
            id="email"
            v-model="email"
            type="email"
            class="input"
            autocomplete="email"
            :aria-invalid="!!erro"
          >
          <p v-if="erro" class="erro" role="alert">
            {{ erro }}
          </p>
        </div>
        <button type="submit" class="btn-primary" :disabled="enviando">
          Enviar link
        </button>
      </form>
    </div>
    <p class="mt-4 text-center text-sm">
      <NuxtLink to="/entrar" class="font-bold text-brand hover:underline">
        Voltar para o login
      </NuxtLink>
    </p>
  </div>
</template>
