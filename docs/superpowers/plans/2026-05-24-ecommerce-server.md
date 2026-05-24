# E-Commerce Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-pattern Node.js/TypeScript e-commerce REST API demonstrating senior backend skills: MySQL, MongoDB, JWT auth, AWS (S3/SQS/SNS/SES/Secrets Manager), unit + integration tests, transactions, graceful shutdown.

**Architecture:** Modular monolith — each feature module (users, products, orders, notifications) owns its full vertical slice (routes → controller → service → repository). Shared infrastructure in `src/infra/`. No cross-module imports except through well-defined interfaces.

**Tech Stack:** Node.js 20, TypeScript strict, Express.js, mysql2, Mongoose, @aws-sdk v3, jsonwebtoken, bcrypt, Zod, pino, multer, Jest, Supertest, ts-jest, aws-sdk-client-mock, ts-node-dev

---

## File Map

```
src/
  types/express.d.ts
  infra/
    config.ts
    db/
      mysql.ts
      mongo.ts
      migrations/
        001_create_users.sql
        002_create_orders.sql
        003_create_order_items.sql
    middleware/
      errorHandler.ts
      logger.ts
      auth.ts
    aws/
      s3.ts  sqs.ts  sns.ts  ses.ts  secrets.ts
  modules/
    users/
      schemas.ts  repository.ts  service.ts  controller.ts  routes.ts
      __tests__/users.service.test.ts  users.routes.test.ts
    products/
      schemas.ts  repository.ts  service.ts  controller.ts  routes.ts
      __tests__/products.service.test.ts  products.routes.test.ts
    orders/
      schemas.ts  repository.ts  service.ts  controller.ts  routes.ts
      __tests__/orders.service.test.ts  orders.routes.test.ts
    notifications/
      service.ts  consumer.ts
      __tests__/notifications.service.test.ts
  app.ts
  server.ts
scripts/migrate.ts
docker-compose.yml
.env.example
package.json  tsconfig.json  jest.config.ts  jest.integration.config.ts
```

---

## Task 1: Project Scaffold

**Files:** `package.json`, `tsconfig.json`, `jest.config.ts`, `jest.integration.config.ts`, `docker-compose.yml`, `.env.example`, `.gitignore`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "playground-server",
  "version": "1.0.0",
  "description": "Senior backend playground: Node.js, TypeScript, MySQL, MongoDB, AWS",
  "main": "dist/server.js",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "migrate": "ts-node scripts/migrate.ts",
    "test": "jest --config jest.config.ts",
    "test:int": "jest --config jest.integration.config.ts --runInBand",
    "test:coverage": "jest --config jest.config.ts --coverage"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.600.0",
    "@aws-sdk/client-secrets-manager": "^3.600.0",
    "@aws-sdk/client-ses": "^3.600.0",
    "@aws-sdk/client-sns": "^3.600.0",
    "@aws-sdk/client-sqs": "^3.600.0",
    "@aws-sdk/s3-request-presigner": "^3.600.0",
    "bcrypt": "^5.1.1",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.4.0",
    "multer": "^1.4.5-lts.1",
    "mysql2": "^3.9.7",
    "pino": "^9.2.0",
    "pino-pretty": "^11.2.0",
    "uuid": "^10.0.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@aws-sdk/client-sqs": "^3.600.0",
    "@types/bcrypt": "^5.0.2",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/multer": "^1.4.11",
    "@types/node": "^20.14.0",
    "@types/supertest": "^6.0.2",
    "@types/uuid": "^10.0.0",
    "aws-sdk-client-mock": "^4.0.1",
    "jest": "^29.7.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.1.4",
    "ts-node": "^10.9.2",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.4.5"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/__tests__/**"]
}
```

- [ ] **Step 3: Create jest.config.ts** (unit tests only — no Docker needed)

```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.service.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFiles: ['<rootDir>/src/test-utils/env.ts'],
};

export default config;
```

- [ ] **Step 4: Create jest.integration.config.ts**

```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.routes.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFiles: ['<rootDir>/src/test-utils/env.ts'],
  globalSetup: '<rootDir>/src/test-utils/globalSetup.ts',
  globalTeardown: '<rootDir>/src/test-utils/globalTeardown.ts',
  testTimeout: 30000,
};

export default config;
```

- [ ] **Step 5: Create docker-compose.yml**

```yaml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    ports:
      - '3306:3306'
    environment:
      MYSQL_ROOT_PASSWORD: secret
      MYSQL_DATABASE: playground
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ['CMD', 'mysqladmin', 'ping', '-h', 'localhost', '-psecret']
      interval: 5s
      timeout: 5s
      retries: 10

  mongo:
    image: mongo:7.0
    ports:
      - '27017:27017'
    volumes:
      - mongo_data:/data/db

volumes:
  mysql_data:
  mongo_data:
```

- [ ] **Step 6: Create .env.example**

```
NODE_ENV=development
PORT=3000

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=secret
MYSQL_DATABASE=playground

MONGO_URI=mongodb://localhost:27017/playground

JWT_SECRET=dev-secret-change-in-prod
JWT_EXPIRES_IN=7d

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=dev-key
AWS_SECRET_ACCESS_KEY=dev-secret
S3_BUCKET=playground-products
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/000000000000/orders
SNS_TOPIC_ARN=arn:aws:sns:us-east-1:000000000000:order-notifications
SES_FROM_EMAIL=noreply@example.com
```

- [ ] **Step 7: Create .env** (copy from .env.example — git-ignored)

```bash
cp .env.example .env
```

- [ ] **Step 8: Create .gitignore**

```
node_modules/
dist/
.env
*.js.map
coverage/
```

- [ ] **Step 9: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 10: Commit**

```bash
git add package.json tsconfig.json jest.config.ts jest.integration.config.ts docker-compose.yml .env.example .gitignore
git commit -m "chore: project scaffold — TypeScript, Jest, Docker Compose"
```

---

## Task 2: Types + AppError + Error Handler

**Files:**
- Create: `src/types/express.d.ts`
- Create: `src/infra/middleware/errorHandler.ts`
- Create: `src/infra/__tests__/errorHandler.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/infra/__tests__/errorHandler.test.ts
import { AppError } from '../middleware/errorHandler';

