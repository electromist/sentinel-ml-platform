import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// → RATE LIMITING: 5 requests per 60 seconds using sliding window
const hasRedisConfig =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

if (!hasRedisConfig && process.env.NODE_ENV === "development") {
  console.warn("Redis config missing - rate limiting disabled in development");
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

export const limiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  analytics: true,
  prefix: "@upstash/ratelimit",
});
