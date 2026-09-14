import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';

import { prisma } from '../lib.js';

import {
  authenticate,
  allow,
} from '../middlewares/auth.js';

import {
  asyncHandler,
} from '../middlewares/error.js';

import {
  registerSchema,
  loginSchema,
  customerSchema,
  productSchema,
  saleSchema,
  financialTransactionSchema,
} from '../validations/schemas.js';

import { completeSale } from '../services/sale.service.js';
import { login as loginUser, refresh as refreshUser } from '../services/auth.service.js';

const r = Router();

/* =========================================================
   AUTH
========================================================= */

r.post(
  '/auth/register',
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);

    const exists = await prisma.user.findUnique({
      where: {
        email: input.email,
      },
    });

    if (exists) {
      return res.status(409).json({
        message: 'E-mail já cadastrado.',
      });
    }

    const passwordHash = await bcrypt.hash(
      input.password,
      12,
    );

    const role = await prisma.role.findUnique({
      where: {
        name: 'EMPLOYEE',
      },
    });

    if (!role) {
      return res.status(500).json({
        message: 'Role padrão não encontrada.',
      });
    }

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        roleId: role.id,
      },
      include: {
        role: true,
      },
    });

    res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        active: user.active,
        role: user.role.name,
      },
    });
  }),
);

r.post(
  '/auth/login',
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);

    try {
      const result = await loginUser(
        input.email,
        input.password,
      );

      res.json(result);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'INVALID_CREDENTIALS'
      ) {
        return res.status(401).json({
          message: 'E-mail ou senha inválidos.',
        });
      }

      throw error;
    }
  }),
);

r.post(
  '/auth/refresh',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      refreshToken: z.string().min(1),
    });

    const { refreshToken } = schema.parse(req.body);

    try {
      const tokenSet = await refreshUser(refreshToken);
      res.json(tokenSet);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'INVALID_TOKEN'
      ) {
        return res.status(401).json({
          message: 'Refresh token inválido ou expirado.',
        });
      }

      throw error;
    }
  }),
);

r.post(
  '/auth/logout',
  asyncHandler(async (req, res) => {
    const refreshToken =
      typeof req.body?.refreshToken === 'string'
        ? req.body.refreshToken
        : null;

    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: {
          token: refreshToken,
        },
      });
    }

    res.status(204).send();
  }),
);

/* =========================================================
   CURRENT USER
========================================================= */

r.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: {
        id: req.auth!.id,
      },
      include: {
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: 'Usuário não encontrado.',
      });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        active: user.active,
        role: user.role.name,
      },
    });
  }),
);

/* =========================================================
   USERS
========================================================= */

r.get(
  '/users',
  authenticate,
  allow('ADMIN'),
  asyncHandler(async (_req, res) => {
    const users =
      await prisma.user.findMany({
        include: {
          role: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

    res.json({
      data: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        active: user.active,
        role: user.role.name,
        createdAt: user.createdAt,
      })),
      total: users.length,
    });
  }),
);

/* =========================================================
   CUSTOMERS
========================================================= */

