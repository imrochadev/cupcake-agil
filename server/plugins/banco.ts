import { conectar, prepararBanco } from '../models/db'
import { semearCardapio } from '../models/seed'

// Na subida do servidor: validação e índices das coleções e o cardápio inicial (se o banco estiver vazio).
export default defineNitroPlugin(() => {
  conectar()
    .then(() => prepararBanco())
    .then(() => semearCardapio())
    .then(semeou => semeou && console.info('[banco] cardápio inicial criado'))
    .catch(erro => console.error('[banco] falha ao preparar:', erro instanceof Error ? erro.message : erro))
})
