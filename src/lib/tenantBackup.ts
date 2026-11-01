export function sqlValue(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

export function buildTenantBackupSql(
  backup: Record<string, unknown[]>,
  tenantId: string,
  generatedAt: string,
): string {
  const lines = [`-- Backup tenant ${tenantId}`, `-- Generated ${generatedAt}`];
  for (const [table, rows] of Object.entries(backup)) {
    for (const row of rows as Record<string, unknown>[]) {
      const keys = Object.keys(row);
      if (keys.length === 0) continue;
      lines.push(
        `INSERT INTO public.${table} (${keys.join(", ")}) VALUES (${keys.map((key) => sqlValue(row[key])).join(", ")});`,
      );
    }
  }
  return `${lines.join("\n")}\n`;
}
