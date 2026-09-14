import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

const configuredBaseURL = import.meta.env.VITE_API_URL?.trim();
const baseURL = configuredBaseURL || (import.meta.env.PROD ? '/api' : 'http://localhost:3333/api');

export const api = axios.create({ baseURL, timeout: 15000 });

let refreshPromise: Promise<string | null> | null = null;

function getAccessToken() {
  return localStorage.getItem('accessToken');
}

function getRefreshToken() {
  return localStorage.getItem('refreshToken');
}

function clearSession() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const url = original?.url ?? '';
    const refreshToken = getRefreshToken();
    const isAuthEndpoint = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'].some((path) => url.includes(path));

    if (error.response?.status !== 401 || !original || original._retry || !refreshToken || isAuthEndpoint) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      refreshPromise ??= api
        .post('/auth/refresh', { refreshToken })
        .then(({ data }) => {
          if (typeof data.accessToken !== 'string' || !data.accessToken) return null;
          localStorage.setItem('accessToken', data.accessToken);
          if (typeof data.refreshToken === 'string' && data.refreshToken) {
            localStorage.setItem('refreshToken', data.refreshToken);
          }
          return data.accessToken as string;
        })
        .catch(() => null)
        .finally(() => {
          refreshPromise = null;
        });

      const token = await refreshPromise;
      if (!token) {
        clearSession();
        window.location.assign('/login');
        return Promise.reject(error);
      }

      original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    } catch {
      clearSession();
      window.location.assign('/login');
      return Promise.reject(error);
    }
  },
);

export function setSession(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

export function clearStoredSession() {
  clearSession();
}

export function getApiErrorMessage(error: unknown, fallback = 'Não foi possível concluir a operação.') {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string' && message) return message;
  }
  return fallback;
}
