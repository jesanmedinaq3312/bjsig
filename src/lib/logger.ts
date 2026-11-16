import { sanitizeLogValue } from "./logSanitizer";

type LogLevel = "debug" | "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

/** Browser/Worker-safe logger; existing variadic calls remain supported. */
function createLogger(scope = "app", context: LogContext = {}) {
  function emit(level: LogLevel, args: unknown[]): void {
    if (!import.meta.env.DEV && (level === "debug" || level === "info")) return;
    const [first, ...rest] = args;
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      scope: sanitizeLogValue(scope),
      environment: import.meta.env.DEV ? "development" : "production",
      message: sanitizeLogValue(typeof first === "string" ? first : "Diagnostic event"),
      context: sanitizeLogValue(context),
      details: sanitizeLogValue(typeof first === "string" ? rest : args),
    };
    // Never hand raw objects to the console: devtools retain live references.
    console[level](import.meta.env.DEV ? entry : JSON.stringify(entry));
  }

  return {
    debug: (...args: unknown[]) => emit("debug", args),
    info: (...args: unknown[]) => emit("info", args),
    warn: (...args: unknown[]) => emit("warn", args),
    error: (...args: unknown[]) => emit("error", args),
    child: (childScope: string, childContext: LogContext = {}) =>
      createLogger(childScope, { ...context, ...childContext }),
  };
}

export const logger = createLogger();
