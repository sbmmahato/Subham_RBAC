import { Role, TransactionType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import * as recordDb from "../db/financialRecord.db.service.js";
import * as userDb from "../db/user.db.service.js";
import { AppError } from "../utils/errors.js";
import * as rbac from "./rbac.service.js";

export type CreateRecordInput = {
  userId: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: Date;
  notes?: string | null;
};

export type UpdateRecordInput = {
  amount?: number;
  type?: TransactionType;
  category?: string;
  date?: Date;
  notes?: string | null;
  userId?: string;
};

export type ListRecordsQuery = {
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  category?: string;
  type?: TransactionType;
  page: number;
  limit: number;
};

/**
 * Resolves list scope: non-admins always see own records; admins may filter by userId or see all.
 * @param actorId - Current user id
 * @param actorRole - Current user role
 * @param filterUserId - Optional userId query from client
 */
function resolveListScope(
  actorId: string,
  actorRole: Role,
  filterUserId?: string
): { userIdScope?: string } {
  if (actorRole === Role.ADMIN) {
    if (filterUserId) return { userIdScope: filterUserId };
    return {};
  }
  if (filterUserId && filterUserId !== actorId) {
    throw new AppError(403, "FORBIDDEN", "Cannot view another user's records");
  }
  return { userIdScope: actorId };
}

/**
 * Ensures the actor may access a single record by id.
 * @param actorId - Current user id
 * @param actorRole - Current user role
 * @param record - Record or null
 */
function assertRecordAccess(
  actorId: string,
  actorRole: Role,
  record: { userId: string } | null
): asserts record is { userId: string } {
  if (!record) {
    throw new AppError(404, "NOT_FOUND", "Record not found");
  }
  if (actorRole !== Role.ADMIN && record.userId !== actorId) {
    throw new AppError(403, "FORBIDDEN", "Insufficient permissions");
  }
}

/**
 * Serializes a Prisma record for JSON (decimal as string).
 * @param r - Financial record
 */
function serializeRecord(r: Awaited<ReturnType<typeof recordDb.findRecordById>>) {
  if (!r) return null;
  return {
    id: r.id,
    userId: r.userId,
    amount: r.amount.toString(),
    type: r.type,
    category: r.category,
    date: r.date.toISOString(),
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

/**
 * Creates a financial record (admin only).
 * @param actorRole - Current role
 * @param input - Record payload
 */
export async function createRecord(actorRole: Role, input: CreateRecordInput) {
  if (!rbac.canWriteFinancialRecords(actorRole)) {
    throw new AppError(403, "FORBIDDEN", "Only administrators can create records");
  }
  const owner = await userDb.findUserById(input.userId);
  if (!owner) {
    throw new AppError(400, "INVALID_USER", "Target user does not exist");
  }
  const record = await recordDb.createRecord({
    userId: input.userId,
    amount: input.amount,
    type: input.type,
    category: input.category,
    date: input.date,
    notes: input.notes,
  });
  return serializeRecord(record);
}

/**
 * Lists records with filters and pagination.
 * @param actorId - Current user id
 * @param actorRole - Current role
 * @param query - Filters and pagination
 */
export async function listRecords(
  actorId: string,
  actorRole: Role,
  query: ListRecordsQuery
) {
  if (!rbac.canReadFinancialRecords(actorRole)) {
    throw new AppError(403, "FORBIDDEN", "Insufficient permissions");
  }
  const scope = resolveListScope(actorId, actorRole, query.userId);
  const skip = (query.page - 1) * query.limit;
  const { items, total } = await recordDb.listRecords({
    ...scope,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    category: query.category,
    type: query.type,
    skip,
    take: query.limit,
  });
  return {
    items: items.map((r) => serializeRecord(r)!),
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit) || 1,
  };
}

/**
 * Gets one record by id with access check.
 * @param actorId - Current user id
 * @param actorRole - Current role
 * @param recordId - Record id
 */
export async function getRecordById(actorId: string, actorRole: Role, recordId: string) {
  const record = await recordDb.findRecordById(recordId);
  assertRecordAccess(actorId, actorRole, record);
  return serializeRecord(record);
}

/**
 * Updates a record (admin only).
 * @param actorRole - Current role
 * @param recordId - Record id
 * @param data - Partial update
 */
export async function updateRecord(actorRole: Role, recordId: string, data: UpdateRecordInput) {
  if (!rbac.canWriteFinancialRecords(actorRole)) {
    throw new AppError(403, "FORBIDDEN", "Only administrators can update records");
  }
  const existing = await recordDb.findRecordById(recordId);
  if (!existing) {
    throw new AppError(404, "NOT_FOUND", "Record not found");
  }
  if (data.userId) {
    const owner = await userDb.findUserById(data.userId);
    if (!owner) {
      throw new AppError(400, "INVALID_USER", "Target user does not exist");
    }
  }
  const updated = await recordDb.updateRecordById(recordId, {
    ...(data.amount !== undefined ? { amount: new Decimal(data.amount) } : {}),
    ...(data.type !== undefined ? { type: data.type } : {}),
    ...(data.category !== undefined ? { category: data.category } : {}),
    ...(data.date !== undefined ? { date: data.date } : {}),
    ...(data.notes !== undefined ? { notes: data.notes } : {}),
    ...(data.userId !== undefined ? { userId: data.userId } : {}),
  });
  return serializeRecord(updated);
}

/**
 * Deletes a record (admin only).
 * @param actorRole - Current role
 * @param recordId - Record id
 */
export async function deleteRecord(actorRole: Role, recordId: string): Promise<void> {
  if (!rbac.canWriteFinancialRecords(actorRole)) {
    throw new AppError(403, "FORBIDDEN", "Only administrators can delete records");
  }
  const existing = await recordDb.findRecordById(recordId);
  if (!existing) {
    throw new AppError(404, "NOT_FOUND", "Record not found");
  }
  await recordDb.deleteRecordById(recordId);
}
