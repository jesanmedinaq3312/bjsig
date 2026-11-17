const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "'": "&#39;",
  '"': "&quot;",
};

/** Encodes untrusted text before interpolation into an HTML text/attribute context. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => HTML_ENTITIES[character] ?? character);
}
