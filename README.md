# Playground Server

Senior backend reference: Node.js, TypeScript, Express, MySQL, MongoDB, AWS.

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

# 4. Run migrations (creates tables + seeds admin user)
npm run migrate

# 5. Start dev server
npm run dev
```

Admin credentials: `admin@example.com` / `admin123`

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

| Pattern | Location |
|---|---|
| MySQL transactions | `src/infra/db/mysql.ts` → `withTransaction()` |
| Raw SQL queries | `src/modules/*/repository.ts` |
| Mongoose schemas | `src/modules/products/schemas.ts` |
| JWT middleware | `src/infra/middleware/auth.ts` |
| Zod validation | `src/modules/*/schemas.ts` |
| SQS consumer (long poll) | `src/modules/notifications/consumer.ts` |
| Graceful shutdown | `src/server.ts` — SIGTERM/SIGINT handler |
| AWS SDK v3 clients | `src/infra/aws/*.ts` |
| Structured logging | `src/infra/middleware/logger.ts` (pino) |
| Error handling | `src/infra/middleware/errorHandler.ts` (AppError) |

## Architecture

Modular monolith — each module owns its full vertical slice:

```
routes → controller → service → repository → DB/AWS
```

No cross-module imports. Shared infra in `src/infra/`.

## AWS Setup (real credentials)

1. Create: S3 bucket, SQS queue, SNS topic, SES verified email
2. Update `.env` with real values
3. `npm run dev` — AWS calls go live automatically

## Next Steps

- Redis caching (product list, sessions)
- Rate limiting (`express-rate-limit`)
- Helmet + CORS hardening
- CI/CD (GitHub Actions)
