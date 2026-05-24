import { Request, Response, NextFunction } from 'express';
import { CreateOrderSchema, OrderQuerySchema } from './schemas';
import { createOrder, listOrders, getOrder } from './service';

export async function createHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = CreateOrderSchema.parse(req.body);
    const order = await createOrder(req.user!.id, req.user!.email, data);
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
}

export async function listHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = OrderQuerySchema.parse(req.query);
    const result = await listOrders(req.user!.id, query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const order = await getOrder(parseInt(req.params.id, 10), req.user!.id);
    res.json(order);
  } catch (err) {
    next(err);
  }
}
