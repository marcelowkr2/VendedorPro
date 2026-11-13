import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  const saltRounds = 10;

  const freePlan = await prisma.plan.upsert({
    where: { slug: 'free' },
    update: {},
    create: {
      id: uuidv4(),
      name: 'Gratuito',
      slug: 'free',
      priceCents: 0,
      limits: { maxUsers: 2, maxProducts: 100, maxOrdersPerMonth: 100 },
      features: ['produtos', 'pedidos', 'relatorios-basicos'],
      active: true,
    },
  });

  const proPlan = await prisma.plan.upsert({
    where: { slug: 'professional' },
    update: {},
    create: {
      id: uuidv4(),
      name: 'Profissional',
      slug: 'professional',
      priceCents: 9900,
      limits: { maxUsers: 10, maxProducts: 1000, maxOrdersPerMonth: 10000 },
      features: ['produtos', 'pedidos', 'relatorios', 'financeiro', 'metas'],
      active: true,
    },
  });

  const teamPlan = await prisma.plan.upsert({
    where: { slug: 'team' },
    update: {},
    create: {
      id: uuidv4(),
      name: 'Equipe',
      slug: 'team',
      priceCents: 29900,
      limits: { maxUsers: 50, maxProducts: 5000, maxOrdersPerMonth: 50000 },
      features: ['produtos', 'pedidos', 'relatorios', 'financeiro', 'metas', 'multivendedores'],
      active: true,
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      id: uuidv4(),
      name: 'Demo VendedorPro',
      slug: 'demo',
      active: true,
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@vendedorpro.com' },
    update: {},
    create: {
      id: uuidv4(),
      name: 'Administrador Demo',
      email: 'admin@vendedorpro.com',
      passwordHash: await bcrypt.hash('12345678', saltRounds),
      role: 'admin_empresa',
      active: true,
    },
  });

  await prisma.tenantUser.upsert({
    where: { userId_tenantId: { userId: adminUser.id, tenantId: tenant.id } },
    update: {},
    create: {
      id: uuidv4(),
      userId: adminUser.id,
      tenantId: tenant.id,
      role: 'admin_empresa',
    },
  });

  await prisma.subscription.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      id: uuidv4(),
      tenantId: tenant.id,
      planId: freePlan.id,
      status: 'active',
    },
  });

  const category = await prisma.category.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Informática' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Informática' },
  });

  const products = [
    { name: 'Notebook Dell', code: 'NB001', barcode: '7890000000001', priceCents: 250000, costCents: 200000, stock: 10, minStock: 2 },
    { name: 'Monitor LG 24', code: 'MN002', barcode: '7890000000002', priceCents: 80000, costCents: 60000, stock: 15, minStock: 3 },
    { name: 'Teclado Mecânico', code: 'TC003', barcode: '7890000000003', priceCents: 15000, costCents: 10000, stock: 25, minStock: 5 },
    { name: 'Mouse Logitech', code: 'MS004', barcode: '7890000000004', priceCents: 6000, costCents: 4000, stock: 50, minStock: 10 },
  ];

  for (const p of products) {
    const existing = await prisma.product.findUnique({
      where: { tenantId_code: { tenantId: tenant.id, code: p.code } },
    });
    const created = await prisma.product.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: p.code } },
      update: {},
      create: { tenantId: tenant.id, ...p, unit: 'UN', categoryId: category.id },
    });
    if (!existing && p.stock > 0) {
      await prisma.stockMovement.create({
        data: { productId: created.id, tenantId: tenant.id, type: 'in', quantity: p.stock, reason: 'Estoque inicial' },
      });
    }
  }

  const customers = [
    { name: 'João Silva', cpfCnpj: '11111111111', email: 'joao@email.com', phone: '11999999999' },
    { name: 'Maria Santos', cpfCnpj: '22222222222', email: 'maria@email.com', phone: '11988888888' },
    { name: 'Tech Store LTDA', cpfCnpj: '333333333333', email: 'tech@email.com', phone: '11977777777' },
  ];

  for (const c of customers) {
    await prisma.customer.upsert({
      where: { tenantId_cpfCnpj: { tenantId: tenant.id, cpfCnpj: c.cpfCnpj } },
      update: {},
      create: { tenantId: tenant.id, ...c },
    });
  }

  console.log('Seed criado com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });