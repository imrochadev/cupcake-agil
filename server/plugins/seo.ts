// Põe no HTML (SPA) os metadados da rota: é o que robôs e prévias de link enxergam, já que eles não rodam o app.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html, { event }) => {
    try {
      // O título e a descrição fixos do nuxt.config dão lugar aos da rota.
      html.head = html.head.map(trecho => trecho.replace(/<title>[\s\S]*?<\/title>/g, '').replace(/<meta name="description"[^>]*>/g, ''))
      html.head.push(tagsSeo(montarSeo(event)))
    } catch (erro) {
      console.error('[seo] falha ao montar os metadados:', erro)
    }
  })
})
