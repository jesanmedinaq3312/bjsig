import { useState, useCallback, type ReactNode } from "react";
import { AlertTriangle, HelpCircle, CheckCircle2 } from "lucide-react";
import { Modal, Button } from "@/components/ui";
import { ConfirmContext, type ConfirmOptions, type ConfirmType } from "@/hooks/useConfirm";

const ICONS: Record<ConfirmType, ReactNode> = {
  warning: <AlertTriangle size={28} className="text-warning" />,
  info: <HelpCircle size={28} className="text-primary" />,
  success: <CheckCircle2 size={28} className="text-success" />,
  danger: <AlertTriangle size={28} className="text-error" />,
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<((v: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => setResolver(() => resolve));
  }, []);

  const handleClose = (result: boolean) => {
    setOpen(false);
    setOptions(null);
    if (resolver) resolver(result);
    setResolver(null);
  };

  const type = options?.type ?? "warning";
  const isDanger = type === "danger";

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Modal
        open={open}
        onClose={() => handleClose(false)}
        title={options?.title ?? "Confirmar acción"}
        size="md"
      >
        <div className="flex flex-col items-center text-center py-2">
          <div className="mb-4">{ICONS[type]}</div>
          <p className="text-sm text-slate-700 leading-relaxed">{options?.message}</p>
          <div className="flex gap-3 mt-6 w-full">
            <Button variant="secondary" className="flex-1" onClick={() => handleClose(false)}>
              {options?.cancelText ?? "Cancelar"}
            </Button>
            <Button
              variant={isDanger ? "danger" : "primary"}
              className="flex-1"
              onClick={() => handleClose(true)}
            >
              {options?.confirmText ?? "Confirmar"}
            </Button>
          </div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}
