# Segurança

## Autenticação

- Senhas armazenadas com **bcrypt**, `SALT_ROUNDS` configurável.
- JWT curto (`accessToken`, 15 min) + `refreshToken` (7 dias). A desativação incrementa
  `tokenVersion` e invalida ambos, inclusive depois da reativação.
- Verificação de e-mail não implementada. Recuperação e redefinição de senha estão
  temporariamente indisponíveis até existir entrega segura de tokens por e-mail.
- Bloqueio de conta após **5** falhas de login consecutivas (15 min).
- Rate limiting: 5 req / min por IP em endpoints de auth (configurável via `RATE_LIMIT`).

## Autorização (RBAC)

Papéis hierárquicos:
- `admin_global` — administração global de usuários e empresas; acesso comercial somente
  às empresas às quais esteja explicitamente vinculado.
- `admin_empresa` — gestão completa do tenant.
- `gerente_comercial` — operação comercial (produtos, pedidos, orçamentos, relatórios).
- `vendedor` — operação limitada (cadastros básicos, visualização).

Permissões codificadas em `packages/shared/src/constants.ts`:
`PRODUCT_CREATE`, `ORDER_CREATE`, `QUOTE_CONVERT`, `FINANCE_READ`, `REPORT_READ`, `ADMIN_GLOBAL`, etc.

`PermissionsGuard` evalua `hasPermission(role, permission)` antes de cada rota protegida.

## Isolamento por Tenant

- `TenantGuard` confirma que `X-tenant-id` é uma empresa ativa e que o usuário possui
  vínculo com ela no banco.
- Nunca confiamos em `tenantId` de payloads do cliente.
- Consultas sempre filtram por `tenantId`.

## Dados Sensíveis

- `DATABASE_URL` e `JWT_SECRET` em `.env` (nunca commitados).
- `.env.example` não contém segredos.
- `AuditLog` registra oldValues/newValues em operações críticas.
- Alterações de status de usuário usam o primeiro tenant vinculado na auditoria ou o
  identificador `global` se o usuário não tiver vínculo.

O ambiente local não deve ser publicado como produção. Ainda é necessária uma revisão
de segurança completa; em particular, os tokens também são mantidos no armazenamento
do navegador e access/refresh tokens usam atualmente o mesmo segredo.

## Headers de Segurança

- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security` (em produção)

## Testes de Segurança (Fase 6)

- Testes de permissões por role.
- Testes de isolamento por tenant (403 em tentativas de acesso cruzado).
- Testes de rate limiting (429 após limite).
- Revisão de dependências (npm audit / snyk) no CI.