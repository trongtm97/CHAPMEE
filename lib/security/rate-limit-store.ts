/**
 * In-memory sliding-window rate limit store.
 * Production: replace with Redis or edge rate limiting (see docs/CONTENT_PROTECTION_PLAN.md).
 */

type Bucket = {
  timestamps: number[];
};

const buckets = new Map<string, Bucket>();

const MAX_BUCKETS = 50_000;

function pruneBucket(bucket: Bucket, windowMs: number, now: number) {
  const cutoff = now - windowMs;
  bucket.timestamps = bucket.timestamps.filter((ts) => ts > cutoff);
}

export function checkInMemoryRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}): { allowed: boolean; count: number; remaining: number } {
  const now = Date.now();
  const limit = Math.max(1, input.limit);
  const windowMs = Math.max(1000, input.windowMs);

  if (buckets.size > MAX_BUCKETS) {
    buckets.clear();
  }

  let bucket = buckets.get(input.key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(input.key, bucket);
  }

  pruneBucket(bucket, windowMs, now);
  const count = bucket.timestamps.length;
  const allowed = count < limit;

  if (allowed) {
    bucket.timestamps.push(now);
  }

  return {
    allowed,
    count: allowed ? count + 1 : count,
    remaining: Math.max(limit - count - (allowed ? 1 : 0), 0)
  };
}

export function resetInMemoryRateLimitForTests() {
  buckets.clear();
}
