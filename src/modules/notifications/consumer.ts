import { receiveMessages, deleteMessage } from '../../infra/aws/sqs';
import { processOrderNotification } from './service';
import { OrderNotificationMessage } from '../orders/schemas';
import { getConfig } from '../../infra/config';
import { logger } from '../../infra/middleware/logger';

let isShuttingDown = false;

export function stopConsumer(): void {
  isShuttingDown = true;
}

export function startConsumer(): void {
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
