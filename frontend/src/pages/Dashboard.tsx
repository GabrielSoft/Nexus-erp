import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  Package,
  ShoppingBag,
  Users,
} from 'lucide-react';
import { api } from '../lib/api';

type RevenueDay = {
  date: string;
  revenue: number;
};

type Data = {
  customers: number;
  products: number;
  sales: number;
  revenue: number;
  averageTicket: number;
  lowStock: {
    id: string;
    name: string;
    stock: number;
    minStock: number;
  }[];
  revenueByDay: RevenueDay[];
};

export function Dashboard() {
  const { data, isLoading, isError } = useQuery<Data>({
    queryKey: ['dashboard'],
    queryFn: () =>
      api.get('/dashboard').then((response) => response.data),
  });

  const cards = [
    {
      label: 'Faturamento',
      value: data?.revenue ?? 0,
      icon: DollarSign,
      currency: true,
    },
    {
      label: 'Clientes',
      value: data?.customers ?? 0,
      icon: Users,
      currency: false,
    },
    {
      label: 'Vendas',
      value: data?.sales ?? 0,
      icon: ShoppingBag,
      currency: false,
    },
    {
      label: 'Produtos',
      value: data?.products ?? 0,
      icon: Package,
      currency: false,
    },
  ];

  const revenueByDay = data?.revenueByDay ?? [];

  const maxRevenue = Math.max(
    ...revenueByDay.map((day) => day.revenue),
    1,
  );

  function formatCurrency(value: number) {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  function formatDate(date: string) {
    const [, month, day] = date.split('-');

    return `${day}/${month}`;
  }

  return (
    <>
      <header className="mb-8">
        <p className="text-sm text-violet-400">
          VISÃO GERAL
        </p>

        <h1 className="text-3xl font-bold">
          Bom dia, equipe Nexus
        </h1>
      </header>

      {isError && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300"
        >
          Não foi possível carregar os dados do dashboard.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        {cards.map(
          ({
            label,
            value,
            icon: Icon,
            currency,
          }) => (
            <div className="card" key={label}>
              <Icon className="mb-5 text-electric" />

              <p className="text-sm text-slate-400">
                {label}
              </p>

              <p className="mt-1 text-2xl font-bold">
                {isLoading
                  ? '—'
                  : currency
                    ? formatCurrency(Number(value))
                    : String(value)}
              </p>
            </div>
          ),
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">
                Receita dos últimos 30 dias
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Dados baseados nas vendas concluídas
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-500">
                Total
              </p>

              <p className="font-semibold text-violet-300">
                {isLoading
                  ? '—'
                  : formatCurrency(data?.revenue ?? 0)}
              </p>
            </div>
          </div>

          <div className="mt-8">
            {isLoading ? (
              <div className="flex h-48 items-center justify-center text-sm text-slate-500">
                Carregando gráfico...
              </div>
            ) : revenueByDay.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-slate-500">
                Nenhuma venda concluída nos últimos 30 dias.
              </div>
            ) : (
              <div className="flex h-48 items-end gap-1">
                {revenueByDay.map((day) => {
                  const height =
                    day.revenue > 0
                      ? Math.max(
                          (day.revenue / maxRevenue) * 100,
                          4,
                        )
                      : 2;

                  return (
                    <div
                      key={day.date}
                      className="group relative flex h-full flex-1 items-end"
                    >
                      <div
                        title={`${formatDate(day.date)} — ${formatCurrency(day.revenue)}`}
                        className="w-full rounded-t bg-gradient-to-t from-electric to-cyan-400/80 transition-all duration-200 group-hover:opacity-80"
                        style={{
                          height: `${height}%`,
                        }}
                      />

                      <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-xs text-white shadow-lg group-hover:block">
                        <div>
                          {formatDate(day.date)}
                        </div>

                        <div className="text-violet-300">
                          {formatCurrency(day.revenue)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {revenueByDay.length > 0 && (
            <div className="mt-3 flex justify-between text-[10px] text-slate-600">
              <span>
                {formatDate(revenueByDay[0].date)}
              </span>

              <span>
                {formatDate(
                  revenueByDay[
                    revenueByDay.length - 1
                  ].date,
                )}
              </span>
            </div>
          )}
        </section>

        <section className="card">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">
              Estoque baixo
            </h2>

            {data?.lowStock &&
              data.lowStock.length > 0 && (
                <span className="rounded-full bg-amber-400/10 px-2 py-1 text-xs text-amber-400">
                  {data.lowStock.length}
                </span>
              )}
          </div>

          <div className="mt-4 space-y-3">
            {data?.lowStock?.length ? (
              data.lowStock.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate">
                      {product.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Estoque mínimo: {product.minStock}
                    </p>
                  </div>

                  <span className="ml-4 whitespace-nowrap text-amber-400">
                    {product.stock}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                Nenhum alerta crítico.
              </p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}