import type { FinancialRecord, Prisma, TransactionType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { getPrisma } from "./prisma.js";

const prisma = () => getPrisma();

export type RecordListFilters = {
  userIdScope?: string;
  dateFrom?: Date;
  dateTo?: Date;
  category?: string;
  type?: TransactionType;
  skip: number;
  take: number;
};

/**
 * Creates a financial record row.
 * @param data - Record fields
 * @returns Created record
 */
export async function createRecord(data: {
  userId: string;
  amount: Decimal | number;
  type: TransactionType;
  category: string;
  date: Date;
  notes?: string | null;
}): Promise<FinancialRecord> {
  return prisma().financialRecord.create({
    data: {
      userId: data.userId,
      amount: new Decimal(data.amount.toString()),
      type: data.type,
      category: data.category,
      date: data.date,
      notes: data.notes ?? null,
    },
  });
}

/**
 * Finds a record by id.
 * @param id - Record id
 * @returns Record or null
 */
export async function findRecordById(id: string): Promise<FinancialRecord | null> {
  return prisma().financialRecord.findUnique({ where: { id } });
}

/**
 * Lists records with filters and pagination.
 * @param filters - Scope and query filters
 * @returns Items and total count
 */
export async function listRecords(
  filters: RecordListFilters
): Promise<{ items: FinancialRecord[]; total: number }> {
  const where: Prisma.FinancialRecordWhereInput = {};

  if (filters.userIdScope) {
    where.userId = filters.userIdScope;
  }

  if (filters.dateFrom || filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) where.date.gte = filters.dateFrom;
    if (filters.dateTo) where.date.lte = filters.dateTo;
  }

  if (filters.category) {
    where.category = filters.category;
  }

  if (filters.type) {
    where.type = filters.type;
  }

  const [items, total] = await Promise.all([
    prisma().financialRecord.findMany({
      where,
      orderBy: { date: "desc" },
      skip: filters.skip,
      take: filters.take,
    }),
    prisma().financialRecord.count({ where }),
  ]);

  return { items, total };
}

/**
 * Updates a record by id.
 * @param id - Record id
 * @param data - Fields to update
 * @returns Updated record
 */
export async function updateRecordById(
  id: string,
  data: Prisma.FinancialRecordUpdateInput
): Promise<FinancialRecord> {
  return prisma().financialRecord.update({ where: { id }, data });
}

/**
 * Deletes a record by id.
 * @param id - Record id
 */
export async function deleteRecordById(id: string): Promise<void> {
  await prisma().financialRecord.delete({ where: { id } });
}
