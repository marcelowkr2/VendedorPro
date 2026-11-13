import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { audit } from '../../audit';
import { ConflictError, NotFoundError } from '../../common/exceptions/app.exception';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, q?: string, limit = 50) {
    return this.prisma.product.findMany({
      where: { tenantId, active: true, ...(q ? { name: { contains: q } } : {}) },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string, actorId: string, data: any) {
    const existing = await this.prisma.product.findFirst({ where: { tenantId, code: data.code } });
    if (existing) throw new ConflictError('Código já existe para este tenant');

    if (data.barcode) {
      const existingBar = await this.prisma.product.findFirst({ where: { tenantId, barcode: data.barcode } });
      if (existingBar) throw new ConflictError('Código de barras já existe para este tenant');
    }

    if (data.categoryId) await this.ensureCategory(tenantId, data.categoryId);
    if (data.brandId) await this.ensureBrand(tenantId, data.brandId);

    const product = await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          tenantId,
          name: data.name,
          code: data.code,
          barcode: data.barcode || null,
          priceCents: data.priceCents ?? 0,
          costCents: data.costCents ?? 0,
          stock: data.stock ?? 0,
          minStock: data.minStock ?? 0,
          unit: data.unit || 'UN',
          categoryId: data.categoryId || null,
          brandId: data.brandId || null,
        },
      });
      if (created.stock > 0) {
        await tx.stockMovement.create({
          data: { productId: created.id, tenantId, type: 'in', quantity: created.stock, reason: 'Estoque inicial' },
        });
      }
      return created;
    });

    await audit(this.prisma, 'PRODUCT_CREATE', tenantId, product.id, null, product, actorId);
    return product;
  }

  async findOne(tenantId: string, id: string) {
    const p = await this.prisma.product.findFirst({ where: { id, tenantId } });
    if (!p) throw new NotFoundError();
    return p;
  }

  async update(tenantId: string, id: string, data: any, actorId: string) {
    const before = await this.findOne(tenantId, id);
    if (data.categoryId) await this.ensureCategory(tenantId, data.categoryId);
    if (data.brandId) await this.ensureBrand(tenantId, data.brandId);
    const product = await this.prisma.product.update({
      where: { id, tenantId },
      data: {
        name: data.name,
        priceCents: data.priceCents,
        costCents: data.costCents,
        minStock: data.minStock,
        unit: data.unit,
        categoryId: data.categoryId,
        brandId: data.brandId,
      },
    });
    await audit(this.prisma, 'PRODUCT_UPDATE', tenantId, id, before, product, actorId);
    return product;
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    const [orderItems, quoteItems] = await Promise.all([
      this.prisma.orderItem.findFirst({ where: { productId: id, order: { tenantId } } }),
      this.prisma.quoteItem.findFirst({ where: { productId: id, quote: { tenantId } } }),
    ]);
    if (orderItems || quoteItems) throw new ConflictError('Produto possui histórico comercial vinculado');
    return this.prisma.product.update({ where: { id, tenantId }, data: { active: false } });
  }

  private async ensureCategory(tenantId: string, categoryId: string) {
    const category = await this.prisma.category.findFirst({ where: { id: categoryId, tenantId } });
    if (!category) throw new NotFoundError('Categoria não encontrada nesta empresa');
  }

  private async ensureBrand(tenantId: string, brandId: string) {
    const brand = await this.prisma.brand.findFirst({ where: { id: brandId, tenantId } });
    if (!brand) throw new NotFoundError('Marca não encontrada nesta empresa');
  }
}