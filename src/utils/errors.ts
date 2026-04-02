/**
 * Application error with HTTP status and optional structured details.
 */
export class AppError extends Error {
  /**
   * @param statusCode - HTTP status code
   * @param code - Machine-readable error code
   * @param message - Human-readable message
   * @param details - Optional validation or extra context
   */
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}
