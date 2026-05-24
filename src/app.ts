import express from 'express';
import { errorHandler } from './infra/middleware/errorHandler';
import usersRouter from './modules/users/routes';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', usersRouter);

// app.use('/api/products', productsRouter);  — added in Task 12
// app.use('/api/orders', ordersRouter);       — added in Task 13

app.use(errorHandler);

export default app;
