import { describe, expect, it } from 'vitest'
import { enderecoSchema, formatarEndereco, lerEnderecoSalvo } from '#shared/endereco'
import { formatar } from '#shared/mascaras'

const ENDERECO = { cep: '01310100', logradouro: 'Avenida Paulista', numero: '1000', complemento: '', bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'sp' }

describe('máscaras', () => {
  it('telefone fixo e celular', () => {
    expect(formatar.telefone('38998680133')).toBe('(38) 99868-0133')
    expect(formatar.telefone('1133334444')).toBe('(11) 3333-4444')
    expect(formatar.telefone('(38) 99868-0133 9')).toBe('(38) 99868-0133')
  })
  it('CEP', () => {
    expect(formatar.cep('01310100')).toBe('01310-100')
    expect(formatar.cep('0131')).toBe('0131')
  })
})

describe('endereço', () => {
  it('normaliza CEP e UF', () => {
    expect(enderecoSchema.parse(ENDERECO)).toMatchObject({ cep: '01310-100', uf: 'SP' })
  })
  it('aponta o campo que falta', () => {
    const r = enderecoSchema.safeParse({ ...ENDERECO, numero: ' ', uf: 'XX' })
    expect(r.error?.issues.map(i => i.path[0])).toEqual(['numero', 'uf'])
  })
  it('formata numa linha, com e sem complemento', () => {
    const e = enderecoSchema.parse(ENDERECO)
    expect(formatarEndereco(e)).toBe('Avenida Paulista, 1000, Bela Vista, São Paulo/SP, CEP 01310-100')
    expect(formatarEndereco({ ...e, complemento: 'Apto 12' })).toBe('Avenida Paulista, 1000 - Apto 12, Bela Vista, São Paulo/SP, CEP 01310-100')
  })
  it('lê o endereço salvo na conta; texto antigo vira null', () => {
    expect(lerEnderecoSalvo(JSON.stringify(ENDERECO))?.cidade).toBe('São Paulo')
    expect(lerEnderecoSalvo('Rua das Flores, 123')).toBeNull()
    expect(lerEnderecoSalvo(null)).toBeNull()
  })
})
