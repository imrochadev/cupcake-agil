// robots.txt: páginas públicas liberadas, API fora, e o endereço do sitemap.
export default defineEventHandler((event) => {
  setResponseHeaders(event, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' })
  return ['User-agent: *', 'Allow: /', 'Disallow: /api/', 'Disallow: /admin', '', `Sitemap: ${origemDoSite(event)}/sitemap.xml`, ''].join('\n')
})
