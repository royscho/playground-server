export interface Config {
  nodeEnv: string;
  port: number;
  mysql: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
  mongoUri: string;
  jwt: {
    secret: string;
    expiresIn: string;
  };
  aws: {
    region: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    s3Bucket: string;
    sqsQueueUrl: string;
    snsTopicArn: string;
    sesFromEmail: string;
  };
}

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export function getConfig(): Config {
  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
    mysql: {
      host: requireEnv('MYSQL_HOST'),
      port: parseInt(process.env.MYSQL_PORT ?? '3306', 10),
      user: requireEnv('MYSQL_USER'),
      password: requireEnv('MYSQL_PASSWORD'),
      database: requireEnv('MYSQL_DATABASE'),
    },
    mongoUri: requireEnv('MONGO_URI'),
    jwt: {
      secret: requireEnv('JWT_SECRET'),
      expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    },
    aws: {
      region: process.env.AWS_REGION ?? 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      s3Bucket: requireEnv('S3_BUCKET'),
      sqsQueueUrl: requireEnv('SQS_QUEUE_URL'),
      snsTopicArn: requireEnv('SNS_TOPIC_ARN'),
      sesFromEmail: requireEnv('SES_FROM_EMAIL'),
    },
  };
}
