import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(3).max(120),

  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),

  password: z.string().min(8).max(128),
});

export const loginSchema = registerSchema.pick({
  email: true,
  password: true,
});

export const customerSchema = z.object({
  name: z.string().trim().min(2).max(120),

  document: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((value) => value || undefined),

  email: z
    .string()
    .trim()
    .email()
    .optional()
    .or(z.literal(''))
    .transform((value) => value || undefined),

  phone: z
    .string()
    .trim()
    .max(30)
    .optional(),

  address: z
    .string()
    .trim()
    .max(200)
    .optional(),

  city: z
    .string()
    .trim()
    .max(100)
    .optional(),

  state: z
    .string()
    .trim()
    .max(2)
    .optional(),

  notes: z
    .string()
    .trim()
    .max(1000)
    .optional(),
});

export const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(120),

  sku: z
    .string()
    .trim()
    .min(2)
    .max(60),

  description: z
    .string()
    .trim()
    .max(1000)
    .optional(),

  categoryId: z
    .string()
    .uuid()
    .optional(),

  price: z
    .coerce
    .number()
    .positive(),

  cost: z
    .coerce
    .number()
    .min(0),

  stock: z
    .coerce
    .number()
    .int()
    .min(0),

  minStock: z
    .coerce
    .number()
    .int()
    .min(0),

  status: z
    .enum(['ACTIVE', 'INACTIVE'])
    .default('ACTIVE'),
});

export const saleSchema = z.object({
  customerId: z.string().uuid(),

  paymentMethod: z
    .string()
    .trim()
    .min(2)
    .max(40),

  discount: z
    .coerce
    .number()
    .min(0)
    .default(0),

  items: z
    .array(
      z.object({
        productId: z.string().uuid(),

        quantity: z
          .coerce
          .number()
          .int()
          .positive(),
      }),
    )
    .min(1),
});

export const financialTransactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),

  description: z
    .string()
    .trim()
    .min(2)
    .max(200),

  amount: z
    .coerce
    .number()
    .positive(),

  status: z
    .enum([
      'PENDING',
      'PAID',
      'OVERDUE',
      'CANCELLED',
    ])
    .default('PENDING'),

  dueDate: z.coerce.date(),

  paidAt: z
    .coerce
    .date()
    .nullable()
    .optional(),

  categoryId: z
    .string()
    .uuid()
    .nullable()
    .optional(),
});