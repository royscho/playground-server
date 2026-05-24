jest.mock('../repository');
jest.mock('bcrypt');

import bcrypt from 'bcrypt';
import * as repo from '../repository';
import { register, login, getProfile } from '../service';
import { AppError } from '../../../infra/middleware/errorHandler';

const mockUser = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  isAdmin: false,
  createdAt: new Date(),
  passwordHash: '$2b$12$hash',
};

describe('register', () => {
  it('hashes password and creates user', async () => {
    (repo.findByEmail as jest.Mock).mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    (repo.createUser as jest.Mock).mockResolvedValue(mockUser);

    const result = await register({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    });

    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
    expect(result.token).toBeDefined();
    expect(result.user.email).toBe('test@example.com');
  });

  it('throws 409 if email already exists', async () => {
    (repo.findByEmail as jest.Mock).mockResolvedValue(mockUser);
    await expect(
      register({ email: 'test@example.com', password: 'password123', name: 'Test' }),
    ).rejects.toThrow(AppError);
  });
});

describe('login', () => {
  it('returns token on valid credentials', async () => {
    (repo.findByEmail as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await login({ email: 'test@example.com', password: 'password123' });
    expect(result.token).toBeDefined();
  });

  it('throws 401 on wrong password', async () => {
    (repo.findByEmail as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    await expect(
      login({ email: 'test@example.com', password: 'wrong' }),
    ).rejects.toThrow(AppError);
  });

  it('throws 401 if user not found', async () => {
    (repo.findByEmail as jest.Mock).mockResolvedValue(null);
    await expect(
      login({ email: 'notfound@example.com', password: 'pass' }),
    ).rejects.toThrow(AppError);
  });
});

describe('getProfile', () => {
  it('returns user when found', async () => {
    (repo.findById as jest.Mock).mockResolvedValue(mockUser);
    const result = await getProfile(1);
    expect(result).toEqual(mockUser);
  });

  it('throws 404 when not found', async () => {
    (repo.findById as jest.Mock).mockResolvedValue(null);
    await expect(getProfile(999)).rejects.toThrow(AppError);
  });
});
