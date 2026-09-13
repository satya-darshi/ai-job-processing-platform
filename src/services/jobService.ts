import crypto from "crypto";
import { pool } from "../db/pool";
import { cacheJobStatus } from "../cache/redis";
import { publishJob } from "../queue/rabbitmq";
import { JobType } from "../types/job";

export async function createJob(
  type: JobType,
  input: string,
  idempotencyKey?: string
) {
  if (idempotencyKey) {
    const existing = await pool.query(
      "SELECT id, status FROM jobs WHERE idempotency_key = $1",
      [idempotencyKey]
    );
    if (existing.rowCount) return existing.rows[0];
  }

  const id = crypto.randomUUID();

  await pool.query(
    `INSERT INTO jobs (id, type, input, status, idempotency_key)
     VALUES ($1, $2, $3, 'QUEUED', $4)`,
    [id, type, input, idempotencyKey ?? null]
  );

  await cacheJobStatus(id, "QUEUED");
  await publishJob({ jobId: id, type, input, attempt: 1 });

  return { id, status: "QUEUED" };
}

export async function getJob(id: string) {
  const result = await pool.query(
    `SELECT id, type, status, result, error, retry_count,
            created_at, started_at, completed_at
     FROM jobs WHERE id = $1`,
    [id]
  );

  return result.rows[0] ?? null;
}
