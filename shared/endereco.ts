import { z } from 'zod'
import { formatar, soNumeros } from './mascaras'

// Endereço de entrega em campos separados (como no portal da Altpay): CEP, logradouro, número, complemento, bairro,
// cidade e UF. O CEP preenche o resto pela BrasilAPI; a pessoa completa número e complemento.

export const UFS: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal',
  ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais',
  PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina',
  SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
}

const campo = (nome: string, min: number, max: number) =>
  z.string().trim().min(min, `${nome}: obrigatório.`).max(max, `${nome}: máximo de ${max} caracteres.`)

export const enderecoSchema = z.object({
  cep: z.string().trim().refine(v => soNumeros(v).length === 8, 'CEP: são 8 números, ex.: 01310-100.').transform(formatar.cep),
  logradouro: campo('Rua', 2, 120),
  numero: campo('Número', 1, 10),
  complemento: z.string().trim().max(60, 'Complemento: máximo de 60 caracteres.').default(''),
  bairro: campo('Bairro', 2, 80),
  cidade: campo('Cidade', 2, 80),
  uf: z.string().trim().toUpperCase().refine(uf => uf in UFS, 'Escolha o estado.'),
})
export type Endereco = z.infer<typeof enderecoSchema>

export function enderecoVazio(): Endereco {
  return { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' }
}

/** "Rua X, 123 - Apto 4, Bairro, Cidade/UF, CEP 00000-000": o que vai no pedido e na tela do entregador. */
export function formatarEndereco(e: Endereco): string {
  const rua = [e.logradouro, e.numero].filter(Boolean).join(', ') + (e.complemento ? ` - ${e.complemento}` : '')
  return `${rua}, ${e.bairro}, ${e.cidade}/${e.uf}, CEP ${formatar.cep(e.cep)}`
}

/** Endereço salvo na conta (texto JSON no Better Auth). Texto antigo ou inválido vira null. */
export function lerEnderecoSalvo(valor: string | null | undefined): Endereco | null {
  if (!valor) return null
  try {
    const r = enderecoSchema.safeParse(JSON.parse(valor))
    return r.success ? r.data : null
  } catch {
    return null
  }
}
