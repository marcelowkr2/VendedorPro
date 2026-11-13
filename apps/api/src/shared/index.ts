import { ROLE_PERMISSIONS } from './constants';

export { PERMISSIONS, ROLE_PERMISSIONS } from './constants';

export function hasPermission(role: string, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: string, permissions: string[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}