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
