import request from 'supertest';
import { mockClient } from 'aws-sdk-client-mock';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import app from '../../../app';
import { connectMySQL, closeMySQL, query } from '../../../infra/db/mysql';
import { connectMongo, closeMongo } from '../../../infra/db/mongo';
import { ProductModel } from '../../products/schemas';

const sqsMock = mockClient(SQSClient);

let userToken: string;
let productId: string;

beforeAll(async () => {
  await connectMySQL();
  await connectMongo();
  sqsMock.on(SendMessageCommand).resolves({});
});

afterAll(async () => {
  sqsMock.reset();
  await closeMySQL();
  await closeMongo();
});

beforeEach(async () => {
  await query('SET FOREIGN_KEY_CHECKS = 0');
  await query('TRUNCATE TABLE order_items');
  await query('TRUNCATE TABLE orders');
  await query('DELETE FROM users WHERE is_admin = FALSE');
  await query('SET FOREIGN_KEY_CHECKS = 1');
  await ProductModel.deleteMany({});

  const reg = await request(app).post('/api/auth/register').send({
    email: 'buyer@example.com',
    password: 'password123',
    name: 'Buyer',
  });
  userToken = reg.body.token;

  const product = await ProductModel.create({
    name: 'Test Widget',
    price: 25.0,
    category: 'tools',
    stock: 10,
  });
  productId = product._id.toString();
});

describe('POST /api/orders', () => {
  it('creates order and returns with items', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ items: [{ productId, quantity: 2 }] });
    expect(res.status).toBe(201);
    expect(res.body.total).toBe(50);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.status).toBe('pending');
  });

  it('returns 404 for unknown product', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ items: [{ productId: '507f1f77bcf86cd799439011', quantity: 1 }] });
    expect(res.status).toBe(404);
  });

  it('returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ items: [{ productId, quantity: 1 }] });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/orders', () => {
  it('returns user order history', async () => {
    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ items: [{ productId, quantity: 1 }] });

    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });
});

describe('GET /api/orders/:id', () => {
  it('returns order detail with items', async () => {
    const created = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ items: [{ productId, quantity: 1 }] });

    const res = await request(app)
      .get(`/api/orders/${created.body.id}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });
});
