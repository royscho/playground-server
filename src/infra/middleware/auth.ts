import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getConfig } from '../config';

interface JwtPayload {
  id: number;
  email: string;
  isAdmin: boolean;
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: { message: 'Missing token', code: 'UNAUTHORIZED' } });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, getConfig().jwt.secret) as JwtPayload;
    req.user = { id: payload.id, email: payload.email, isAdmin: payload.isAdmin };
    next();
  } catch {
    res.status(401).json({ error: { message: 'Invalid token', code: 'UNAUTHORIZED' } });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user?.isAdmin) {
    res.status(403).json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } });
    return;
  }
  next();
}
