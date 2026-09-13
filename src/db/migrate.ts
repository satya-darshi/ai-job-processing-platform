import { pool } from "./pool";

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jobs (
      id UUID PRIMARY KEY,
      type VARCHAR(30) NOT NULL,
      input TEXT NOT NULL,
      status VARCHAR(20) NOT NULL,
      result TEXT,
      error TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0,
      idempotency_key VARCHAR(255) UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS job_attempts (
      id BIGSERIAL PRIMARY KEY,
      job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      attempt_number INTEGER NOT NULL,
      status VARCHAR(20) NOT NULL,
      error TEXT,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
  `);

  console.log("Database migration complete.");
  await pool.end();
}

migrate().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
