import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { api, getApiErrorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';

type Kind = 'customers' | 'products';
type Item = Record<string, unknown> & { id: string };

const config = {
  customers: {
    title: 'Clientes',
    fields: ['name', 'email', 'phone'],
  },
  products: {
    title: 'Produtos',
    fields: ['name', 'sku', 'price', 'stock', 'minStock', 'cost'],
  },
} as const;

const numericFields = ['price', 'stock', 'minStock', 'cost'];

function createForm(fields: readonly string[], item?: Item) {
  return Object.fromEntries(fields.map((field) => [field, item?.[field] == null ? '' : String(item[field])])) as Record<string, string>;
}

export function Resource({ kind }: { kind: Kind }) {
  const c = config[kind];
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, string> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const canDelete = user?.role === 'ADMIN' || user?.role === 'MANAGER' || (typeof user?.role === 'object' && ['ADMIN', 'MANAGER'].includes(user.role.name));

  const { data, isLoading, isError } = useQuery<{ data: Item[]; total: number }>({
    queryKey: [kind, search],
    queryFn: () => api.get(`/${kind}`, { params: { search } }).then((response) => response.data),
  });

  function startCreate() {
    setError('');
    setEditingId(null);
    setForm(createForm(c.fields));
  }

  function startEdit(item: Item) {
    setError('');
    setEditingId(item.id);
    setForm(createForm(c.fields, item));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setError('');

    const payload: Record<string, string | number> = { ...form };
    for (const key of numericFields) {
      if (key in payload && payload[key] !== '') payload[key] = Number(payload[key]);
    }

    try {
      if (editingId) {
        await api.patch(`/${kind}/${editingId}`, payload);
      } else {
        await api.post(`/${kind}`, payload);
      }
      setForm(null);
      setEditingId(null);
      await qc.invalidateQueries({ queryKey: [kind] });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  async function remove(item: Item) {
    if (!canDelete || !window.confirm(`Excluir ${String(item.name)}?`)) return;
    setError('');
    try {
      await api.delete(`/${kind}/${item.id}`);
      await qc.invalidateQueries({ queryKey: [kind] });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Não foi possível excluir o registro.'));
    }
  }

  return <>
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <p className="text-sm text-violet-400">CADASTROS</p>
        <h1 className="text-3xl font-bold">{c.title}</h1>
      </div>
      <button className="btn" onClick={startCreate}>Novo {kind === 'customers' ? 'cliente' : 'produto'}</button>
    </div>

    {error && <p role="alert" className="mb-5 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}

    {form && <form onSubmit={save} className="card mb-6 grid gap-3 md:grid-cols-3">
      {c.fields.map((field) => <label key={field} className="text-xs capitalize text-slate-400">
        {field}
        <input
          required={field === 'name' || field === 'sku'}
          min={numericFields.includes(field) ? '0' : undefined}
          step={field === 'price' || field === 'cost' ? '0.01' : undefined}
          type={numericFields.includes(field) ? 'number' : field === 'email' ? 'email' : 'text'}
          value={form[field] ?? ''}
          onChange={(event) => setForm({ ...form, [field]: event.target.value })}
        />
      </label>)}
      <div className="flex items-end gap-2">
        <button className="btn" type="submit">{editingId ? 'Atualizar' : 'Salvar'}</button>
        <button type="button" className="text-sm text-slate-400" onClick={() => { setForm(null); setEditingId(null); }}>Cancelar</button>
      </div>
    </form>}

    <div className="card overflow-hidden">
      <input className="mb-5 max-w-sm" placeholder="Buscar..." value={search} onChange={(event) => setSearch(event.target.value)} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-slate-500"><tr>
            {c.fields.map((field) => <th key={field} className="pb-3 capitalize">{field}</th>)}
            <th className="pb-3 text-right">Ações</th>
          </tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={c.fields.length + 1} className="py-5 text-slate-400">Carregando...</td></tr>}
            {!isLoading && isError && <tr><td colSpan={c.fields.length + 1} className="py-5 text-red-300">Não foi possível carregar os dados.</td></tr>}
            {!isLoading && !isError && !data?.data?.length && <tr><td colSpan={c.fields.length + 1} className="py-5 text-slate-500">Nenhum registro encontrado.</td></tr>}
            {!isLoading && !isError && data?.data?.map((item) => <tr key={item.id} className="border-t border-white/5">
              {c.fields.map((field) => <td key={field} className="py-3">
                {field === 'price' || field === 'cost'
                  ? Number(item[field]).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                  : String(item[field] ?? '—')}
              </td>)}
              <td className="py-3 text-right">
                <div className="flex justify-end gap-3">
                  <button className="text-violet-300 hover:text-violet-200" onClick={() => startEdit(item)}>Editar</button>
                  {canDelete && <button className="text-red-300 hover:text-red-200" onClick={() => void remove(item)}>Excluir</button>}
                </div>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  </>;
}