describe('AppError', () => {
  it('sets message, statusCode, code', () => {
    const err = new AppError('Not found', 404, 'NOT_FOUND');
    expect(err.message).toBe('Not found');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err).toBeInstanceOf(Error);
  });

  it('defaults code to undefined', () => {
    const err = new AppError('Bad request', 400);
    expect(err.code).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- --testPathPattern=errorHandler
```

Expected: `Cannot find module '../middleware/errorHandler'`

- [ ] **Step 3: Create src/types/express.d.ts**

```typescript
declare namespace Express {
  interface Request {
    user?: {
      id: number;
      email: string;
      isAdmin: boolean;
    };
  }
}
```

- [ ] **Step 4: Create src/infra/middleware/errorHandler.ts**

```typescript
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { message: err.message, code: err.code },
    });
    return;
  }

  const isProd = process.env.NODE_ENV === 'production';
  res.status(500).json({
    error: {
      message: isProd ? 'Internal server error' : err.message,
      code: 'INTERNAL_ERROR',
    },
  });
}
```

- [ ] **Step 5: Run test — expect PASS**

```bash
npm test -- --testPathPattern=errorHandler
```

Expected: `PASS  src/infra/__tests__/errorHandler.test.ts`

- [ ] **Step 6: Commit**

```bash
git add src/types/express.d.ts src/infra/middleware/errorHandler.ts src/infra/__tests__/errorHandler.test.ts
git commit -m "feat: AppError class and global error handler middleware"
```

---

## Task 3: Config Module

**Files:**
- Create: `src/infra/config.ts`
- Create: `src/test-utils/env.ts`

- [ ] **Step 1: Create src/infra/config.ts**

```typescript
export interface Config {
  nodeEnv: string;
  port: number;
  mysql: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
  mongoUri: string;
  jwt: {
    secret: string;
    expiresIn: string;
  };
  aws: {
    region: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    s3Bucket: string;
    sqsQueueUrl: string;
    snsTopicArn: string;
    sesFromEmail: string;
  };
}

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export function getConfig(): Config {
  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
    mysql: {
      host: requireEnv('MYSQL_HOST'),
      port: parseInt(process.env.MYSQL_PORT ?? '3306', 10),
      user: requireEnv('MYSQL_USER'),
      password: requireEnv('MYSQL_PASSWORD'),
      database: requireEnv('MYSQL_DATABASE'),
    },
    mongoUri: requireEnv('MONGO_URI'),
    jwt: {
      secret: requireEnv('JWT_SECRET'),
      expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    },
    aws: {
      region: process.env.AWS_REGION ?? 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      s3Bucket: requireEnv('S3_BUCKET'),
      sqsQueueUrl: requireEnv('SQS_QUEUE_URL'),
      snsTopicArn: requireEnv('SNS_TOPIC_ARN'),
      sesFromEmail: requireEnv('SES_FROM_EMAIL'),
    },
  };
}
```

- [ ] **Step 2: Create src/test-utils/env.ts** (loaded before every test suite)

```typescript
process.env.NODE_ENV = 'test';
process.env.MYSQL_HOST = 'localhost';
process.env.MYSQL_PORT = '3306';
process.env.MYSQL_USER = 'root';
process.env.MYSQL_PASSWORD = 'secret';
process.env.MYSQL_DATABASE = 'playground_test';
process.env.MONGO_URI = 'mongodb://localhost:27017/playground_test';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = 'test-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
process.env.S3_BUCKET = 'test-bucket';
process.env.SQS_QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/000000000000/test-orders';
process.env.SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:000000000000:test-notifications';
process.env.SES_FROM_EMAIL = 'test@example.com';
```

- [ ] **Step 3: Commit**

```bash
git add src/infra/config.ts src/test-utils/env.ts
git commit -m "feat: config module with typed env loading"
```

---

## Task 4: Logger

**Files:** Create `src/infra/middleware/logger.ts`

- [ ] **Step 1: Create src/infra/middleware/logger.ts**

```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});
```

- [ ] **Step 2: Commit**

```bash
git add src/infra/middleware/logger.ts
git commit -m "feat: pino structured logger"
```

---

## Task 5: MySQL Connection + withTransaction

**Files:**
- Create: `src/infra/db/mysql.ts`
- Create: `src/infra/__tests__/mysql.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/infra/__tests__/mysql.test.ts
jest.mock('mysql2/promise', () => ({
  createPool: jest.fn(() => ({
    execute: jest.fn(),
    getConnection: jest.fn(),
    end: jest.fn(),
  })),
}));

import { getPool, query, withTransaction } from '../db/mysql';
import mysql from 'mysql2/promise';

const mockPool = {
  execute: jest.fn(),
  getConnection: jest.fn(),
  end: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (mysql.createPool as jest.Mock).mockReturnValue(mockPool);
});

describe('query', () => {
  it('executes sql with params and returns rows', async () => {
    const rows = [{ id: 1 }];
    mockPool.execute.mockResolvedValue([rows, []]);
    const result = await query<{ id: number }>('SELECT * FROM users WHERE id = ?', [1]);
    expect(result).toEqual(rows);
    expect(mockPool.execute).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ?', [1]);
  });
});

