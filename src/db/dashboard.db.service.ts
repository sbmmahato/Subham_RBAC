import type { Prisma, TransactionType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { getPrisma } from "./prisma.js";

const prisma = () => getPrisma();

export type DashboardScope = {
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
};

/**
 * Builds a where clause for dashboard aggregations.
 * @param scope - Optional user id and date range
 * @returns Prisma where input
 */
function scopeWhere(scope: DashboardScope): Prisma.FinancialRecordWhereInput {
  const where: Prisma.FinancialRecordWhereInput = {};
  if (scope.userId) where.userId = scope.userId;
  if (scope.dateFrom || scope.dateTo) {
    where.date = {};
    if (scope.dateFrom) where.date.gte = scope.dateFrom;
    if (scope.dateTo) where.date.lte = scope.dateTo;
  }
  return where;
}

/**
 * Computes total income and expense for the given scope.
 * @param scope - User and date filters
 * @returns Sums for income and expense
 */
export async function aggregateIncomeExpense(scope: DashboardScope): Promise<{
  totalIncome: string;
  totalExpense: string;
}> {
  const whereBase = scopeWhere(scope);
  const [income, expense] = await Promise.all([
    prisma().financialRecord.aggregate({
      where: { ...whereBase, type: "INCOME" as TransactionType },
      _sum: { amount: true },
    }),
    prisma().financialRecord.aggregate({
      where: { ...whereBase, type: "EXPENSE" as TransactionType },
      _sum: { amount: true },
    }),
  ]);
  return {
    totalIncome: income._sum.amount?.toString() ?? "0",
    totalExpense: expense._sum.amount?.toString() ?? "0",
  };
}

export type CategoryRow = { category: string; totalIncome: string; totalExpense: string };

/**
 * Aggregates totals per category for the scope.
 * @param scope - User and date filters
 * @returns One row per category with income/expense split
 */
export async function aggregateByCategory(scope: DashboardScope): Promise<CategoryRow[]> {
  const whereBase = scopeWhere(scope);
  const grouped = await prisma().financialRecord.groupBy({
    by: ["category", "type"],
    where: whereBase,
    _sum: { amount: true },
  });

  const map = new Map<string, { income: string; expense: string }>();
  for (const row of grouped) {
    const cat = row.category;
    if (!map.has(cat)) {
      map.set(cat, { income: "0", expense: "0" });
    }
    const entry = map.get(cat)!;
    const sum = row._sum.amount?.toString() ?? "0";
    if (row.type === "INCOME") entry.income = sum;
    else entry.expense = sum;
  }

  return Array.from(map.entries()).map(([category, v]) => ({
    category,
    totalIncome: v.income,
    totalExpense: v.expense,
  }));
}

export type TrendRow = { period: string; totalIncome: string; totalExpense: string };

/**
 * Monthly trends by grouping records in application memory (suitable for assessment-scale data).
 * @param scope - User and date filters
 * @returns One row per YYYY-MM
 */
export async function aggregateMonthlyTrends(scope: DashboardScope): Promise<TrendRow[]> {
  const where = scopeWhere(scope);
  const rows = await prisma().financialRecord.findMany({
    where,
    select: { date: true, type: true, amount: true },
  });

  const byPeriod = new Map<string, { income: Decimal; expense: Decimal }>();
  for (const r of rows) {
    const ym = `${r.date.getUTCFullYear()}-${String(r.date.getUTCMonth() + 1).padStart(2, "0")}`;
    if (!byPeriod.has(ym)) {
      byPeriod.set(ym, { income: new Decimal(0), expense: new Decimal(0) });
    }
    const e = byPeriod.get(ym)!;
    if (r.type === "INCOME") e.income = e.income.add(r.amount);
    else e.expense = e.expense.add(r.amount);
  }

  return Array.from(byPeriod.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, v]) => ({
      period,
      totalIncome: v.income.toString(),
      totalExpense: v.expense.toString(),
    }));
}

/**
 * Returns the most recent records for the scope.
 * @param scope - User filter (date range optional)
 * @param limit - Max rows
 * @returns Recent records ordered by date desc
 */
export async function listRecentRecords(
  scope: DashboardScope,
  limit: number
): Promise<
  Awaited<ReturnType<ReturnType<typeof prisma>["financialRecord"]["findMany"]>>
> {
  const where = scopeWhere(scope);
  return prisma().financialRecord.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
}
