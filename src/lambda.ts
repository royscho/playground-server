
import 'dotenv/config';
import serverlessExpress from '@vendia/serverless-express';
import { connectMySQL } from './infra/db/mysql';
import { connectMongo } from './infra/db/mongo';
import app from './app';

let handler: ReturnType<typeof serverlessExpress>;

// Connections reused across warm Lambda invocations
async function bootstrap() {
  await connectMySQL();
  await connectMongo();
  handler = serverlessExpress({ app });
}

const ready = bootstrap();

export const lambdaHandler = async (event: unknown, context: unknown) => {
  await ready;
  return handler(event as never, context as never, undefined as never);
};
