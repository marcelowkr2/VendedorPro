import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundError } from '../../common/exceptions/app.exception';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async adjust(tenantId: string, data: { productId: string; type: 'in' | 'out' | 'adjustment'; quantity: number; reason?: string }) {
    const p = await this.prisma.product.findFirst({ where: { id: data.productId, tenantId } });
    if (!p) throw new NotFoundError('Produto não encontrado');

    if (data.type === 'out' && p.stock < data.quantity) throw new Error('Estoque insuficiente');

    const delta = data.type === 'in' ? data.quantity : data.type === 'out' ? -data.quantity : data.quantity - p.stock;

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id: data.productId },
        data: { stock: { increment: delta } },
      });
      await tx.stockMovement.create({
        data: { productId: data.productId, tenantId, type: data.type, quantity: Math.abs(data.quantity), reason: data.reason || '' },
      });
      return product;
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