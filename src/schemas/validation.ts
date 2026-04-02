import { z } from "zod";
import { Role, TransactionType, UserStatus } from "@prisma/client";

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createUserBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  role: z.nativeEnum(Role),
  status: z.nativeEnum(UserStatus),
});

const pageFromQuery = z
  .string()
  .optional()
  .transform((s) => (s === undefined || s === "" ? 1 : Number.parseInt(s, 10)))
  .pipe(z.number().int().min(1));

const limitFromQuery = (fallback: number, max: number) =>
  z
    .string()
    .optional()
    .transform((s) => {
      if (s === undefined || s === "") return fallback;
      return Number.parseInt(s, 10);
    })
    .pipe(z.number().int().min(1).max(max));

export const paginationQuerySchema = z.object({
  page: pageFromQuery,
  limit: limitFromQuery(20, 100),
});

export const updateUserBodySchema = z
  .object({
    name: z.string().nullable().optional(),
    email: z.string().email().optional(),
    role: z.nativeEnum(Role).optional(),
    status: z.nativeEnum(UserStatus).optional(),
  })
  .refine((x) => Object.keys(x).length > 0, { message: "At least one field required" });

export const recordCreateBodySchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().positive(),
  type: z.nativeEnum(TransactionType),
  category: z.string().min(1).max(128),
  date: z.string().datetime(),
  notes: z.string().max(2000).nullable().optional(),
});

export const recordUpdateBodySchema = z
  .object({
    userId: z.string().uuid().optional(),
    amount: z.number().positive().optional(),
    type: z.nativeEnum(TransactionType).optional(),
    category: z.string().min(1).max(128).optional(),
    date: z.string().datetime().optional(),
    notes: z.string().max(2000).nullable().optional(),
  })
  .refine((x) => Object.keys(x).length > 0, { message: "At least one field required" });

const optionalIsoDateTime = z
  .string()
  .optional()
  .transform((s) => (s === undefined || s === "" ? undefined : s))
  .pipe(z.union([z.string().datetime(), z.undefined()]));

export const recordListQuerySchema = z.object({
  page: pageFromQuery,
  limit: limitFromQuery(20, 100),
  userId: z.string().uuid().optional(),
  dateFrom: optionalIsoDateTime,
  dateTo: optionalIsoDateTime,
  category: z.string().optional(),
  type: z.nativeEnum(TransactionType).optional(),
});

export const dashboardQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  dateFrom: optionalIsoDateTime,
  dateTo: optionalIsoDateTime,
});

export const recentQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  dateFrom: optionalIsoDateTime,
  dateTo: optionalIsoDateTime,
  limit: z
    .string()
    .optional()
    .transform((s) => (s === undefined || s === "" ? 10 : Number.parseInt(s, 10)))
    .pipe(z.number().int().min(1).max(50)),
});
