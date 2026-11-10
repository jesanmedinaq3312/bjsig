import { type ReactNode, type ButtonHTMLAttributes, useState } from "react";
import { Info, Loader2 } from "lucide-react";

export function Card({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div onClick={onClick} className={`glass-surface glass-hover rounded-2xl ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-3">
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "outline";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover shadow-sm",
  secondary: "bg-secondary text-slate-700 hover:bg-secondary-hover",
  ghost: "text-slate-600 hover:bg-slate-100",
  danger: "bg-error text-white hover:bg-error shadow-sm",
  success: "bg-success text-white hover:bg-success shadow-sm",
  outline: "border border-slate-300 text-slate-700 hover:bg-slate-50 bg-white",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  loading,
  disabled,
  ...props
}: ButtonProps) {
  const sizes = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${sizes} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={size === "sm" ? 13 : 15} className="animate-spin" />}
      {children}
    </button>
  );
}

export function Badge({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}
      style={style}
    >
      {children}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "md" | "lg" | "xl";
}) {
  if (!open) return null;
  const maxW = size === "xl" ? "max-w-4xl" : size === "lg" ? "max-w-2xl" : "max-w-lg";
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-slate-900/40 px-3 py-4 backdrop-blur-md animate-fade-in sm:items-center sm:p-4">
      <div
        className={`glass-modal flex w-full min-w-0 ${maxW} max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-2xl animate-scale-in sm:max-h-[90dvh]`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div
          className="flex min-w-0 shrink-0 items-start justify-between gap-3 border-b border-white/20 px-4 py-3 sm:px-5 sm:py-4"
          style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(20px)" }}
        >
          <h2 className="min-w-0 flex-1 break-words text-base font-semibold leading-snug text-slate-800 sm:text-lg">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 rounded-lg px-2 py-1 text-xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-4 sm:p-5">
          {children}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ message, icon }: { message: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
      {icon && <div className="mb-2">{icon}</div>}
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );
}

export function FullScreenLoader() {
  return (
    <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-base font-semibold text-slate-700">Cargando datos...</p>
          <p className="text-sm text-slate-400 mt-1">Sincronizando con la base de datos</p>
        </div>
      </div>
    </div>
  );
}

export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-slate-200 rounded flex-1"
          style={{ maxWidth: `${100 / cols}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} cols={cols} />
      ))}
    </div>
  );
}

export function ReloadingBanner() {
  return (
    <div className="sticky top-0 z-30 glass-topbar border-primary/20 px-4 py-1.5 flex items-center gap-2 text-xs text-primary animate-fade-in">
      <Loader2 size={13} className="animate-spin" />
      Actualizando datos...
    </div>
  );
}

export function Input({
  label,
  className = "",
  ...props
}: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>}
      <input
        className={`glass-input w-full px-3 py-2 text-sm text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${className}`}
        {...props}
      />
    </label>
  );
}

export function Select({
  label,
  className = "",
  children,
  ...props
}: { label?: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>}
      <select
        className={`glass-input w-full px-3 py-2 text-sm text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function Textarea({
  label,
  className = "",
  ...props
}: { label?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>}
      <textarea
        className={`glass-input w-full px-3 py-2 text-sm text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary ${className}`}
        {...props}
      />
    </label>
  );
}

/** Non-invasive info tooltip with technical/legal guidance. */
export function InfoTooltip({ text, size = 14 }: { text: string; size?: number }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShow((s) => !s);
        }}
        className="text-slate-400 hover:text-primary transition-colors"
        aria-label="Información"
      >
        <Info size={size} />
      </button>
      {show && (
        <span
          role="tooltip"
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-xl leading-relaxed pointer-events-none animate-fade-in"
        >
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </span>
      )}
    </span>
  );
}

/** Label with an inline info tooltip. */
export function InfoLabel({
  label,
  info,
  children,
}: {
  label: string;
  info: string;
  children?: ReactNode;
}) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1">
      {label}
      <InfoTooltip text={info} />
      {children}
    </span>
  );
}
