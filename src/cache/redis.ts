import Redis from "ioredis";
import { env } from "../config/env";

export const redis = new Redis(env.redisUrl);

export async function cacheJobStatus(
  jobId: string,
  status: string
): Promise<void> {
  await redis.set(`job:${jobId}:status`, status, "EX", 300);
}
