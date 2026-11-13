# Arquitetura

## Visão Geral

Monorepo com pnpm workspaces e Turbo. Duas aplicações: `apps/api` (NestJS) e `apps/web` (Next.js).
Compartilhamento de código via `packages/shared`, `packages/db`, `packages/config`.

## Backend (apps/api)

- NestJS com `globalPrefix: 'api/v1'`.
- `ValidationPipe` global (class-validator + zod).
- `HttpExceptionFilter` padroniza respostas de erro: `{ statusCode, timestamp, path, code, message, details }`.
- `LoggingInterceptor` com timing e IP.
- `TenantGuard` lê `X-tenant-id` e confirma pertencimento via JWT (`tenants[]`).
- `PermissionsGuard` verifica `role_permissions` antes de rotas protegidas.
- `PrismaService` global com `$connect` no init e `$disconnect` no shutdown (Terminus).
- Throttler (5 req / min por IP por padrão), rate limit configurable via env.
- Swagger em `/api/v1/docs` com bearer auth.

## Frontend (apps/web)

- Next.js 15 App Router, React 19.
- `app/layout.tsx` raiz envolve app em `QueryProvider` + `Toaster`.
- `app-shell.tsx` (client) com sidebar de navegação e estado de auth (Zustand + persist).
- `lib/api.ts` com interceptor de request (JWT) e response (refresh token em 401).
- `lib/server-auth.ts` para autenticação server-side em rotas SSR.

## Multi-tenant

Toda entidade comercial tem `tenantId`. O `TenantGuard`:
1. Extrai `X-tenant-id` do header.
2. Busca o tenant no banco.
3. Valida se o tenant está ativo (`active`).
4. Confirma se o usuário (do JWT) pertence a esse tenant (`TenantUser`).
5. Lança `TenantIsolationError` (403) caso contrário.

Nunca confiamos no `tenantId` enviado pelo frontend em payloads; ele é sempre determinado pelo JWT + header.

## Monetização (Fase 5)

- `Plan` (free/professional/team) com `limits` JSON (maxUsers, maxProducts, maxOrdersPerMonth, features).
- `Subscription` com `status` (trial/active/cancelled/expired), `trialEnd`, `currentPeriodEnd`.
- `PlanLimitError` (403) quando o tenant ultrapassar os limites do plano.
- Integração Stripe (pagamentos, webhooks) — endpoints `/api/v1/billing/*`.

## Dados

- PostgreSQL 16 via Docker Compose.
- Prisma ORM. Soft deletes (`active=false`).
- Valores monetários em `Int` (centavos).
- `AuditLog` imutável com `oldValues`/`newValues` JSON.

## Testes (Fase 6)

- Jest para unit (services, helpers) e integration (controllers com Prisma mocked).
- Cobertura alvo: ≥ 80%.
- Testes de permissões e isolamento por tenant.

## Deploy

- Dockerfile (multi-stage) para api e web.
- Variáveis de ambiente via `.env` (nunca commitadas).
- Health checks via Terminus (`/health`, `/health/db`).