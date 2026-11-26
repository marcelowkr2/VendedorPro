# VendedorPro — SaaS de Gestão Comercial

SaaS multi-tenant (Next.js 15 + NestJS + TypeScript + Prisma + PostgreSQL + Docker) para
gestão comercial de equipes de vendas: produtos, clientes, orçamentos, pedidos, estoque,
financeiro, metas, relatórios e dashboard.

## Arquitetura

```
Saas-vendedor/
├── apps/
│   ├── api/            # Backend NestJS (API REST /api/v1)
│   └── web/            # Frontend Next.js 15 (App Router)
├── packages/
│   ├── shared/         # Tipos, constantes, zod, money, erros, permissões
│   ├── db/             # Prisma schema (schema.prisma) + client
│   └── config/         # Validação de variáveis de ambiente (zod)
├── docs/               # Documentação
├── docker-compose.yml  # PostgreSQL 16-alpine
├── turbo.json          # Pipeline turbo
└── package.json        # Workspace pnpm
```

## Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS, shadcn/ui, TanStack Query, Zustand, Zod, Recharts
- **Backend**: NestJS, Prisma ORM, PostgreSQL 16, JWT + Passport, class-validator, zod, Throttler, Terminus
- **Infra**: Docker Compose (PostgreSQL 16-alpine), pnpm workspaces, Turbo, TypeScript path aliases
- **Testes**: Jest (unit + integration)
- **Docs**: Swagger/OpenAPI em `/api/v1/docs`

## Quick Start

### Rodar localmente com Docker

Requisitos: Docker Engine e Docker Compose v2.

```bash
# Opcional: personalize as variáveis locais
cp .env.example .env

# Constrói e inicia PostgreSQL, API e frontend
docker compose up --build
```

Na primeira inicialização, o serviço da API sincroniza o schema Prisma e carrega dados de demonstração. Acesse:

- Aplicação: http://localhost:3000
- API: http://localhost:4000/api/v1
- Swagger: http://localhost:4000/api/v1/docs

Login local de demonstração: `admin@vendedorpro.com` / `12345678`. Essa conta e a senha fixa são somente para desenvolvimento local; não use os dados de demonstração ou as variáveis padrão em produção.

Para parar os serviços, use `Ctrl+C` e depois `docker compose down`. Os dados do PostgreSQL permanecem no volume `vendedorpro-pg`; para removê-los, execute `docker compose down -v`.

O Compose usa o modo de desenvolvimento com código montado do host e recarga automática. Mudanças nas dependências ou nos manifests exigem reconstrução (`docker compose up --build`); não é uma configuração de deploy.

### Contas SaaS e administração

- Em **Criar conta** (`/cadastro`), cada novo usuário recebe uma empresa exclusiva e o papel
  `admin_empresa`. O cadastro cria usuário, empresa, vínculo e auditoria na mesma transação.
- A área **Administração** (`/admin`) é exclusiva de `admin_global`: mostra usuários e empresas
  e permite ativar ou desativar usuários comuns. Administradores globais não podem ter seu
  status alterado por essa tela ou pela API.
- Desativar invalida os tokens de acesso e atualização. Ao reativar a conta, o usuário
  precisa entrar novamente; as sessões anteriores continuam inválidas.
- O acesso comercial exige vínculo explícito com a empresa, inclusive para o administrador
  global. O vínculo previamente existente do superadministrador com a empresa demo foi
  preservado; ele não concede acesso às demais contas.
- A recuperação de senha está temporariamente indisponível: ainda não há envio seguro de
  e-mail. Cadastro não verifica o endereço de e-mail. Planos, assinaturas e cobranças
  ainda não estão implementados neste fluxo.

O Compose local aplica o schema com `prisma db push`. A configuração atual da VPS também
executa esse comando ao iniciar a API; o deploy automático bloqueia alterações no schema,
mas isso não substitui migrações revisadas e backups para produção.
Esta configuração local não está pronta para produção: ainda são necessárias revisão de
segurança, recuperação/verificação por e-mail e infraestrutura e segredos adequados.

### Atualização na VPS

Na VPS configurada para `vendedorpro.infosystema.cloud`, um timer systemd consulta a
branch `master` pública a cada dois minutos. Commits novos são construídos e publicados
automaticamente; falhas de build preservam a versão em execução e falhas na verificação
HTTP tentam restaurar as imagens anteriores. Alterações no schema Prisma são bloqueadas
para revisão e migração manual. O monitoramento pode ser consultado com
`systemctl status vendedorpro-deploy.timer` e `journalctl -u vendedorpro-deploy.service`.
O banco e `.env.production` permanecem fora dos diretórios de releases. Não há backup
automático do banco; providencie backups independentes antes de operar com dados reais.
O script e as unidades systemd instalados na VPS não se atualizam automaticamente:
revise e instale alterações neles separadamente.

