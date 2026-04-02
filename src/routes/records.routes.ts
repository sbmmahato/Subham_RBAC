import type { FastifyInstance } from "fastify";
import * as recordService from "../services/financialRecord.service.js";
import {
  recordCreateBodySchema,
  recordListQuerySchema,
  recordUpdateBodySchema,
} from "../schemas/validation.js";
import { parseOrThrow } from "../utils/parse.js";

/**
 * Registers financial record CRUD routes.
 * @param app - Fastify instance
 */
export async function registerRecordRoutes(app: FastifyInstance): Promise<void> {
  app.get("/records", async (request) => {
    const u = request.currentUser!;
    const q = parseOrThrow(recordListQuerySchema, request.query);
    return recordService.listRecords(u.id, u.role, {
      userId: q.userId,
      dateFrom: q.dateFrom ? new Date(q.dateFrom) : undefined,
      dateTo: q.dateTo ? new Date(q.dateTo) : undefined,
      category: q.category,
      type: q.type,
      page: q.page,
      limit: q.limit,
    });
  });

  app.post("/records", async (request, reply) => {
    const u = request.currentUser!;
    const body = parseOrThrow(recordCreateBodySchema, request.body);
    const created = await recordService.createRecord(u.role, {
      userId: body.userId,
      amount: body.amount,
      type: body.type,
      category: body.category,
      date: new Date(body.date),
      notes: body.notes,
    });
    return reply.status(201).send(created);
  });

  app.get("/records/:id", async (request) => {
    const u = request.currentUser!;
    const { id } = request.params as { id: string };
    return recordService.getRecordById(u.id, u.role, id);
  });

  app.patch("/records/:id", async (request) => {
    const u = request.currentUser!;
    const { id } = request.params as { id: string };
    const body = parseOrThrow(recordUpdateBodySchema, request.body);
    return recordService.updateRecord(u.role, id, {
      userId: body.userId,
      amount: body.amount,
      type: body.type,
      category: body.category,
      date: body.date ? new Date(body.date) : undefined,
      notes: body.notes,
    });
  });

  app.delete("/records/:id", async (request, reply) => {
    const u = request.currentUser!;
    const { id } = request.params as { id: string };
    await recordService.deleteRecord(u.role, id);
    return reply.status(204).send();
  });
}
