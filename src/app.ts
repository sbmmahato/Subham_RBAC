import Fastify from "fastify";
import jwt from "@fastify/jwt";
import type { FastifyInstance } from "fastify";
import { loadEnv } from "./config/env.js";
import { authenticate } from "./middleware/authenticate.js";
import { AppError } from "./utils/errors.js";
import { registerAuthRoutes } from "./routes/auth.routes.js";
import { registerUserRoutes } from "./routes/users.routes.js";
import { registerRecordRoutes } from "./routes/records.routes.js";
import { registerDashboardRoutes } from "./routes/dashboard.routes.js";

/**
 * Builds the Fastify application with plugins, JWT, and routes.
 * @returns Configured Fastify instance
 */
export async function buildApp(): Promise<FastifyInstance> {
  const env = loadEnv();

  const app = Fastify({
    logger: env.nodeEnv === "development",
  });

  await app.register(jwt, {
    secret: env.jwtSecret,
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details !== undefined ? { details: error.details } : {}),
        },
      });
    }
    request.log.error(error);
    return reply.status(500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    });
  });

  app.get("/health", async () => ({ status: "ok" }));

  await registerAuthRoutes(app);

  await app.register(async function protectedRoutes(fastify) {
    fastify.addHook("preHandler", authenticate);
    await registerUserRoutes(fastify);
    await registerRecordRoutes(fastify);
    await registerDashboardRoutes(fastify);
  });

  return app;
}
