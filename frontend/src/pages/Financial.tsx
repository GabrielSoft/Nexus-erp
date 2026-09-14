import {
  useState,
  type FormEvent,
} from 'react';

import {
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  ArrowDownCircle,
  ArrowUpCircle,
  Plus,
  Trash2,
  Wallet,
} from 'lucide-react';

import {
  api,
  getApiErrorMessage,
} from '../lib/api';

import { useAuth } from '../lib/auth';

type TransactionType =
  | 'INCOME'
  | 'EXPENSE';

type TransactionStatus =
  | 'PENDING'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED';

type FinancialTransaction = {
  id: string;

  type: TransactionType;

  description: string;

  amount: number | string;

  status: TransactionStatus;

  dueDate: string;

  paidAt?: string | null;

  category?: {
    id: string;
    name: string;
  } | null;

  createdAt: string;
};

type FinancialResponse = {
  data: FinancialTransaction[];

  summary: {
    income: number;
    expense: number;
    balance: number;
    paid: number;
    pending: number;
  };
};

const statusLabels: Record<
  TransactionStatus,
  string
> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  OVERDUE: 'Vencido',
  CANCELLED: 'Cancelado',
};

function currency(
  value: number | string,
) {
  return Number(value).toLocaleString(
    'pt-BR',
    {
      style: 'currency',
      currency: 'BRL',
    },
  );
}

function formatDate(value: string) {
  const datePart = value.includes('T')
    ? value.slice(0, 10)
    : value;

  const [year, month, day] = datePart.split('-');

  if (!year || !month || !day) {
    return '—';
  }

  return `${day}/${month}/${year}`;
}

