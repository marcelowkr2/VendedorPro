import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const { token, currentTenant } = useAuthStore.getState();
      if (token) config.headers.set('Authorization', `Bearer ${token}`);
      if (currentTenant) config.headers.set('X-tenant-id', currentTenant.tenantId);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const res = await axios.post('/api/auth/refresh');
          const newToken = res.data.accessToken;
          useAuthStore.getState().setTokens(newToken, res.data.refreshToken);
          isRefreshing = false;
          refreshQueue.forEach((cb) => cb(newToken));
          refreshQueue = [];
          original.headers.set('Authorization', `Bearer ${newToken}`);
          return api(original);
        } catch (refreshError) {
          isRefreshing = false;
          refreshQueue.forEach((cb) => cb(null));
          refreshQueue = [];
          try {
            await axios.post('/api/auth/logout');
          } catch {
            toast.error('Não foi possível encerrar a sessão no servidor');
          }
          useAuthStore.getState().logout();
          window.location.href = '/login';
          if (refreshError instanceof Error) toast.error('Sua sessão expirou. Entre novamente.');
          return Promise.reject(error);
        }
      }
      return new Promise((resolve, reject) => {
        refreshQueue.push((token) => {
          if (token) {
            original.headers.set('Authorization', `Bearer ${token}`);
            resolve(api(original));
          } else {
            reject(error);
          }
        });
      });
    }

    const message = error.response?.data?.message || error.message || 'Erro na requisição';
    if (error.response?.status !== 401) {
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    }

    return Promise.reject(error);
  },
);

export async function request<T = any>(config: AxiosRequestConfig): Promise<T> {
  const res = await api.request<T>(config);
  return res.data;
}