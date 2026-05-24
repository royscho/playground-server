import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { getConfig } from '../config';

let client: SESClient;

export function getSESClient(): SESClient {
  if (!client) {
    const cfg = getConfig();
    client = new SESClient({ region: cfg.aws.region });
  }
  return client;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const cfg = getConfig();
  await getSESClient().send(
    new SendEmailCommand({
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject },
        Body: { Html: { Data: html } },
      },
      Source: cfg.aws.sesFromEmail,
    }),
  );
}
