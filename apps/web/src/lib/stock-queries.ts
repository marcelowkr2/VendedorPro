import { QueryClient } from '@tanstack/react-query';

export function invalidateStockQueries(queryClient: QueryClient, tenantId: string) {
  const keys = ['products', 'products-stock', 'products-order', 'products-quote', 'movements', 'low-stock', 'dashboard-performance'];
  return queryClient.invalidateQueries({
    predicate: (query) => query.queryKey[1] === tenantId && typeof query.queryKey[0] === 'string' && keys.includes(query.queryKey[0]),
  });
}
