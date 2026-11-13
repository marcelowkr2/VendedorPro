import { hasPermission, hasAnyPermission, canManageTenant } from './permissions';

describe('permissions', () => {
  it('admin_global tem todas', () => {
    expect(hasPermission('admin_global', 'PRODUCT_CREATE')).toBe(true);
    expect(hasPermission('admin_global', 'ADMIN_GLOBAL')).toBe(true);
  });

  it('vendedor tem permissões limitadas', () => {
    expect(hasPermission('vendedor', 'PRODUCT_READ')).toBe(true);
    expect(hasPermission('vendedor', 'PRODUCT_CREATE')).toBe(false);
    expect(hasPermission('vendedor', 'ORDER_CREATE')).toBe(true);
  });

  it('hasAnyPermission', () => {
    expect(hasAnyPermission('vendedor', ['PRODUCT_CREATE', 'ORDER_CREATE'])).toBe(true);
    expect(hasAnyPermission('vendedor', ['PRODUCT_CREATE', 'PRODUCT_DELETE'])).toBe(false);
  });

  it('canManageTenant', () => {
    expect(canManageTenant('admin_global')).toBe(true);
    expect(canManageTenant('admin_empresa')).toBe(true);
    expect(canManageTenant('gerente_comercial')).toBe(false);
    expect(canManageTenant('vendedor')).toBe(false);
  });
});