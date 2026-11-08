// Máscaras (as mesmas do portal da Altpay): `formatar` para exibir um valor já salvo; `MASCARAS` para o v-maska nos
// campos (o próprio maska escolhe entre fixo e celular pelo tamanho).

export function soNumeros(valor: string): string {
  return valor.replace(/\D+/g, '')
}

export const formatar = {
  cep(valor: string): string {
    return soNumeros(valor).replace(/(\d{5})(\d)/, '$1-$2').replace(/(-\d{3})\d+?$/, '$1')
  },
  telefone(valor: string): string {
    return soNumeros(valor)
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(\d{4})-(\d)(\d{4})/, '$1$2-$3')
      .replace(/(-\d{4})\d+?$/, '$1')
  },
}

export const MASCARAS = {
  cep: '#####-###',
  telefone: '[\'(##) ####-####\', \'(##) #####-####\']',
}
