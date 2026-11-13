export interface ServiceResult<T = any> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface PaginationInput {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T = any> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TenantContext {
  tenantId: string;
  tenant: any;
  role: string;
}

export interface AuditContext {
  actorUserId?: string;
  tenantId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: any;
  newValues?: any;
}

export interface PaymentConditionInput {
  name: string;
  days: number;
  installments: number;
}

export interface PlanLimits {
  maxUsers?: number;
  maxProducts?: number;
  maxOrdersPerMonth?: number;
  features?: string[];
}