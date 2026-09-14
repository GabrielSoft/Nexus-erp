import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { api, getApiErrorMessage } from '../lib/api';

type ReportProduct = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  revenue: number;
};

type ReportCustomer = {
  id: string;
  name: string;
  sales: number;
  revenue: number;
};

type ReportLowStock = {
  id: string;
  name: string;
  sku: string;
  stock: number;
  minStock: number;
};

type ReportDaily = {
  date: string;
  revenue: number;
  sales: number;
};

type ReportData = {
  period: {
    start: string;
    end: string;
  };

  sales: {
    total: number;
    revenue: number;
    averageTicket: number;
  };

  financial: {
    income: number;
    expense: number;
    balance: number;
    pending: number;
  };

  products: {
    total: number;
    lowStock: ReportLowStock[];
    topSelling: ReportProduct[];
  };

  customers: {
    total: number;
    topCustomers: ReportCustomer[];
  };

  daily: ReportDaily[];
};

function currency(value: number) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatDate(value: string) {
  if (!value) return '—';

  const [year, month, day] = value.slice(0, 10).split('-');

  if (!year || !month || !day) return '—';

  return `${day}/${month}/${year}`;
}

function getToday() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function Reports() {
  const [startDate, setStartDate] = useState(getDaysAgo(29));
  const [endDate, setEndDate] = useState(getToday());

  const [error, setError] = useState('');

  const { data, isLoading, isError, refetch } = useQuery<ReportData>({
    queryKey: ['reports', startDate, endDate],
    queryFn: async () => {
      const response = await api.get('/reports', {
        params: {
          startDate,
          endDate,
        },
      });

      return response.data;
    },
    enabled: Boolean(startDate && endDate),
  });

  const maxDailyRevenue = useMemo(() => {
    if (!data?.daily?.length) return 0;

    let max = 0;

    for (const item of data.daily) {
      if (item.revenue > max) {
        max = item.revenue;
      }
    }

    return max;
  }, [data]);

  function applyPeriod(days: number) {
    setStartDate(getDaysAgo(days - 1));
    setEndDate(getToday());
  }

  function exportCSV() {
    if (!data) return;

    const rows: string[][] = [
      ['RELATÓRIO NEXUS ERP'],
      [`Período;${formatDate(data.period.start)} até ${formatDate(data.period.end)}`],
      [],
      ['RESUMO'],
      ['Indicador', 'Valor'],
      ['Vendas', String(data.sales.total)],
      ['Faturamento', currency(data.sales.revenue)],
      ['Ticket médio', currency(data.sales.averageTicket)],
      ['Receitas', currency(data.financial.income)],
      ['Despesas', currency(data.financial.expense)],
      ['Saldo', currency(data.financial.balance)],
      ['Pendentes', currency(data.financial.pending)],
      [],
      ['PRODUTOS MAIS VENDIDOS'],
      ['Produto', 'SKU', 'Quantidade', 'Faturamento'],
    ];

    for (const product of data.products.topSelling) {
      rows.push([
        product.name,
        product.sku,
        String(product.quantity),
        currency(product.revenue),
      ]);
    }

    rows.push([]);
    rows.push(['CLIENTES QUE MAIS COMPRARAM']);
    rows.push(['Cliente', 'Vendas', 'Faturamento']);

    for (const customer of data.customers.topCustomers) {
      rows.push([
        customer.name,
        String(customer.sales),
        currency(customer.revenue),
      ]);
    }

    rows.push([]);
    rows.push(['ESTOQUE BAIXO']);
    rows.push(['Produto', 'SKU', 'Estoque', 'Estoque mínimo']);

    for (const product of data.products.lowStock) {
      rows.push([
        product.name,
        product.sku,
        String(product.stock),
        String(product.minStock),
      ]);
    }

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(';'),
      )
      .join('\n');

    const blob = new Blob([`\ufeff${csv}`], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `relatorio-nexus-${startDate}-${endDate}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  async function reload() {
    setError('');

    try {
      await refetch();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm text-violet-400">ANÁLISE GERENCIAL</p>

          <h1 className="text-3xl font-bold">
            Relatórios
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Indicadores de vendas, financeiro, produtos e clientes.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
            onClick={() => applyPeriod(7)}
          >
            7 dias
          </button>

          <button
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
            onClick={() => applyPeriod(30)}
          >
            30 dias
          </button>

          <button
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
            onClick={() => applyPeriod(90)}
          >
            90 dias
          </button>

          <button
            className="btn"
            onClick={exportCSV}
            disabled={!data}
          >
            Exportar CSV
          </button>

          <button
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
            onClick={() => window.print()}
          >
            Imprimir
          </button>
        </div>
      </div>

      <div className="card grid gap-4 md:grid-cols-3">
        <label className="text-xs text-slate-400">
          Data inicial

          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </label>

        <label className="text-xs text-slate-400">
          Data final

          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </label>

        <div className="flex items-end">
          <button
            className="btn w-full"
            onClick={() => void reload()}
            disabled={isLoading || !startDate || !endDate}
          >
            {isLoading ? 'Carregando...' : 'Atualizar relatório'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {isError && !error && (
        <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
          Não foi possível carregar o relatório.
        </div>
      )}

      {isLoading && (
        <div className="card py-12 text-center text-slate-400">
          Gerando relatório...
        </div>
      )}

      {!isLoading && data && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="card">
              <p className="text-sm text-slate-400">
                Faturamento
              </p>

              <p className="mt-3 text-2xl font-bold text-emerald-300">
                {currency(data.sales.revenue)}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Vendas concluídas
              </p>
            </div>

            <div className="card">
              <p className="text-sm text-slate-400">
                Vendas
              </p>

              <p className="mt-3 text-2xl font-bold">
                {data.sales.total}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                No período selecionado
              </p>
            </div>

            <div className="card">
              <p className="text-sm text-slate-400">
                Ticket médio
              </p>

              <p className="mt-3 text-2xl font-bold text-violet-300">
                {currency(data.sales.averageTicket)}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Média por venda
              </p>
            </div>

            <div className="card">
              <p className="text-sm text-slate-400">
                Saldo financeiro
              </p>

              <p className="mt-3 text-2xl font-bold">
                {currency(data.financial.balance)}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Receitas menos despesas
              </p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="card">
              <div className="mb-6">
                <h2 className="font-semibold">
                  Desempenho financeiro
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Período: {formatDate(data.period.start)} até{' '}
                  {formatDate(data.period.end)}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <p className="text-sm text-slate-400">
                    Receitas
                  </p>

                  <p className="mt-2 text-xl font-bold text-emerald-300">
                    {currency(data.financial.income)}
                  </p>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <p className="text-sm text-slate-400">
                    Despesas
                  </p>

                  <p className="mt-2 text-xl font-bold text-red-300">
                    {currency(data.financial.expense)}
                  </p>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <p className="text-sm text-slate-400">
                    Saldo
                  </p>

                  <p className="mt-2 text-xl font-bold">
                    {currency(data.financial.balance)}
                  </p>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <p className="text-sm text-slate-400">
                    Pendentes
                  </p>

                  <p className="mt-2 text-xl font-bold text-amber-300">
                    {currency(data.financial.pending)}
                  </p>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="mb-6">
                <h2 className="font-semibold">
                  Faturamento por dia
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Evolução das vendas concluídas.
                </p>
              </div>

              <div className="flex h-56 items-end gap-1 overflow-x-auto">
                {data.daily.map((item) => {
                  const height =
                    maxDailyRevenue > 0
                      ? Math.max(
                          4,
                          (item.revenue / maxDailyRevenue) * 100,
                        )
                      : 4;

                  return (
                    <div
                      key={item.date}
                      className="group flex h-full min-w-[12px] flex-1 flex-col justify-end"
                      title={`${formatDate(item.date)} — ${currency(item.revenue)}`}
                    >
                      <div
                        className="w-full rounded-t-md bg-violet-500/80 transition hover:bg-violet-400"
                        style={{
                          height: `${height}%`,
                        }}
                      />

                      <span className="mt-2 hidden text-center text-[9px] text-slate-500 group-hover:block">
                        {formatDate(item.date).slice(0, 5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="card overflow-hidden">
              <div className="mb-5">
                <h2 className="font-semibold">
                  Produtos mais vendidos
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Ranking por quantidade vendida.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="pb-3">Produto</th>
                      <th className="pb-3">SKU</th>
                      <th className="pb-3">Qtd.</th>
                      <th className="pb-3 text-right">
                        Faturamento
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {!data.products.topSelling.length && (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-6 text-center text-slate-500"
                        >
                          Nenhuma venda no período.
                        </td>
                      </tr>
                    )}

                    {data.products.topSelling.map((product) => (
                      <tr
                        key={product.id}
                        className="border-t border-white/5"
                      >
                        <td className="py-3 font-medium">
                          {product.name}
                        </td>

                        <td className="py-3 text-slate-400">
                          {product.sku}
                        </td>

                        <td className="py-3">
                          {product.quantity}
                        </td>

                        <td className="py-3 text-right text-emerald-300">
                          {currency(product.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card overflow-hidden">
              <div className="mb-5">
                <h2 className="font-semibold">
                  Clientes que mais compraram
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Ranking por faturamento.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] text-left text-sm">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="pb-3">Cliente</th>
                      <th className="pb-3">Vendas</th>
                      <th className="pb-3 text-right">
                        Faturamento
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {!data.customers.topCustomers.length && (
                      <tr>
                        <td
                          colSpan={3}
                          className="py-6 text-center text-slate-500"
                        >
                          Nenhuma venda no período.
                        </td>
                      </tr>
                    )}

                    {data.customers.topCustomers.map((customer) => (
                      <tr
                        key={customer.id}
                        className="border-t border-white/5"
                      >
                        <td className="py-3 font-medium">
                          {customer.name}
                        </td>

                        <td className="py-3">
                          {customer.sales}
                        </td>

                        <td className="py-3 text-right text-emerald-300">
                          {currency(customer.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section className="card overflow-hidden">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold">
                  Estoque baixo
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Produtos que estão no limite ou abaixo do estoque mínimo.
                </p>
              </div>

              <span className="rounded-full bg-red-400/10 px-3 py-1 text-xs text-red-300">
                {data.products.lowStock.length} alerta(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="pb-3">Produto</th>
                    <th className="pb-3">SKU</th>
                    <th className="pb-3">Estoque atual</th>
                    <th className="pb-3">Mínimo</th>
                    <th className="pb-3 text-right">
                      Situação
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {!data.products.lowStock.length && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-6 text-center text-slate-500"
                      >
                        Nenhum produto com estoque baixo.
                      </td>
                    </tr>
                  )}

                  {data.products.lowStock.map((product) => (
                    <tr
                      key={product.id}
                      className="border-t border-white/5"
                    >
                      <td className="py-3 font-medium">
                        {product.name}
                      </td>

                      <td className="py-3 text-slate-400">
                        {product.sku}
                      </td>

                      <td className="py-3 text-red-300">
                        {product.stock}
                      </td>

                      <td className="py-3">
                        {product.minStock}
                      </td>

                      <td className="py-3 text-right">
                        <span className="rounded-full bg-red-400/10 px-3 py-1 text-xs text-red-300">
                          Reposição necessária
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}