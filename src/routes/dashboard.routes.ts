import type { FastifyInstance } from "fastify";
import * as dashboardService from "../services/dashboard.service.js";
import { dashboardQuerySchema, recentQuerySchema } from "../schemas/validation.js";
import { parseOrThrow } from "../utils/parse.js";

/**
 * Registers dashboard analytics routes.
 * @param app - Fastify instance
 */
export async function registerDashboardRoutes(app: FastifyInstance): Promise<void> {
  app.get("/dashboard/summary", async (request) => {
    const u = request.currentUser!;
    const q = parseOrThrow(dashboardQuerySchema, request.query);
    return dashboardService.getSummary(u.id, u.role, {
      userId: q.userId,
      dateFrom: q.dateFrom ? new Date(q.dateFrom) : undefined,
      dateTo: q.dateTo ? new Date(q.dateTo) : undefined,
    });
  });

  app.get("/dashboard/by-category", async (request) => {
    const u = request.currentUser!;
    const q = parseOrThrow(dashboardQuerySchema, request.query);
    return dashboardService.getByCategory(u.id, u.role, {
      userId: q.userId,
      dateFrom: q.dateFrom ? new Date(q.dateFrom) : undefined,
      dateTo: q.dateTo ? new Date(q.dateTo) : undefined,
    });
  });

  app.get("/dashboard/trends", async (request) => {
    const u = request.currentUser!;
    const q = parseOrThrow(dashboardQuerySchema, request.query);
    return dashboardService.getTrends(u.id, u.role, {
      userId: q.userId,
      dateFrom: q.dateFrom ? new Date(q.dateFrom) : undefined,
      dateTo: q.dateTo ? new Date(q.dateTo) : undefined,
    });
  });

  app.get("/dashboard/recent", async (request) => {
    const u = request.currentUser!;
    const q = parseOrThrow(recentQuerySchema, request.query);
    return dashboardService.getRecent(
      u.id,
      u.role,
      {
        userId: q.userId,
        dateFrom: q.dateFrom ? new Date(q.dateFrom) : undefined,
        dateTo: q.dateTo ? new Date(q.dateTo) : undefined,
      },
      q.limit
    );
  });
}