r.get(
  '/customers',
  authenticate,
  asyncHandler(async (req, res) => {
    const search =
      typeof req.query.search === 'string'
        ? req.query.search.trim()
        : '';

    const customers =
      await prisma.customer.findMany({
        where: search
          ? {
              OR: [
                {
                  name: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  email: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  phone: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  document: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : undefined,
        orderBy: {
          createdAt: 'desc',
        },
      });

    res.json({
      data: customers,
      total: customers.length,
    });
  }),
);

r.post(
  '/customers',
  authenticate,
  asyncHandler(async (req, res) => {
    const input =
      customerSchema.parse(req.body);

    const customer =
      await prisma.customer.create({
        data: input,
      });

    res.status(201).json(customer);
  }),
);

r.patch(
  '/customers/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const input =
      customerSchema
        .partial()
        .parse(req.body);

    const customer =
      await prisma.customer.update({
        where: {
          id: String(req.params.id),
        },
        data: input,
      });

    res.json(customer);
  }),
);

r.delete(
  '/customers/:id',
  authenticate,
  allow('ADMIN', 'MANAGER'),
  asyncHandler(async (req, res) => {
    const sales =
      await prisma.sale.count({
        where: {
          customerId: String(req.params.id),
        },
      });

    if (sales > 0) {
      return res.status(409).json({
        message:
          'Não é possível excluir um cliente que possui vendas vinculadas.',
      });
    }

    await prisma.customer.delete({
      where: {
        id: String(req.params.id),
      },
    });

    res.status(204).send();
  }),
);

/* =========================================================
   PRODUCTS
========================================================= */

r.get(
  '/products',
  authenticate,
  asyncHandler(async (req, res) => {
    const search =
      typeof req.query.search === 'string'
        ? req.query.search.trim()
        : '';

    const products =
      await prisma.product.findMany({
        where: search
          ? {
              OR: [
                {
                  name: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  sku: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : undefined,
        include: {
          category: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

    res.json({
      data: products,
      total: products.length,
    });
  }),
);

r.post(
  '/products',
  authenticate,
  asyncHandler(async (req, res) => {
    const input =
      productSchema.parse(req.body);

    const product =
      await prisma.product.create({
        data: {
          name: input.name,
          sku: input.sku,
          description: input.description,
          categoryId: input.categoryId,
          price: input.price,
          cost: input.cost,
          stock: input.stock,
          minStock: input.minStock,
          status: input.status,
        },
        include: {
          category: true,
        },
      });

    if (input.stock > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: 'IN',
          quantity: input.stock,
          reason: 'Estoque inicial',
        },
      });
    }

    res.status(201).json(product);
  }),
);

r.patch(
  '/products/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const input =
      productSchema
        .partial()
        .parse(req.body);

    const productId = String(req.params.id);

    const product = await prisma.$transaction(async (tx) => {
      const current = await tx.product.findUnique({
        where: { id: productId },
        select: { stock: true },
      });

      if (!current) {
        return null;
      }

      const updated = await tx.product.update({
        where: { id: productId },
        data: input,
        include: { category: true },
      });

      if (input.stock !== undefined && input.stock !== current.stock) {
        await tx.stockMovement.create({
          data: {
            productId,
            type: 'ADJUSTMENT',
            quantity: input.stock - current.stock,
            reason: 'Ajuste manual de estoque',
          },
        });
      }

      return updated;
    });

    if (!product) {
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }

    res.json(product);
  }),
);

r.delete(
  '/products/:id',
  authenticate,
  allow('ADMIN', 'MANAGER'),
  asyncHandler(async (req, res) => {
    const productId =
      String(req.params.id);

    const saleItems =
      await prisma.saleItem.count({
        where: {
          productId,
        },
      });

    if (saleItems > 0) {
      return res.status(409).json({
        message:
          'Não é possível excluir um produto que possui vendas vinculadas.',
      });
    }

    await prisma.stockMovement.deleteMany({
      where: {
        productId,
      },
    });

    await prisma.product.delete({
      where: {
        id: productId,
      },
    });

    res.status(204).send();
  }),
);

/* =========================================================
   SALES
========================================================= */

r.get(
  '/sales',
  authenticate,
  asyncHandler(async (_req, res) => {
    const sales =
      await prisma.sale.findMany({
        include: {
          customer: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
            include: {
              product: true,
            },
          },
          payment: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

    res.json({
      data: sales,
      total: sales.length,
    });
  }),
);

r.post(
  '/sales',
  authenticate,
  asyncHandler(async (req, res) => {
    const input =
      saleSchema.parse(req.body);

    const sale = await completeSale(
      req.auth!.id,
      input,
    );

    res.status(201).json(sale);
  }),
);

r.get(
  '/sales/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const sale =
      await prisma.sale.findUnique({
        where: {
          id: String(req.params.id),
        },
        include: {
          customer: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
            include: {
              product: true,
            },
          },
          payment: true,
        },
      });

    if (!sale) {
      return res.status(404).json({
        message: 'Venda não encontrada.',
      });
    }

    res.json(sale);
  }),
);

/* =========================================================
   FINANCEIRO
========================================================= */

r.get(
  '/financial',
  authenticate,
  allow('ADMIN', 'MANAGER'),
  asyncHandler(async (_req, res) => {
    const transactions =
      await prisma.financialTransaction.findMany({
        include: {
          category: true,
        },
        orderBy: {
          dueDate: 'asc',
        },
      });

    let income = 0;
    let expense = 0;
    let paid = 0;
    let pending = 0;

    for (const transaction of transactions) {
      const amount =
        Number(transaction.amount);

      if (
        transaction.type === 'INCOME' &&
        transaction.status !== 'CANCELLED'
      ) {
        income += amount;
      }

      if (
        transaction.type === 'EXPENSE' &&
        transaction.status !== 'CANCELLED'
      ) {
        expense += amount;
      }

      if (transaction.status === 'PAID') {
        paid += amount;
      }

      if (transaction.status === 'PENDING') {
        pending += amount;
      }
    }

    res.json({
      data: transactions,
      summary: {
        income,
        expense,
        balance: income - expense,
        paid,
        pending,
      },
    });
  }),
);

r.post(
  '/financial',
  authenticate,
  allow('ADMIN', 'MANAGER'),
  asyncHandler(async (req, res) => {
    const input =
      financialTransactionSchema.parse(
        req.body,
      );

    const transaction =
      await prisma.financialTransaction.create({
        data: {
          type: input.type,
          description: input.description,
          amount: input.amount,
          status: input.status,
          dueDate: input.dueDate,
          paidAt: input.paidAt ?? null,
          categoryId:
            input.categoryId ?? null,
        },
        include: {
          category: true,
        },
      });

    res.status(201).json(transaction);
  }),
);

r.patch(
  '/financial/:id',
  authenticate,
  allow('ADMIN', 'MANAGER'),
  asyncHandler(async (req, res) => {
    const input =
      financialTransactionSchema
        .partial()
        .parse(req.body);

    const transaction =
      await prisma.financialTransaction.update({
        where: {
          id: String(req.params.id),
        },
        data: {
          ...input,

          ...(input.status === 'PAID' &&
          input.paidAt === undefined
            ? {
                paidAt: new Date(),
              }
            : {}),

          ...(input.status !== undefined &&
          input.status !== 'PAID' &&
          input.paidAt === undefined
            ? {
                paidAt: null,
              }
            : {}),
        },
        include: {
          category: true,
        },
      });

    res.json(transaction);
  }),
);

r.delete(
  '/financial/:id',
  authenticate,
  allow('ADMIN', 'MANAGER'),
  asyncHandler(async (req, res) => {
    await prisma.financialTransaction.delete({
      where: {
        id: String(req.params.id),
      },
    });

    res.status(204).send();
  }),
);

/* =========================================================
   CATEGORIES
========================================================= */

r.get(
  '/categories',
  authenticate,
  asyncHandler(async (_req, res) => {
    const categories =
      await prisma.category.findMany({
        orderBy: {
          name: 'asc',
        },
      });

    res.json({
      data: categories,
      total: categories.length,
    });
  }),
);

r.post(
  '/categories',
  authenticate,
  allow('ADMIN', 'MANAGER'),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      name: z
        .string()
        .trim()
        .min(2)
        .max(100),
    });

    const input =
      schema.parse(req.body);

    const category =
      await prisma.category.create({
        data: input,
      });

    res.status(201).json(category);
  }),
);