describe('withTransaction', () => {
  it('commits on success and returns result', async () => {
    const mockConn = {
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      release: jest.fn(),
    };
    mockPool.getConnection.mockResolvedValue(mockConn);
    const result = await withTransaction(async () => 'done');
    expect(mockConn.beginTransaction).toHaveBeenCalled();
    expect(mockConn.commit).toHaveBeenCalled();
    expect(mockConn.rollback).not.toHaveBeenCalled();
    expect(result).toBe('done');
  });

  it('rolls back on error and rethrows', async () => {
    const mockConn = {
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      release: jest.fn(),
    };
    mockPool.getConnection.mockResolvedValue(mockConn);
    await expect(
      withTransaction(async () => { throw new Error('fail'); }),
    ).rejects.toThrow('fail');
    expect(mockConn.rollback).toHaveBeenCalled();
    expect(mockConn.commit).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- --testPathPattern=mysql
```

Expected: `Cannot find module '../db/mysql'`

- [ ] **Step 3: Create src/infra/db/mysql.ts**

```typescript
import mysql, { Pool, PoolConnection } from 'mysql2/promise';
import { getConfig } from '../config';

let pool: Pool;

export function getPool(): Pool {
  if (!pool) {
    const cfg = getConfig();
    pool = mysql.createPool({
      host: cfg.mysql.host,
      port: cfg.mysql.port,
      user: cfg.mysql.user,
      password: cfg.mysql.password,
      database: cfg.mysql.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
}

export async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
  const [rows] = await getPool().execute(sql, params);
  return rows as T[];
}

export async function withTransaction<T>(
  fn: (conn: PoolConnection) => Promise<T>,
): Promise<T> {
  const conn = await getPool().getConnection();
  await conn.beginTransaction();
  try {
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function connectMySQL(): Promise<void> {
  const conn = await getPool().getConnection();
  conn.release();
}

export async function closeMySQL(): Promise<void> {
  if (pool) await pool.end();
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- --testPathPattern=mysql
```

Expected: `PASS  src/infra/__tests__/mysql.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/infra/db/mysql.ts src/infra/__tests__/mysql.test.ts
git commit -m "feat: MySQL connection pool and withTransaction helper"
```

---

## Task 6: MongoDB Connection

**Files:** Create `src/infra/db/mongo.ts`

- [ ] **Step 1: Create src/infra/db/mongo.ts**

```typescript
import mongoose from 'mongoose';
import { getConfig } from '../config';
import { logger } from '../middleware/logger';

export async function connectMongo(): Promise<void> {
  const { mongoUri } = getConfig();
  await mongoose.connect(mongoUri);
  logger.info('MongoDB connected');
}

export async function closeMongo(): Promise<void> {
  await mongoose.disconnect();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/infra/db/mongo.ts
git commit -m "feat: MongoDB connection via Mongoose"
```

---

## Task 7: Auth Middleware

**Files:**
- Create: `src/infra/middleware/auth.ts`
- Create: `src/infra/__tests__/auth.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/infra/__tests__/auth.test.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate } from '../middleware/auth';

const mockReq = (token?: string) =>
  ({
    headers: token ? { authorization: `Bearer ${token}` } : {},
  }) as unknown as Request;

const mockRes = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const next: NextFunction = jest.fn();

describe('authenticate', () => {
  const secret = 'test-secret'; // matches env.ts

  it('calls next() with valid token and sets req.user', () => {
    const token = jwt.sign({ id: 1, email: 'a@b.com', isAdmin: false }, secret);
    const req = mockReq(token);
    authenticate(req, mockRes(), next);
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({ id: 1, email: 'a@b.com', isAdmin: false });
  });

  it('returns 401 with no token', () => {
    const req = mockReq();
    const res = mockRes();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 with invalid token', () => {
    const req = mockReq('bad.token.here');
    const res = mockRes();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- --testPathPattern=auth
```

- [ ] **Step 3: Create src/infra/middleware/auth.ts**

```typescript
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
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- --testPathPattern=auth
```

- [ ] **Step 5: Commit**

```bash
git add src/infra/middleware/auth.ts src/infra/__tests__/auth.test.ts
git commit -m "feat: JWT authenticate middleware and requireAdmin guard"
```

---

## Task 8: AWS Clients

**Files:** Create `src/infra/aws/s3.ts`, `sqs.ts`, `sns.ts`, `ses.ts`, `secrets.ts`

- [ ] **Step 1: Create src/infra/aws/s3.ts**

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getConfig } from '../config';

let client: S3Client;

export function getS3Client(): S3Client {
  if (!client) {
    const cfg = getConfig();
    client = new S3Client({ region: cfg.aws.region });
  }
  return client;
}

export async function uploadFile(
  key: string,
  buffer: Buffer,
  mimeType: string,
): Promise<void> {
  const cfg = getConfig();
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: cfg.aws.s3Bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }),
  );
}

export async function getPresignedUrl(key: string): Promise<string> {
  const cfg = getConfig();
  const command = new GetObjectCommand({ Bucket: cfg.aws.s3Bucket, Key: key });
  return getSignedUrl(getS3Client(), command, { expiresIn: 3600 });
}
```

- [ ] **Step 2: Create src/infra/aws/sqs.ts**

```typescript
import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  Message,
} from '@aws-sdk/client-sqs';
import { getConfig } from '../config';

let client: SQSClient;

export function getSQSClient(): SQSClient {
  if (!client) {
    const cfg = getConfig();
    client = new SQSClient({ region: cfg.aws.region });
  }
  return client;
}

export async function sendMessage(queueUrl: string, body: object): Promise<void> {
  await getSQSClient().send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(body),
    }),
  );
}

export async function receiveMessages(queueUrl: string): Promise<Message[]> {
  const result = await getSQSClient().send(
    new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 20,
    }),
  );
  return result.Messages ?? [];
}

export async function deleteMessage(
  queueUrl: string,
  receiptHandle: string,
): Promise<void> {
  await getSQSClient().send(
    new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: receiptHandle }),
  );
}
```

- [ ] **Step 3: Create src/infra/aws/sns.ts**

```typescript
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { getConfig } from '../config';

let client: SNSClient;

export function getSNSClient(): SNSClient {
  if (!client) {
    const cfg = getConfig();
    client = new SNSClient({ region: cfg.aws.region });
  }
  return client;
}

export async function publish(topicArn: string, message: object): Promise<void> {
  await getSNSClient().send(
    new PublishCommand({
      TopicArn: topicArn,
      Message: JSON.stringify(message),
    }),
  );
}
```

- [ ] **Step 4: Create src/infra/aws/ses.ts**

```typescript
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { getConfig } from '../config';

let client: SESClient;

export function getSESClient(): SESClient {
  if (!client) {
    const cfg = getConfig();
    client = new SESClient({ region: cfg.aws.region });
  }
  return client;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const cfg = getConfig();
  await getSESClient().send(
    new SendEmailCommand({
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject },
        Body: { Html: { Data: html } },
      },
      Source: cfg.aws.sesFromEmail,
    }),
  );
}
```

- [ ] **Step 5: Create src/infra/aws/secrets.ts**

```typescript
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { getConfig } from '../config';

let client: SecretsManagerClient;

function getClient(): SecretsManagerClient {
  if (!client) {
    const cfg = getConfig();
    client = new SecretsManagerClient({ region: cfg.aws.region });
  }
  return client;
}

export async function getSecret(secretId: string): Promise<string> {
  const result = await getClient().send(
    new GetSecretValueCommand({ SecretId: secretId }),
  );
  if (!result.SecretString) throw new Error(`Secret ${secretId} has no string value`);
  return result.SecretString;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/infra/aws/
git commit -m "feat: AWS SDK v3 clients — S3, SQS, SNS, SES, Secrets Manager"
```

---

## Task 9: Database Migrations

**Files:**
- Create: `src/infra/db/migrations/001_create_users.sql`
- Create: `src/infra/db/migrations/002_create_orders.sql`
- Create: `src/infra/db/migrations/003_create_order_items.sql`
- Create: `scripts/migrate.ts`

- [ ] **Step 1: Create 001_create_users.sql**

```sql
CREATE TABLE IF NOT EXISTS migrations_run (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO users (email, password_hash, name, is_admin)
VALUES ('admin@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO8e', 'Admin', TRUE);
-- password: admin123
```

- [ ] **Step 2: Create 002_create_orders.sql**

```sql
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  status ENUM('pending','confirmed','shipped','delivered','cancelled') DEFAULT 'pending',
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

- [ ] **Step 3: Create 003_create_order_items.sql**

```sql
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id VARCHAR(24) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);
```

- [ ] **Step 4: Create scripts/migrate.ts**

```typescript
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function migrate(): Promise<void> {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST ?? 'localhost',
    port: parseInt(process.env.MYSQL_PORT ?? '3306', 10),
    user: process.env.MYSQL_USER ?? 'root',
    password: process.env.MYSQL_PASSWORD ?? 'secret',
    database: process.env.MYSQL_DATABASE ?? 'playground',
    multipleStatements: true,
  });

  const migrationsDir = path.join(__dirname, '../src/infra/db/migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  for (const file of files) {
    const [existing] = await conn.execute(
      'SELECT id FROM migrations_run WHERE name = ? LIMIT 1',
      [file],
    ).catch(() => [[]] as unknown as [unknown[]]);

    if (Array.isArray(existing) && existing.length > 0) {
      console.log(`  skip: ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    await conn.query(sql);
    await conn.execute('INSERT IGNORE INTO migrations_run (name) VALUES (?)', [file]);
    console.log(`  ran: ${file}`);
  }

  await conn.end();
  console.log('Migrations complete.');
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 5: Add dotenv dep and update package.json scripts**

```bash
npm install dotenv
```

Update `scripts.migrate` in package.json:
```json
"migrate": "ts-node -e \"require('dotenv').config()\" scripts/migrate.ts"
```

- [ ] **Step 6: Commit**

```bash
git add src/infra/db/migrations/ scripts/migrate.ts package.json
git commit -m "feat: SQL migrations — users, orders, order_items tables"
```

---

## Task 10: App + Server + Test Utils

**Files:**
- Create: `src/app.ts`
- Create: `src/server.ts`
- Create: `src/test-utils/globalSetup.ts`
- Create: `src/test-utils/globalTeardown.ts`

- [ ] **Step 1: Create src/app.ts**

```typescript
import express from 'express';
import { errorHandler } from './infra/middleware/errorHandler';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// routes mounted in Task 11-13
// app.use('/api/auth', usersRouter);
// app.use('/api/users', usersRouter);
// app.use('/api/products', productsRouter);
// app.use('/api/orders', ordersRouter);

app.use(errorHandler);

export default app;
```

- [ ] **Step 2: Create src/server.ts**

```typescript
import { connectMySQL, closeMySQL } from './infra/db/mysql';
import { connectMongo, closeMongo } from './infra/db/mongo';
import { logger } from './infra/middleware/logger';
import { getConfig } from './infra/config';
import app from './app';

let isShuttingDown = false;
export { isShuttingDown };

async function start(): Promise<void> {
  await connectMySQL();
  await connectMongo();

  const { port } = getConfig();
  const server = app.listen(port, () => {
    logger.info(`Server running on port ${port}`);
  });

  // SQS consumer started here in Task 15
  // startConsumer();

  function shutdown(signal: string): void {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`${signal} received — shutting down`);

    server.close(async () => {
      // stopConsumer() — added in Task 15
      await closeMySQL();
      await closeMongo();
      logger.info('Shutdown complete');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Shutdown timeout — forcing exit');
      process.exit(1);
    }, 10_000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  logger.error(err, 'Startup failed');
  process.exit(1);
});
```

- [ ] **Step 3: Create src/test-utils/globalSetup.ts** (integration tests only)

```typescript
import { connectMySQL, closeMySQL, query } from '../infra/db/mysql';
import { connectMongo, closeMongo } from '../infra/db/mongo';

export default async function globalSetup(): Promise<void> {
  await connectMySQL();
  await query('SET FOREIGN_KEY_CHECKS = 0');
  await query('TRUNCATE TABLE order_items');
  await query('TRUNCATE TABLE orders');
  await query('TRUNCATE TABLE users');
  await query('SET FOREIGN_KEY_CHECKS = 1');
  await closeMySQL();
  await connectMongo();
  const mongoose = await import('mongoose');
  await mongoose.default.connection.dropDatabase();
  await closeMongo();
}
```

- [ ] **Step 4: Create src/test-utils/globalTeardown.ts**

```typescript
export default async function globalTeardown(): Promise<void> {
  // connections are managed per test file — nothing to do here
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app.ts src/server.ts src/test-utils/
git commit -m "feat: Express app, server with graceful shutdown, test utils"
```

---

## Task 11: Users Module

**Files:**
- Create: `src/modules/users/schemas.ts`
- Create: `src/modules/users/repository.ts`
- Create: `src/modules/users/service.ts`
- Create: `src/modules/users/controller.ts`
- Create: `src/modules/users/routes.ts`
- Create: `src/modules/users/__tests__/users.service.test.ts`
- Create: `src/modules/users/__tests__/users.routes.test.ts`

- [ ] **Step 1: Create src/modules/users/schemas.ts**

```typescript
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
```

- [ ] **Step 2: Create src/modules/users/repository.ts**

```typescript
import { query } from '../../infra/db/mysql';
import { User, UserRow } from './schemas';

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    isAdmin: row.is_admin === 1,
    createdAt: row.created_at,
  };
}

export async function findByEmail(
  email: string,
): Promise<(User & { passwordHash: string }) | null> {
  const rows = await query<UserRow>(
    'SELECT * FROM users WHERE email = ? LIMIT 1',
    [email],
  );
  if (!rows[0]) return null;
  return { ...rowToUser(rows[0]), passwordHash: rows[0].password_hash };
}

export async function findById(id: number): Promise<User | null> {
  const rows = await query<UserRow>('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  return rows[0] ? rowToUser(rows[0]) : null;
}

export async function createUser(data: {
  email: string;
  passwordHash: string;
  name: string;
}): Promise<User> {
  await query(
    'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
    [data.email, data.passwordHash, data.name],
  );
  const user = await findByEmail(data.email);
  if (!user) throw new Error('User creation failed');
  return user;
}
```

- [ ] **Step 3: Write failing unit test**

```typescript
// src/modules/users/__tests__/users.service.test.ts
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
```

- [ ] **Step 4: Run test — expect FAIL**

```bash
npm test -- --testPathPattern=users.service
```

- [ ] **Step 5: Create src/modules/users/service.ts**

```typescript
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

  const { passwordHash: _, ...user } = userWithHash;
  return { token: signToken(user), user };
}

export async function getProfile(userId: number): Promise<User> {
  const user = await findById(userId);
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
  return user;
}
```

- [ ] **Step 6: Run test — expect PASS**

```bash
npm test -- --testPathPattern=users.service
```

- [ ] **Step 7: Create src/modules/users/controller.ts**

```typescript
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
```

- [ ] **Step 8: Create src/modules/users/routes.ts**

```typescript
import { Router } from 'express';
import { authenticate } from '../../infra/middleware/auth';
import { registerHandler, loginHandler, getMeHandler } from './controller';

const router = Router();

router.post('/auth/register', registerHandler);
router.post('/auth/login', loginHandler);
router.get('/users/me', authenticate, getMeHandler);

export default router;
```

- [ ] **Step 9: Mount router in src/app.ts** — update the file:

```typescript
import express from 'express';
import { errorHandler } from './infra/middleware/errorHandler';
import usersRouter from './modules/users/routes';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', usersRouter);

app.use(errorHandler);

export default app;
```

- [ ] **Step 10: Write failing integration test**

```typescript
// src/modules/users/__tests__/users.routes.test.ts
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
```

- [ ] **Step 11: Run integration test — need Docker up first**

```bash
docker-compose up -d
npm run migrate
npm run test:int -- --testPathPattern=users.routes
```

Expected: `PASS  src/modules/users/__tests__/users.routes.test.ts`

- [ ] **Step 12: Commit**

```bash
git add src/modules/users/ src/app.ts
git commit -m "feat: users module — register, login, JWT auth with unit + integration tests"
```

---

## Task 12: Products Module

**Files:**
- Create: `src/modules/products/schemas.ts`
- Create: `src/modules/products/repository.ts`
- Create: `src/modules/products/service.ts`
- Create: `src/modules/products/controller.ts`
- Create: `src/modules/products/routes.ts`
- Create: `src/modules/products/__tests__/products.service.test.ts`
- Create: `src/modules/products/__tests__/products.routes.test.ts`

- [ ] **Step 1: Create src/modules/products/schemas.ts**

```typescript
import { z } from 'zod';
import mongoose, { Document, Schema } from 'mongoose';

export const CreateProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  price: z.number().min(0),
  category: z.string().min(1),
  stock: z.number().int().min(0).optional().default(0),
  metadata: z.record(z.unknown()).optional().default({}),
});

export const UpdateProductSchema = CreateProductSchema.partial();

export const ProductQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  category: z.string().optional(),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type ProductQuery = z.infer<typeof ProductQuerySchema>;

export interface IProduct {
  name: string;
  description?: string;
  price: number;
  category: string;
  stock: number;
  imageUrl?: string | null;
  isDeleted: boolean;
  metadata: Record<string, unknown>;
}

export interface IProductDoc extends IProduct, Document {}

const productSchema = new Schema<IProductDoc>(
  {
    name: { type: String, required: true },
    description: String,
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true },
    stock: { type: Number, default: 0 },
    imageUrl: { type: String, default: null },
    isDeleted: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export const ProductModel = mongoose.model<IProductDoc>('Product', productSchema);
```

- [ ] **Step 2: Create src/modules/products/repository.ts**

```typescript
import { ProductModel, IProductDoc, CreateProductInput, UpdateProductInput, ProductQuery } from './schemas';

export async function findAll(
  filter: ProductQuery,
): Promise<{ products: IProductDoc[]; total: number }> {
  const query = filter.category
    ? { isDeleted: false, category: filter.category }
    : { isDeleted: false };
  const skip = (filter.page - 1) * filter.limit;
  const [products, total] = await Promise.all([
    ProductModel.find(query).skip(skip).limit(filter.limit).lean(),
    ProductModel.countDocuments(query),
  ]);
  return { products: products as unknown as IProductDoc[], total };
}

export async function findById(id: string): Promise<IProductDoc | null> {
  return ProductModel.findOne({ _id: id, isDeleted: false }).lean() as Promise<IProductDoc | null>;
}

export async function create(data: CreateProductInput): Promise<IProductDoc> {
  return ProductModel.create(data);
}

export async function update(
  id: string,
  data: UpdateProductInput,
): Promise<IProductDoc | null> {
  return ProductModel.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: data },
    { new: true },
  ).lean() as Promise<IProductDoc | null>;
}

export async function softDelete(id: string): Promise<void> {
  await ProductModel.findByIdAndUpdate(id, { isDeleted: true });
}

export async function updateImageUrl(
  id: string,
  imageUrl: string,
): Promise<IProductDoc | null> {
  return ProductModel.findByIdAndUpdate(id, { imageUrl }, { new: true }).lean() as Promise<IProductDoc | null>;
}
```

- [ ] **Step 3: Write failing unit test**

```typescript
// src/modules/products/__tests__/products.service.test.ts
jest.mock('../repository');

import * as repo from '../repository';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../service';
import { AppError } from '../../../infra/middleware/errorHandler';

const mockProduct = {
  _id: '507f1f77bcf86cd799439011',
  name: 'Widget',
  price: 9.99,
  category: 'widgets',
  stock: 10,
  isDeleted: false,
};

describe('getProduct', () => {
  it('returns product when found', async () => {
    (repo.findById as jest.Mock).mockResolvedValue(mockProduct);
    const result = await getProduct('507f1f77bcf86cd799439011');
    expect(result).toEqual(mockProduct);
  });

  it('throws 404 when not found', async () => {
    (repo.findById as jest.Mock).mockResolvedValue(null);
    await expect(getProduct('507f1f77bcf86cd799439011')).rejects.toThrow(AppError);
  });
});

describe('createProduct', () => {
  it('creates and returns product', async () => {
    (repo.create as jest.Mock).mockResolvedValue(mockProduct);
    const result = await createProduct({
      name: 'Widget',
      price: 9.99,
      category: 'widgets',
      stock: 10,
      metadata: {},
    });
    expect(result).toEqual(mockProduct);
  });
});

describe('deleteProduct', () => {
  it('soft deletes product', async () => {
    (repo.findById as jest.Mock).mockResolvedValue(mockProduct);
    (repo.softDelete as jest.Mock).mockResolvedValue(undefined);
    await expect(deleteProduct('507f1f77bcf86cd799439011')).resolves.not.toThrow();
    expect(repo.softDelete).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
  });

  it('throws 404 when product not found', async () => {
    (repo.findById as jest.Mock).mockResolvedValue(null);
    await expect(deleteProduct('507f1f77bcf86cd799439011')).rejects.toThrow(AppError);
  });
});
```

- [ ] **Step 4: Run test — expect FAIL**

```bash
npm test -- --testPathPattern=products.service
```

- [ ] **Step 5: Create src/modules/products/service.ts**

```typescript
import * as repo from './repository';
import { CreateProductInput, UpdateProductInput, ProductQuery, IProductDoc } from './schemas';
import { AppError } from '../../infra/middleware/errorHandler';

export async function listProducts(
  query: ProductQuery,
): Promise<{ products: IProductDoc[]; total: number; page: number; limit: number }> {
  const { products, total } = await repo.findAll(query);
  return { products, total, page: query.page, limit: query.limit };
}

export async function getProduct(id: string): Promise<IProductDoc> {
  const product = await repo.findById(id);
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');
  return product;
}

export async function createProduct(data: CreateProductInput): Promise<IProductDoc> {
  return repo.create(data);
}

export async function updateProduct(
  id: string,
  data: UpdateProductInput,
): Promise<IProductDoc> {
  const updated = await repo.update(id, data);
  if (!updated) throw new AppError('Product not found', 404, 'NOT_FOUND');
  return updated;
}

export async function deleteProduct(id: string): Promise<void> {
  const product = await repo.findById(id);
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');
  await repo.softDelete(id);
}
```

- [ ] **Step 6: Run test — expect PASS**

```bash
npm test -- --testPathPattern=products.service
```

- [ ] **Step 7: Create src/modules/products/controller.ts**

```typescript
import { Request, Response, NextFunction } from 'express';
import {
  CreateProductSchema,
  UpdateProductSchema,
  ProductQuerySchema,
} from './schemas';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from './service';

export async function listHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = ProductQuerySchema.parse(req.query);
    const result = await listProducts(query);
    res.json(result);
  } catch (err) { next(err); }
}

export async function getHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await getProduct(req.params.id);
    res.json(product);
  } catch (err) { next(err); }
}

export async function createHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = CreateProductSchema.parse(req.body);
    const product = await createProduct(data);
    res.status(201).json(product);
  } catch (err) { next(err); }
}

export async function updateHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = UpdateProductSchema.parse(req.body);
    const product = await updateProduct(req.params.id, data);
    res.json(product);
  } catch (err) { next(err); }
}

export async function deleteHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await deleteProduct(req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
}
```

- [ ] **Step 8: Create src/modules/products/routes.ts**

```typescript
import { Router } from 'express';
import { authenticate, requireAdmin } from '../../infra/middleware/auth';
import {
  listHandler,
  getHandler,
  createHandler,
  updateHandler,
  deleteHandler,
} from './controller';

const router = Router();

router.get('/', listHandler);
router.get('/:id', getHandler);
router.post('/', authenticate, requireAdmin, createHandler);
router.put('/:id', authenticate, requireAdmin, updateHandler);
router.delete('/:id', authenticate, requireAdmin, deleteHandler);

export default router;
```

- [ ] **Step 9: Mount products router in src/app.ts**

```typescript
import express from 'express';
import { errorHandler } from './infra/middleware/errorHandler';
import usersRouter from './modules/users/routes';
import productsRouter from './modules/products/routes';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', usersRouter);
app.use('/api/products', productsRouter);

app.use(errorHandler);

export default app;
```

- [ ] **Step 10: Write failing integration test**

```typescript
// src/modules/products/__tests__/products.routes.test.ts
import request from 'supertest';
import app from '../../../app';
import { connectMySQL, closeMySQL, query } from '../../../infra/db/mysql';
import { connectMongo, closeMongo } from '../../../infra/db/mongo';
import { ProductModel } from '../schemas';

let adminToken: string;

beforeAll(async () => {
  await connectMySQL();
  await connectMongo();
  // Login as seeded admin user (password: admin123 from migration)
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
      email: 'user@example.com', password: 'password123', name: 'User',
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
    const product = await ProductModel.create({ name: 'ToDelete', price: 1, category: 'test', stock: 0 });
    const res = await request(app)
      .delete(`/api/products/${product._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
    const found = await request(app).get(`/api/products/${product._id}`);
    expect(found.status).toBe(404);
  });
});
```

- [ ] **Step 11: Run integration test**

```bash
npm run test:int -- --testPathPattern=products.routes
```

Expected: `PASS`

- [ ] **Step 12: Commit**

```bash
git add src/modules/products/ src/app.ts
git commit -m "feat: products module — MongoDB CRUD with admin auth, unit + integration tests"
```

---

## Task 13: Orders Module (with Transactions)

**Files:**
- Create: `src/modules/orders/schemas.ts`
- Create: `src/modules/orders/repository.ts`
- Create: `src/modules/orders/service.ts`
- Create: `src/modules/orders/controller.ts`
- Create: `src/modules/orders/routes.ts`
- Create: `src/modules/orders/__tests__/orders.service.test.ts`
- Create: `src/modules/orders/__tests__/orders.routes.test.ts`

- [ ] **Step 1: Create src/modules/orders/schemas.ts**

```typescript
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
```

- [ ] **Step 2: Create src/modules/orders/repository.ts**

```typescript
import { ResultSetHeader } from 'mysql2';
import { PoolConnection } from 'mysql2/promise';
import { query } from '../../infra/db/mysql';
import {
  Order,
  OrderItem,
  OrderWithItems,
  OrderRow,
  OrderItemRow,
  OrderQuery,
} from './schemas';

function rowToOrder(row: OrderRow): Order {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    total: parseFloat(row.total),
    createdAt: row.created_at,
  };
}

function rowToItem(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    quantity: row.quantity,
    unitPrice: parseFloat(row.unit_price),
  };
}

export async function createOrder(
  conn: PoolConnection,
  data: {
    userId: number;
    total: number;
    items: Array<{ productId: string; quantity: number; unitPrice: number }>;
  },
): Promise<OrderWithItems> {
  const [orderResult] = await conn.execute<ResultSetHeader>(
    'INSERT INTO orders (user_id, status, total) VALUES (?, ?, ?)',
    [data.userId, 'pending', data.total],
  );
  const orderId = orderResult.insertId;

  for (const item of data.items) {
    await conn.execute(
      'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
      [orderId, item.productId, item.quantity, item.unitPrice],
    );
  }

  const [orderRows] = await conn.execute<OrderRow[]>(
    'SELECT * FROM orders WHERE id = ?',
    [orderId],
  );
  const [itemRows] = await conn.execute<OrderItemRow[]>(
    'SELECT * FROM order_items WHERE order_id = ?',
    [orderId],
  );

  return {
    ...rowToOrder(orderRows[0]),
    items: (itemRows as OrderItemRow[]).map(rowToItem),
  };
}

export async function findByUserId(
  userId: number,
  filter: OrderQuery,
): Promise<{ orders: Order[]; total: number }> {
  const offset = (filter.page - 1) * filter.limit;
  const rows = await query<OrderRow>(
    'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [userId, filter.limit, offset],
  );
  const countRows = await query<{ total: number }>(
    'SELECT COUNT(*) as total FROM orders WHERE user_id = ?',
    [userId],
  );
  return {
    orders: rows.map(rowToOrder),
    total: countRows[0].total,
  };
}

export async function findById(
  id: number,
  userId: number,
): Promise<OrderWithItems | null> {
  const rows = await query<OrderRow>(
    'SELECT * FROM orders WHERE id = ? AND user_id = ? LIMIT 1',
    [id, userId],
  );
  if (!rows[0]) return null;

  const items = await query<OrderItemRow>(
    'SELECT * FROM order_items WHERE order_id = ?',
    [id],
  );
  return { ...rowToOrder(rows[0]), items: items.map(rowToItem) };
}
```

- [ ] **Step 3: Write failing unit test**

```typescript
// src/modules/orders/__tests__/orders.service.test.ts
jest.mock('../repository');
jest.mock('../../../infra/db/mysql');
jest.mock('../../../infra/aws/sqs');
jest.mock('../../products/repository');

import * as ordersRepo from '../repository';
import * as productsRepo from '../../products/repository';
import { withTransaction } from '../../../infra/db/mysql';
import { sendMessage } from '../../../infra/aws/sqs';
import { createOrder, listOrders, getOrder } from '../service';
import { AppError } from '../../../infra/middleware/errorHandler';

const mockProduct = {
  _id: '507f1f77bcf86cd799439011',
  name: 'Widget',
  price: 9.99,
  stock: 5,
  isDeleted: false,
};

const mockOrder = {
  id: 1,
  userId: 1,
  status: 'pending' as const,
  total: 9.99,
  createdAt: new Date(),
  items: [{ id: 1, orderId: 1, productId: '507f1f77bcf86cd799439011', quantity: 1, unitPrice: 9.99 }],
};

describe('createOrder', () => {
  it('creates order with transaction and publishes to SQS', async () => {
    (productsRepo.findById as jest.Mock).mockResolvedValue(mockProduct);
    (withTransaction as jest.Mock).mockImplementation((fn: (conn: unknown) => Promise<unknown>) =>
      fn({} as unknown),
    );
    (ordersRepo.createOrder as jest.Mock).mockResolvedValue(mockOrder);
    (sendMessage as jest.Mock).mockResolvedValue(undefined);

    const result = await createOrder(1, 'user@example.com', {
      items: [{ productId: '507f1f77bcf86cd799439011', quantity: 1 }],
    });

    expect(result).toEqual(mockOrder);
    expect(sendMessage).toHaveBeenCalled();
  });

  it('throws 404 if product not found', async () => {
    (productsRepo.findById as jest.Mock).mockResolvedValue(null);
    await expect(
      createOrder(1, 'user@example.com', {
        items: [{ productId: '507f1f77bcf86cd799439011', quantity: 1 }],
      }),
    ).rejects.toThrow(AppError);
  });

  it('throws 400 if product out of stock', async () => {
    (productsRepo.findById as jest.Mock).mockResolvedValue({ ...mockProduct, stock: 0 });
    await expect(
      createOrder(1, 'user@example.com', {
        items: [{ productId: '507f1f77bcf86cd799439011', quantity: 1 }],
      }),
    ).rejects.toThrow(AppError);
  });
});

describe('getOrder', () => {
  it('returns order when found', async () => {
    (ordersRepo.findById as jest.Mock).mockResolvedValue(mockOrder);
    const result = await getOrder(1, 1);
    expect(result).toEqual(mockOrder);
  });

  it('throws 404 when order not found', async () => {
    (ordersRepo.findById as jest.Mock).mockResolvedValue(null);
    await expect(getOrder(999, 1)).rejects.toThrow(AppError);
  });
});
```

- [ ] **Step 4: Run test — expect FAIL**

```bash
npm test -- --testPathPattern=orders.service
```

- [ ] **Step 5: Create src/modules/orders/service.ts**

```typescript
import { withTransaction } from '../../infra/db/mysql';
import { sendMessage } from '../../infra/aws/sqs';
import { findById as findProduct } from '../products/repository';
import * as repo from './repository';
import {
  CreateOrderInput,
  OrderQuery,
  Order,
  OrderWithItems,
  OrderNotificationMessage,
} from './schemas';
import { AppError } from '../../infra/middleware/errorHandler';
import { getConfig } from '../../infra/config';
import { logger } from '../../infra/middleware/logger';

export async function createOrder(
  userId: number,
  userEmail: string,
  input: CreateOrderInput,
): Promise<OrderWithItems> {
  const resolvedItems: Array<{ productId: string; quantity: number; unitPrice: number }> = [];
  let total = 0;

  for (const item of input.items) {
    const product = await findProduct(item.productId);
    if (!product) throw new AppError(`Product ${item.productId} not found`, 404, 'NOT_FOUND');
    if (product.stock < item.quantity)
      throw new AppError(`Product ${item.productId} out of stock`, 400, 'OUT_OF_STOCK');
    resolvedItems.push({ productId: item.productId, quantity: item.quantity, unitPrice: product.price });
    total += product.price * item.quantity;
  }

  const order = await withTransaction((conn) =>
    repo.createOrder(conn, { userId, total: Math.round(total * 100) / 100, items: resolvedItems }),
  );

  const message: OrderNotificationMessage = {
    orderId: order.id,
    userId,
    email: userEmail,
    total: order.total,
    items: resolvedItems,
  };

  try {
    await sendMessage(getConfig().aws.sqsQueueUrl, message);
  } catch (err) {
    logger.error(err, 'Failed to publish order notification to SQS');
  }

  return order;
}

export async function listOrders(
  userId: number,
  query: OrderQuery,
): Promise<{ orders: Order[]; total: number; page: number; limit: number }> {
  const { orders, total } = await repo.findByUserId(userId, query);
  return { orders, total, page: query.page, limit: query.limit };
}

export async function getOrder(id: number, userId: number): Promise<OrderWithItems> {
  const order = await repo.findById(id, userId);
  if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND');
  return order;
}
```

- [ ] **Step 6: Run test — expect PASS**

```bash
npm test -- --testPathPattern=orders.service
```

- [ ] **Step 7: Create src/modules/orders/controller.ts**

```typescript
import { Request, Response, NextFunction } from 'express';
import { CreateOrderSchema, OrderQuerySchema } from './schemas';
import { createOrder, listOrders, getOrder } from './service';

export async function createHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = CreateOrderSchema.parse(req.body);
    const order = await createOrder(req.user!.id, req.user!.email, data);
    res.status(201).json(order);
  } catch (err) { next(err); }
}

export async function listHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = OrderQuerySchema.parse(req.query);
    const result = await listOrders(req.user!.id, query);
    res.json(result);
  } catch (err) { next(err); }
}

export async function getHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const order = await getOrder(parseInt(req.params.id, 10), req.user!.id);
    res.json(order);
  } catch (err) { next(err); }
}
```

- [ ] **Step 8: Create src/modules/orders/routes.ts**

```typescript
import { Router } from 'express';
import { authenticate } from '../../infra/middleware/auth';
import { createHandler, listHandler, getHandler } from './controller';

const router = Router();

router.use(authenticate);
router.post('/', createHandler);
router.get('/', listHandler);
router.get('/:id', getHandler);

export default router;
```

- [ ] **Step 9: Mount orders router in src/app.ts**

```typescript
import express from 'express';
import { errorHandler } from './infra/middleware/errorHandler';
import usersRouter from './modules/users/routes';
import productsRouter from './modules/products/routes';
import ordersRouter from './modules/orders/routes';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', usersRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);

app.use(errorHandler);

export default app;
```

- [ ] **Step 10: Write failing integration test**

```typescript
// src/modules/orders/__tests__/orders.routes.test.ts
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
  await closeMySQL();
  await closeMongo();
  sqsMock.reset();
});

beforeEach(async () => {
  await query('SET FOREIGN_KEY_CHECKS = 0');
  await query('TRUNCATE TABLE order_items');
  await query('TRUNCATE TABLE orders');
  await query('DELETE FROM users WHERE is_admin = FALSE');
  await query('SET FOREIGN_KEY_CHECKS = 1');
  await ProductModel.deleteMany({});

  const reg = await request(app).post('/api/auth/register').send({
    email: 'buyer@example.com', password: 'password123', name: 'Buyer',
  });
  userToken = reg.body.token;

  const product = await ProductModel.create({
    name: 'Test Widget', price: 25.00, category: 'tools', stock: 10,
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
  });
});
```

- [ ] **Step 11: Run integration test**

```bash
npm run test:int -- --testPathPattern=orders.routes
```

Expected: `PASS`

- [ ] **Step 12: Commit**

```bash
git add src/modules/orders/ src/app.ts
git commit -m "feat: orders module — MySQL transactions, SQS publish, unit + integration tests"
```

---

## Task 14: S3 Product Image Upload

**Files:**
- Modify: `src/modules/products/service.ts` (add `uploadProductImage`)
- Modify: `src/modules/products/controller.ts` (add `uploadImageHandler`)
- Modify: `src/modules/products/routes.ts` (add `POST /:id/image`)
- Create: `src/modules/products/__tests__/products.s3.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/modules/products/__tests__/products.s3.test.ts
jest.mock('../repository');
jest.mock('../../../infra/aws/s3');

import * as repo from '../repository';
import { uploadFile, getPresignedUrl } from '../../../infra/aws/s3';
import { uploadProductImage } from '../service';
import { AppError } from '../../../infra/middleware/errorHandler';

const mockProduct = {
  _id: '507f1f77bcf86cd799439011',
  name: 'Widget',
  price: 9.99,
  category: 'tools',
  stock: 5,
  imageUrl: null,
  isDeleted: false,
};

describe('uploadProductImage', () => {
  it('uploads to S3 and updates imageUrl', async () => {
    (repo.findById as jest.Mock).mockResolvedValue(mockProduct);
    (uploadFile as jest.Mock).mockResolvedValue(undefined);
    (getPresignedUrl as jest.Mock).mockResolvedValue('https://s3.example.com/presigned');
    (repo.updateImageUrl as jest.Mock).mockResolvedValue({
      ...mockProduct,
      imageUrl: 'products/507f1f77bcf86cd799439011/uuid.jpg',
    });

    const result = await uploadProductImage(
      '507f1f77bcf86cd799439011',
      Buffer.from('fake-image'),
      'image/jpeg',
      'photo.jpg',
    );

    expect(uploadFile).toHaveBeenCalled();
    expect(repo.updateImageUrl).toHaveBeenCalled();
    expect(result.presignedUrl).toBe('https://s3.example.com/presigned');
  });

  it('throws 404 if product not found', async () => {
    (repo.findById as jest.Mock).mockResolvedValue(null);
    await expect(
      uploadProductImage('507f1f77bcf86cd799439011', Buffer.from('x'), 'image/jpeg', 'x.jpg'),
    ).rejects.toThrow(AppError);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- --testPathPattern=products.s3
```

- [ ] **Step 3: Add `uploadProductImage` to src/modules/products/service.ts**

Add this function to the existing service.ts:

```typescript
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { uploadFile, getPresignedUrl } from '../../infra/aws/s3';
import { updateImageUrl } from './repository';

export async function uploadProductImage(
  id: string,
  buffer: Buffer,
  mimeType: string,
  originalName: string,
): Promise<{ imageUrl: string; presignedUrl: string }> {
  const product = await repo.findById(id);
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');

  const ext = path.extname(originalName) || '.jpg';
  const key = `products/${id}/${uuidv4()}${ext}`;

  await uploadFile(key, buffer, mimeType);
  await updateImageUrl(id, key);

  const presignedUrl = await getPresignedUrl(key);
  return { imageUrl: key, presignedUrl };
}
```

Note: also add `import * as repo from './repository';` if not already present, and add the `uuid`, `path` imports at the top of service.ts.

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- --testPathPattern=products.s3
```

- [ ] **Step 5: Add `uploadImageHandler` to src/modules/products/controller.ts**

Add to existing controller.ts:

```typescript
import multer from 'multer';
import { uploadProductImage } from './service';

export const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export async function uploadImageHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400, 'NO_FILE');
    const result = await uploadProductImage(
      req.params.id,
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname,
    );
    res.json(result);
  } catch (err) { next(err); }
}
```

Also add `import { AppError } from '../../infra/middleware/errorHandler';` to controller.ts imports.

- [ ] **Step 6: Add upload route to src/modules/products/routes.ts**

```typescript
import { Router } from 'express';
import { authenticate, requireAdmin } from '../../infra/middleware/auth';
import {
  listHandler, getHandler, createHandler, updateHandler, deleteHandler,
  upload, uploadImageHandler,
} from './controller';

const router = Router();

router.get('/', listHandler);
router.get('/:id', getHandler);
router.post('/', authenticate, requireAdmin, createHandler);
router.put('/:id', authenticate, requireAdmin, updateHandler);
router.delete('/:id', authenticate, requireAdmin, deleteHandler);
router.post('/:id/image', authenticate, upload.single('image'), uploadImageHandler);

export default router;
```

- [ ] **Step 7: Commit**

```bash
git add src/modules/products/
git commit -m "feat: S3 product image upload with presigned URL response"
```

---

## Task 15: Notifications Module (SQS Consumer + SNS + SES)

**Files:**
- Create: `src/modules/notifications/service.ts`
- Create: `src/modules/notifications/consumer.ts`
- Create: `src/modules/notifications/__tests__/notifications.service.test.ts`
- Modify: `src/server.ts` (start/stop consumer)

- [ ] **Step 1: Write failing test**

```typescript
// src/modules/notifications/__tests__/notifications.service.test.ts
jest.mock('../../../infra/aws/sns');
jest.mock('../../../infra/aws/ses');

import { publish } from '../../../infra/aws/sns';
import { sendEmail } from '../../../infra/aws/ses';
import { processOrderNotification } from '../service';

describe('processOrderNotification', () => {
  beforeEach(() => jest.clearAllMocks());

  it('publishes to SNS and sends SES email', async () => {
    (publish as jest.Mock).mockResolvedValue(undefined);
    (sendEmail as jest.Mock).mockResolvedValue(undefined);

    await processOrderNotification({
      orderId: 1,
      userId: 1,
      email: 'buyer@example.com',
      total: 49.98,
      items: [{ productId: '507f1f77bcf86cd799439011', quantity: 2, unitPrice: 24.99 }],
    });

    expect(publish).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ orderId: 1 }),
    );
    expect(sendEmail).toHaveBeenCalledWith(
      'buyer@example.com',
      expect.stringContaining('Order'),
      expect.stringContaining('49.98'),
    );
  });

  it('does not throw if SNS fails — logs and continues', async () => {
    (publish as jest.Mock).mockRejectedValue(new Error('SNS down'));
    (sendEmail as jest.Mock).mockResolvedValue(undefined);
    await expect(processOrderNotification({
      orderId: 2, userId: 1, email: 'x@y.com', total: 10, items: [],
    })).resolves.not.toThrow();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- --testPathPattern=notifications.service
```

- [ ] **Step 3: Create src/modules/notifications/service.ts**

```typescript
import { publish } from '../../infra/aws/sns';
import { sendEmail } from '../../infra/aws/ses';
import { OrderNotificationMessage } from '../orders/schemas';
import { getConfig } from '../../infra/config';
import { logger } from '../../infra/middleware/logger';

export async function processOrderNotification(
  message: OrderNotificationMessage,
): Promise<void> {
  try {
    await publish(getConfig().aws.snsTopicArn, message);
  } catch (err) {
    logger.error(err, 'SNS publish failed');
  }

  const html = `
    <h1>Order Confirmed</h1>
    <p>Order #${message.orderId} — Total: $${message.total.toFixed(2)}</p>
    <ul>
      ${message.items.map((i) => `<li>${i.productId} × ${i.quantity}</li>`).join('')}
    </ul>
  `;

  await sendEmail(message.email, `Order #${message.orderId} Confirmed`, html);
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- --testPathPattern=notifications.service
```

- [ ] **Step 5: Create src/modules/notifications/consumer.ts**

```typescript
import { receiveMessages, deleteMessage } from '../../infra/aws/sqs';
import { processOrderNotification } from './service';
import { OrderNotificationMessage } from '../orders/schemas';
import { getConfig } from '../../infra/config';
import { logger } from '../../infra/middleware/logger';

let isShuttingDown = false;

export function stopConsumer(): void {
  isShuttingDown = true;
}

export async function startConsumer(): Promise<void> {
  logger.info('SQS consumer started');
  pollLoop();
}

async function pollLoop(): Promise<void> {
  while (!isShuttingDown) {
    try {
      const messages = await receiveMessages(getConfig().aws.sqsQueueUrl);
      for (const msg of messages) {
        if (!msg.Body || !msg.ReceiptHandle) continue;
        try {
          const body = JSON.parse(msg.Body) as OrderNotificationMessage;
          await processOrderNotification(body);
          await deleteMessage(getConfig().aws.sqsQueueUrl, msg.ReceiptHandle);
        } catch (err) {
          logger.error(err, `Failed to process message ${msg.MessageId}`);
        }
      }
    } catch (err) {
      if (!isShuttingDown) {
        logger.error(err, 'SQS receive error');
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }
  logger.info('SQS consumer stopped');
}
```

- [ ] **Step 6: Update src/server.ts** — wire in consumer

```typescript
import { connectMySQL, closeMySQL } from './infra/db/mysql';
import { connectMongo, closeMongo } from './infra/db/mongo';
import { logger } from './infra/middleware/logger';
import { getConfig } from './infra/config';
import { startConsumer, stopConsumer } from './modules/notifications/consumer';
import app from './app';

let isShuttingDown = false;
export { isShuttingDown };

async function start(): Promise<void> {
  await connectMySQL();
  await connectMongo();

  const { port } = getConfig();
  const server = app.listen(port, () => {
    logger.info(`Server running on port ${port}`);
  });

  startConsumer();

  function shutdown(signal: string): void {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`${signal} received — shutting down`);

    server.close(async () => {
      stopConsumer();
      await closeMySQL();
      await closeMongo();
      logger.info('Shutdown complete');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Shutdown timeout — forcing exit');
      process.exit(1);
    }, 10_000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  logger.error(err, 'Startup failed');
  process.exit(1);
});
```

- [ ] **Step 7: Commit**

```bash
git add src/modules/notifications/ src/server.ts
git commit -m "feat: notifications module — SQS consumer, SNS publish, SES email"
```

---

## Task 16: README

**Files:** Create `README.md`

- [ ] **Step 1: Create README.md**

```markdown
# Playground Server

Senior backend reference implementation: Node.js, TypeScript, Express, MySQL, MongoDB, AWS.

## Stack

| Layer | Tech |
|---|---|
| Runtime | Node.js 20 LTS + TypeScript strict |
| Framework | Express.js |
| Relational DB | MySQL 8 (mysql2, raw queries, transactions) |
| Document DB | MongoDB 7 (Mongoose) |
| Auth | JWT (HS256) + bcrypt |
| Validation | Zod |
| AWS | S3, SQS, SNS, SES, Secrets Manager (SDK v3) |
| Logging | pino (structured JSON) |
| Testing | Jest + Supertest + aws-sdk-client-mock |

## Quick Start

```bash
# 1. Start databases
docker-compose up -d

# 2. Install deps
npm install

# 3. Copy env
cp .env.example .env

# 4. Run migrations
npm run migrate

# 5. Start dev server
npm run dev
```

## Testing

```bash
npm test              # unit tests (no Docker needed)
npm run test:int      # integration tests (Docker required)
npm run test:coverage # coverage report
```

## API

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | — | Register user |
| POST | /api/auth/login | — | Login, get JWT |
| GET | /api/users/me | Bearer | Get profile |
| GET | /api/products | — | List products (paginated) |
| GET | /api/products/:id | — | Get product |
| POST | /api/products | Admin | Create product |
| PUT | /api/products/:id | Admin | Update product |
| DELETE | /api/products/:id | Admin | Soft delete |
| POST | /api/products/:id/image | Bearer | Upload image to S3 |
| POST | /api/orders | Bearer | Create order (MySQL transaction) |
| GET | /api/orders | Bearer | List orders |
| GET | /api/orders/:id | Bearer | Order detail |

## Key Patterns

- **Transactions**: `withTransaction(conn => ...)` in `src/infra/db/mysql.ts`
- **Graceful shutdown**: SIGTERM/SIGINT → drain connections → exit (10s timeout)
- **SQS consumer**: long-poll loop in `src/modules/notifications/consumer.ts`
- **Modular structure**: each module owns routes → controller → service → repository

## Next Steps

- Redis caching (product list, session)
- Rate limiting (express-rate-limit)
- CI/CD pipeline (GitHub Actions)
- Helmet + CORS middleware
```

- [ ] **Step 2: Run all unit tests — confirm all pass**

```bash
npm test
```

Expected: all service tests pass.

- [ ] **Step 3: Run integration tests — confirm all pass**

```bash
npm run test:int
```

Expected: all routes tests pass.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: README with quick start, API reference, key patterns"
```

---

## Self-Review Checklist

- [x] §1 Architecture → Task 1 (scaffold), Task 10 (app/server)
- [x] §2 Tech Stack → Task 1 (package.json)
- [x] §3 Data Models → Task 9 (migrations), Task 12 (Mongoose schema)
- [x] §4 API Endpoints → Tasks 11–14
- [x] §5 AWS Integration → Tasks 8, 14 (S3), 13 (SQS publish), 15 (consumer, SNS, SES)
- [x] §6 Testing → All modules have unit + integration tests
- [x] §7 Local Dev → Task 1 (docker-compose, .env), Task 9 (migrate script)
- [x] §8 Error Handling → Task 2 (AppError, errorHandler)
- [x] §9 Transactions → Task 13 (withTransaction in orders)
- [x] §10 Graceful Shutdown → Task 15 (server.ts SIGTERM/SIGINT)
