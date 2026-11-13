import { Injectable } from '@nestjs/common';

export async function audit(
  prisma: any,
  action: string,
  tenantId: string,
  entityId: string,
  oldValues: any,
  newValues: any,
  userId?: string,
) {
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action,
      entityType: 'generic',
      entityId,
      oldValues,
      newValues,
    },
  });
}