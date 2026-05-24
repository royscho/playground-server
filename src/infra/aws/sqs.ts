import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  Message,
} from '@aws-sdk/client-sqs';
import { getConfig } from '../config';

let client: SQSClient;

export function getSQSClient(): SQSClient {
  if (!client) {
    const cfg = getConfig();
    client = new SQSClient({ region: cfg.aws.region });
  }
  return client;
}

export async function sendMessage(queueUrl: string, body: object): Promise<void> {
  await getSQSClient().send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(body),
    }),
  );
}

export async function receiveMessages(queueUrl: string): Promise<Message[]> {
  const result = await getSQSClient().send(
    new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 20,
    }),
  );
  return result.Messages ?? [];
}

export async function deleteMessage(
  queueUrl: string,
  receiptHandle: string,
): Promise<void> {
  await getSQSClient().send(
    new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: receiptHandle }),
  );
}
