import { ObjectId } from 'mongodb'
import type { FeedbackEntrada } from '#shared/schemas'
import type { FeedbackDTO } from '#shared/tipos'
import { colecoes, type FeedbackDoc } from './db'
import { salvarImagem } from './catalogo'

// Model do feedback dos testadores (PIT II, Situação 3): o formulário que os colegas preenchem ao testar o site.

export async function registrarFeedback(
  entrada: FeedbackEntrada,
  extra: { navegador: string, userId: string | null, imagem: { mime: string, dados: Uint8Array } | null },
): Promise<string> {
  const doc: FeedbackDoc = {
    _id: new ObjectId(),
    ...entrada,
    navegador: extra.navegador.slice(0, 300),
    userId: extra.userId,
    imagemId: extra.imagem ? await salvarImagem(extra.imagem.mime, extra.imagem.dados, 'feedback') : null,
    criadoEm: new Date(),
  }
  await colecoes().feedbacks.insertOne(doc)
  return doc._id.toHexString()
}

export async function listarFeedbacks(): Promise<FeedbackDTO[]> {
  const docs = await colecoes().feedbacks.find().sort({ criadoEm: -1 }).limit(500).toArray()
  const ids = docs.flatMap(d => (d.userId && ObjectId.isValid(d.userId) ? [new ObjectId(d.userId)] : []))
  const contas = new Map((await colecoes().usuarios.find({ _id: { $in: ids } }, { projection: { email: 1 } }).toArray()).map(u => [u._id.toHexString(), u.email]))
  return docs.map(d => ({
    id: d._id.toHexString(),
    nome: d.nome,
    dataTeste: d.dataTeste,
    funcionou: d.funcionou,
    naoFuncionou: d.naoFuncionou,
    naoTestado: d.naoTestado,
    sugestoes: d.sugestoes,
    nota: d.nota,
    pagina: d.pagina,
    navegador: d.navegador,
    temImagem: Boolean(d.imagemId),
    conta: d.userId ? contas.get(d.userId) ?? null : null,
    criadoEm: d.criadoEm.toISOString(),
  }))
}

export async function imagemDoFeedback(id: ObjectId) {
  const feedback = await colecoes().feedbacks.findOne({ _id: id }, { projection: { imagemId: 1 } })
  return feedback?.imagemId ? colecoes().imagens.findOne({ _id: feedback.imagemId, uso: 'feedback' }) : null
}
