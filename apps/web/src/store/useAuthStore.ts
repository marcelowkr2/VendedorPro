import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  currentTenant: { id: string; tenantId: string; slug: string; name: string; role: string } | null;
  tenants: { id: string; slug: string; name: string; role: string }[];
  setAuth: (auth: { user: User; accessToken: string; refreshToken: string; tenants: AuthState['tenants'] }) => void;
  setCurrentTenant: (tenant: AuthState['tenants'][number] | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      currentTenant: null,
      tenants: [],
      setAuth: (auth) =>
        set({
          user: auth.user,
          token: auth.accessToken,
          refreshToken: auth.refreshToken,
          tenants: auth.tenants,
          currentTenant: null,
        }),
      setCurrentTenant: (tenant) =>
        set({ currentTenant: tenant ? { ...tenant, tenantId: tenant.id } : null }),
      setTokens: (token, refreshToken) => set({ token, refreshToken }),
      logout: () => {
        localStorage.removeItem('vp_access_token');
        localStorage.removeItem('vp_refresh_token');
        set({ user: null, token: null, refreshToken: null, currentTenant: null, tenants: [] });
      },
    }),
    {
      name: 'vendedorpro-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        currentTenant: state.currentTenant,
        tenants: state.tenants,
      }),
    },
  ),
);