import "dotenv/config";

/**
 * Loads validated environment configuration for the HTTP server and JWT.
 * @returns Application configuration object
 */
export function loadEnv() {
  const port = Number(process.env.PORT) || 3000;
  const databaseUrl = process.env.DATABASE_URL;
  const jwtSecret = process.env.JWT_SECRET;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
  if (!jwtSecret || jwtSecret.length < 16) {
    throw new Error("JWT_SECRET must be set and at least 16 characters");
  }

  return {
    port,
    databaseUrl,
    jwtSecret,
    nodeEnv: process.env.NODE_ENV ?? "development",
  } as const;
}
