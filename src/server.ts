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
