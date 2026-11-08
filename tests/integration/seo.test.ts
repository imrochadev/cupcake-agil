import { describe, expect, it } from 'vitest'
import { Cliente } from './cliente'

// O que robôs e prévias de link (WhatsApp, LinkedIn) recebem: o HTML direto do servidor, sem rodar o app.
const html = async (caminho: string) => (await new Cliente().get<string>(caminho)).dados

describe('SEO e Open Graph', () => {
  it('a página inicial vem com título, descrição, Open Graph, Twitter, canonical e JSON-LD', async () => {
    const h = await html('/')
    const base = new Cliente().base
    expect(h).toContain('<title>Cupcake Ágil: cupcakes artesanais na sua porta</title>')
    expect(h.match(/<title>/g)).toHaveLength(1)
    expect(h).toContain('<meta property="og:title" content="Cupcake Ágil: cupcakes artesanais na sua porta">')
    expect(h).toContain(`<meta property="og:image" content="${base}/og.jpg">`)
    expect(h).toContain('<meta name="twitter:card" content="summary_large_image">')
    expect(h).toContain(`<link rel="canonical" href="${base}/">`)
    expect(h).toContain('<meta name="robots" content="index, follow, max-image-preview:large">')
    expect(h).toContain('"@type":"Bakery"')
  })

  it('páginas pessoais não são indexadas', async () => {
    for (const caminho of ['/carrinho', '/pedidos/123', '/admin']) expect(await html(caminho)).toContain('<meta name="robots" content="noindex, follow">')
    expect(await html('/pedidos')).toContain('<title>Meus pedidos · Cupcake Ágil</title>')
  })

  it('robots.txt e sitemap.xml', async () => {
    const base = new Cliente().base
    const robots = await html('/robots.txt')
    expect(robots).toContain('Disallow: /api/')
    expect(robots).toContain(`Sitemap: ${base}/sitemap.xml`)
    const sitemap = await html('/sitemap.xml')
    expect(sitemap).toContain(`<loc>${base}/</loc>`)
    expect(sitemap).not.toContain('/pedidos')
  })

  it('a imagem de prévia existe', async () => {
    const r = await fetch(`${new Cliente().base}/og.jpg`)
    expect(r.status).toBe(200)
    expect(r.headers.get('content-type')).toContain('image/jpeg')
  })
})
