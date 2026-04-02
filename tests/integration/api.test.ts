import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { loginToken } from "../helpers.js";

const PASSWORD = "password123";

describe("Finance API integration", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /health", () => {
    it("returns ok", async () => {
      const res = await app.inject({ method: "GET", url: "/health" });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual({ status: "ok" });
    });
  });

  describe("POST /auth/login", () => {
    it("returns 401 for wrong password", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "admin@example.com", password: "wrong" },
      });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body) as { error: { code: string } };
      expect(body.error.code).toBe("INVALID_CREDENTIALS");
    });

    it("returns token for viewer", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "viewer@example.com", password: PASSWORD },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as { token: string };
      expect(body.token).toBeTruthy();
    });
  });

  describe("protected routes without token", () => {
    it("GET /me returns 401", async () => {
      const res = await app.inject({ method: "GET", url: "/me" });
      expect(res.statusCode).toBe(401);
    });
  });

  describe("GET /me", () => {
    it("returns current user for valid token", async () => {
      const token = await loginToken(app, "viewer@example.com", PASSWORD);
      const res = await app.inject({
        method: "GET",
        url: "/me",
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as { email: string; role: string };
      expect(body.email).toBe("viewer@example.com");
      expect(body.role).toBe("VIEWER");
      expect(body).not.toHaveProperty("passwordHash");
    });
  });

  describe("GET /users (admin)", () => {
    it("403 for viewer", async () => {
      const token = await loginToken(app, "viewer@example.com", PASSWORD);
      const res = await app.inject({
        method: "GET",
        url: "/users?page=1&limit=10",
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it("200 and items for admin", async () => {
      const token = await loginToken(app, "admin@example.com", PASSWORD);
      const res = await app.inject({
        method: "GET",
        url: "/users?page=1&limit=10",
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as { items: unknown[]; total: number };
      expect(body.items.length).toBeGreaterThan(0);
      expect(body.total).toBeGreaterThanOrEqual(3);
    });
  });

  describe("POST /users", () => {
    it("403 for viewer", async () => {
      const token = await loginToken(app, "viewer@example.com", PASSWORD);
      const res = await app.inject({
        method: "POST",
        url: "/users",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          email: "shouldfail@example.com",
          password: "password12345",
          role: "VIEWER",
          status: "ACTIVE",
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it("201 for admin", async () => {
      const token = await loginToken(app, "admin@example.com", PASSWORD);
      const email = `created-${Date.now()}@example.com`;
      const res = await app.inject({
        method: "POST",
        url: "/users",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          email,
          password: "password12345",
          name: "Created User",
          role: "VIEWER",
          status: "ACTIVE",
        },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body) as { email: string };
      expect(body.email).toBe(email);
    });
  });

  describe("Financial records", () => {
    let viewerId: string;
    let viewerToken: string;
    let adminToken: string;
    let recordId: string;

    beforeAll(async () => {
      viewerToken = await loginToken(app, "viewer@example.com", PASSWORD);
      adminToken = await loginToken(app, "admin@example.com", PASSWORD);
      const me = await app.inject({
        method: "GET",
        url: "/me",
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      viewerId = (JSON.parse(me.body) as { id: string }).id;

      const list = await app.inject({
        method: "GET",
        url: "/records?limit=1",
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      const items = (JSON.parse(list.body) as { items: { id: string }[] }).items;
      recordId = items[0]?.id;
    });

    it("GET /records returns seeded data for viewer", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/records?page=1&limit=20",
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as { items: unknown[]; total: number };
      expect(body.total).toBeGreaterThan(0);
    });

    it("POST /records 403 for viewer", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/records",
        headers: { authorization: `Bearer ${viewerToken}` },
        payload: {
          userId: viewerId,
          amount: 10,
          type: "INCOME",
          category: "X",
          date: "2024-01-01T00:00:00.000Z",
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it("POST /records 201 for admin", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/records",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          userId: viewerId,
          amount: 99.5,
          type: "EXPENSE",
          category: "TestCategory",
          date: "2024-03-15T10:00:00.000Z",
          notes: "integration test",
        },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body) as { id: string; amount: string };
      expect(body.amount).toBe("99.5");
      recordId = body.id;
    });

    it("GET /records/:id scoped for viewer", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/records/${recordId}`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      expect(res.statusCode).toBe(200);
    });

    it("PATCH /records/:id for admin", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/records/${recordId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { amount: 100, notes: "patched" },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as { amount: string; notes: string };
      expect(body.amount).toBe("100");
      expect(body.notes).toBe("patched");
    });

    it("DELETE /records/:id for admin", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: `/records/${recordId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(204);
    });
  });

  describe("Dashboard", () => {
    it("GET /dashboard/summary returns totals", async () => {
      const token = await loginToken(app, "viewer@example.com", PASSWORD);
      const res = await app.inject({
        method: "GET",
        url: "/dashboard/summary",
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as {
        totalIncome: number;
        totalExpense: number;
        net: number;
      };
      expect(typeof body.totalIncome).toBe("number");
      expect(typeof body.totalExpense).toBe("number");
      expect(body.net).toBe(body.totalIncome - body.totalExpense);
    });

    it("GET /dashboard/by-category", async () => {
      const token = await loginToken(app, "analyst@example.com", PASSWORD);
      const res = await app.inject({
        method: "GET",
        url: "/dashboard/by-category",
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as { items: unknown[] };
      expect(Array.isArray(body.items)).toBe(true);
    });

    it("GET /dashboard/trends", async () => {
      const token = await loginToken(app, "viewer@example.com", PASSWORD);
      const res = await app.inject({
        method: "GET",
        url: "/dashboard/trends",
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as { items: unknown[] };
      expect(Array.isArray(body.items)).toBe(true);
    });

    it("GET /dashboard/recent", async () => {
      const token = await loginToken(app, "admin@example.com", PASSWORD);
      const res = await app.inject({
        method: "GET",
        url: "/dashboard/recent?limit=5",
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as { items: unknown[] };
      expect(Array.isArray(body.items)).toBe(true);
    });
  });

  describe("Validation", () => {
    it("POST /records with invalid body returns 400", async () => {
      const token = await loginToken(app, "admin@example.com", PASSWORD);
      const res = await app.inject({
        method: "POST",
        url: "/records",
        headers: { authorization: `Bearer ${token}` },
        payload: { userId: "not-a-uuid", amount: -1 },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body) as { error: { code: string } };
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });
  });
});
