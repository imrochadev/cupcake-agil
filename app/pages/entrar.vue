<script setup lang="ts">
import type { ConfigDTO } from '#shared/tipos'

// Login (CUPC-7): e-mail e senha, ou Google/GitHub quando configurados.
const route = useRoute()
const voltar = computed(() => caminhoSeguro(route.query.voltar))
const { atualizar } = useSessao()
const { avisar } = useToast()
const { data: config } = useLazyFetch<ConfigDTO>('/api/config')

const email = ref('')
const senha = ref('')
const erro = ref('')
const entrando = ref(false)

async function entrar() {
  erro.value = ''
  if (!email.value.trim() || !senha.value) {
    erro.value = 'Informe e-mail e senha.'
    return
  }
  entrando.value = true
  const { error } = await authClient.signIn.email({ email: email.value.trim(), password: senha.value })
  entrando.value = false
  if (error) {
    erro.value = erroDeConta(error)
    return rolarParaErro()
  }
  const usuario = await atualizar()
  avisar(`Que bom te ver, ${usuario?.nome.split(' ')[0] ?? ''}!`)
  await navigateTo(voltar.value)
}

async function social(provider: 'google' | 'github') {
  await authClient.signIn.social({ provider, callbackURL: voltar.value, errorCallbackURL: '/entrar' })
}
</script>

<template>
  <div class="mx-auto max-w-md">
    <div class="card p-6">
      <h1 class="text-2xl font-semibold">
        Entrar
      </h1>
      <p class="mt-1 text-sm text-muted">
        Para montar o carrinho e acompanhar seus pedidos.
      </p>

      <div v-if="config?.provedores.length" class="mt-5 grid gap-2">
        <button
          v-if="config.provedores.includes('google')"
          type="button"
          class="btn-outline"
          @click="social('google')"
        >
          <Icon name="simple-icons:google" /> Entrar com Google
        </button>
        <button
          v-if="config.provedores.includes('github')"
          type="button"
          class="btn-outline"
          @click="social('github')"
        >
          <Icon name="simple-icons:github" /> Entrar com GitHub
        </button>
        <p class="my-1 text-center text-xs text-muted">
          ou com e-mail
        </p>
      </div>

      <form
        class="mt-5 grid gap-4"
        novalidate
        @submit.prevent="entrar"
      >
        <div>
          <label class="label" for="email">E-mail</label>
          <input
            id="email"
            v-model="email"
            type="email"
            class="input"
            autocomplete="email"
            required
            :aria-invalid="!!erro"
          >
        </div>
        <div>
          <div class="flex items-baseline justify-between">
            <label class="label" for="senha">Senha</label>
            <NuxtLink to="/recuperar-senha" class="text-sm font-semibold text-brand hover:underline">
              Esqueci a senha
            </NuxtLink>
          </div>
          <input
            id="senha"
            v-model="senha"
            type="password"
            class="input"
            autocomplete="current-password"
            required
            :aria-invalid="!!erro"
          >
        </div>
        <p v-if="erro" class="alerta bg-danger-soft text-danger" role="alert">
          <Icon name="lucide:circle-alert" class="mt-0.5 shrink-0" /> {{ erro }}
        </p>
        <button type="submit" class="btn-primary" :disabled="entrando">
          {{ entrando ? 'Entrando…' : 'Entrar' }}
        </button>
      </form>
    </div>
    <p class="mt-4 text-center text-sm">
      Ainda não tem conta?
      <NuxtLink :to="{ path: '/cadastro', query: route.query }" class="font-bold text-brand hover:underline">
        Criar conta
      </NuxtLink>
    </p>
  </div>
</template>
