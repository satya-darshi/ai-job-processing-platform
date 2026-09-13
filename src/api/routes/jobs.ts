import { Router } from "express";
import { z } from "zod";
import { createJob, getJob } from "../../services/jobService";

const router = Router();

const createSchema = z.object({
  type: z.enum(["summarize", "classify"]),
  input: z.string().min(1).max(100_000)
});

/**
 * @openapi
 * /jobs:
 *   post:
 *     summary: Create an asynchronous AI job
 *     responses:
 *       201:
 *         description: Job queued
 */
router.post("/", async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const idempotencyKey = req.header("Idempotency-Key") ?? undefined;

    const job = await createJob(body.type, body.input, idempotencyKey);
    res.status(201).json({
      jobId: job.id,
      status: job.status
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid request",
        details: error.issues
      });
    }
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const job = await getJob(req.params.id);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json({
      jobId: job.id,
      type: job.type,
      status: job.status,
      result: job.result,
      error: job.error,
      retryCount: job.retry_count,
      createdAt: job.created_at,
      startedAt: job.started_at,
      completedAt: job.completed_at
    });
  } catch (error) {
    next(error);
  }
});

export default router;
