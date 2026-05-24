/**
 * Local Lambda emulator — wraps lambdaHandler in an HTTP server on port 3002.
 * Translates every incoming request into an API Gateway v1 event,
 * calls lambdaHandler, and writes the Lambda response back as HTTP.
 *
 * Run: npx ts-node --transpile-only scripts/lambda-server.ts
 * Then point Postman at http://localhost:3002
 */
import http from 'http';
import { lambdaHandler } from '../src/lambda';

const PORT = 3002;

const server = http.createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', async () => {
    const rawBody = Buffer.concat(chunks).toString();

    // Build API Gateway v1 proxy event
    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
    const queryParams: Record<string, string> = {};
    url.searchParams.forEach((v, k) => (queryParams[k] = v));

    const event = {
      version: '1.0',
      httpMethod: req.method ?? 'GET',
      path: url.pathname,
      headers: req.headers as Record<string, string>,
      queryStringParameters: Object.keys(queryParams).length ? queryParams : null,
      body: rawBody || null,
      isBase64Encoded: false,
      requestContext: {
        accountId: 'local',
        resourcePath: '/{proxy+}',
        stage: 'local',
        requestId: `local-${Date.now()}`,
        identity: { sourceIp: '127.0.0.1' },
      },
    };

    try {
      const result = await lambdaHandler(event, {
        functionName: 'playground-server-local',
        awsRequestId: `local-${Date.now()}`,
        getRemainingTimeInMillis: () => 30000,
      });

      const headers = result.multiValueHeaders ?? {};
      res.writeHead(result.statusCode ?? 200, {
        'content-type': 'application/json',
        ...Object.fromEntries(Object.entries(headers).map(([k, v]) => [k, (v as string[]).join(', ')])),
      });
      res.end(result.body ?? '');
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: String(err) }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Lambda emulator running on http://localhost:${PORT}`);
  console.log('Point Postman baseUrl at http://localhost:3002');
});