### Rodar sem Docker

```bash
# 1. Copie o .env
cp .env.example .env

# 2. Inicie o PostgreSQL
docker compose up -d

# 3. Instale dependências e gere o cliente Prisma
pnpm install
pnpm db:generate
pnpm db:migrate

# 4. Inicie os servidores (dois terminais)
pnpm dev:api   # http://localhost:4000
pnpm dev:web   # http://localhost:3000
```

## Módulos

| Módulo | Descrição |
| --- | --- |
| Auth | Cadastro, login, refresh e bloqueio por tentativas; recuperação e verificação de e-mail pendentes |
| Tenants | Empresas (multi-tenant), status e isolamento por `tenantId` |
| Usuários | Listagem e ativação/desativação por administrador global; vínculo criado no cadastro |
| Produtos | CRUD por tenant, código/barras únicos, margem, movimento inicial de estoque |
| Clientes | CRUD com CPF/CNPJ, soft delete |
| Orçamentos | Criação, numeração `ORC-YYYY-NNNNN`, conversão para pedido, PDF |
| Pedidos | Criação atômica (décremento de estoque + movimento), cancelamento devolve estoque, PDF |
| Estoque | Ajustes in/out/adjustment, relatório de estoque baixo |
| Financeiro | Condições de pagamento, contas a receber, pagamentos parciais |
| Metas | Metas por vendedor/período, progresso recalculado |
| Relatórios | Dashboard, vendas por período/vendedor/cliente/produto, top produtos, estoque baixo |
| Admin | Indicadores globais, listagem de tenants e usuários (admin_global) |

Na página de clientes, use **Editar** para atualizar ou limpar os dados de contato. **Excluir**
desativa o cadastro e o retira da carteira, sem apagar seu histórico. Clientes com pedidos,
orçamentos ou contas a receber vinculados não podem ser excluídos.

Na página de pedidos, **PDF** baixa o documento com cliente, itens, quantidades, preços,
desconto e total. As movimentações de estoque mostram o nome do produto, e o financeiro
exibe os status dos recebíveis em português.
Ao selecionar um produto no pedido, seu preço é preenchido automaticamente e pode ser
editado; os totais por item e do pedido são recalculados conforme a quantidade.
No cadastro de produtos, a unidade de venda identifica a medida (por exemplo, `UN`, `kg`,
`g` ou `L`) e aparece na lista. Estoque e pedidos usam quantidades inteiras e não fazem
conversão automática entre unidades nem aceitam frações.

Em **Estoque**, o saldo atual lista produtos ativos; o histórico mantém as movimentações
mesmo após a desativação do produto. Uma venda reduz o saldo e o cancelamento ou exclusão
do pedido o devolve. Entrada e saída alteram a quantidade; ajuste define o saldo final,
inclusive zero. Produtos com histórico comercial não podem ser excluídos.

O dashboard apresenta os pedidos ativos, exceto cancelados, por mês de criação nos últimos
seis meses (horário de São Paulo). Os valores representam o total dos pedidos, não
necessariamente pagamentos recebidos; o ranking soma as quantidades por produto no período.
Produtos, clientes e alertas de estoque consideram apenas cadastros ativos da empresa.

## Regras de Ouro

1. **Centavos (`Cents`)**: todos os valores monetários são `Int` em centavos. Nunca use `Float`/`Decimal`.
2. **Isolamento por tenant**: toda entidade comercial tem `tenant_id`; `TenantGuard` valida `X-tenant-id` contra o JWT.
3. **Soft delete**: use `active=false` em vez de excluir. Bloqueie exclusão se houver dependências.
4. **Transações**: operações que alteram estoque + movimento + pedido usam `prisma.$transaction`.
5. **AuditLog**: toda ação de create/update/delete/convert/login grava `AuditLog` (oldValues/newValues JSON).
6. **API versionada**: `/api/v1/*`; Swagger em `/api/v1/docs`.

## Documentação

- `docs/ARCHITECTURE.md` — arquitetura e decisões
- `docs/DATABASE.md` — modelo de dados (Prisma)
- `docs/API.md` — endpoints e contratos
- `docs/SECURITY.md` — autenticação, rate limiting, RBAC
- `docs/IMPLEMENTATION_PLAN.md` — fases de implementação
- `docs/CHANGELOG.md` — histórico de mudanças