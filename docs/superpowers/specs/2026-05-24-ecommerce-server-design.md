# E-Commerce Playground Server — Design Spec

**Date:** 2026-05-24
**Purpose:** Learning/refreshing senior backend patterns — Node.js, TypeScript, MySQL, MongoDB, AWS

---

## 1. Architecture

**Modular Monolith.** Feature modules own their full vertical slice (routes → controller → service → repository). Shared infrastructure in `infra/`. No cross-module imports except through well-defined interfaces.

```
src/
  modules/
    users/
      routes.ts
      controller.ts
      service.ts
      repository.ts
      schemas.ts        ← Zod validation schemas
      __tests__/
        users.service.test.ts
        users.routes.test.ts
    products/
      routes.ts
      controller.ts
      service.ts
      repository.ts
      schemas.ts
      __tests__/
        products.service.test.ts
        products.routes.test.ts
    orders/
      routes.ts
      controller.ts
      service.ts
      repository.ts
      schemas.ts
      __tests__/
        orders.service.test.ts
        orders.routes.test.ts
    notifications/
      consumer.ts       ← SQS poll loop
      service.ts        ← SNS publish + SES send
      __tests__/
        notifications.service.test.ts
  infra/
    db/
      mysql.ts          ← mysql2 connection pool
      mongo.ts          ← mongoose connection
    aws/
      s3.ts
      sqs.ts
      sns.ts
      ses.ts
      secrets.ts        ← Secrets Manager client
    middleware/
      auth.ts           ← JWT verify middleware
      errorHandler.ts   ← global error handler
      logger.ts         ← pino structured logger
    config.ts           ← load config from Secrets Manager (prod) or env (dev)
  app.ts                ← Express setup, route mounting
  server.ts             ← HTTP server start
docker-compose.yml      ← MySQL 8 + MongoDB 7 containers
```

---

## 2. Tech Stack

| Concern | Library | Notes |
|---|---|---|
| Runtime | Node.js 20 LTS | |
| Framework | Express.js | |
| Language | TypeScript (strict) | |
| MySQL | mysql2 | Raw queries, connection pool — no ORM |
| MongoDB | Mongoose | Type-safe schemas |
| AWS SDK | @aws-sdk v3 | Modular clients (S3, SQS, SNS, SES, SecretsManager) |
| Auth | jsonwebtoken + bcrypt | JWT HS256, bcrypt rounds=12 |
| Validation | Zod | Schema → TypeScript type inference |
| Logging | pino | Structured JSON logs |
| Testing | Jest + Supertest + ts-jest | |
| AWS mocking | aws-sdk-client-mock | Official AWS mock library for SDK v3 |
| Dev server | ts-node-dev | Fast restart on change |
| Build | tsc | Compile to `dist/` |

---

## 3. Data Models

### MySQL

```sql
CREATE TABLE users (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  email        VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name         VARCHAR(255) NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id),
  status     ENUM('pending','confirmed','shipped','delivered','cancelled') DEFAULT 'pending',
  total      DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  order_id   INT NOT NULL REFERENCES orders(id),
  product_id VARCHAR(24) NOT NULL,  -- MongoDB ObjectId as string
  quantity   INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL
);
```

### MongoDB (Mongoose)

```typescript
// Product schema
{
  name:        string (required)
  description: string
  price:       number (required, min: 0)
  category:    string (required)
  stock:       number (default: 0)
  imageUrl:    string | null
  isDeleted:   boolean (default: false)  // soft delete
  metadata:    Record<string, unknown>   // flexible extra fields
  createdAt:   Date
  updatedAt:   Date
}
```

---

## 4. API Endpoints

All protected routes require `Authorization: Bearer <token>` header.

### Auth / Users
```
POST /api/auth/register   — body: { email, password, name }  → { token, user }
POST /api/auth/login      — body: { email, password }        → { token, user }
GET  /api/users/me        — protected                        → user profile
```

### Products
```
GET    /api/products           — query: ?page&limit&category  → paginated list
GET    /api/products/:id       —                              → single product
POST   /api/products           — protected (admin role)       → created product
PUT    /api/products/:id       — protected (admin role)       → updated product
DELETE /api/products/:id       — protected (admin role)       → 204 (soft delete)
POST   /api/products/:id/image — multipart/form-data          → { imageUrl }
```

