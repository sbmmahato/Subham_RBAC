import type { FastifyInstance } from "fastify";

/**
 * Logs in and returns the JWT string.
 * @param app - Fastify app
 * @param email - User email
 * @param password - Plain password
 */
export async function loginToken(
  app: FastifyInstance,
  email: string,
  password: string
): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email, password },
  });
  if (res.statusCode !== 200) {
    throw new Error(`Login failed ${res.statusCode}: ${res.body}`);
  }
  const body = JSON.parse(res.body) as { token: string };
  return body.token;
}
