import { Test } from '@nestjs/testing';
import { CustomersService } from './customers.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CustomersService', () => {
  const customer = {
    id: 'customer-1',
    tenantId: 'tenant-1',
    name: 'Cliente',
    cpfCnpj: '123',
    email: 'cliente@example.com',
    phone: '12345',
    active: true,
  };
  let service: CustomersService;
  let tx: {
    customer: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
    order: { findFirst: jest.Mock };
    quote: { findFirst: jest.Mock };
    accountsReceivable: { findFirst: jest.Mock };
    auditLog: { create: jest.Mock };
  };

  beforeEach(async () => {
    tx = {
      customer: { findFirst: jest.fn().mockResolvedValue(customer), create: jest.fn(), update: jest.fn() },
      order: { findFirst: jest.fn().mockResolvedValue(null) },
      quote: { findFirst: jest.fn().mockResolvedValue(null) },
      accountsReceivable: { findFirst: jest.fn().mockResolvedValue(null) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const module = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: { $transaction: (fn: (transaction: typeof tx) => unknown) => fn(tx) } },
      ],
    }).compile();
    service = module.get(CustomersService);
  });

  it('creates a customer and audits the actor inside the transaction', async () => {
    tx.customer.findFirst.mockResolvedValue(null);
    tx.customer.create.mockResolvedValue(customer);
    await expect(service.create('tenant-1', { name: 'Cliente', cpfCnpj: '123' }, 'actor-1'))
      .resolves.toEqual(customer);
    expect(tx.customer.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tenantId: 'tenant-1', name: 'Cliente', cpfCnpj: '123' }),
    }));
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tenantId: 'tenant-1', userId: 'actor-1', action: 'CUSTOMER_CREATE' }),
    }));
  });

  it('rejects a duplicate CPF/CNPJ on creation', async () => {
    await expect(service.create('tenant-1', { name: 'Cliente', cpfCnpj: '123' }, 'actor-1'))
      .rejects.toThrow('CPF/CNPJ já cadastrado');
    expect(tx.customer.create).not.toHaveBeenCalled();
  });

  it('updates and clears optional fields with tenant-scoped auditing', async () => {
    const updated = { ...customer, name: 'Novo nome', email: null };
    tx.customer.update.mockResolvedValue(updated);
    await expect(service.update('tenant-1', 'customer-1', { name: 'Novo nome', email: null }, 'actor-1'))
      .resolves.toEqual(updated);
    expect(tx.customer.findFirst).toHaveBeenCalledWith({ where: { id: 'customer-1', tenantId: 'tenant-1', active: true } });
    expect(tx.customer.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'customer-1', tenantId: 'tenant-1' },
      data: expect.objectContaining({ name: 'Novo nome', email: null }),
    }));
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tenantId: 'tenant-1', userId: 'actor-1', action: 'CUSTOMER_UPDATE' }),
    }));
  });

  it('rejects a customer outside the tenant', async () => {
    tx.customer.findFirst.mockResolvedValue(null);
    await expect(service.update('other-tenant', 'customer-1', { name: 'Novo' }, 'actor-1'))
      .rejects.toThrow('Cliente não encontrado');
    await expect(service.remove('other-tenant', 'customer-1', 'actor-1'))
      .rejects.toThrow('Cliente não encontrado');
    expect(tx.customer.update).not.toHaveBeenCalled();
  });

  it('rejects a duplicate CPF/CNPJ on update', async () => {
    tx.customer.findFirst.mockResolvedValueOnce(customer).mockResolvedValueOnce({ id: 'other' });
    await expect(service.update('tenant-1', 'customer-1', { cpfCnpj: '456' }, 'actor-1'))
      .rejects.toThrow('CPF/CNPJ já cadastrado');
    expect(tx.customer.update).not.toHaveBeenCalled();
  });

  it.each(['order', 'quote', 'accountsReceivable'] as const)(
    'blocks deletion when %s exists',
    async (relation) => {
      tx[relation].findFirst.mockResolvedValue({ id: 'linked' });
      await expect(service.remove('tenant-1', 'customer-1', 'actor-1'))
        .rejects.toThrow('Cliente possui pedidos, orçamentos ou contas a receber vinculados');
      expect(tx.customer.update).not.toHaveBeenCalled();
    },
  );

  it('soft-deletes and audits an unlinked customer in the transaction', async () => {
    const inactive = { ...customer, active: false };
    tx.customer.update.mockResolvedValue(inactive);
    await expect(service.remove('tenant-1', 'customer-1', 'actor-1')).resolves.toEqual(inactive);
    expect(tx.customer.update).toHaveBeenCalledWith({
      where: { id: 'customer-1', tenantId: 'tenant-1' }, data: { active: false },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: 'actor-1', action: 'CUSTOMER_DELETE' }),
    }));
  });

  it('propagates audit failures instead of reporting success', async () => {
    tx.customer.update.mockResolvedValue({ ...customer, active: false });
    tx.auditLog.create.mockRejectedValue(new Error('audit failed'));
    await expect(service.remove('tenant-1', 'customer-1', 'actor-1')).rejects.toThrow('audit failed');
  });
});
