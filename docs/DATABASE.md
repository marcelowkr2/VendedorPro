# Banco de Dados

PostgreSQL 16 + Prisma ORM. Schema em `packages/db/prisma/schema.prisma`.

## Tabelas

| Tabela | Descrição |
| --- | --- |
| `Plan` | Planos (free/professional/team) com limits JSON |
| `Tenant` | Empresa (tenant), slug único, status |
| `Subscription` | Assinatura do tenant a um plano |
| `User` | Conta global de usuário (email único) |
| `TenantUser` | Vínculo usuário-tenant com role |
| `Role` | Papéis (admin_global, admin_empresa, gerente_comercial, vendedor) |
| `Permission` | Permissões codificadas |
| `RolePermission` | Relação muitos-entre-muitos |
| `Category` | Categoria de produto (por tenant) |
| `Brand` | Marca de produto (por tenant) |
| `Product` | Produto (tenant_id, code e barcode únicos por tenant) |
| `Customer` | Cliente (tenant_id, CPF/CNPJ único por tenant) |
| `StockMovement` | Movimento de estoque (in/out/adjustment) |
| `Quote` | Orçamento (ORC-YYYY-NNNNN) |
| `QuoteItem` | Item de orçamento |
| `Order` | Pedidos de venda (PED-YYYY-NNNNN) |
| `OrderItem` | Item de pedido |
| `PaymentCondition` | Condição de pagamento (parcelas) |
| `AccountsReceivable` | Conta a receber (gerada do pedido) |
| `Payment` | Pagamento (parcial/total) |
| `SalesGoal` | Meta de vendas por período |
| `AuditLog` | Log imutável de ações críticas |

## Regras

- `tenantId` em todas as entidades comerciais.
- `Int` (centavos) para `priceCents`, `costCents`, `totalCents`, `subtotalCents`, `discountCents`, `receivedCents`.
- `active` boolean para soft delete.
- `createdAt`/`updatedAt` em todas as tabelas.
- Índices em `tenantId` + chaves alternativas (code, barcode, email).

## Conexão

```
DATABASE_URL=postgres://vendedorpro:postgres@localhost:5432/vendedorpro
```