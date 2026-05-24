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

  it('does not throw if SNS fails — logs and continues to SES', async () => {
    (publish as jest.Mock).mockRejectedValue(new Error('SNS down'));
    (sendEmail as jest.Mock).mockResolvedValue(undefined);

    await expect(
      processOrderNotification({
        orderId: 2,
        userId: 1,
        email: 'x@y.com',
        total: 10,
        items: [],
      }),
    ).resolves.not.toThrow();

    expect(sendEmail).toHaveBeenCalled();
  });
});
