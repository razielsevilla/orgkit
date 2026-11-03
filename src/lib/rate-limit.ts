/**
 * In-memory sliding-window rate limiter for the invite endpoint.
 * Protects against token brute-force attempts per IP.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Periodic cleanup of stale rate limit entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitMap.entries()) {
      if (now > record.resetAt) {
        rateLimitMap.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref();
}

/**
 * Checks whether an IP has exceeded the allowed attempts within the time window.
 * @param ip Client IP address
 * @param maxAttempts Maximum attempts permitted within the window (default: 20)
 * @param windowMs Time window in milliseconds (default: 60,000ms / 1 min)
 * @returns true if allowed, false if rate limit exceeded
 */
export function checkInviteRateLimit(
  ip: string,
  maxAttempts = 20,
  windowMs = 60 * 1000
): boolean {
  if (!ip) return true;

  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= maxAttempts) {
    return false;
  }

  record.count += 1;
  return true;
}

