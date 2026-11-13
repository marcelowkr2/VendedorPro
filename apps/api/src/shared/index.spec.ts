import { hasPermission, hasAnyPermission } from './index';

describe('shared index', () => {
  it('hasPermission', () => {
    expect(hasPermission('admin_global', 'ADMIN_GLOBAL')).toBe(true);
    expect(hasPermission('vendedor', 'ORDER_CREATE')).toBe(true);
  });

  it('hasAnyPermission', () => {
    expect(hasAnyPermission('vendedor', ['ORDER_CREATE', 'ORDER_DELETE'])).toBe(true);
    expect(hasAnyPermission('vendedor', ['ORDER_DELETE'])).toBe(false);
  });
});