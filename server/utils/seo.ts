import type { H3Event } from 'h3'

// Metadados de cada rota (título, descrição, Open Graph, Twitter, canonical, robots e JSON-LD) postos no HTML pelo
// servidor (server/plugins/seo.ts): o site é SPA, e robôs e prévias de link (WhatsApp, LinkedIn…) não rodam o app.

export interface Seo {
  titulo: string
  descricao: string
  canonical: string
  imagem: string
  indexar: boolean
  jsonLd?: object
}

const NOME = 'Cupcake Ágil'
const DESCRICAO = 'Cupcakes artesanais com entrega: escolha no cardápio, pague com PIX, cartão ou dinheiro e acompanhe o pedido até a sua porta. Entrega grátis acima de R$ 80.'
const IMAGEM = { largura: 1200, altura: 630, alt: 'Cupcakes da Cupcake Ágil: chocolate, morango, red velvet e limão' }

/** Páginas públicas (entram no sitemap e podem ser indexadas); o resto (conta, carrinho, pedidos, painel) não. */
export const PAGINAS_PUBLICAS: Record<string, { titulo: string, descricao: string }> = {
  '/': { titulo: `${NOME}: cupcakes artesanais na sua porta`, descricao: DESCRICAO },
  '/entrar': { titulo: `Entrar · ${NOME}`, descricao: 'Entre na sua conta da Cupcake Ágil para montar o carrinho e acompanhar seus pedidos.' },
  '/cadastro': { titulo: `Criar conta · ${NOME}`, descricao: 'Crie sua conta na Cupcake Ágil e peça cupcakes artesanais com entrega.' },
}

const PRIVADAS: Record<string, string> = {
  '/carrinho': 'Carrinho',
  '/checkout': 'Finalizar compra',
  '/pedidos': 'Meus pedidos',
  '/recuperar-senha': 'Recuperar senha',
  '/redefinir-senha': 'Criar senha nova',
  '/admin': 'Painel da loja',
}

/** Endereço público do site: BETTER_AUTH_URL (o domínio principal) ou o da própria requisição. */
export function origemDoSite(event: H3Event): string {
  return (process.env.BETTER_AUTH_URL || getRequestURL(event).origin).replace(/\/+$/, '')
}

export function montarSeo(event: H3Event): Seo {
  const origem = origemDoSite(event)
  const caminho = getRequestURL(event).pathname.replace(/\/+$/, '') || '/'
  const publica = PAGINAS_PUBLICAS[caminho]
  const privada = Object.entries(PRIVADAS).find(([p]) => caminho === p || caminho.startsWith(`${p}/`))?.[1]
  const seo: Seo = {
    titulo: publica?.titulo ?? (privada ? `${privada} · ${NOME}` : NOME),
    descricao: publica?.descricao ?? DESCRICAO,
    canonical: `${origem}${caminho}`,
    imagem: `${origem}/og.jpg`,
    indexar: Boolean(publica),
  }
  if (caminho === '/') {
    seo.jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Bakery',
      'name': NOME,
      'url': `${origem}/`,
      'description': DESCRICAO,
      'image': seo.imagem,
      'logo': `${origem}/apple-touch-icon.png`,
      'servesCuisine': 'Confeitaria',
      'priceRange': 'R$',
      'currenciesAccepted': 'BRL',
      'paymentAccepted': 'PIX, Cartão de crédito, Dinheiro',
      'areaServed': 'BR',
    }
  }
  return seo
}

const ENTIDADES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }
const esc = (t: string) => t.replace(/[&<>"']/g, c => ENTIDADES[c]!)

export function tagsSeo(seo: Seo): string {
  const meta = (attr: 'name' | 'property', chave: string, valor: string) => `<meta ${attr}="${chave}" content="${esc(valor)}">`
  const tags = [
    `<title>${esc(seo.titulo)}</title>`,
    meta('name', 'description', seo.descricao),
    meta('name', 'robots', seo.indexar ? 'index, follow, max-image-preview:large' : 'noindex, follow'),
    `<link rel="canonical" href="${esc(seo.canonical)}">`,
    meta('property', 'og:site_name', NOME),
    meta('property', 'og:type', 'website'),
    meta('property', 'og:locale', 'pt_BR'),
    meta('property', 'og:title', seo.titulo),
    meta('property', 'og:description', seo.descricao),
    meta('property', 'og:url', seo.canonical),
    meta('property', 'og:image', seo.imagem),
    meta('property', 'og:image:type', 'image/jpeg'),
    meta('property', 'og:image:width', String(IMAGEM.largura)),
    meta('property', 'og:image:height', String(IMAGEM.altura)),
    meta('property', 'og:image:alt', IMAGEM.alt),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', seo.titulo),
    meta('name', 'twitter:description', seo.descricao),
    meta('name', 'twitter:image', seo.imagem),
    meta('name', 'twitter:image:alt', IMAGEM.alt),
  ]
  if (seo.jsonLd) tags.push(`<script type="application/ld+json">${JSON.stringify(seo.jsonLd).replace(/</g, '\\u003c')}</script>`)
  return tags.join('')
}
