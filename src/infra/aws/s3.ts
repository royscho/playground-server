import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getConfig } from '../config';

let client: S3Client;

export function getS3Client(): S3Client {
  if (!client) {
    const cfg = getConfig();
    client = new S3Client({ region: cfg.aws.region });
  }
  return client;
}

export async function uploadFile(
  key: string,
  buffer: Buffer,
  mimeType: string,
): Promise<void> {
  const cfg = getConfig();
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: cfg.aws.s3Bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }),
  );
}

export async function getPresignedUrl(key: string): Promise<string> {
  const cfg = getConfig();
  const command = new GetObjectCommand({ Bucket: cfg.aws.s3Bucket, Key: key });
  return getSignedUrl(getS3Client(), command, { expiresIn: 3600 });
}
