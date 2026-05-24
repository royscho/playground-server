import { ResultSetHeader } from 'mysql2';
import { PoolConnection } from 'mysql2/promise';
import { query } from '../../infra/db/mysql';
import {
  Order,
  OrderItem,
  OrderWithItems,
  OrderRow,
  OrderItemRow,
  OrderQuery,
} from './schemas';

function rowToOrder(row: OrderRow): Order {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    total: parseFloat(row.total),
    createdAt: row.created_at,
  };
}

function rowToItem(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    quantity: row.quantity,
    unitPrice: parseFloat(row.unit_price),
  };
}

export async function createOrder(
  conn: PoolConnection,
  data: {
    userId: number;
    total: number;
    items: Array<{ productId: string; quantity: number; unitPrice: number }>;
  },
): Promise<OrderWithItems> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [orderResult] = await (conn as any).execute(
    'INSERT INTO orders (user_id, status, total) VALUES (?, ?, ?)',
    [data.userId, 'pending', data.total],
  );
  const orderId = orderResult.insertId;

  for (const item of data.items) {
    await conn.execute(
      'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
      [orderId, item.productId, item.quantity, item.unitPrice],
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [orderRows] = await (conn as any).execute(
    'SELECT * FROM orders WHERE id = ?',
    [orderId],
  ) as [OrderRow[], unknown];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [itemRows] = await (conn as any).execute(
    'SELECT * FROM order_items WHERE order_id = ?',
    [orderId],
  ) as [OrderItemRow[], unknown];

  return {
    ...rowToOrder(orderRows[0]),
    items: itemRows.map(rowToItem),
  };
}

export async function findByUserId(
  userId: number,
  filter: OrderQuery,
): Promise<{ orders: Order[]; total: number }> {
  const offset = (filter.page - 1) * filter.limit;
  const rows = await query<OrderRow>(
    `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ${filter.limit} OFFSET ${offset}`,
    [userId],
  );
  const countRows = await query<{ total: number }>(
    'SELECT COUNT(*) as total FROM orders WHERE user_id = ?',
    [userId],
  );
  return { orders: rows.map(rowToOrder), total: Number(countRows[0].total) };
}

export async function findById(
  id: number,
  userId: number,
): Promise<OrderWithItems | null> {
  const rows = await query<OrderRow>(
    'SELECT * FROM orders WHERE id = ? AND user_id = ? LIMIT 1',
    [id, userId],
  );
  if (!rows[0]) return null;

  const items = await query<OrderItemRow>(
    'SELECT * FROM order_items WHERE order_id = ?',
    [id],
  );
  return { ...rowToOrder(rows[0]), items: items.map(rowToItem) };
}
