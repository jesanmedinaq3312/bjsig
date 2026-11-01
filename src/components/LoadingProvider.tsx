import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, RefreshCw, X, ShieldCheck } from "lucide-react";

import { Loader, LoaderStyles } from "@/components/ui/loader";

const LOADING_PHRASES = [
  "Enviando información segura…",
  "Procesando cambios…",
  "Recibiendo confirmación…",
  "Sincronizando con la base de datos…",
  "Asegurando la integridad de los datos…",
  "Validando permisos y consistencia…",
  "Casi listo…",
];

interface BackgroundTask {
  id: number;
  label: string;
  state: "loading" | "success" | "error";
  error?: string;
  retry: () => void;
}

interface LoadingContextValue {
  runWithLoading: <T>(fn: () => Promise<T>) => Promise<T>;
  runInBackground: <T>(label: string, fn: () => Promise<T>) => Promise<T>;
  isLoading: boolean;
}

const LoadingContext = createContext<LoadingContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components -- mixed component and stable API export is intentional here
export function useLoading() {
  const ctx = useContext(LoadingContext);
  if (!ctx) throw new Error("useLoading must be used within LoadingProvider");
  return ctx;
}

function AnimatedLoadingPhrase({ label }: { label: string }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % LOADING_PHRASES.length),
      1450,
    );
    return () => window.clearInterval(timer);
  }, []);
  return (
    <span>
      {label} · {LOADING_PHRASES[index]}
    </span>
  );
}

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [tasks, setTasks] = useState<BackgroundTask[]>([]);
  const pendingCount = useRef(0);
  const nextTaskId = useRef(1);

  const runWithLoading = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    pendingCount.current += 1;
    setIsLoading(true);
    try {
      return await fn();
    } finally {
      pendingCount.current -= 1;
      if (pendingCount.current === 0) setIsLoading(false);
    }
  }, []);

  const runInBackground = useCallback(
    async <T,>(label: string, fn: () => Promise<T>): Promise<T> => {
      const id = nextTaskId.current++;
      const retry = () => {
        void runInBackground(label, fn);
      };
      setTasks((current) => [...current.slice(-2), { id, label, state: "loading", retry }]);
      try {
        const result = await fn();
        setTasks((current) =>
          current.map((task) => (task.id === id ? { ...task, state: "success" } : task)),
        );
        window.setTimeout(
          () => setTasks((current) => current.filter((task) => task.id !== id)),
          4200,
        );
        return result;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "No se pudo completar la operación.";
        setTasks((current) =>
          current.map((task) =>
            task.id === id ? { ...task, state: "error", error: message } : task,
          ),
        );
        throw error;
      }
    },
    [],
  );

  return (
    <LoadingContext.Provider value={{ runWithLoading, runInBackground, isLoading }}>
      {children}
      <LoaderStyles />
      {isLoading && (
        <div className="fixed left-0 right-0 top-0 z-[200] h-1 overflow-hidden bg-slate-100 pointer-events-none">
          <div className="h-full bg-primary animate-loading-bar" />
        </div>
      )}
      {isLoading && (
        <div
          className="fixed right-4 top-4 z-[175] flex items-center gap-2 rounded-full border border-blue-100 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-600 shadow-lg backdrop-blur"
          role="status"
        >
          <Loader variant="morph" size={18} />
          <ShieldCheck size={14} className="text-blue-600" />
          <AnimatedLoadingPhrase label="Operación" />
        </div>
      )}
      {tasks.length > 0 && (
        <div
          className="fixed top-1/2 left-1/2 z-[180] w-[min(390px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 space-y-2"
          aria-live="polite"
        >
          {tasks.map((task) => (
            <div
              key={task.id}
              className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 shadow-lg backdrop-blur"
            >
              <div className="flex items-start gap-2">
                {task.state === "loading" && (
                  <Loader variant="dots" size={20} className="mt-0.5 shrink-0" />
                )}
                {task.state === "success" && (
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                )}
                {task.state === "error" && (
                  <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-600" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-700">
                    {task.state === "loading" ? (
                      <AnimatedLoadingPhrase label={task.label} />
                    ) : task.state === "success" ? (
                      `${task.label} completada · Datos íntegros`
                    ) : (
                      `${task.label} falló`
                    )}
                  </p>
                  {task.state === "error" && (
                    <p className="mt-1 break-words text-[11px] text-slate-500">{task.error}</p>
                  )}
                  {task.state === "error" && (
                    <button
                      type="button"
                      onClick={task.retry}
                      className="mt-2 inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white hover:bg-slate-700"
                    >
                      <RefreshCw size={12} /> Intentar de nuevo
                    </button>
                  )}
                </div>
                {task.state !== "loading" && (
                  <button
                    type="button"
                    onClick={() =>
                      setTasks((current) => current.filter((item) => item.id !== task.id))
                    }
                    className="text-slate-400 hover:text-slate-700"
                    aria-label="Cerrar aviso"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </LoadingContext.Provider>
  );
}
