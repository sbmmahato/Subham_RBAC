import { z } from "zod";
import { AppError } from "./errors.js";

/**
 * Parses data with a Zod schema or throws a 400 AppError with details.
 * @param schema - Zod schema (input/output may differ)
 * @param data - Unknown input
 * @returns Parsed output
 */
export function parseOrThrow<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid input", result.error.flatten());
  }
  return result.data;
}
