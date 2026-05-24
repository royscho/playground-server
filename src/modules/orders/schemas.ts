import { z } from 'zod';

export const CreateOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().length(24),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1),
});

export const OrderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type OrderQuery = z.infer<typeof OrderQuerySchema>;

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  id: number;
  userId: number;
  status: OrderStatus;
  total: number;
  createdAt: Date;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export interface OrderRow {
  id: number;
  user_id: number;
  status: OrderStatus;
  total: string;
  created_at: Date;
}

export interface OrderItemRow {
  id: number;
  order_id: number;
  product_id: string;
  quantity: number;
  unit_price: string;
}

export interface OrderNotificationMessage {
  orderId: number;
  userId: number;
  email: string;
  total: number;
  items: Array<{ productId: string; quantity: number; unitPrice: number }>;
}
