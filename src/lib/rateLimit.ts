/** Expected HTTP throttling, not an unexpected application failure. */
export class RateLimitError extends Error {
  readonly retryAt: number;

  constructor(message: string, retryAfter: string | null, now = Date.now()) {
    super(message);
    this.name = "RateLimitError";
    const seconds = retryAfter ? Number(retryAfter) : NaN;
    const date = retryAfter ? Date.parse(retryAfter) : NaN;
    const minutes = message.match(/(\d+)\s*minutos?/i);
    const duration = minutes ? Number(minutes[1]) * 60_000 : 60_000;
    this.retryAt =
      Number.isFinite(seconds) && seconds >= 0
        ? now + seconds * 1000
        : Number.isFinite(date) && date > now
          ? date
          : now + duration;
  }
}
