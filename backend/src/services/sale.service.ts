import { prisma } from '../lib.js';
import { Prisma } from '@prisma/client';

export async function completeSale(
  userId: string,
  input: {
    customerId: string;
    paymentMethod: string;
    discount: number;
    items: { productId: string; quantity: number }[];
  },
) {
  return prisma.$transaction(async (tx) => {
    const productIds = input.items.map((item) => item.productId);
    const uniqueProductIds = new Set(productIds);
    if (uniqueProductIds.size !== productIds.length) throw new Error('Produto repetido na venda');

    const products = await tx.product.findMany({
      where: { id: { in: productIds }, status: 'ACTIVE' },
    });
    if (products.length !== input.items.length) throw new Error('Produto indisponível');

    let subtotal = new Prisma.Decimal(0);
    const items = input.items.map((item) => {
      const product = products.find((candidate) => candidate.id === item.productId)!;
      const total = new Prisma.Decimal(product.price).mul(item.quantity);
      subtotal = subtotal.add(total);
      return {
        productId: product.id,
        quantity: item.quantity,
        unitPrice: product.price,
        total,
      };
    });

    const discount = new Prisma.Decimal(input.discount);
    if (discount.gt(subtotal)) throw new Error('Desconto não pode ser maior que o subtotal');
    const total = subtotal.sub(discount);

    for (const item of input.items) {
      const updated = await tx.product.updateMany({
        where: {
          id: item.productId,
          status: 'ACTIVE',
          stock: { gte: item.quantity },
        },
        data: { stock: { decrement: item.quantity } },
      });
      if (updated.count !== 1) throw new Error('Estoque insuficiente');
    }

    const sale = await tx.sale.create({
      data: {
        customerId: input.customerId,
        userId,
        status: 'COMPLETED',
        paymentMethod: input.paymentMethod,
        discount,
        subtotal,
        total,
        items: { create: items },
        payment: {
          create: {
            amount: total,
            dueDate: new Date(),
            status: 'PAID',
            paidAt: new Date(),
          },
        },
      },
      include: { items: true, payment: true },
    });

    for (const item of input.items) {
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: 'SALE',
          quantity: -item.quantity,
          reason: `Venda ${sale.id}`,
        },
      });
    }

    return sale;
  });
}
