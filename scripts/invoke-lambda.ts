/**
 * Simulates a Lambda invocation locally.
 * Run: npx ts-node scripts/invoke-lambda.ts
 *
 * Shows how API Gateway translates an HTTP request into an event object,
 * passes it to the Lambda handler, and gets back an HTTP response object.
 */
import { lambdaHandler } from '../src/lambda';

// This is exactly what API Gateway sends to Lambda for GET /health
const event = {
  version: '1.0',
  httpMethod: 'GET',
  path: '/health',
  headers: { 'Content-Type': 'application/json' },
  queryStringParameters: null,
  body: null,
  isBase64Encoded: false,
  requestContext: {
    accountId: '123456789012',
    resourcePath: '/{proxy+}',
    stage: 'dev',
    requestId: 'local-test-001',
    identity: { sourceIp: '127.0.0.1' },
  },
};

// Lambda context (simplified)
const context = {
  functionName: 'playground-server-dev-api',
  awsRequestId: 'local-context-001',
  getRemainingTimeInMillis: () => 30000,
};

async function main() {
  console.log('=== Lambda Event (what API Gateway sends) ===');
  console.log(JSON.stringify(event, null, 2));

  console.log('\n=== Invoking lambdaHandler... ===\n');
  const response = await lambdaHandler(event, context);

  console.log('=== Lambda Response (what API Gateway returns to browser) ===');
  console.log(JSON.stringify(response, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
