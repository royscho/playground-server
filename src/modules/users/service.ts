import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { findByEmail, findById, createUser } from './repository';
import { RegisterInput, LoginInput, User } from './schemas';
import { AppError } from '../../infra/middleware/errorHandler';
import { getConfig } from '../../infra/config';

function signToken(user: User): string {
  return jwt.sign(
    { id: user.id, email: user.email, isAdmin: user.isAdmin },
    getConfig().jwt.secret,
    { expiresIn: getConfig().jwt.expiresIn as jwt.SignOptions['expiresIn'] },
  );
}

export async function register(
  data: RegisterInput,
): Promise<{ token: string; user: User }> {
  const existing = await findByEmail(data.email);
  if (existing) throw new AppError('Email already in use', 409, 'EMAIL_CONFLICT');

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await createUser({ email: data.email, passwordHash, name: data.name });
  return { token: signToken(user), user };
}

export async function login(
  data: LoginInput,
): Promise<{ token: string; user: User }> {
  const userWithHash = await findByEmail(data.email);
  if (!userWithHash) throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');

  const valid = await bcrypt.compare(data.password, userWithHash.passwordHash);
  if (!valid) throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');

  const { passwordHash: _hash, ...user } = userWithHash;
  return { token: signToken(user), user };
}

export async function getProfile(userId: number): Promise<User> {
  const user = await findById(userId);
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
  return user;
}
