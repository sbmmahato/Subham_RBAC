import type { FastifyInstance } from "fastify";
import * as authService from "../services/auth.service.js";
import { loginBodySchema } from "../schemas/validation.js";
import { parseOrThrow } from "../utils/parse.js";

/**
 * Registers public authentication routes.
 * @param app - Fastify instance with JWT plugin
 */
export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post("/auth/login", async (request, reply) => {
    const body = parseOrThrow(loginBodySchema, request.body);
    const result = await authService.login(app, body);
    return reply.send(result);
  });
}
