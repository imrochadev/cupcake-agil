import { listarCatalogo } from '../models/catalogo'

// Cardápio (CUPC-8): categorias e produtos ativos, com preço, descrição, foto e disponibilidade.
export default defineEventHandler(() => listarCatalogo())
