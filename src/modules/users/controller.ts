import { Request, Response, NextFunction } from 'express';
import { RegisterSchema, LoginSchema } from './schemas';
import { register, login, getProfile } from './service';

export async function registerHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = RegisterSchema.parse(req.body);
    const result = await register(data);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = LoginSchema.parse(req.body);
    const result = await login(data);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getMeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await getProfile(req.user!.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
}
