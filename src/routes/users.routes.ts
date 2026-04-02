import type { FastifyInstance } from "fastify";
import * as userService from "../services/user.service.js";
import {
  createUserBodySchema,
  paginationQuerySchema,
  updateUserBodySchema,
} from "../schemas/validation.js";
import { parseOrThrow } from "../utils/parse.js";

/**
 * Registers user management routes (require authentication).
 * @param app - Fastify instance
 */
export async function registerUserRoutes(app: FastifyInstance): Promise<void> {
  app.get("/me", async (request) => {
    const u = request.currentUser!;
    return userService.getUserById(u.id, u.role, u.id);
  });

  app.get("/users", async (request) => {
    const u = request.currentUser!;
    const q = parseOrThrow(paginationQuerySchema, request.query);
    return userService.listUsers(u.role, q.page, q.limit);
  });

  app.post("/users", async (request, reply) => {
    const u = request.currentUser!;
    const body = parseOrThrow(createUserBodySchema, request.body);
    const created = await userService.createUser(u.role, {
      email: body.email,
      password: body.password,
      name: body.name,
      role: body.role,
      status: body.status,
    });
    return reply.status(201).send(created);
  });

  app.get("/users/:id", async (request) => {
    const u = request.currentUser!;
    const { id } = request.params as { id: string };
    return userService.getUserById(u.id, u.role, id);
  });

  app.patch("/users/:id", async (request) => {
    const u = request.currentUser!;
    const { id } = request.params as { id: string };
    const body = parseOrThrow(updateUserBodySchema, request.body);
    return userService.updateUser(u.id, u.role, id, body);
  });
}
