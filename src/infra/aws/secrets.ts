import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { getConfig } from '../config';

let client: SecretsManagerClient;

function getClient(): SecretsManagerClient {
  if (!client) {
    const cfg = getConfig();
    client = new SecretsManagerClient({ region: cfg.aws.region });
  }
  return client;
}

export async function getSecret(secretId: string): Promise<string> {
  const result = await getClient().send(
    new GetSecretValueCommand({ SecretId: secretId }),
  );
  if (!result.SecretString) throw new Error(`Secret ${secretId} has no string value`);
  return result.SecretString;
}
