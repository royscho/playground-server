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
