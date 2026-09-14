import { useMemo, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Plus,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import { api, getApiErrorMessage } from '../lib/api';

type Customer = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  price: number | string;
  stock: number;
  minStock: number;
  status: 'ACTIVE' | 'INACTIVE';
};

type SaleItem = {
  product: Product;
  quantity: number;
};

type Sale = {
  id: string;
  createdAt: string;
  status: string;
  paymentMethod: string;
  subtotal: number | string;
  discount: number | string;
  total: number | string;
  customer: {
    name: string;
  };
  items: {
    id: string;
    quantity: number;
    unitPrice: number | string;
    total: number | string;
    product: {
      name: string;
    };
  }[];
};

const paymentMethods = [
  'PIX',
  'Dinheiro',
  'Cartão de débito',
  'Cartão de crédito',
  'Transferência',
];

function currency(value: number | string) {
  return Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function Sales() {
  const queryClient = useQueryClient();

  const [customerId, setCustomerId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [discount, setDiscount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data: customersData, isLoading: loadingCustomers } =
    useQuery<{ data: Customer[] }>({
      queryKey: ['customers-sales'],
      queryFn: () =>
        api
          .get('/customers', {
            params: {
              limit: 100,
            },
          })
          .then((response) => response.data),
    });

  const { data: productsData, isLoading: loadingProducts } =
    useQuery<{ data: Product[] }>({
      queryKey: ['products-sales'],
      queryFn: () =>
        api
          .get('/products', {
            params: {
              limit: 100,
            },
          })
          .then((response) => response.data),
    });

  const { data: salesData, isLoading: loadingSales } =
    useQuery<{ data: Sale[]; total: number }>({
      queryKey: ['sales'],
      queryFn: () =>
        api.get('/sales').then((response) => response.data),
    });

  const customers = customersData?.data ?? [];
  const products = productsData?.data ?? [];
  const sales = salesData?.data ?? [];

  const availableProducts = products.filter(
    (product) =>
      product.status === 'ACTIVE' &&
      product.stock > 0,
  );

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (sum, item) =>
          sum +
          Number(item.product.price) *
            item.quantity,
        0,
      ),
    [cart],
  );

  const discountValue = Math.max(
    0,
    Number(discount) || 0,
  );

  const total = Math.max(
    0,
    subtotal - discountValue,
  );

  function addToCart() {
    setError('');
    setSuccess('');

    const product = products.find(
      (item) => item.id === productId,
    );

    if (!product) {
      setError('Selecione um produto.');
      return;
    }

    if (product.status !== 'ACTIVE') {
      setError('Este produto está inativo.');
      return;
    }

    if (product.stock <= 0) {
      setError('Este produto está sem estoque.');
      return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setError('Informe uma quantidade válida.');
      return;
    }

    const existing = cart.find(
      (item) => item.product.id === product.id,
    );

    const newQuantity =
      (existing?.quantity ?? 0) + quantity;

    if (newQuantity > product.stock) {
      setError(
        `Estoque insuficiente. Disponível: ${product.stock}.`,
      );
      return;
    }

    if (existing) {
      setCart(
        cart.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: newQuantity,
              }
            : item,
        ),
      );
    } else {
      setCart([
        ...cart,
        {
          product,
          quantity,
        },
      ]);
    }

    setProductId('');
    setQuantity(1);
  }

  function removeFromCart(productIdToRemove: string) {
    setCart(
      cart.filter(
        (item) =>
          item.product.id !== productIdToRemove,
      ),
    );
  }

  function clearSale() {
    setCustomerId('');
    setProductId('');
    setQuantity(1);
    setDiscount('0');
    setPaymentMethod('PIX');
    setCart([]);
    setError('');
    setSuccess('');
  }

  async function completeSale(
    event: FormEvent,
  ) {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (!customerId) {
      setError('Selecione um cliente.');
      return;
    }

    if (cart.length === 0) {
      setError(
        'Adicione pelo menos um produto à venda.',
      );
      return;
    }

    if (discountValue > subtotal) {
      setError(
        'O desconto não pode ser maior que o subtotal.',
      );
      return;
    }

    try {
      await api.post('/sales', {
        customerId,
        paymentMethod,
        discount: discountValue,
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
      });

      setSuccess(
        'Venda concluída com sucesso!',
      );

      clearSale();

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['sales'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['products-sales'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['dashboard'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['products'],
        }),
      ]);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'Não foi possível concluir a venda.',
        ),
      );
    }
  }

  return (
    <div>
      <header className="mb-8">
        <p className="text-sm text-violet-400">
          OPERAÇÃO
        </p>

        <h1 className="mt-1 text-3xl font-bold">
          Vendas
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Registre vendas, controle o estoque e acompanhe
          suas operações.
        </p>
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
          className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-300"
        >
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <form
          onSubmit={completeSale}
          className="card xl:col-span-2"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-violet-500/10 p-3">
              <ShoppingCart className="text-violet-400" />
            </div>

            <div>
              <h2 className="font-semibold">
                Nova venda
              </h2>

              <p className="text-sm text-slate-500">
                Adicione os produtos da operação.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-400">
              Cliente

              <select
                value={customerId}
                onChange={(event) =>
                  setCustomerId(event.target.value)
                }
                className="mt-2"
                required
              >
                <option value="">
                  {loadingCustomers
                    ? 'Carregando clientes...'
                    : 'Selecione um cliente'}
                </option>

                {customers.map((customer) => (
                  <option
                    key={customer.id}
                    value={customer.id}
                  >
                    {customer.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-slate-400">
              Forma de pagamento

              <select
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(event.target.value)
                }
                className="mt-2"
              >
                {paymentMethods.map((method) => (
                  <option
                    key={method}
                    value={method}
                  >
                    {method}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="grid gap-4 md:grid-cols-[1fr_120px_auto] md:items-end">
              <label className="text-sm text-slate-400">
                Produto

                <select
                  value={productId}
                  onChange={(event) =>
                    setProductId(event.target.value)
                  }
                  className="mt-2"
                >
                  <option value="">
                    {loadingProducts
                      ? 'Carregando produtos...'
                      : 'Selecione um produto'}
                  </option>

                  {availableProducts.map(
                    (product) => (
                      <option
                        key={product.id}
                        value={product.id}
                      >
                        {product.name} —{' '}
                        {currency(product.price)} — estoque:{' '}
                        {product.stock}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="text-sm text-slate-400">
                Quantidade

                <input
                  className="mt-2"
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(
                      Number(event.target.value),
                    )
                  }
                />
              </label>

              <button
                type="button"
                className="btn flex items-center justify-center gap-2"
                onClick={addToCart}
              >
                <Plus size={18} />
                Adicionar
              </button>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3">
                    Produto
                  </th>

                  <th className="pb-3">
                    Preço
                  </th>

                  <th className="pb-3">
                    Qtd.
                  </th>

                  <th className="pb-3">
                    Total
                  </th>

                  <th className="pb-3 text-right">
                    Ação
                  </th>
                </tr>
              </thead>

              <tbody>
                {cart.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 text-center text-slate-500"
                    >
                      Nenhum produto adicionado à venda.
                    </td>
                  </tr>
                ) : (
                  cart.map((item) => (
                    <tr
                      key={item.product.id}
                      className="border-t border-white/5"
                    >
                      <td className="py-4">
                        <div>
                          <p className="font-medium">
                            {item.product.name}
                          </p>

                          <p className="text-xs text-slate-500">
                            SKU: {item.product.sku}
                          </p>
                        </div>
                      </td>

                      <td className="py-4">
                        {currency(
                          item.product.price,
                        )}
                      </td>

                      <td className="py-4">
                        {item.quantity}
                      </td>

                      <td className="py-4 font-medium">
                        {currency(
                          Number(item.product.price) *
                            item.quantity,
                        )}
                      </td>

                      <td className="py-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            removeFromCart(
                              item.product.id,
                            )
                          }
                          className="text-red-300 hover:text-red-200"
                          title="Remover"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-4 border-t border-white/5 pt-6 md:grid-cols-2">
            <label className="text-sm text-slate-400">
              Desconto

              <input
                className="mt-2"
                type="number"
                min="0"
                max={subtotal}
                step="0.01"
                value={discount}
                onChange={(event) =>
                  setDiscount(event.target.value)
                }
              />
            </label>

            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="flex justify-between text-sm text-slate-400">
                <span>Subtotal</span>

                <span>
                  {currency(subtotal)}
                </span>
              </div>

              <div className="mt-2 flex justify-between text-sm text-slate-400">
                <span>Desconto</span>

                <span>
                  - {currency(discountValue)}
                </span>
              </div>

              <div className="mt-4 flex justify-between border-t border-white/5 pt-4">
                <span className="font-semibold">
                  Total
                </span>

                <span className="text-2xl font-bold text-violet-300">
                  {currency(total)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={clearSale}
              className="rounded-xl px-4 py-2 text-sm text-slate-400 hover:bg-white/5"
            >
              Limpar
            </button>

            <button
              type="submit"
              className="btn"
              disabled={cart.length === 0}
            >
              Finalizar venda
            </button>
          </div>
        </form>

        <section className="card">
          <div className="mb-5">
            <h2 className="font-semibold">
              Resumo da venda
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Confira os dados antes de finalizar.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <p className="text-xs text-slate-500">
                Cliente
              </p>

              <p className="mt-1 font-medium">
                {customers.find(
                  (customer) =>
                    customer.id === customerId,
                )?.name ?? 'Nenhum cliente selecionado'}
              </p>
            </div>

            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <p className="text-xs text-slate-500">
                Produtos
              </p>

              <p className="mt-1 text-2xl font-bold">
                {cart.reduce(
                  (sum, item) =>
                    sum + item.quantity,
                  0,
                )}
              </p>
            </div>

            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <p className="text-xs text-slate-500">
                Pagamento
              </p>

              <p className="mt-1 font-medium">
                {paymentMethod}
              </p>
            </div>

            <div className="rounded-xl border border-violet-400/10 bg-violet-400/5 p-4">
              <p className="text-xs text-slate-500">
                Total da operação
              </p>

              <p className="mt-1 text-2xl font-bold text-violet-300">
                {currency(total)}
              </p>
            </div>
          </div>
        </section>
      </div>

      <section className="card mt-6 overflow-hidden">
        <div className="mb-6">
          <h2 className="font-semibold">
            Últimas vendas
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Histórico das operações realizadas.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3">
                  Data
                </th>

                <th className="pb-3">
                  Cliente
                </th>

                <th className="pb-3">
                  Pagamento
                </th>

                <th className="pb-3">
                  Itens
                </th>

                <th className="pb-3">
                  Total
                </th>

                <th className="pb-3">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {loadingSales ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-6 text-slate-500"
                  >
                    Carregando vendas...
                  </td>
                </tr>
              ) : !sales?.length ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-6 text-slate-500"
                  >
                    Nenhuma venda realizada ainda.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="border-t border-white/5"
                  >
                    <td className="py-4 text-slate-400">
                      {formatDate(
                        sale.createdAt,
                      )}
                    </td>

                    <td className="py-4">
                      {sale.customer.name}
                    </td>

                    <td className="py-4">
                      {sale.paymentMethod}
                    </td>

                    <td className="py-4">
                      {sale.items.reduce(
                        (sum, item) =>
                          sum + item.quantity,
                        0,
                      )}
                    </td>

                    <td className="py-4 font-medium">
                      {currency(sale.total)}
                    </td>

                    <td className="py-4">
                      <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
                        {sale.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}