function formatDateOnly(value: string) {
  const datePart = value.slice(0, 10);
  const [year, month, day] = datePart.split('-').map(Number);

  if (
    !year ||
    !month ||
    !day ||
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return '—';
  }

  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function Financial() {
  const queryClient =
    useQueryClient();

  const { user } = useAuth();

  const [formOpen, setFormOpen] =
    useState(false);

  const [type, setType] =
    useState<TransactionType>(
      'INCOME',
    );

  const [description, setDescription] =
    useState('');

  const [amount, setAmount] =
    useState('');

  const [status, setStatus] =
    useState<TransactionStatus>(
      'PENDING',
    );

  const [dueDate, setDueDate] =
    useState(today());

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const { data, isLoading, isError } =
    useQuery<FinancialResponse>({
      queryKey: ['financial'],

      queryFn: () =>
        api
          .get('/financial')
          .then(
            (response) =>
              response.data,
          ),
    });

  const transactions =
    data?.data ?? [];

  const summary =
    data?.summary ?? {
      income: 0,
      expense: 0,
      balance: 0,
      paid: 0,
      pending: 0,
    };

  const canManage =
    user?.role === 'ADMIN' ||
    user?.role === 'MANAGER' ||
    (typeof user?.role ===
      'object' &&
      ['ADMIN', 'MANAGER'].includes(
        user.role.name,
      ));

  const balance = summary.income - summary.expense;

  function resetForm() {
    setFormOpen(false);

    setType('INCOME');

    setDescription('');

    setAmount('');

    setStatus('PENDING');

    setDueDate(today());

    setError('');
  }

  async function save(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError('');
    setSuccess('');

    const cleanDescription =
      description.trim();

    if (!cleanDescription) {
      setError(
        'Informe uma descrição.',
      );
      return;
    }

    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(
        numericAmount,
      ) ||
      numericAmount <= 0
    ) {
      setError(
        'Informe um valor válido.',
      );
      return;
    }

    try {
      await api.post(
        '/financial',
        {
          type,

          description:
            cleanDescription,

          amount:
            numericAmount,

          status,

          dueDate,

          paidAt:
            status === 'PAID'
              ? new Date().toISOString()
              : null,
        },
      );

      resetForm();

      setSuccess(
        'Movimentação cadastrada com sucesso.',
      );

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['financial'],
        }),

        queryClient.invalidateQueries({
          queryKey: ['dashboard'],
        }),
      ]);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'Não foi possível cadastrar a movimentação.',
        ),
      );
    }
  }

  async function remove(
    transaction: FinancialTransaction,
  ) {
    if (
      !canManage ||
      !window.confirm(
        `Excluir "${transaction.description}"?`,
      )
    ) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await api.delete(
        `/financial/${transaction.id}`,
      );

      setSuccess(
        'Movimentação excluída com sucesso.',
      );

      await queryClient.invalidateQueries({
        queryKey: ['financial'],
      });
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'Não foi possível excluir a movimentação.',
        ),
      );
    }
  }

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-violet-400">
            GESTÃO FINANCEIRA
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Financeiro
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Controle receitas, despesas e
            movimentações financeiras.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            className="btn flex items-center gap-2"
            onClick={() => {
              setFormOpen(true);
              setError('');
              setSuccess('');
            }}
          >
            <Plus size={18} />

            Nova movimentação
          </button>
        )}
      </header>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mb-5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-300"
        >
          {success}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="card">
          <ArrowUpCircle
            className="mb-5 text-emerald-400"
          />

          <p className="text-sm text-slate-400">
            Receitas
          </p>

          <p className="mt-1 text-2xl font-bold text-emerald-300">
            {isLoading
              ? '—'
              : currency(
                  summary.income,
                )}
          </p>
        </div>

        <div className="card">
          <ArrowDownCircle
            className="mb-5 text-red-400"
          />

          <p className="text-sm text-slate-400">
            Despesas
          </p>

          <p className="mt-1 text-2xl font-bold text-red-300">
            {isLoading
              ? '—'
              : currency(
                  summary.expense,
                )}
          </p>
        </div>

        <div className="card">
          <Wallet
            className="mb-5 text-violet-400"
          />

          <p className="text-sm text-slate-400">
            Saldo
          </p>

          <p className="mt-1 text-2xl font-bold">
            {isLoading
              ? '—'
              : currency(balance)}
          </p>
        </div>

        <div className="card">
          <p className="mb-5 text-sm font-semibold text-slate-400">
            Pendentes
          </p>

          <p className="text-2xl font-bold">
            {isLoading
              ? '—'
              : currency(
                  summary.pending,
                )}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            A receber / pagar
          </p>
        </div>
      </div>

      {formOpen && (
        <form
          onSubmit={save}
          className="card mt-6"
        >
          <div className="mb-6">
            <h2 className="font-semibold">
              Nova movimentação
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Registre uma receita ou uma
              despesa.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm text-slate-400">
              Tipo

              <select
                className="mt-2"
                value={type}
                onChange={(event) =>
                  setType(
                    event.target
                      .value as TransactionType,
                  )
                }
              >
                <option value="INCOME">
                  Receita
                </option>

                <option value="EXPENSE">
                  Despesa
                </option>
              </select>
            </label>

            <label className="text-sm text-slate-400">
              Descrição

              <input
                className="mt-2"
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value,
                  )
                }
                placeholder="Ex.: Venda, aluguel..."
                required
              />
            </label>

            <label className="text-sm text-slate-400">
              Valor

              <input
                className="mt-2"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) =>
                  setAmount(
                    event.target.value,
                  )
                }
                placeholder="0,00"
                required
              />
            </label>

            <label className="text-sm text-slate-400">
              Vencimento

              <input
                className="mt-2"
                type="date"
                value={dueDate}
                onChange={(event) =>
                  setDueDate(
                    event.target.value,
                  )
                }
                required
              />
            </label>

            <label className="text-sm text-slate-400">
              Status

              <select
                className="mt-2"
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target
                      .value as TransactionStatus,
                  )
                }
              >
                <option value="PENDING">
                  Pendente
                </option>

                <option value="PAID">
                  Pago
                </option>

                <option value="OVERDUE">
                  Vencido
                </option>

                <option value="CANCELLED">
                  Cancelado
                </option>
              </select>
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              className="rounded-xl px-4 py-2 text-sm text-slate-400 hover:bg-white/5"
              onClick={resetForm}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="btn"
            >
              Salvar movimentação
            </button>
          </div>
        </form>
      )}

      <section className="card mt-6 overflow-hidden">
        <div className="mb-6">
          <h2 className="font-semibold">
            Movimentações financeiras
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Histórico de receitas e despesas.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3">
                  Data
                </th>

                <th className="pb-3">
                  Tipo
                </th>

                <th className="pb-3">
                  Descrição
                </th>

                <th className="pb-3">
                  Vencimento
                </th>

                <th className="pb-3">
                  Valor
                </th>

                <th className="pb-3">
                  Status
                </th>

                <th className="pb-3 text-right">
                  Ação
                </th>
              </tr>
            </thead>

            <tbody>
              {isLoading && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-slate-500"
                  >
                    Carregando movimentações...
                  </td>
                </tr>
              )}

              {!isLoading &&
                isError && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-red-300"
                    >
                      Não foi possível carregar
                      os dados financeiros.
                    </td>
                  </tr>
                )}

              {!isLoading &&
                !isError &&
                transactions.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-slate-500"
                    >
                      Nenhuma movimentação
                      cadastrada.
                    </td>
                  </tr>
                )}

              {!isLoading &&
                !isError &&
                transactions.map(
                  (transaction) => (
                    <tr
                      key={
                        transaction.id
                      }
                      className="border-t border-white/5"
                    >
                      <td className="py-4 text-slate-400">
                        {formatDate(
                          transaction.createdAt,
                        )}
                      </td>

                      <td className="py-4">
                        {transaction.type ===
                        'INCOME' ? (
                          <span className="flex items-center gap-2 text-emerald-300">
                            <ArrowUpCircle
                              size={16}
                            />

                            Receita
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-red-300">
                            <ArrowDownCircle
                              size={16}
                            />

                            Despesa
                          </span>
                        )}
                      </td>

                      <td className="py-4 font-medium">
                        {
                          transaction.description
                        }
                      </td>

                      <td className="py-4 text-slate-400">
                        {formatDateOnly(
                          transaction.dueDate,
                        )}
                      </td>

                      <td
                        className={`py-4 font-semibold ${
                          transaction.type ===
                          'INCOME'
                            ? 'text-emerald-300'
                            : 'text-red-300'
                        }`}
                      >
                        {transaction.type ===
                        'INCOME'
                          ? '+ '
                          : '- '}

                        {currency(
                          transaction.amount,
                        )}
                      </td>

                      <td className="py-4">
                        <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
                          {
                            statusLabels[
                              transaction
                                .status
                            ]
                          }
                        </span>
                      </td>

                      <td className="py-4 text-right">
                        {canManage && (
                          <button
                            type="button"
                            className="text-red-300 hover:text-red-200"
                            title="Excluir"
                            onClick={() =>
                              void remove(
                                transaction,
                              )
                            }
                          >
                            <Trash2
                              size={18}
                            />
                          </button>
                        )}
                      </td>
                    </tr>
                  ),
                )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}