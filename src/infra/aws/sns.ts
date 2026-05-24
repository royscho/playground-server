import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { getConfig } from '../config';

let client: SNSClient;

export function getSNSClient(): SNSClient {
  if (!client) {
    const cfg = getConfig();
    client = new SNSClient({ region: cfg.aws.region });
  }
  return client;
}

export async function publish(topicArn: string, message: object): Promise<void> {
  await getSNSClient().send(
    new PublishCommand({
      TopicArn: topicArn,
      Message: JSON.stringify(message),
    }),
  );
}
