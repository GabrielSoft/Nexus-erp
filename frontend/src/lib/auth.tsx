import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, clearStoredSession, setSession } from './api';

type User = {
  id: string;
  name: string;
  email: string;
  active?: boolean;
  role?: { name: string } | string;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser() {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    localStorage.removeItem('user');
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readStoredUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) {
      setLoading(false);
      return;
    }

    api.get('/me')
      .then(({ data }) => {
        const current = (data.user ?? data) as User;
        setUser(current);
        localStorage.setItem('user', JSON.stringify(current));
      })
      .catch(() => {
        clearStoredSession();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    async login(email, password) {
      const { data } = await api.post('/auth/login', { email, password });
      if (typeof data.accessToken !== 'string' || typeof data.refreshToken !== 'string') {
        throw new Error('Resposta de autenticação inválida.');
      }

      setSession(data.accessToken, data.refreshToken);
      const current = (data.user ?? (await api.get('/me')).data) as User;
      setUser(current);
      localStorage.setItem('user', JSON.stringify(current));
    },
    async logout() {
      const refreshToken = localStorage.getItem('refreshToken');
      try {
        await api.post('/auth/logout', refreshToken ? { refreshToken } : undefined);
      } finally {
        clearStoredSession();
        setUser(null);
      }
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
