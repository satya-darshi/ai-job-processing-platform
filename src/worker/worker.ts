import { getChannel, JOB_QUEUE } from "../queue/rabbitmq";
import { pool } from "../db/pool";
import { cacheJobStatus } from "../cache/redis";
import { runLLM } from "../ai/llm";
import { env } from "../config/env";
import { JobMessage } from "../types/job";
import { logger } from "../utils/logger";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function processJob(message: JobMessage) {
  const { jobId, type, input, attempt } = message;

  await pool.query(
    "UPDATE jobs SET status='PROCESSING', started_at=COALESCE(started_at, NOW()) WHERE id=$1",
    [jobId]
  );
  await cacheJobStatus(jobId, "PROCESSING");

  const attemptRow = await pool.query(
    `INSERT INTO job_attempts (job_id, attempt_number, status)
     VALUES ($1, $2, 'PROCESSING') RETURNING id`,
    [jobId, attempt]
  );
  const attemptId = attemptRow.rows[0].id;

  try {
    const result = await runLLM(type, input);

    await pool.query(
      `UPDATE jobs
       SET status='COMPLETED', result=$2, completed_at=NOW()
       WHERE id=$1`,
      [jobId, result.text]
    );

    await pool.query(
      `UPDATE job_attempts SET status='COMPLETED', completed_at=NOW() WHERE id=$1`,
      [attemptId]
    );

    await cacheJobStatus(jobId, "COMPLETED");
    logger.info("Job completed", {
      jobId,
      attempt,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens
    });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);

    await pool.query(
      `UPDATE job_attempts
       SET status='FAILED', error=$2, completed_at=NOW()
       WHERE id=$1`,
      [attemptId, messageText]
    );

    if (attempt < env.maxRetries) {
      const nextAttempt = attempt + 1;
      const delay = 1000 * 2 ** (attempt - 1);
      await pool.query(
        "UPDATE jobs SET status='QUEUED', retry_count=$2 WHERE id=$1",
        [jobId, nextAttempt - 1]
      );
      await cacheJobStatus(jobId, "QUEUED");
      await sleep(delay);

      const ch = await getChannel();
      ch.sendToQueue(
        JOB_QUEUE,
        Buffer.from(JSON.stringify({
          jobId,
          type,
          input,
          attempt: nextAttempt
        } satisfies JobMessage)),
        { persistent: true }
      );

      logger.error("Job failed; retry scheduled", {
        jobId,
        attempt,
        nextAttempt
      });
    } else {
      await pool.query(
        `UPDATE jobs SET status='FAILED', error=$2, completed_at=NOW() WHERE id=$1`,
        [jobId, messageText]
      );
      await cacheJobStatus(jobId, "FAILED");
      logger.error("Job permanently failed", { jobId, attempt });
    }
  }
}

async function startWorker() {
  const ch = await getChannel();
  await ch.prefetch(5);

  ch.consume(JOB_QUEUE, async (msg) => {
    if (!msg) return;

    try {
      const job = JSON.parse(msg.content.toString()) as JobMessage;
      await processJob(job);
      ch.ack(msg);
    } catch (error) {
      logger.error("Unexpected worker error", {
        error: error instanceof Error ? error.message : String(error)
      });
      ch.nack(msg, false, false);
    }
  });

  logger.info("Worker started");
}

startWorker().catch((error) => {
  logger.error("Worker startup failed", {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
});
