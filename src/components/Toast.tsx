import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toast: (type: ToastType, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components -- mixed component and stable API export is intentional here
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const ICONS: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 size={20} className="text-success" />,
  error: <XCircle size={20} className="text-error" />,
  info: <Info size={20} className="text-primary" />,
  warning: <AlertTriangle size={20} className="text-warning" />,
};

const ACCENT: Record<ToastType, string> = {
  success: "border-l-emerald-500",
  error: "border-l-red-500",
  info: "border-l-blue-500",
  warning: "border-l-amber-500",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (type: ToastType, title: string, message?: string) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, type, title, message }]);
      setTimeout(() => remove(id), 4500);
    },
    [remove],
  );

  const value: ToastContextValue = {
    toast,
    success: (t, m) => toast("success", t, m),
    error: (t, m) => toast("error", t, m),
    info: (t, m) => toast("info", t, m),
    warning: (t, m) => toast("warning", t, m),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[300] flex flex-col gap-2.5 w-[340px] max-w-[calc(100vw-2rem)] pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto bg-white rounded-xl shadow-lg border border-slate-200 border-l-4 ${ACCENT[t.type]} px-4 py-3 flex items-start gap-3 animate-toast-in`}
          >
            <div className="shrink-0 mt-0.5 animate-candy-pop">{ICONS[t.type]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">{t.title}</p>
              {t.message && <p className="text-xs text-slate-500 mt-0.5">{t.message}</p>}
            </div>
            <button
              onClick={() => remove(t.id)}
              className="shrink-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md p-0.5 transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
