import type { FastifyReply, FastifyRequest } from "fastify";
import { UserStatus } from "@prisma/client";
import * as userDb from "../db/user.db.service.js";

type JwtPayload = { sub: string; email?: string; role?: string };

/**
 * Verifies JWT and attaches the current active user to the request.
 * @param request - Fastify request
 * @param reply - Fastify reply
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    await reply.status(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid token",
      },
    });
    return;
  }

  const payload = request.user as JwtPayload;
  const user = await userDb.findUserById(payload.sub);
  if (!user || user.status !== UserStatus.ACTIVE) {
    await reply.status(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "User not found or inactive",
      },
    });
    return;
  }

  request.currentUser = {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}