### Orders
```
POST /api/orders      — protected, body: { items: [{ productId, quantity }] }
GET  /api/orders      — protected → user's order history (paginated)
GET  /api/orders/:id  — protected → order detail with items
```

---

## 5. AWS Integration Flow

### S3 — Product Images
- `POST /api/products/:id/image` receives multipart upload
- Uploaded to S3 bucket, key: `products/{productId}/{uuid}.{ext}`
- `imageUrl` stored on MongoDB product document
- Presigned URL generated for reads (not public bucket)

### SQS + SNS + SES — Order Notifications
```
Order created
  → orders.service publishes JSON message to SQS queue
      { orderId, userId, email, total, items }
  → notifications consumer polls SQS (long poll, 20s)
  → on message: publish to SNS topic (for extensibility)
  → SNS triggers SES send: order confirmation email to user
```

SQS consumer starts in `server.ts` alongside the HTTP server (not a separate process).
Consumer errors are logged but do not crash the server.

### Secrets Manager
- At startup, `infra/config.ts` fetches secrets in production:
  - `MYSQL_URL`, `MONGO_URI`, `JWT_SECRET`, `AWS_*` overrides
- In development: falls back to `.env` file
- Pattern: `getConfig()` returns typed config object used everywhere

---

## 6. Testing Strategy

### Unit Tests (no Docker, no real AWS)
- Location: `modules/**/__tests__/*.service.test.ts`
- Mock repositories with `jest.fn()`
- Mock AWS clients with `aws-sdk-client-mock`
- Test: business logic, validation, error cases, edge cases
- Run: `npm test`

### Integration Tests (Docker required)
- Location: `modules/**/__tests__/*.routes.test.ts`
- Supertest against real Express app
- Real MySQL + MongoDB via Docker Compose
- AWS clients mocked (not LocalStack)
- Run: `npm run test:int`

### Coverage
- Run: `npm run test:coverage`
- Target: 80%+ on service layer

### Structure example
```
modules/orders/__tests__/
  orders.service.test.ts   ← unit: mock repo, mock SQS client
  orders.routes.test.ts    ← integration: real DB, mock SQS
```

---

## 7. Local Development

```bash
# Start databases
docker-compose up -d

# Install deps
npm install

# Run dev server (hot reload)
npm run dev

# Run migrations (plain SQL files, no ORM migration tool)
npm run migrate

# Run unit tests
npm test

# Run integration tests (Docker must be up)
npm run test:int
```

### Environment Variables (`.env`)
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

---

## 8. Error Handling

- All errors flow through `infra/middleware/errorHandler.ts`
- Custom `AppError` class: `{ message, statusCode, code }`
- Validation errors (Zod): 400 with field details
- Auth errors: 401
- Not found: 404
- Unexpected: 500 (message hidden in prod, logged with pino)

---

## 9. Database Transactions

Order creation is the canonical transaction example — it must be atomic:

```
BEGIN
  INSERT INTO orders (user_id, status, total)
  INSERT INTO order_items (order_id, product_id, quantity, unit_price) × N
COMMIT
-- on any error: ROLLBACK, surface AppError to client
```

Implementation:
- `mysql.ts` exposes `withTransaction(fn)` helper — acquires connection from pool, calls `BEGIN`, passes connection to `fn`, calls `COMMIT` or `ROLLBACK`
- `orders.repository.ts` uses `withTransaction` for create
- All other queries use the pool directly (no transaction needed)
- Parameterized queries (`?` placeholders) throughout — prevents SQL injection

---

## 10. Graceful Shutdown

`server.ts` registers SIGTERM + SIGINT handlers:

```
1. Stop accepting new HTTP connections (server.close())
2. Wait for in-flight requests to finish (max 10s timeout)
3. Stop SQS consumer poll loop
4. Close MySQL connection pool
5. Close Mongoose connection
6. Exit process with code 0
```

- Ensures Docker / Kubernetes stops cleanly without dropped requests
- SQS consumer checks a `isShuttingDown` flag to exit poll loop gracefully
- Timeout forces exit after 10s to avoid hanging indefinitely

---

## Out of Scope

- Admin role management (admin flag hardcoded on seed user)
- Payment processing
- Rate limiting (mention in README as next step)
- Caching layer (Redis — mention as next step)
- CI/CD pipeline
