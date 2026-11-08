<script setup lang="ts">
import { reais } from '#shared/dinheiro'
import { FORMAS } from '#shared/pagamento'
import { finalizado, proximaEtapa, STATUS } from '#shared/rastreamento'
import type { PedidoDTO } from '#shared/tipos'
import { renderSVG } from 'uqr'

// Detalhe e rastreamento (CUPC-11): etapa atual, horário estimado e aviso quando a etapa muda (a tela consulta o
// servidor a cada 10 s enquanto o pedido não termina).
definePageMeta({ middleware: 'conta' })
const route = useRoute()
const { avisar } = useToast()
const { data: pedido, error, refresh } = useLazyFetch<PedidoDTO>(() => `/api/pedidos/${route.params.id}`)
const copiado = ref(false)
const alterando = ref(false)

// Botão de teste: avança o pedido para a próxima etapa na hora (sem esperar a entrega simulada).
async function alterarStatusTeste() {
  if (!pedido.value) return
  alterando.value = true
  try {
    pedido.value = await api<PedidoDTO>(`/api/pedidos/${pedido.value.id}/status-teste`, { method: 'POST' })
  } catch (e) {
    avisar(erroDe(e).message, 'erro')
  } finally {
    alterando.value = false
  }
}

let timer: ReturnType<typeof setInterval> | undefined
let ultimoStatus: string | undefined

function notificar(texto: string) {
  avisar(texto, 'info')
  try {
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) new Notification('Cupcake Ágil', { body: texto, icon: '/favicon.svg' })
  } catch {}
}

watch(() => pedido.value?.status, (status) => {
  if (status && ultimoStatus && status !== ultimoStatus) notificar(`Pedido #${pedido.value!.numero}: ${STATUS[status]}`)
  ultimoStatus = status
  if (status && finalizado(status)) clearInterval(timer)
}, { immediate: true })

onMounted(() => {
  timer = setInterval(() => document.visibilityState === 'visible' && refresh(), 10_000)
  if (route.query.novo && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {})
})
onBeforeUnmount(() => clearInterval(timer))

// QR Code do PIX para pagar com o celular quando a compra foi feita no computador (pedido do testador Guilherme).
const qrPix = computed(() => pedido.value?.pagamento.pixCopiaECola
  ? renderSVG(pedido.value.pagamento.pixCopiaECola, { border: 1, whiteColor: '#ffffff', blackColor: '#3b2420' })
  : '')

const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

async function copiarPix() {
  await navigator.clipboard.writeText(pedido.value?.pagamento.pixCopiaECola ?? '')
  copiado.value = true
  setTimeout(() => (copiado.value = false), 2000)
}
</script>

