import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InsufficientStockError, NotFoundError } from '../../common/exceptions/app.exception';
import { audit } from '../../audit';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async adjust(tenantId: string, data: { productId: string; type: 'in' | 'out' | 'adjustment'; quantity: number; reason?: string }, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const where = { id: data.productId, tenantId, active: true };
      const updated = await tx.product.updateMany({
        where: { ...where, ...(data.type === 'out' ? { stock: { gte: data.quantity } } : {}) },
        data: { stock: data.type === 'in' ? { increment: data.quantity } : data.type === 'out' ? { decrement: data.quantity } : data.quantity },
      });
      if (updated.count !== 1) {
        const product = await tx.product.findFirst({ where });
        if (!product) throw new NotFoundError('Produto ativo não encontrado');
        throw new InsufficientStockError();
      }
      const product = await tx.product.findFirstOrThrow({ where });
      const movement = await tx.stockMovement.create({
        data: { productId: data.productId, tenantId, type: data.type, quantity: data.quantity, reason: data.reason || '' },
      });
      await audit(tx, 'STOCK_ADJUST', tenantId, movement.id, null, movement, actorId);
      return product;
    });
  }

  async products(tenantId: string) {
    return this.prisma.product.findMany({
      where: { tenantId, active: true },
      select: { id: true, name: true, code: true, stock: true, minStock: true, unit: true },
      orderBy: { name: 'asc' },
    });
  }

  async movements(tenantId: string, limit = 20) {
    return this.prisma.stockMovement.findMany({
      where: { tenantId, product: { tenantId } },
      include: { product: { select: { name: true, code: true } } },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async lowStock(tenantId: string) {
    const products = await this.prisma.product.findMany({ where: { tenantId, active: true } });
    return products.filter((product) => product.stock <= product.minStock);
  }
}