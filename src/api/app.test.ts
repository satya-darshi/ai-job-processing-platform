import request from "supertest";
import { app } from "./app";

describe("API", () => {
  it("returns health status", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("rejects invalid job types", async () => {
    const response = await request(app)
      .post("/jobs")
      .send({ type: "invalid", input: "hello" });

    expect(response.status).toBe(400);
  });
});
