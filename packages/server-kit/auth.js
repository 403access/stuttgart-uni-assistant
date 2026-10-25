/** Token helpers shared by the assistant server and the distribution service. */
import { createHash, timingSafeEqual } from 'node:crypto';

export function hashToken(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}

export function readBearer(request) {
  const header = request?.headers?.authorization;
  if (typeof header !== 'string') return null;
  const match = /^Bearer\s+([A-Za-z0-9_-]{20,200})$/i.exec(header.trim());
  return match ? match[1] : null;
}

/** Compare two strings without leaking their length through timing. */
export function constantTimeEqual(a, b) {
  const left = Buffer.from(String(a ?? ''));
  const right = Buffer.from(String(b ?? ''));
  return left.length === right.length && timingSafeEqual(left, right);
}
