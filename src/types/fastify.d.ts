import type { Role, UserStatus } from "@prisma/client";

declare module "fastify" {
  interface FastifyRequest {
    currentUser?: {
      id: string;
      email: string;
      role: Role;
      status: UserStatus;
    };
  }
}
