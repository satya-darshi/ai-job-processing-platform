# AI job Processing Platform

An asynchronous backend platform for submitting long-running AI jobs without blocking HTTP requests.

## Architecture

```text
Client
  |
  v
Express API
  |
  +----> PostgreSQL (job metadata/results)
  |
  +----> Redis (job-status cache)
  |
  +----> RabbitMQ (job queue)
              |
              v
         Worker Service
              |
              v
          LLM Provider
```

## Features

- REST API for creating and querying jobs
- PostgreSQL persistence
- RabbitMQ producer/consumer architecture
- Dedicated background worker
- Redis job-status caching
- LLM integration for summarization/classification
- Retry with exponential backoff
- Idempotency keys
- Dead-letter queue for permanently failed jobs
- Structured logging
- Docker Compose development environment
- Swagger/OpenAPI documentation
- Jest/Supertest API tests

## Tech Stack

- Node.js 20+
- TypeScript
- Express
- PostgreSQL
- RabbitMQ
- Redis
- OpenAI-compatible LLM API
- Docker Compose
- Jest + Supertest

## Quick Start

### 1. Clone and configure

```bash
git clone <your-github-repository-url>
cd ai-job-processing-platform
cp .env.example .env
```

Add your LLM API key to `.env`.

### 2. Start infrastructure

```bash
docker compose up -d postgres redis rabbitmq
```

### 3. Install dependencies

```bash
npm install
```

### 4. Run database migrations

```bash
npm run migrate
```

### 5. Start API and worker

In two terminals:

```bash
npm run dev:api
```

```bash
npm run dev:worker
```

API runs on `http://localhost:3000`.

Swagger UI:
`http://localhost:3000/docs`

Health check:
`GET /health`

## API Examples

### Create a job

```bash
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: demo-001" \
  -d '{
    "type": "summarize",
    "input": "RabbitMQ allows backend applications to process long-running jobs asynchronously."
  }'
```

Response:

```json
{
  "jobId": "uuid",
  "status": "QUEUED"
}
```

### Check a job

```bash
curl http://localhost:3000/jobs/<job-id>
```

### Supported job types

- `summarize`
- `classify`

## Environment Variables

See `.env.example`.

For local development, the default Docker credentials are intentionally simple. Do not use them in production.

## Project Structure

```text
src/
├── api/
│   ├── app.ts
│   ├── server.ts
│   ├── routes/
│   │   └── jobs.ts
│   └── middleware/
│       └── errorHandler.ts
├── config/
│   └── env.ts
├── db/
│   ├── pool.ts
│   └── migrate.ts
├── queue/
│   └── rabbitmq.ts
├── cache/
│   └── redis.ts
├── ai/
│   └── llm.ts
├── services/
│   └── jobService.ts
├── worker/
│   └── worker.ts
├── types/
│   └── job.ts
└── utils/
    └── logger.ts
```

## Reliability Design

### Retry

Transient worker failures are retried up to three times. The delay grows exponentially:

```text
attempt 1 -> 1 second
attempt 2 -> 2 seconds
attempt 3 -> 4 seconds
```

Jobs that still fail are marked `FAILED`.

### Idempotency

Clients can send an `Idempotency-Key`. The server stores the key with the resulting job so accidental duplicate submissions can return the original job instead of creating another one.

### Dead-letter queue

Messages that cannot be processed successfully are routed to a dead-letter queue for later inspection.

## Testing

```bash
npm test
```

The API tests focus on validation, job creation, and health checks.

## Future Improvements

- Authentication and per-user quotas
- Horizontal worker scaling
- Prometheus metrics
- OpenTelemetry tracing
- WebSocket/SSE job-status updates
- Batch jobs
- More AI providers/models
- Production secret management
- Kubernetes deployment
