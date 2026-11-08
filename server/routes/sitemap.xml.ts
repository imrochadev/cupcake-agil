// Sitemap só com as páginas públicas (conta, carrinho, pedidos e painel são pessoais).
export default defineEventHandler((event) => {
  const origem = origemDoSite(event)
  setResponseHeaders(event, { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' })
  const urls = Object.keys(PAGINAS_PUBLICAS).map(p => `  <url><loc>${origem}${p}</loc><changefreq>${p === '/' ? 'daily' : 'monthly'}</changefreq><priority>${p === '/' ? '1.0' : '0.5'}</priority></url>`)
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
})
