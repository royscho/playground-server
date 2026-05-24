jest.mock('../repository');
jest.mock('../../../infra/db/mysql');
jest.mock('../../../infra/aws/sqs');
jest.mock('../../products/repository');

import * as ordersRepo from '../repository';
import * as productsRepo from '../../products/repository';
import { withTransaction } from '../../../infra/db/mysql';
import { sendMessage } from '../../../infra/aws/sqs';
import { createOrder, listOrders, getOrder } from '../service';
import { AppError } from '../../../infra/middleware/errorHandler';

const mockProduct = {
  _id: '507f1f77bcf86cd799439011',
  name: 'Widget',
  price: 9.99,
  stock: 5,
  isDeleted: false,
};

const mockOrder = {
  id: 1,
  userId: 1,
  status: 'pending' as const,
  total: 9.99,
  createdAt: new Date(),
  items: [
    {
      id: 1,
      orderId: 1,
      productId: '507f1f77bcf86cd799439011',
      quantity: 1,
      unitPrice: 9.99,
    },
  ],
};

describe('createOrder', () => {
  it('creates order with transaction and publishes to SQS', async () => {
    (productsRepo.findById as jest.Mock).mockResolvedValue(mockProduct);
    (withTransaction as jest.Mock).mockImplementation(
      (fn: (conn: unknown) => Promise<unknown>) => fn({}),
    );
    (ordersRepo.createOrder as jest.Mock).mockResolvedValue(mockOrder);
    (sendMessage as jest.Mock).mockResolvedValue(undefined);

    const result = await createOrder(1, 'user@example.com', {
      items: [{ productId: '507f1f77bcf86cd799439011', quantity: 1 }],
    });

    expect(result).toEqual(mockOrder);
    expect(sendMessage).toHaveBeenCalled();
  });

  it('throws 404 if product not found', async () => {
    (productsRepo.findById as jest.Mock).mockResolvedValue(null);
    await expect(
      createOrder(1, 'user@example.com', {
        items: [{ productId: '507f1f77bcf86cd799439011', quantity: 1 }],
      }),
    ).rejects.toThrow(AppError);
  });

  it('throws 400 if product out of stock', async () => {
    (productsRepo.findById as jest.Mock).mockResolvedValue({ ...mockProduct, stock: 0 });
    await expect(
      createOrder(1, 'user@example.com', {
        items: [{ productId: '507f1f77bcf86cd799439011', quantity: 1 }],
      }),
    ).rejects.toThrow(AppError);
  });
});

describe('getOrder', () => {
  it('returns order when found', async () => {
    (ordersRepo.findById as jest.Mock).mockResolvedValue(mockOrder);
    const result = await getOrder(1, 1);
    expect(result).toEqual(mockOrder);
  });

  it('throws 404 when order not found', async () => {
    (ordersRepo.findById as jest.Mock).mockResolvedValue(null);
    await expect(getOrder(999, 1)).rejects.toThrow(AppError);
  });
});

describe('listOrders', () => {
  it('returns orders with pagination', async () => {
    (ordersRepo.findByUserId as jest.Mock).mockResolvedValue({
      orders: [mockOrder],
      total: 1,
    });
    const result = await listOrders(1, { page: 1, limit: 20 });
    expect(result.orders).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});
