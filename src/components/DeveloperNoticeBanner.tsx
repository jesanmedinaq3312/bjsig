import { useEffect, useMemo, useState } from "react";
import { BellRing, Check, Clock3, Gift, Info, Megaphone, WalletCards } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Notice = {
  id: string;
  title: string;
  message: string;
  priority: "normal" | "high" | "urgent" | string;
  template_key: string;
  created_at: string;
  created_by_email: string | null;
  read_at: string | null;
};

const priorityStyle: Record<string, string> = {
  urgent: "border-rose-200 bg-rose-50 text-rose-900",
  high: "border-amber-200 bg-amber-50 text-amber-900",
  normal: "border-blue-200 bg-blue-50 text-blue-900",
};

const priorityRank: Record<string, number> = { urgent: 3, high: 2, normal: 1 };

function NoticeIcon({ template }: { template: string }) {
  if (template === "payment_due") return <WalletCards size={17} />;
  if (template === "gift") return <Gift size={17} />;
  if (template === "announcement") return <Megaphone size={17} />;
  return <Info size={17} />;
}

export function DeveloperNoticeBanner() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [open, setOpen] = useState(false);
  const unreadCount = useMemo(() => notices.filter((notice) => !notice.read_at).length, [notices]);

  useEffect(() => {
    let active = true;
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: tenantId } = await (supabase as any).rpc("current_tenant_id");
      if (!tenantId) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("saas_customer_notifications")
        .select("id,title,message,priority,template_key,created_at,created_by_email,read_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (active) {
        const sorted = ([...(data ?? [])] as Notice[]).sort(
          (a, b) =>
            (priorityRank[b.priority] ?? 0) - (priorityRank[a.priority] ?? 0) ||
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        setNotices(sorted);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function acknowledge(id: string) {
    const readAt = new Date().toISOString();
    setNotices((current) =>
      current.map((notice) => (notice.id === id ? { ...notice, read_at: readAt } : notice)),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc("acknowledge_saas_notification", {
      _notification_id: id,
    });
    if (error) {
      setNotices((current) =>
        current.map((notice) => (notice.id === id ? { ...notice, read_at: null } : notice)),
      );
    }
  }

  if (!notices.length) return null;
  const current = notices[0];
  const tone = priorityStyle[current.priority] ?? priorityStyle.normal;

  return (
    <section
      className={`mb-5 overflow-hidden rounded-2xl border shadow-sm ${tone}`}
      aria-label="Avisos del desarrollador"
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/70">
          <NoticeIcon template={current.template_key} />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block truncate text-sm">{current.title}</strong>
          <span className="mt-0.5 flex items-center gap-1 text-[11px] opacity-70">
            <Clock3 size={11} /> {new Date(current.created_at).toLocaleString("es-CL")}{" "}
            {current.created_by_email ? `· ${current.created_by_email}` : "· Dev Team"}
          </span>
        </span>
        <span className="text-xs font-black">
          {open
            ? "Cerrar"
            : unreadCount
              ? `${unreadCount} nuevo${unreadCount === 1 ? "" : "s"}`
              : "Ver"}
        </span>
      </button>
      {open && (
        <div className="space-y-2 border-t border-current/10 bg-white/45 px-4 py-3">
          {notices.map((notice) => (
            <article key={notice.id} className="rounded-xl border border-white/70 bg-white/70 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black">{notice.title}</p>
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-5 opacity-80">
                    {notice.message}
                  </p>
                </div>
                {!notice.read_at ? (
                  <button
                    type="button"
                    onClick={() => void acknowledge(notice.id)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-950 px-2.5 py-1.5 text-[10px] font-bold text-white"
                  >
                    <Check size={12} /> Leído
                  </button>
                ) : (
                  <span className="text-[10px] font-bold opacity-60">Leído</span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
