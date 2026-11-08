<script setup lang="ts">
import { UFS, type Endereco } from '#shared/endereco'
import { MASCARAS, soNumeros } from '#shared/mascaras'

// Endereço em campos separados. Ao completar o CEP, busca rua, bairro, cidade e UF na BrasilAPI (como o portal da
// Altpay) e leva o foco para o número. Se o CEP não for achado, a pessoa preenche à mão.
const endereco = defineModel<Endereco>({ required: true })
const props = defineProps<{ erros?: Record<string, string>, prefixo?: string }>()
const id = (campo: string) => `${props.prefixo ?? 'end'}-${campo}`
const erro = (campo: string) => props.erros?.[campo] ?? props.erros?.[`endereco.${campo}`]

const buscando = ref(false)
const avisoCep = ref('')
let ultimoCep = soNumeros(endereco.value.cep)

watch(() => endereco.value.cep, async (cep) => {
  const digitos = soNumeros(cep)
  if (digitos.length !== 8 || digitos === ultimoCep) return
  ultimoCep = digitos
  buscando.value = true
  avisoCep.value = ''
  try {
    const r = await $fetch<{ street?: string, neighborhood?: string, city?: string, state?: string }>(`https://brasilapi.com.br/api/cep/v2/${digitos}`)
    endereco.value = {
      ...endereco.value,
      logradouro: r.street || endereco.value.logradouro,
      bairro: r.neighborhood || endereco.value.bairro,
      cidade: r.city || endereco.value.cidade,
      uf: r.state || endereco.value.uf,
    }
    await nextTick()
    document.getElementById(id(r.street ? 'numero' : 'logradouro'))?.focus()
  } catch {
    avisoCep.value = 'Não achamos esse CEP. Confira os números ou preencha o endereço à mão.'
  } finally {
    buscando.value = false
  }
})
</script>

<template>
  <div class="grid grid-cols-6 gap-4">
    <div class="col-span-6 sm:col-span-2">
      <label class="label" :for="id('cep')">CEP *</label>
      <div class="relative">
        <input
          :id="id('cep')"
          v-model="endereco.cep"
          v-maska
          :data-maska="MASCARAS.cep"
          class="input"
          inputmode="numeric"
          autocomplete="postal-code"
          placeholder="00000-000"
          :aria-invalid="!!erro('cep')"
        >
        <Icon v-if="buscando" name="lucide:loader-circle" class="absolute top-1/2 right-3 -translate-y-1/2 animate-spin text-muted" />
      </div>
      <p v-if="erro('cep')" class="erro">
        {{ erro('cep') }}
      </p>
      <p v-else-if="avisoCep" class="hint text-warn">
        {{ avisoCep }}
      </p>
      <a
        v-else
        href="https://buscacepinter.correios.com.br/app/endereco/index.php"
        target="_blank"
        rel="noopener"
        class="hint inline-block hover:underline"
      >Não sei meu CEP</a>
    </div>
    <div class="col-span-6 sm:col-span-4">
      <label class="label" :for="id('logradouro')">Rua *</label>
      <input
        :id="id('logradouro')"
        v-model="endereco.logradouro"
        class="input"
        autocomplete="address-line1"
        maxlength="120"
        placeholder="Rua, avenida…"
        :aria-invalid="!!erro('logradouro')"
      >
      <p v-if="erro('logradouro')" class="erro">
        {{ erro('logradouro') }}
      </p>
    </div>
    <div class="col-span-2">
      <label class="label" :for="id('numero')">Número *</label>
      <input
        :id="id('numero')"
        v-model="endereco.numero"
        class="input"
        inputmode="numeric"
        maxlength="10"
        placeholder="123"
        :aria-invalid="!!erro('numero')"
      >
      <p v-if="erro('numero')" class="erro">
        {{ erro('numero') }}
      </p>
    </div>
    <div class="col-span-4">
      <label class="label" :for="id('complemento')">Complemento</label>
      <input
        :id="id('complemento')"
        v-model="endereco.complemento"
        class="input"
        autocomplete="address-line2"
        maxlength="60"
        placeholder="Apto, bloco, casa…"
        :aria-invalid="!!erro('complemento')"
      >
      <p v-if="erro('complemento')" class="erro">
        {{ erro('complemento') }}
      </p>
    </div>
    <div class="col-span-6 sm:col-span-2">
      <label class="label" :for="id('bairro')">Bairro *</label>
      <input
        :id="id('bairro')"
        v-model="endereco.bairro"
        class="input"
        maxlength="80"
        :aria-invalid="!!erro('bairro')"
      >
      <p v-if="erro('bairro')" class="erro">
        {{ erro('bairro') }}
      </p>
    </div>
    <div class="col-span-4 sm:col-span-3">
      <label class="label" :for="id('cidade')">Cidade *</label>
      <input
        :id="id('cidade')"
        v-model="endereco.cidade"
        class="input"
        autocomplete="address-level2"
        maxlength="80"
        :aria-invalid="!!erro('cidade')"
      >
      <p v-if="erro('cidade')" class="erro">
        {{ erro('cidade') }}
      </p>
    </div>
    <div class="col-span-2 sm:col-span-1">
      <label class="label" :for="id('uf')">UF *</label>
      <select
        :id="id('uf')"
        v-model="endereco.uf"
        class="input px-2"
        autocomplete="address-level1"
        :aria-invalid="!!erro('uf')"
      >
        <option value="" disabled>
          UF
        </option>
        <option
          v-for="(nome, sigla) in UFS"
          :key="sigla"
          :value="sigla"
          :title="nome"
        >
          {{ sigla }}
        </option>
      </select>
      <p v-if="erro('uf')" class="erro">
        {{ erro('uf') }}
      </p>
    </div>
  </div>
</template>
