
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../../src/api/app.js";

describe("Express application", () => {
  const app = createApp({});

  it("should return 404 for an unknown route", async () => {
    const response = await request(app).get("/unknown");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
    expect(response.body.error.message).toBe("Resource not found");
    expect(response.body.error.details).toEqual([]);
  });

  it("should return 400 for invalid JSON", async () => {
    const response = await request(app)
      .post("/unknown")
      .set("Content-Type", "application/json")
      .send('{"name":');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_JSON");
  });
});
