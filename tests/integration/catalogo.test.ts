import { describe, expect, it } from 'vitest'
import type { CatalogoDTO } from '../../shared/tipos'
import { Cliente } from './cliente'

// CUPC-8: cardápio com foto, preço, descrição, categorias e disponibilidade.
describe('catálogo', () => {
  it('lista categorias e produtos com tudo o que a tela mostra', async () => {
    const { status, dados } = await new Cliente().get<CatalogoDTO>('/api/catalogo')
    expect(status).toBe(200)
    expect(dados.categorias.map(c => c.nome)).toEqual(['Clássicos', 'Frutados', 'Especiais', 'Veganos'])
    expect(dados.produtos.length).toBeGreaterThanOrEqual(10)
    // O cardápio inicial tem foto em todos (outros testes criam produtos sem foto).
    expect(dados.produtos.filter(p => p.imagemUrl).length).toBeGreaterThanOrEqual(10)
    for (const p of dados.produtos) {
      if (p.imagemUrl) expect(p.imagemUrl).toMatch(/^\/api\/imagens\/[a-f\d]{24}$/)
      expect(p.precoCentavos).toBeGreaterThan(0)
      expect(p.descricao.length).toBeGreaterThan(10)
      expect(dados.categorias.some(c => c.id === p.categoriaId)).toBe(true)
    }
  })

  it('mostra o esgotado como indisponível', async () => {
    const { dados } = await new Cliente().get<CatalogoDTO>('/api/catalogo')
    const pistache = dados.produtos.find(p => p.nome === 'Pistache')
    expect(pistache).toMatchObject({ estoque: 0, disponivel: false })
  })

  it('serve a foto com cache longo e sem virar página', async () => {
    const { dados } = await new Cliente().get<CatalogoDTO>('/api/catalogo')
    const r = await fetch(new Cliente().base + dados.produtos.find(p => p.imagemUrl)!.imagemUrl)
    expect(r.status).toBe(200)
    expect(r.headers.get('content-type')).toBe('image/jpeg')
    expect(r.headers.get('cache-control')).toContain('immutable')
    expect(r.headers.get('content-security-policy')).toContain('sandbox')
  })

  it('imagem inexistente ou id inválido dá 404', async () => {
    const c = new Cliente()
    expect((await c.get('/api/imagens/000000000000000000000000')).status).toBe(404)
    expect((await c.get('/api/imagens/nao-e-id')).status).toBe(404)
  })
})
