const REDACTED = "[REDACTED]";
const MAX_DEPTH = 6;
const MAX_ITEMS = 50;
const MAX_TEXT = 8_000;
const sensitiveKey =
  /password|passwd|secret|token|authorization|cookie|api[_-]?key|email|phone|address|rut|national[_-]?id|latitude|longitude|(^|_)lat$|(^|_)lng$|body|payload|session|user[_-]?id|worker[_-]?id/i;

function sanitizeText(value: string): string {
  return (
    value
      // Query strings, fragments and URL credentials may carry recovery tokens.
      .replace(/https?:\/\/[^\s)"'<>]+/gi, (raw) => {
        try {
          const url = new URL(raw);
          url.username = "";
          url.password = "";
          url.search = "";
          url.hash = "";
          return url.toString();
        } catch {
          return "[URL]";
        }
      })
      .replace(/\bBearer\s+[^\s,;"']+/gi, `Bearer ${REDACTED}`)
      .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, REDACTED)
      .replace(/\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+\b/g, REDACTED)
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, REDACTED)
      .replace(
        /(\b(?:password|passwd|secret|[\w-]*token|authorization|cookie|api[_-]?key)\b\s*[=:]\s*)(?:"[^"]*"|'[^']*'|[^\s&,;]+)/gi,
        `$1${REDACTED}`,
      )
      .slice(0, MAX_TEXT)
  );
}

/** A bounded, detached snapshot; logging must not throw on diagnostic input. */
export function sanitizeLogValue(value: unknown): unknown {
  const seen = new WeakSet<object>();
  function visit(current: unknown, depth: number): unknown {
    if (typeof current === "string") return sanitizeText(current);
    if (current == null || typeof current === "boolean" || typeof current === "number")
      return current;
    if (typeof current === "bigint") return String(current);
    if (typeof current !== "object") return `[${typeof current}]`;
    if (seen.has(current)) return "[Circular]";
    if (depth >= MAX_DEPTH) return "[Depth limit]";
    seen.add(current);
    if (Array.isArray(current))
      return current.slice(0, MAX_ITEMS).map((item) => visit(item, depth + 1));
    if (current instanceof Date)
      return Number.isNaN(current.getTime()) ? "[Invalid date]" : current.toISOString();
    const result: Record<string, unknown> = {};
    const keys =
      current instanceof Error
        ? [...new Set(["name", "message", "stack", "cause", ...Object.keys(current)])]
        : Object.keys(current);
    for (const key of keys.slice(0, MAX_ITEMS)) {
      if (sensitiveKey.test(key)) {
        result[key] = REDACTED;
        continue;
      }
      try {
        result[key] = visit((current as Record<string, unknown>)[key], depth + 1);
      } catch {
        result[key] = "[Unreadable]";
      }
    }
    return result;
  }
  try {
    return visit(value, 0);
  } catch {
    return "[Unreadable]";
  }
}
