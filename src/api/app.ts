import express from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import jobsRouter from "./routes/jobs";
import { errorHandler } from "./middleware/errorHandler";

export const app = express();

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/jobs", jobsRouter);

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "AI Jobs Processing Platform API",
      version: "1.0.0"
    }
  },
  apis: ["./src/api/routes/*.ts"]
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(errorHandler);
