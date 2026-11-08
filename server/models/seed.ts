import { ObjectId } from 'mongodb'
import { colecoes, type CategoriaDoc, type ProdutoDoc } from './db'
import { salvarImagem } from './catalogo'

// Cardápio inicial (só quando o banco está vazio). As fotos ficam em server/assets/cupcakes (geradas com o Gemini,
// fundo branco, mesma sessão de estúdio) e vão para o banco junto com os produtos.

const CATEGORIAS: CategoriaDoc[] = [
  { _id: 'classicos', nome: 'Clássicos', ordem: 1 },
  { _id: 'frutados', nome: 'Frutados', ordem: 2 },
  { _id: 'especiais', nome: 'Especiais', ordem: 3 },
  { _id: 'veganos', nome: 'Veganos', ordem: 4 },
]

type Inicial = Pick<ProdutoDoc, 'nome' | 'descricao' | 'categoriaId' | 'precoCentavos' | 'estoque'> & { foto: string }

const PRODUTOS: Inicial[] = [
  { foto: 'baunilha-classico', nome: 'Baunilha Clássico', descricao: 'Massa fofinha de baunilha com cobertura de buttercream, confeitos coloridos e uma cereja no topo.', categoriaId: 'classicos', precoCentavos: 990, estoque: 40 },
  { foto: 'chocolate-belga', nome: 'Chocolate Belga', descricao: 'Massa de cacau 50% com ganache cremosa de chocolate belga meio amargo e raspas de chocolate.', categoriaId: 'classicos', precoCentavos: 1190, estoque: 35 },
  { foto: 'red-velvet', nome: 'Red Velvet', descricao: 'O clássico vermelho aveludado com cobertura de cream cheese levemente salgada.', categoriaId: 'classicos', precoCentavos: 1290, estoque: 25 },
  { foto: 'morango-chantilly', nome: 'Morango com Chantilly', descricao: 'Massa de baunilha com chantilly de morango e morango fresco por cima.', categoriaId: 'frutados', precoCentavos: 1190, estoque: 30 },
  { foto: 'limao-siciliano', nome: 'Limão Siciliano', descricao: 'Massa cítrica com raspas de limão e merengue maçaricado por cima.', categoriaId: 'frutados', precoCentavos: 1090, estoque: 20 },
  { foto: 'frutas-vermelhas', nome: 'Frutas Vermelhas', descricao: 'Massa de baunilha, cobertura de mascarpone e framboesas, mirtilos e amora frescos com calda.', categoriaId: 'frutados', precoCentavos: 1290, estoque: 18 },
  { foto: 'doce-de-leite', nome: 'Doce de Leite com Flor de Sal', descricao: 'Massa amanteigada, cobertura de doce de leite artesanal e cristais de flor de sal.', categoriaId: 'especiais', precoCentavos: 1390, estoque: 22 },
  { foto: 'pistache', nome: 'Pistache', descricao: 'Massa de pistache com creme de pistache e pistaches torrados picados.', categoriaId: 'especiais', precoCentavos: 1490, estoque: 0 },
  { foto: 'avela-cacau', nome: 'Avelã com Cacau', descricao: 'Massa de chocolate com creme de avelã e cacau, coberta com avelãs torradas.', categoriaId: 'especiais', precoCentavos: 1390, estoque: 15 },
  { foto: 'cenoura-vegano', nome: 'Cenoura Vegano', descricao: 'Massa de cenoura sem ingredientes de origem animal, com cobertura de cacau e óleo de coco.', categoriaId: 'veganos', precoCentavos: 1190, estoque: 16 },
  { foto: 'coco-vegano', nome: 'Coco Vegano', descricao: 'Massa de coco com leite de coco, chantilly vegetal e coco ralado tostado.', categoriaId: 'veganos', precoCentavos: 1150, estoque: 3 },
]

/** Cria categorias e produtos se ainda não há nenhuma categoria. */
export async function semearCardapio(): Promise<boolean> {
  const c = colecoes()
  if (await c.categorias.countDocuments({}, { limit: 1 })) return false
  await c.categorias.insertMany(CATEGORIAS)
  const fotos = useStorage('assets:server')
  const agora = new Date()
  for (const { foto, ...produto } of PRODUTOS) {
    const dados = await fotos.getItemRaw<Uint8Array>(`cupcakes/${foto}.jpg`)
    const imagemId = dados ? await salvarImagem('image/jpeg', new Uint8Array(dados), 'produto') : null
    await c.produtos.insertOne({ _id: new ObjectId(), ...produto, ativo: true, imagemId, criadoEm: agora, atualizadoEm: agora, excluidoEm: null })
  }
  return true
}
