# Changelog

## 0.1.0 — 2026-11-08
- Estrutura inicial do monorepo (pnpm + Turbo).
- Backend NestJS com módulos: auth, tenants, users, products, customers, quotes, orders, stock, finance, reports, goals, admin.
- Frontend Next.js 15 com layout, login, dashboard e app-shell.
- Prisma schema multi-tenant com AuditLog, soft deletes, valores em centavos.
- PDF de orçamentos e pedidos.
- Documentação: arquitetura, banco, API, segurança, plano de implementação.
- Testes Jest para money, permissions, zod, auth, orders, stock, quotes, tenant guard.