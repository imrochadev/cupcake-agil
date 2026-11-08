# Cupcake Ágil

Loja de cupcakes pela internet, feita para o **Projeto Integrador Transdisciplinar em Engenharia de Software II** (Cruzeiro do Sul Virtual).

**Site:** https://cupcake-store.imrocha.dev

O pagamento é de mentira e nada é cobrado. Cartões de teste: `4242 4242 4242 4242` (aprovado) e `4000 0000 0000 0002` (recusado), com qualquer validade futura e CVV `123`.

## Documentação

- [Situação 1: planejamento revisado](docs/situacao-1/situacao-1.pdf)
- [Situação 2: desenvolvimento](docs/situacao-2/situacao-2.pdf)
- [Situação 3: testes e validação](docs/situacao-3/situacao-3.pdf)

## Como rodar

Precisa de Node 22.18 ou mais novo, pnpm e um MongoDB (`docker compose up -d mongo` sobe um).

```bash
pnpm install
cp .env.example .env   # confira DATABASE_URL e troque BETTER_AUTH_SECRET
pnpm dev               # http://localhost:3000
```

## Testes

```bash
pnpm test              # unidade
pnpm test:integration  # integração
pnpm test:e2e          # ponta a ponta no navegador
```

## Licença

[MIT](LICENSE)
