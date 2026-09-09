import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from 'aws-lambda';
import { ZodError } from 'zod';
import { mutationSchema } from '../src/domain/commands';
import { mutate, read } from './repository';
import { resolveProduct } from './products/resolve';
import { ProductError } from './products/errors';
import { protectRequest, recordMalformed } from './access/protection';
import { AccessError } from './access/config';

function response(
  statusCode: number,
  value: unknown,
  retryAfter = 0,
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...(retryAfter ? { 'Retry-After': String(retryAfter) } : {}),
    },
    body: JSON.stringify(value),
  };
}
export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyStructuredResultV2> {
  const owner = event.requestContext.authorizer?.jwt?.claims.sub;
  if (typeof owner !== 'string' || !owner)
    return response(401, { message: 'Sign in to open your kitchen.' });
  try {
    const username = event.requestContext.authorizer.jwt.claims.username;
    await protectRequest(owner, typeof username === 'string' ? username : undefined);
    if (event.routeKey === 'GET /v1/kitchen') return response(200, await read(owner));
    if (!['POST /v1/mutations', 'POST /v1/products/resolve'].includes(event.routeKey))
      return response(404, { message: 'Not found.' });
    const body = requestBody(event);
    if (Buffer.byteLength(body) > 16_384) {
      await recordMalformed(owner);
      return response(413, { message: 'This change is too large.' });
    }
    if (event.routeKey === 'POST /v1/products/resolve')
      return response(200, await resolveProduct(owner, body));
    const mutation = mutationSchema.parse(JSON.parse(body));
    return response(200, await mutate(owner, mutation));
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      try {
        await recordMalformed(owner);
      } catch (guardError) {
        return failure(guardError, event.requestContext.requestId);
      }
    }
    return failure(error, event.requestContext.requestId);
  }
}

function requestBody(event: APIGatewayProxyEventV2WithJWTAuthorizer): string {
  const body = event.body ?? '';
  return event.isBase64Encoded ? Buffer.from(body, 'base64').toString('utf8') : body;
}

function failure(error: unknown, requestId: string): APIGatewayProxyStructuredResultV2 {
  if (error instanceof AccessError)
    return response(error.status, { message: error.message }, error.retryAfter);
  if (error instanceof ProductError) return response(error.status, { message: error.message });
  if (error instanceof SyntaxError || error instanceof ZodError)
    return response(400, { message: 'This change is invalid. Update the app and try again.' });
  if (
    error instanceof Error &&
    /quantity changed|storage is full|do not match|already exists|no longer exists/.test(
      error.message,
    )
  )
    return response(409, { message: error.message });
  console.error('Kitchen request failed', {
    requestId,
    type: error instanceof Error ? error.name : 'Unknown',
  });
  return response(503, {
    message: 'Sync is temporarily unavailable. Your changes remain on your device.',
  });
}
