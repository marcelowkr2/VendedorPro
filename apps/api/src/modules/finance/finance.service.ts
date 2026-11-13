import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictError, NotFoundError, ValidationError } from '../../common/exceptions/app.exception';

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async listPaymentConditions(tenantId: string) {
    return this.prisma.paymentCondition.findMany({ where: { tenantId, active: true } });
  }

  async listReceivables(tenantId: string, limit = 50) {
    return this.prisma.accountsReceivable.findMany({
      where: { tenantId },
      include: { customer: true },
      take: limit,
      orderBy: { dueDate: 'asc' },
    });
  }

  async recordPayment(receivableId: string, amountCents: number, tenantId: string, method = 'pix') {
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
      throw new ValidationError('O valor recebido deve ser um inteiro positivo em centavos');
    }

    return this.prisma.$transaction(async (tx) => {
      const receivable = await tx.accountsReceivable.findFirst({
        where: { id: receivableId, tenantId },
      });
      if (!receivable) throw new NotFoundError('Recebível não encontrado');

      const updated = await tx.accountsReceivable.updateMany({
        where: {
          id: receivableId,
          tenantId,
          receivedCents: { lte: receivable.totalCents - amountCents },
        },
        data: { receivedCents: { increment: amountCents } },
      });
      if (updated.count !== 1) {
        throw new ConflictError('O pagamento excede o saldo pendente');
      }

      await tx.payment.create({
        data: { accountsReceivableId: receivableId, amountCents, method },
      });

      const result = await tx.accountsReceivable.findUniqueOrThrow({ where: { id: receivableId } });
      const status = result.receivedCents >= result.totalCents ? 'received' : 'partial';
      return tx.accountsReceivable.update({
        where: { id: receivableId },
        data: { status },
      });
    });
  }

  async summary(tenantId: string) {
    const items = await this.prisma.accountsReceivable.findMany({ where: { tenantId } });
    const total = items.reduce((a, i) => a + i.totalCents, 0);
    const received = items.reduce((a, i) => a + i.receivedCents, 0);
    return { totalCents: total, receivedCents: received, pendingCents: total - received, count: items.length };
  }
}