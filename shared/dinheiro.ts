// Valores em centavos (inteiros) em todo o sistema: soma de preço em ponto flutuante erra (0,1 + 0,2).
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function reais(centavos: number): string {
  // O Intl põe um espaço não separável depois do "R$"; troca pelo comum (copiar, comparar em teste).
  return BRL.format(centavos / 100).replace(/\s/g, ' ')
}
