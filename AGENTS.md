# AGENTS.md — Diretrizes para Agentes de IA

Este arquivo orienta agentes de IA (como Claude) a trabalharem no repositório VendedorPro.

## Regras de Ouro

1. **Centavos (`Cents`)**: valores monetários são `Int` em centavos. Use `toCents`/`fromCents` de `@vendedorpro/shared`. Nunca `Float`/`Decimal`.
2. **Isolamento por tenant**: toda entidade comercial tem `tenantId`. `TenantGuard` confirma `X-tenant-id` contra JWT. Nunca confie em payloads do cliente.
3. **Soft delete**: `active=false`. Bloqueie exclusão se houver dependências.
4. **Transações**: estoque + movimento + pedido em `prisma.$transaction`.
5. **AuditLog**: create/update/delete/convert/login gravam `AuditLog` (oldValues/newValues JSON).
6. **API versionada**: `/api/v1/*`. Swagger em `/api/v1/docs`.

## Estrutura

```
apps/api/        # NestJS backend
apps/web/        # Next.js 15 frontend
packages/shared/ # tipos, constantes, money, erros, zod, permissões
packages/db/     # Prisma schema + client
packages/config/ # validação de env (zod)
docs/            # documentação
```

## Comandos

```bash
pnpm install
pnpm dev:api     # http://localhost:4000
pnpm dev:web     # http://localhost:3000
pnpm db:generate # gerar cliente Prisma
pnpm db:migrate  # executar migrations
pnpm test        # jest
pnpm lint        # eslint
pnpm build       # turbo build
```

## Estilo de Código

- TypeScript estrito, sem `any` desnecessário.
- Services com métodos async, tratamento de erros com `AppError` subclasses.
- Componentes React function components + hooks.
- Zod para validação de schemas de entrada.
- Rotas NestJS: controller fino, service com lógica, repository pattern implícito no PrismaService.

## Testes

- Jest. Unit para services/helpers, integration para controllers.
- Cobertura alvo: ≥ 80%.
- Teste permissões por role e isolamento por tenant.