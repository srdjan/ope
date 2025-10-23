/**
 * Structured logging utility for OPE
 *
 * Provides consistent logging throughout the application with:
 * - Request ID tracking
 * - Timestamps
 * - Log levels (INFO, WARN, ERROR)
 * - Structured context data
 */

export type LogLevel = "INFO" | "WARN" | "ERROR";

export type LogContext = {
  readonly requestId?: string;
  readonly stage?: string;
  readonly duration?: number;
  readonly [key: string]: unknown;
};

/**
 * Format a log message with timestamp, level, and context
 */
function formatLog(
  level: LogLevel,
  message: string,
  context?: LogContext,
): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : "";
  return `[${timestamp}] ${level}: ${message}${contextStr}`;
}

/**
 * Log an info-level message
 */
export function logInfo(message: string, context?: LogContext): void {
  console.log(formatLog("INFO", message, context));
}

/**
 * Log a warning-level message
 */
export function logWarn(message: string, context?: LogContext): void {
  console.warn(formatLog("WARN", message, context));
}

/**
 * Log an error-level message
 */
export function logError(
  message: string,
  error?: unknown,
  context?: LogContext,
): void {
  const errorContext = {
    ...context,
    error: error instanceof Error
      ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      }
      : String(error),
  };
  console.error(formatLog("ERROR", message, errorContext));
}

/**
 * Create a request-scoped logger that includes request ID in all logs
 */
export function createRequestLogger(requestId: string) {
  return {
    info: (message: string, context?: Omit<LogContext, "requestId">) =>
      logInfo(message, { ...context, requestId }),
    warn: (message: string, context?: Omit<LogContext, "requestId">) =>
      logWarn(message, { ...context, requestId }),
    error: (
      message: string,
      error?: unknown,
      context?: Omit<LogContext, "requestId">,
    ) => logError(message, error, { ...context, requestId }),
  };
}

/**
 * Log the start of a pipeline stage and return a function to log completion
 */
export function logStage(
  logger: ReturnType<typeof createRequestLogger>,
  stage: string,
) {
  const startTime = performance.now();
  logger.info(`Starting ${stage} stage`);

  return (context?: Omit<LogContext, "stage" | "duration">) => {
    const duration = Math.round(performance.now() - startTime);
    logger.info(`Completed ${stage} stage`, { ...context, stage, duration });
  };
}
