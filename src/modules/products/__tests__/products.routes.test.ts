import request from 'supertest';
import app from '../../../app';
import { connectMySQL, closeMySQL, query } from '../../../infra/db/mysql';
import { connectMongo, closeMongo } from '../../../infra/db/mongo';
import { ProductModel } from '../schemas';

let adminToken: string;

beforeAll(async () => {
  await connectMySQL();
  await connectMongo();
  const res = await request(app).post('/api/auth/login').send({
    email: 'admin@example.com',
    password: 'admin123',
  });
  adminToken = res.body.token;
});

afterAll(async () => {
  await closeMySQL();
  await closeMongo();
});

beforeEach(async () => {
  await ProductModel.deleteMany({});
  await query('SET FOREIGN_KEY_CHECKS = 0');
  await query('DELETE FROM users WHERE is_admin = FALSE');
  await query('SET FOREIGN_KEY_CHECKS = 1');
});

describe('GET /api/products', () => {
  it('returns paginated products', async () => {
    await ProductModel.create({ name: 'Widget', price: 9.99, category: 'tools', stock: 5 });
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });
});

describe('POST /api/products', () => {
  it('creates product with admin token', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Gadget', price: 19.99, category: 'gadgets', stock: 3 });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Gadget');
  });

  it('returns 403 without admin token', async () => {
    const userRes = await request(app).post('/api/auth/register').send({
      email: 'user@example.com',
      password: 'password123',
      name: 'User',
    });
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${userRes.body.token}`)
      .send({ name: 'Gadget', price: 19.99, category: 'gadgets' });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/products/:id', () => {
  it('soft deletes product', async () => {
    const product = await ProductModel.create({
      name: 'ToDelete',
      price: 1,
      category: 'test',
      stock: 0,
    });
    const res = await request(app)
      .delete(`/api/products/${product._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
    const found = await request(app).get(`/api/products/${product._id}`);
    expect(found.status).toBe(404);
  });
});
