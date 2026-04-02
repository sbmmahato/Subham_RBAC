import { Role } from "@prisma/client";
import * as dashboardDb from "../db/dashboard.db.service.js";
import { AppError } from "../utils/errors.js";
import * as rbac from "./rbac.service.js";

export type DashboardQuery = {
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
};

/**
 * Resolves dashboard aggregation scope for analytics endpoints.
 * @param actorId - Current user id
 * @param actorRole - Current role
 * @param filterUserId - Optional userId from query
 */
function resolveDashboardScope(
  actorId: string,
  actorRole: Role,
  filterUserId?: string
): { userId?: string; dateFrom?: Date; dateTo?: Date } {
  if (!rbac.canViewDashboard(actorRole)) {
    throw new AppError(403, "FORBIDDEN", "Insufficient permissions");
  }
  if (actorRole === Role.ADMIN) {
    if (filterUserId) return { userId: filterUserId };
    return {};
  }
  if (filterUserId && filterUserId !== actorId) {
    throw new AppError(403, "FORBIDDEN", "Cannot view another user's dashboard");
  }
  return { userId: actorId };
}

/**
 * Returns income, expense, and net for the scope.
 * @param actorId - Current user id
 * @param actorRole - Current role
 * @param query - Optional user and date filters
 */
export async function getSummary(
  actorId: string,
  actorRole: Role,
  query: DashboardQuery
) {
  const scope = resolveDashboardScope(actorId, actorRole, query.userId);
  const { totalIncome, totalExpense } = await dashboardDb.aggregateIncomeExpense({
    ...scope,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
  });
  const income = Number(totalIncome);
  const expense = Number(totalExpense);
  return {
    totalIncome: income,
    totalExpense: expense,
    net: income - expense,
    scope: actorRole === Role.ADMIN && !scope.userId ? "all_users" : "scoped",
  };
}

/**
 * Category breakdown for the scope.
 * @param actorId - Current user id
 * @param actorRole - Current role
 * @param query - Optional filters
 */
export async function getByCategory(
  actorId: string,
  actorRole: Role,
  query: DashboardQuery
) {
  const scope = resolveDashboardScope(actorId, actorRole, query.userId);
  const rows = await dashboardDb.aggregateByCategory({
    ...scope,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
  });
  return { items: rows };
}

/**
 * Monthly trend rows for the scope.
 * @param actorId - Current user id
 * @param actorRole - Current role
 * @param query - Optional filters
 */
export async function getTrends(actorId: string, actorRole: Role, query: DashboardQuery) {
  const scope = resolveDashboardScope(actorId, actorRole, query.userId);
  const items = await dashboardDb.aggregateMonthlyTrends({
    ...scope,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
  });
  return { items };
}

/**
 * Recent records for the scope.
 * @param actorId - Current user id
 * @param actorRole - Current role
 * @param query - Optional filters
 * @param limit - Max items
 */
export async function getRecent(
  actorId: string,
  actorRole: Role,
  query: DashboardQuery,
  limit: number
) {
  const scope = resolveDashboardScope(actorId, actorRole, query.userId);
  const rows = await dashboardDb.listRecentRecords(
    {
      ...scope,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    },
    limit
  );
  return {
    items: rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      amount: r.amount.toString(),
      type: r.type,
      category: r.category,
      date: r.date.toISOString(),
      notes: r.notes,
    })),
  };
}
