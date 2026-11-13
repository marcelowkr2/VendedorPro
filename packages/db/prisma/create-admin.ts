import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

// Cria (ou promove) o administrador global usando ADMIN_EMAIL, ADMIN_PASSWORD e ADMIN_NAME do ambiente.
const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || 'Super Administrador';
  if (!email || !password || password.length < 8) {
    throw new Error('Defina ADMIN_EMAIL e ADMIN_PASSWORD (mínimo de 8 caracteres).');
  }
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email } });
    const user = existing
      ? await tx.user.update({ where: { id: existing.id }, data: { passwordHash, role: 'admin_global', active: true, name } })
      : await tx.user.create({ data: { email, passwordHash, name, role: 'admin_global' } });
    const link = await tx.tenantUser.findFirst({ where: { userId: user.id } });
    if (!link) {
      const tenant = await tx.tenant.create({ data: { name: 'VendedorPro Administração', slug: uuidv4() } });
      await tx.tenantUser.create({ data: { userId: user.id, tenantId: tenant.id, role: 'admin_global' } });
    }
  });
  console.log(`Administrador global pronto: ${email}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
