import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { getApiErrorMessage } from '../lib/api';

export function Login() {
  const [email, setEmail] = useState('admin@nexuserp.com');
  const [password, setPassword] = useState('Nexus@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const registered = Boolean((location.state as { registered?: boolean } | null)?.registered);
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/';

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      nav(from, { replace: true });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Não foi possível conectar à API. Verifique se o backend está em execução.'));
    } finally {
      setLoading(false);
    }
  }

  return <div className="grid min-h-screen place-items-center p-6">
    <form onSubmit={submit} className="card w-full max-w-md space-y-5">
      <div><p className="text-sm font-semibold tracking-widest text-violet-400">NEXUS ERP</p><h1 className="mt-2 text-3xl font-bold">Bem-vindo de volta</h1><p className="mt-1 text-sm text-slate-400">Acesse sua operação em um só lugar.</p></div>
      {registered && <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-300">Conta criada com sucesso. Agora faça login.</p>}
      {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}
      <label className="block text-sm text-slate-400">E-mail<input className="mt-2" value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="email" required /></label>
      <label className="block text-sm text-slate-400">Senha<input className="mt-2" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required /></label>
      <button disabled={loading} className="btn w-full">{loading ? 'Entrando...' : 'Entrar na plataforma'}</button>
      <p className="text-center text-sm text-slate-400">Novo por aqui? <Link className="text-violet-400 hover:text-violet-300" to="/register">Criar conta</Link></p>
    </form>
  </div>;
}
