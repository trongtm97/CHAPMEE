export async function measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
  if (process.env.NODE_ENV !== "development") {
    return fn();
  }

  const startedAt = performance.now();
  try {
    return await fn();
  } finally {
    const duration = Math.round(performance.now() - startedAt);
    if (duration > 1000) {
      console.warn(`[perf] ${name} took ${duration}ms`);
    } else {
      console.debug(`[perf] ${name} took ${duration}ms`);
    }
  }
}
