import React from 'react';

import type { ReactNode } from 'react';

import ReactDOM from 'react-dom/client';

import { Reports } from './pages/Reports';

import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';

import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';

import './index.css';

import { Layout } from './components/Layout';

import { Login } from './pages/Login';

import { Register } from './pages/Register';

import { Dashboard } from './pages/Dashboard';

import { Resource } from './pages/Resource';

import { Sales } from './pages/Sales';

import { Financial } from './pages/Financial';

import {
  AuthProvider,
  useAuth,
} from './lib/auth';

const q = new QueryClient();

function Guard({
  children,
}: {
  children: ReactNode;
}) {
  const {
    user,
    loading,
  } = useAuth();

  const location =
    useLocation();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-slate-400">
        Carregando sessão...
      </div>
    );
  }

  return user ? (
    <>{children}</>
  ) : (
    <Navigate
      to="/login"
      replace
      state={{
        from: location,
      }}
    />
  );
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          element={
            <Guard>
              <Layout />
            </Guard>
          }
        >
          <Route
            path="/"
            element={<Dashboard />}
          />

          <Route
            path="/customers"
            element={
              <Resource kind="customers" />
            }
          />

          <Route
            path="/products"
            element={
              <Resource kind="products" />
            }
          />

          <Route
            path="/sales"
            element={<Sales />}
          />

          <Route
            path="/financial"
            element={<Financial />}
          />

          <Route
            path="/reports"
            element={<Reports />}
          />
        </Route>

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />
      </Routes>
    </AuthProvider>
  );
}

ReactDOM.createRoot(
  document.getElementById(
    'root',
  )!,
).render(
  <React.StrictMode>
    <QueryClientProvider client={q}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);