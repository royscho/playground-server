import express from 'express';
import { errorHandler } from './infra/middleware/errorHandler';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Routers mounted as modules are built:
// app.use('/api', usersRouter);
// app.use('/api/products', productsRouter);
// app.use('/api/orders', ordersRouter);

app.use(errorHandler);

export default app;