<template>
  <div v-if="error" class="card p-6 text-center" role="alert">
    <p class="font-bold">
      {{ erroDe(error).message }}
    </p>
    <NuxtLink to="/pedidos" class="btn-primary mt-4">
      Ver meus pedidos
    </NuxtLink>
  </div>

  <div v-else-if="pedido" class="grid gap-6">
    <div v-if="route.query.novo" class="alerta animate-pop bg-ok-soft p-4 text-ok" role="status">
      <Icon name="lucide:party-popper" class="mt-0.5 shrink-0 text-xl" />
      <div>
        <p class="font-bold">
          Pedido confirmado!
        </p>
        <p>Já recebemos seu pedido. Você pode acompanhar cada etapa aqui.</p>
      </div>
    </div>

    <div class="flex flex-wrap items-end justify-between gap-2">
      <div>
        <NuxtLink to="/pedidos" class="text-sm font-semibold text-brand hover:underline">
          ← Meus pedidos
        </NuxtLink>
        <h1 class="text-3xl font-semibold">
          Pedido #{{ pedido.numero }}
        </h1>
      </div>
      <p v-if="!finalizado(pedido.status)" class="text-right">
        <span class="block text-sm text-muted">Previsão de entrega</span>
        <span class="text-2xl font-extrabold" data-testid="previsao">{{ hora(pedido.previsaoEntrega) }}</span>
      </p>
    </div>

    <section class="card p-5">
      <h2 class="mb-4 text-xl font-semibold" data-testid="status-pedido">
        {{ STATUS[pedido.status] }}
      </h2>
      <StatusLinha :pedido="pedido" />
      <div v-if="!finalizado(pedido.status)" class="mt-4 flex flex-wrap items-center gap-3 border-t border-dashed border-line pt-4">
        <button
          type="button"
          class="btn-outline"
          :disabled="alterando"
          @click="alterarStatusTeste"
        >
          <Icon :name="alterando ? 'lucide:loader-circle' : 'lucide:flask-conical'" :class="{ 'animate-spin': alterando }" />
          Alteração de status de teste
        </button>
        <p class="text-sm text-muted">
          Só para testar: passa o pedido para <strong>{{ STATUS[proximaEtapa(pedido.status)!] }}</strong> agora.
        </p>
      </div>
    </section>

    <div class="grid gap-6 md:grid-cols-2">
      <section class="card p-5">
        <h2 class="text-xl font-semibold">
          Itens
        </h2>
        <ul class="mt-3 grid gap-1 text-sm">
          <li v-for="item in pedido.itens" :key="item.produtoId" class="flex justify-between gap-2">
            <span>{{ item.quantidade }}× {{ item.nome }}</span>
            <span class="tabular-nums">{{ reais(item.precoCentavos * item.quantidade) }}</span>
          </li>
        </ul>
        <dl class="mt-3 grid gap-1 border-t border-line pt-3 text-sm">
          <div class="flex justify-between">
            <dt>Entrega</dt>
            <dd>{{ pedido.taxaEntrega ? reais(pedido.taxaEntrega) : 'Grátis' }}</dd>
          </div>
          <div class="flex justify-between text-lg font-extrabold">
            <dt>Total</dt>
            <dd>{{ reais(pedido.total) }}</dd>
          </div>
        </dl>
      </section>

      <section class="card grid content-start gap-3 p-5 text-sm">
        <h2 class="text-xl font-semibold">
          Entrega e pagamento
        </h2>
        <p><strong>Endereço:</strong> {{ pedido.endereco }}</p>
        <p><strong>Telefone:</strong> {{ pedido.telefone }}</p>
        <p v-if="pedido.observacao">
          <strong>Observação:</strong> {{ pedido.observacao }}
        </p>
        <p>
          <strong>Pagamento:</strong> {{ FORMAS[pedido.pagamento.forma] }}
          <template v-if="pedido.pagamento.cartaoFinal">
            ({{ pedido.pagamento.bandeira }} final {{ pedido.pagamento.cartaoFinal }})
          </template>
          ·
          <span :class="pedido.pagamento.status === 'aprovado' ? 'font-bold text-ok' : 'text-warn'">
            {{ pedido.pagamento.status === 'aprovado' ? 'aprovado' : 'pagar na entrega' }}
          </span>
        </p>
        <p v-if="pedido.pagamento.trocoParaCentavos">
          <strong>Troco para:</strong> {{ reais(pedido.pagamento.trocoParaCentavos) }}
        </p>
        <p class="text-muted">
          Código da transação: {{ pedido.pagamento.codigo }}
        </p>
        <div v-if="pedido.pagamento.pixCopiaECola" class="grid gap-3 rounded-xl bg-surface-2 p-3 sm:grid-cols-[150px_1fr]">
          <!-- eslint-disable vue/no-v-html -- SVG do QR Code, gerado aqui a partir do código do pedido -->
          <div
            class="size-[150px] overflow-hidden rounded-lg bg-white [&>svg]:size-full"
            role="img"
            aria-label="QR Code do PIX"
            v-html="qrPix"
          />
          <!-- eslint-enable vue/no-v-html -->
          <div>
            <p class="font-bold">
              PIX (simulado)
            </p>
            <p class="text-muted">
              Aponte a câmera do celular para o QR Code ou use o código copia e cola.
            </p>
            <p class="mt-1 font-mono text-xs break-all text-muted">
              {{ pedido.pagamento.pixCopiaECola }}
            </p>
            <button type="button" class="btn-outline mt-2 py-1.5 text-sm" @click="copiarPix">
              <Icon :name="copiado ? 'lucide:check' : 'lucide:copy'" /> {{ copiado ? 'Copiado' : 'Copiar código' }}
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
  <div v-else class="grid gap-6" aria-busy="true">
    <div class="h-10 w-56 animate-pulse rounded-xl bg-surface-2" />
    <div class="card h-40 animate-pulse bg-surface-2" />
    <div class="grid gap-6 md:grid-cols-2">
      <div class="card h-48 animate-pulse bg-surface-2" />
      <div class="card h-48 animate-pulse bg-surface-2" />
    </div>
  </div>
</template>
