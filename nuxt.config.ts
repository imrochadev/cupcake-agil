import tailwindcss from '@tailwindcss/vite'

// Loja inteira num app Nuxt: as telas (app/, a View do MVC), as rotas da API (server/api, os Controllers) e o acesso
// ao MongoDB (server/models, os Models). As regras puras (preço, pagamento, etapas do pedido) ficam em shared/ e valem
// nos dois lados.
export default defineNuxtConfig({
  modules: ['@nuxt/icon', '@nuxt/eslint'],
  // Tudo depende da sessão do cliente (carrinho, pedidos): renderiza no navegador, como o flaggle.
  ssr: false,
  devtools: { enabled: false },
  app: {
    head: {
      title: 'Cupcake Ágil',
      htmlAttrs: { lang: 'pt-BR' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: 'Cupcakes artesanais com entrega: escolha no cardápio, pague como preferir e acompanhe o pedido até a sua porta.' },
        { name: 'theme-color', content: '#fff7f2' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=Nunito:wght@400;600;700;800&display=swap' },
      ],
    },
  },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    databaseUrl: '',
    /** E-mails (separados por vírgula) que viram administradores ao criar a conta. */
    adminEmails: '',
    /** Minutos entre as etapas do pedido na entrega simulada (recebido → em preparo → saiu → entregue). */
    etapaMinutos: '2',
    /** SMTP para o e-mail de senha nova; sem MAIL_HOST o link sai só no log do servidor. */
    mailHost: process.env.MAIL_HOST || '',
    mailPort: process.env.MAIL_PORT || '587',
    mailUser: process.env.MAIL_USERNAME || '',
    mailPassword: process.env.MAIL_PASSWORD || '',
    mailFrom: process.env.MAIL_FROM || 'Cupcake Ágil <nao-responda@cupcakeagil.dev>',
  },
  compatibilityDate: '2026-10-01',
  // Na Vercel, as funções rodam em São Paulo (gru1), ao lado do cluster do MongoDB Atlas e de quem usa a loja.
  nitro: { vercel: { functions: { regions: ['gru1'] } } },
  vite: {
    plugins: [tailwindcss()],
  },
  typescript: {
    strict: true,
  },
  eslint: { config: { stylistic: { braceStyle: '1tbs' } } },
  // Ícones embutidos no bundle (só os usados): nada é buscado na Iconify em tempo de execução.
  icon: {
    mode: 'svg',
    provider: 'none',
    fallbackToApi: false,
    serverBundle: false,
    clientBundle: {
      scan: { globInclude: ['app/**/*.{vue,ts}'], globExclude: ['node_modules', '.nuxt', '.output'] },
    },
  },
})
