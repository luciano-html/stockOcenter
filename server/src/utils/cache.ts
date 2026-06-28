import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

export function getCache<T>(key: string): T | undefined {
  return cache.get<T>(key);
}

export function setCache<T>(key: string, value: T, ttlSeconds = 60): void {
  cache.set(key, value, ttlSeconds);
}

export function delCache(key: string): void {
  cache.del(key);
}

export function clearStockCache(): void {
  const keys = cache.keys();
  const stockKeys = keys.filter((k) => k.startsWith('stock:') || k.startsWith('sillas:'));
  cache.del(stockKeys);
}
