import { Badge } from "@/components/ui";
import { ExpiryService } from "@/lib/expiry";

export function ExpiryBadge({
  date,
  today,
  compact,
}: {
  date: string | null;
  today: Date;
  compact?: boolean;
}) {
  const check = ExpiryService.check(date, today);
  if (compact) {
    return (
      <span
        className={`inline-block w-2 h-2 rounded-full ${ExpiryService.dot(check.status)}`}
        title={check.label}
      />
    );
  }
  return (
    <Badge className={`${ExpiryService.color(check.status)} whitespace-nowrap`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ExpiryService.dot(check.status)}`} />
      {check.label}
    </Badge>
  );
}

export function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-2 border-b border-slate-100 pb-1">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-700 font-medium text-right">{value || "—"}</span>
    </div>
  );
}
