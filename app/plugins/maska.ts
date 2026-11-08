import { vMaska } from 'maska/vue'

// Máscaras nos campos (CEP, telefone): v-maska com data-maska, como no portal da Altpay.
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('maska', vMaska)
})