/* =========================================================
   STOCK
========================================================= */

r.get(
  '/stock/movements',
  authenticate,
  asyncHandler(async (_req, res) => {
    const movements =
      await prisma.stockMovement.findMany({
        include: {
          product: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

    res.json({
      data: movements,
      total: movements.length,
    });
  }),
);

/* =========================================================
   DASHBOARD
========================================================= */

r.get(
  '/dashboard',
  authenticate,
  asyncHandler(async (_req, res) => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - 29);

    const [
      customers,
      products,
      sales,
      completedSales,
      lowStockProducts,
      recentSales,
      periodSales,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.product.count({
        where: { status: 'ACTIVE' },
      }),
      prisma.sale.count({
        where: { status: 'COMPLETED' },
      }),
      prisma.sale.findMany({
        where: { status: 'COMPLETED' },
        select: { total: true },
      }),
      prisma.product.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { stock: 'asc' },
        take: 100,
      }).then((activeProducts) =>
        activeProducts
          .filter((product) => product.stock <= product.minStock)
          .slice(0, 10),
      ),
      prisma.sale.findMany({
        where: { status: 'COMPLETED' },
        include: {
          customer: true,
          user: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.sale.findMany({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startDate, lte: today },
        },
        select: { createdAt: true, total: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    let revenue = 0;
    for (const sale of completedSales) {
      revenue += Number(sale.total);
    }

    const days = new Map<string, number>();
    for (let index = 0; index < 30; index += 1) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);
      const key = date.toISOString().slice(0, 10);
      days.set(key, 0);
    }

    for (const sale of periodSales) {
      const key = sale.createdAt.toISOString().slice(0, 10);
      const amount = Number(sale.total);
      days.set(key, (days.get(key) ?? 0) + amount);
    }

    const revenueByDay = [...days.entries()].map(([date, value]) => ({
      date,
      revenue: value,
    }));

    res.json({
      customers,
      products,
      sales,
      revenue,
      averageTicket: sales > 0 ? revenue / sales : 0,
      lowStock: lowStockProducts,
      recentSales,
      revenueByDay,
    });
  }),
);

/* =========================================================
   REPORTS
========================================================= */

r.get(
  '/reports',
  authenticate,
  allow('ADMIN', 'MANAGER'),
  asyncHandler(async (req, res) => {
    const startParam = String(req.query.startDate ?? '');
    const endParam = String(req.query.endDate ?? '');

    const now = new Date();

    const startDate = startParam
      ? new Date(`${startParam}T00:00:00`)
      : new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 29,
          0,
          0,
          0,
          0,
        );

    const endDate = endParam
      ? new Date(`${endParam}T23:59:59.999`)
      : new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999,
        );

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      return res.status(422).json({
        message: 'Período inválido.',
      });
    }

    if (startDate > endDate) {
      return res.status(422).json({
        message: 'A data inicial não pode ser maior que a data final.',
      });
    }

    const sales = await prisma.sale.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const transactions =
      await prisma.financialTransaction.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

    const products = await prisma.product.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    const customers = await prisma.customer.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    let revenue = 0;

    for (const sale of sales) {
      revenue += Number(sale.total);
    }

    const totalSales = sales.length;

    const averageTicket =
      totalSales > 0
        ? revenue / totalSales
        : 0;

    let income = 0;
    let expense = 0;
    let pending = 0;

    for (const transaction of transactions) {
      const amount = Number(transaction.amount);

      if (transaction.status === 'PENDING') {
        pending += amount;
      }

      if (
        transaction.type === 'INCOME' &&
        transaction.status !== 'CANCELLED'
      ) {
        income += amount;
      }

      if (
        transaction.type === 'EXPENSE' &&
        transaction.status !== 'CANCELLED'
      ) {
        expense += amount;
      }
    }

    const productMap = new Map<
      string,
      {
        id: string;
        name: string;
        sku: string;
        quantity: number;
        revenue: number;
      }
    >();

    const customerMap = new Map<
      string,
      {
        id: string;
        name: string;
        sales: number;
        revenue: number;
      }
    >();

    for (const sale of sales) {
      const existingCustomer =
        customerMap.get(sale.customerId);

      if (existingCustomer) {
        existingCustomer.sales += 1;
        existingCustomer.revenue += Number(sale.total);
      } else {
        customerMap.set(sale.customerId, {
          id: sale.customerId,
          name: sale.customer.name,
          sales: 1,
          revenue: Number(sale.total),
        });
      }

      for (const item of sale.items) {
        const existingProduct =
          productMap.get(item.productId);

        if (existingProduct) {
          existingProduct.quantity += item.quantity;
          existingProduct.revenue += Number(item.total);
        } else {
          productMap.set(item.productId, {
            id: item.productId,
            name: item.product.name,
            sku: item.product.sku,
            quantity: item.quantity,
            revenue: Number(item.total),
          });
        }
      }
    }

    const topSelling = Array.from(productMap.values());

    topSelling.sort((a, b) => {
      if (b.quantity !== a.quantity) {
        return b.quantity - a.quantity;
      }

      return b.revenue - a.revenue;
    });

    const topCustomers = Array.from(
      customerMap.values(),
    );

    topCustomers.sort((a, b) => {
      if (b.revenue !== a.revenue) {
        return b.revenue - a.revenue;
      }

      return b.sales - a.sales;
    });

    const lowStock = products
      .filter((product) => product.stock <= product.minStock)
      .map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        stock: product.stock,
        minStock: product.minStock,
      }));

    const dailyMap = new Map<
      string,
      {
        date: string;
        revenue: number;
        sales: number;
      }
    >();

    const cursor = new Date(startDate);

    while (cursor <= endDate) {
      const year = cursor.getFullYear();
      const month = String(cursor.getMonth() + 1).padStart(2, '0');
      const day = String(cursor.getDate()).padStart(2, '0');

      const key = `${year}-${month}-${day}`;

      dailyMap.set(key, {
        date: key,
        revenue: 0,
        sales: 0,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    for (const sale of sales) {
      const date = sale.createdAt;

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      const key = `${year}-${month}-${day}`;

      const existing = dailyMap.get(key);

      if (existing) {
        existing.revenue += Number(sale.total);
        existing.sales += 1;
      }
    }

    const daily = Array.from(dailyMap.values());

    return res.json({
      period: {
        start: startParam || startDate.toISOString(),
        end: endParam || endDate.toISOString(),
      },

      sales: {
        total: totalSales,
        revenue,
        averageTicket,
      },

      financial: {
        income,
        expense,
        balance: income - expense,
        pending,
      },

      products: {
        total: products.length,
        lowStock,
        topSelling: topSelling.slice(0, 10),
      },

      customers: {
        total: customers.length,
        topCustomers: topCustomers.slice(0, 10),
      },

      daily,
    });
  }),
);

/* =========================================================
   HEALTH
========================================================= */

r.get(
  '/health',
  asyncHandler(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'ok',
      service: 'nexus-api',
      timestamp:
        new Date().toISOString(),
    });
  }),
);

/* =========================================================
   EXPORT
========================================================= */

export default r;