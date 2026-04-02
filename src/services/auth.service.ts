import bcrypt from "bcrypt";
import type { FastifyInstance } from "fastify";
import { UserStatus } from "@prisma/client";
import * as userDb from "../db/user.db.service.js";
import { AppError } from "../utils/errors.js";

export type LoginInput = { email: string; password: string };

/**
 * Authenticates credentials and returns a signed JWT payload subject.
 * @param app - Fastify instance with JWT registered
 * @param input - Email and password
 * @returns JWT token string
 */
export async function login(
  app: FastifyInstance,
  input: LoginInput
): Promise<{ token: string }> {
  const user = await userDb.findUserByEmail(input.email);
  if (!user) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }
  if (user.status === UserStatus.INACTIVE) {
    throw new AppError(403, "USER_INACTIVE", "Account is inactive");
  }
  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const token = await app.jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    { expiresIn: "7d" }
  );

  return { token };
}
