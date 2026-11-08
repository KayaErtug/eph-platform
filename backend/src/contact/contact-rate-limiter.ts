/** IP başına pencere içinde en çok `limit` istek (bellek içi). */
export class ContactRateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit = 5,
    private readonly windowMs = 60 * 60 * 1000,
    private readonly maxKeys = 10000,
  ) {}

  /** true: izin verildi ve sayıldı; false: limit aşıldı. */
  consume(key: string, now = Date.now()): boolean {
    const recent = (this.hits.get(key) ?? []).filter(
      (t) => now - t < this.windowMs,
    );
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > this.maxKeys) this.prune(now);
    return true;
  }

  private prune(now: number) {
    for (const [k, v] of this.hits) {
      if (!v.some((t) => now - t < this.windowMs)) this.hits.delete(k);
    }
  }
}
