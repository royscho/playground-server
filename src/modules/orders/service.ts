import { withTransaction } from '../../infra/db/mysql';
import { sendMessage } from '../../infra/aws/sqs';
import { findById as findProduct } from '../products/repository';
import * as repo from './repository';
import {
  CreateOrderInput,
  OrderQuery,
  Order,
  OrderWithItems,
  OrderNotificationMessage,
} from './schemas';
import { AppError } from '../../infra/middleware/errorHandler';
import { getConfig } from '../../infra/config';
import { logger } from '../../infra/middleware/logger';

export async function createOrder(
  userId: number,
  userEmail: string,
  input: CreateOrderInput,
): Promise<OrderWithItems> {
  const resolvedItems: Array<{ productId: string; quantity: number; unitPrice: number }> =
    [];
  let total = 0;

  for (const item of input.items) {
    const product = await findProduct(item.productId);
    if (!product) throw new AppError(`Product ${item.productId} not found`, 404, 'NOT_FOUND');
    if (product.stock < item.quantity)
      throw new AppError(`Product ${item.productId} out of stock`, 400, 'OUT_OF_STOCK');
    resolvedItems.push({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: product.price,
    });
    total += product.price * item.quantity;
  }

  const order = await withTransaction((conn) =>
    repo.createOrder(conn, {
      userId,
      total: Math.round(total * 100) / 100,
      items: resolvedItems,
    }),
  );

  const message: OrderNotificationMessage = {
    orderId: order.id,
    userId,
    email: userEmail,
    total: order.total,
    items: resolvedItems,
  };

  try {
    await sendMessage(getConfig().aws.sqsQueueUrl, message);
  } catch (err) {
    logger.error(err, 'Failed to publish order notification to SQS');
  }

  return order;
}

export async function listOrders(
  userId: number,
  query: OrderQuery,
): Promise<{ orders: Order[]; total: number; page: number; limit: number }> {
  const { orders, total } = await repo.findByUserId(userId, query);
  return { orders, total, page: query.page, limit: query.limit };
}

export async function getOrder(id: number, userId: number): Promise<OrderWithItems> {
  const order = await repo.findById(id, userId);
  if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND');
  return order;
}
