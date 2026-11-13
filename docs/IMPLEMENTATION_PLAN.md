# Plano de Implementação

## Fase 1 — Estrutura Base (concluída)
- Monorepo pnpm + Turbo, configs base (TS, Next, Prisma).
- `packages/shared`, `packages/db`, `packages/config`.
- `apps/api` (NestJS) com auth, tenants, users, products, customers, quotes, orders, stock, finance, reports, goals, admin.
- `apps/web` (Next.js 15) com layout, login, dashboard, app-shell, páginas iniciais.

## Fase 2 — Gestão Comercial (concluída)
- Produtos: CRUD, código/barras únicos, margem, movimento inicial de estoque.
- Clientes: CRUD com CPF/CNPJ, soft delete.
- Orçamentos: numeração `ORC-YYYY-NNNNN`, conversão para pedido, PDF.
- Pedidos: criação atômica, cancelamento devolve estoque, PDF.

## Fase 3 — Controle (concluída)
- Estoque: movimentos in/out/adjustment, relatório de estoque baixo.
- Financeiro: condições de pagamento, contas a receber, pagamentos parciais.
- Metas: criar, calcular progresso.

## Fase 4 — Inteligência (concluída)
- Dashboard e relatórios (vendas por período/vendedor/cliente/produto).
- Top produtos, estoque baixo, resumo contas a receber.

## Fase 5 — Planos, assinaturas e Stripe (em andamento)
- Planos (free/professional/team) com limits.
- Assinaturas (trial, active, cancelled, expired).
- Integração Stripe (pagamentos + webhooks).
- Painel admin global.
- `PlanLimitError` quando o tenant ultrapassar limites do plano.

## Fase 6 — Qualidade (concluída)
- Testes Jest (unit + integration) para money, permissions, zod, auth, orders, stock, quotes, tenant guard.
- `PlanLimitError` quando o tenant ultrapassar limites do plano.