import request from 'supertest';
import app from '../../../app';
import { connectMySQL, closeMySQL, query } from '../../../infra/db/mysql';
import { connectMongo, closeMongo } from '../../../infra/db/mongo';

beforeAll(async () => {
  await connectMySQL();
  await connectMongo();
});

afterAll(async () => {
  await closeMySQL();
  await closeMongo();
});

beforeEach(async () => {
  await query('SET FOREIGN_KEY_CHECKS = 0');
  await query('TRUNCATE TABLE order_items');
  await query('TRUNCATE TABLE orders');
  await query('DELETE FROM users WHERE is_admin = FALSE');
  await query('SET FOREIGN_KEY_CHECKS = 1');
});

describe('POST /api/auth/register', () => {
  it('creates user and returns token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'new@example.com',
      password: 'password123',
      name: 'New User',
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('new@example.com');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('returns 409 on duplicate email', async () => {
    await request(app).post('/api/auth/register').send({
      email: 'dup@example.com',
      password: 'password123',
      name: 'User',
    });
    const res = await request(app).post('/api/auth/register').send({
      email: 'dup@example.com',
      password: 'password123',
      name: 'User',
    });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  it('returns token with valid credentials', async () => {
    await request(app).post('/api/auth/register').send({
      email: 'login@example.com',
      password: 'password123',
      name: 'Login User',
    });
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@example.com',
      password: 'password123',
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('returns 401 with wrong password', async () => {
    await request(app).post('/api/auth/register').send({
      email: 'login2@example.com',
      password: 'password123',
      name: 'User',
    });
    const res = await request(app).post('/api/auth/login').send({
      email: 'login2@example.com',
      password: 'wrongpass',
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/users/me', () => {
  it('returns profile with valid token', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      email: 'me@example.com',
      password: 'password123',
      name: 'Me User',
    });
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${reg.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('me@example.com');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });
});
