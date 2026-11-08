// ESLint: a configuração do Nuxt (gerada em .nuxt/ pelo @nuxt/eslint, com as regras de estilo) e os ajustes daqui.
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    'vue/max-attributes-per-line': ['error', { singleline: { max: 3 }, multiline: { max: 1 } }],
    'no-empty': ['error', { allowEmptyCatch: true }],
  },
}, {
  // Nos testes, as respostas da API são lidas soltas (o teste confere o formato).
  files: ['tests/**'],
  rules: { '@typescript-eslint/no-explicit-any': 'off' },
})
