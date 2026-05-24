import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

export interface User {
  id: number;
  email: string;
  name: string;
  isAdmin: boolean;
  createdAt: Date;
}

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  is_admin: number;
  created_at: Date;
}
