import type { Prisma, Role, User, UserStatus } from "@prisma/client";
import { getPrisma } from "./prisma.js";

const prisma = () => getPrisma();

/**
 * Finds a user by primary key.
 * @param id - User id
 * @returns User or null
 */
export async function findUserById(id: string): Promise<User | null> {
  return prisma().user.findUnique({ where: { id } });
}

/**
 * Finds a user by email address.
 * @param email - Email
 * @returns User or null
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma().user.findUnique({ where: { email: email.toLowerCase() } });
}

/**
 * Lists users with optional pagination.
 * @param params - Skip/take for pagination
 * @returns Users and total count
 */
export async function listUsers(params: { skip: number; take: number }): Promise<{
  items: User[];
  total: number;
}> {
  const [items, total] = await Promise.all([
    prisma().user.findMany({
      orderBy: { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
    }),
    prisma().user.count(),
  ]);
  return { items, total };
}

export type CreateUserInput = {
  email: string;
  passwordHash: string;
  name?: string | null;
  role: Role;
  status: UserStatus;
};

/**
 * Persists a new user.
 * @param data - User fields
 * @returns Created user
 */
export async function createUser(data: CreateUserInput): Promise<User> {
  return prisma().user.create({
    data: {
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      name: data.name ?? null,
      role: data.role,
      status: data.status,
    },
  });
}

/**
 * Updates a user by id.
 * @param id - User id
 * @param data - Partial user fields
 * @returns Updated user
 */
export async function updateUserById(
  id: string,
  data: Prisma.UserUpdateInput
): Promise<User> {
  return prisma().user.update({ where: { id }, data });
}
