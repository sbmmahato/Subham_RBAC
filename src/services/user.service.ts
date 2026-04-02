import bcrypt from "bcrypt";
import { Role, UserStatus } from "@prisma/client";
import * as userDb from "../db/user.db.service.js";
import { AppError } from "../utils/errors.js";
import * as rbac from "./rbac.service.js";

export type CreateUserServiceInput = {
  email: string;
  password: string;
  name?: string | null;
  role: Role;
  status: UserStatus;
};

export type UpdateUserServiceInput = {
  name?: string | null;
  role?: Role;
  status?: UserStatus;
  email?: string;
};

/**
 * Creates a user (admin only — enforced by route).
 * @param actorRole - Calling user's role
 * @param data - New user fields
 * @returns Created user without password hash
 */
export async function createUser(actorRole: Role, data: CreateUserServiceInput) {
  if (!rbac.canManageUsers(actorRole)) {
    throw new AppError(403, "FORBIDDEN", "Insufficient permissions");
  }
  const existing = await userDb.findUserByEmail(data.email);
  if (existing) {
    throw new AppError(409, "EMAIL_EXISTS", "Email already registered");
  }
  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await userDb.createUser({
    email: data.email,
    passwordHash,
    name: data.name,
    role: data.role,
    status: data.status,
  });
  return sanitizeUser(user);
}

/**
 * Lists users with pagination (admin only).
 * @param actorRole - Calling user's role
 * @param page - 1-based page
 * @param limit - Page size
 */
export async function listUsers(actorRole: Role, page: number, limit: number) {
  if (!rbac.canManageUsers(actorRole)) {
    throw new AppError(403, "FORBIDDEN", "Insufficient permissions");
  }
  const skip = (page - 1) * limit;
  const { items, total } = await userDb.listUsers({ skip, take: limit });
  return {
    items: items.map(sanitizeUser),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Returns a single user if the actor may access it.
 * @param actorId - Calling user id
 * @param actorRole - Calling user role
 * @param targetId - Target user id
 */
export async function getUserById(actorId: string, actorRole: Role, targetId: string) {
  if (actorId !== targetId && !rbac.canManageUsers(actorRole)) {
    throw new AppError(403, "FORBIDDEN", "Insufficient permissions");
  }
  const user = await userDb.findUserById(targetId);
  if (!user) {
    throw new AppError(404, "NOT_FOUND", "User not found");
  }
  return sanitizeUser(user);
}

/**
 * Updates a user; admins may change role/status/email; users may update own name only.
 * @param actorId - Calling user id
 * @param actorRole - Calling user role
 * @param targetId - Target user id
 * @param data - Fields to update
 */
export async function updateUser(
  actorId: string,
  actorRole: Role,
  targetId: string,
  data: UpdateUserServiceInput
) {
  const isSelf = actorId === targetId;
  const isAdmin = rbac.canManageUsers(actorRole);

  if (!isSelf && !isAdmin) {
    throw new AppError(403, "FORBIDDEN", "Insufficient permissions");
  }

  if (!isAdmin && (data.role !== undefined || data.status !== undefined || data.email !== undefined)) {
    throw new AppError(403, "FORBIDDEN", "Cannot change role, status, or email");
  }

  const user = await userDb.findUserById(targetId);
  if (!user) {
    throw new AppError(404, "NOT_FOUND", "User not found");
  }

  if (data.email && data.email !== user.email) {
    const taken = await userDb.findUserByEmail(data.email);
    if (taken && taken.id !== targetId) {
      throw new AppError(409, "EMAIL_EXISTS", "Email already registered");
    }
  }

  const updated = await userDb.updateUserById(targetId, {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.role !== undefined && isAdmin ? { role: data.role } : {}),
    ...(data.status !== undefined && isAdmin ? { status: data.status } : {}),
    ...(data.email !== undefined && isAdmin ? { email: data.email.toLowerCase() } : {}),
  });

  return sanitizeUser(updated);
}

/**
 * Strips sensitive fields from a user record for API responses.
 * @param user - Prisma user
 */
function sanitizeUser(user: {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  passwordHash?: string;
}) {
  const { passwordHash: _p, ...rest } = user as typeof user & { passwordHash?: string };
  return rest;
}
