import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getApiErrorMessage } from '../lib/api';

export function Register() {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (password !== confirmation) {
      setError('As senhas não conferem.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/register', { name, email, password });
      nav('/login', { replace: true, state: { registered: true } });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Não foi possível criar a conta.'));
    } finally {
      setLoading(false);
    }
  }

  return <div className="grid min-h-screen place-items-center p-6">
    <form onSubmit={submit} className="card w-full max-w-md space-y-5">
      <div>
        <p className="text-sm font-semibold tracking-widest text-violet-400">NEXUS ERP</p>
        <h1 className="mt-2 text-3xl font-bold">Criar conta</h1>
        <p className="mt-1 text-sm text-slate-400">O cadastro cria um usuário com perfil de funcionário.</p>
      </div>
      {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}
      <label className="block text-sm text-slate-400">Nome<input className="mt-2" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required minLength={3} /></label>
      <label className="block text-sm text-slate-400">E-mail<input className="mt-2" value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required /></label>
      <label className="block text-sm text-slate-400">Senha<input className="mt-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required minLength={8} /></label>
      <label className="block text-sm text-slate-400">Confirmar senha<input className="mt-2" type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="new-password" required minLength={8} /></label>
      <button disabled={loading} className="btn w-full">{loading ? 'Criando...' : 'Criar conta'}</button>
      <p className="text-center text-sm text-slate-400">Já possui conta? <Link className="text-violet-400 hover:text-violet-300" to="/login">Voltar ao login</Link></p>
    </form>
  </div>;
}
