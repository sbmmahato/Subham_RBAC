import { Role } from "@prisma/client";

/**
 * Whether the role may create, update, or delete financial records.
 * @param role - User role
 */
export function canWriteFinancialRecords(role: Role): boolean {
  return role === Role.ADMIN;
}

/**
 * Whether the role may list or manage all users.
 * @param role - User role
 */
export function canManageUsers(role: Role): boolean {
  return role === Role.ADMIN;
}

/**
 * Whether the role may read financial records (all roles may read subject to row scope).
 * @param role - User role
 */
export function canReadFinancialRecords(_role: Role): boolean {
  return true;
}

/**
 * Whether the role may view dashboard aggregates.
 * @param role - User role
 */
export function canViewDashboard(_role: Role): boolean {
  return true;
}

/**
 * Whether the user may update another user's profile fields (admin-only fields).
 * @param role - Acting user role
 */
export function canUpdateAnyUser(role: Role): boolean {
  return role === Role.ADMIN;
}
