# API REST

Base: `http://localhost:4000/api/v1`. Autenticação via JWT Bearer.
Documentação interativa: `/api/v1/docs`.

## Autenticação

| Endpoint | Descrição |
| --- | --- |
| `POST /auth/login` | Login por e-mail/senha; retorna `accessToken`, `refreshToken`, `tenants[]` |
| `POST /auth/register` | Cadastro público; cria usuário, empresa privada e vínculo |
| `POST /auth/refresh` | Renova access token |
| `POST /auth/forgot-password` | Temporariamente indisponível (503; envio seguro por e-mail pendente) |
| `POST /auth/reset-password` | Temporariamente indisponível (503) |
| `PATCH /auth/change-password` | Troca de senha autenticado |
| `GET /auth/me` | Dados do usuário autenticado |

Headers obrigatórios em rotas de tenant: `X-tenant-id: <tenantId>`.

## Tenants

| Endpoint | Perfil |
| --- | --- |
| `GET /admin/tenants` | admin_global; listagem de empresas |
| `GET /tenants/:id` | admin_global |

## Usuários

| Endpoint | Perfil |
| --- | --- |
| `GET /users` | admin_global |
| `GET /users/:id` | admin_global |
| `PATCH /users/:id` | admin_global; corpo estrito `{ "active": true }` ou `{ "active": false }` |

Ao desativar, as sessões existentes são revogadas e não voltam a funcionar após reativação.
Administradores globais são protegidos contra alteração de status. O antigo endpoint
`POST /users/:id/tenants` foi removido para impedir acesso cruzado; convites e equipes
serão tratados em etapa futura.

## Produtos

| Endpoint | Perfil |
| --- | --- |
| `GET /products` | qualquer logado |
| `POST /products` | admin_empresa / gerente_comercial |
| `GET /products/:id` | qualquer logado |
| `PATCH /products/:id` | admin_empresa / gerente_comercial |
| `DELETE /products/:id` | admin_empresa / gerente_comercial (bloqueado se há OrderItem) |

## Clientes

| Endpoint | Perfil |
| --- | --- |
| `GET /customers` | qualquer logado |
| `POST /customers` | admin_empresa / gerente_comercial / vendedor |
| `PATCH /customers/:id` | admin_empresa / gerente_comercial / vendedor |
| `DELETE /customers/:id` | admin_empresa / gerente_comercial (bloqueado se há pedidos) |

## Orçamentos

| Endpoint | Perfil |
| --- | --- |
| `GET /quotes` | qualquer logado |
| `POST /quotes` | admin_empresa / gerente_comercial / vendedor |
| `GET /quotes/:id` | qualquer logado |
| `PATCH /quotes/:id/status` | admin_empresa / gerente_comercial |
| `POST /quotes/:id/convert` | admin_empresa / gerente_comercial / vendedor (cria pedido) |

## Pedidos

| Endpoint | Perfil |
| --- | --- |
| `GET /orders` | qualquer logado |
| `POST /orders` | admin_empresa / gerente_comercial / vendedor |
| `GET /orders/:id` | qualquer logado |
| `PATCH /orders/:id/status` | admin_empresa / gerente_comercial |
| `DELETE /orders/:id` | admin_empresa / gerente_comercial (devolve estoque se não cancelado) |

## Estoque

| Endpoint | Perfil |
| --- | --- |
| `POST /stock/adjust` | admin_empresa / gerente_comercial |
| `GET /stock/movements` | qualquer logado |
| `GET /reports/low-stock` | qualquer logado |

## Financeiro

| Endpoint | Perfil |
| --- | --- |
| `GET /finance/payment-conditions` | qualquer logado |
| `GET /finance/receivables` | admin_empresa / gerente_comercial |
| `POST /finance/receivables/:id/payments` | admin_empresa / gerente_comercial |

## Metas

| Endpoint | Perfil |
| --- | --- |
| `GET /goals` | admin_empresa / gerente_comercial |
| `POST /goals` | admin_empresa / gerente_comercial |
| `GET /goals/:id/progress` | admin_empresa / gerente_comercial |

## Relatórios

| Endpoint | Perfil |
| --- | --- |
| `GET /reports/dashboard` | qualquer logado |
| `GET /reports/sales-by-period` | qualquer logado |
| `GET /reports/sales-by-seller` | admin_empresa / gerente_comercial |
| `GET /reports/sales-by-customer` | admin_empresa / gerente_comercial |
| `GET /reports/sales-by-product` | admin_empresa / gerente_comercial |
| `GET /reports/top-products` | qualquer logado |
| `GET /reports/low-stock` | qualquer logado |
| `GET /reports/accounts-receivable-summary` | admin_empresa / gerente_comercial |

## Admin

| Endpoint | Perfil |
| --- | --- |
| `GET /admin/indicators` | admin_global |
| `GET /admin/tenants` | admin_global |
| `GET /admin/users` | admin_global |

## Contratos de Erro

| HTTP | code | Descrição |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | Dados inválidos |
| 401 | UNAUTHORIZED | Token ausente/inválido |
| 403 | FORBIDDEN / TENANT_ISOLATION / PLAN_LIMIT | Sem permissão / tenant inválido / limite do plano |
| 404 | NOT_FOUND | Recurso não encontrado |
| 409 | CONFLICT / DUPLICATE | Duplicidade (email/código/barras) |
| 422 | INSUFFICIENT_STOCK | Estoque insuficiente |
| 429 | TOO_MANY_REQUESTS | Rate limit |