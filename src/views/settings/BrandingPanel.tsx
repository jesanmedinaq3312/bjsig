import { useState, useEffect } from "react";
import {
  Palette,
  CheckCircle2,
  XCircle,
  Loader2,
  Info,
  Link2,
  Building2,
  Upload,
  RotateCcw,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { Button, Input } from "@/components/ui";
import { audit } from "@/lib/audit";
import { systemConfigRepo } from "@/lib/repositories";
import { useLoading } from "@/components/LoadingProvider";
import {
  clearCompanyLogo,
  DEFAULT_COMPANY_LOGO_URL,
  loadCompanyBranding,
  setBrandingCache,
  uploadCompanyLogo,
} from "@/lib/logo";
import { useTheme, type ThemeMode } from "@/hooks/useTheme";
import { ThemeCustomizerCard } from "@/components/ThemeCustomizer";
import { CompanyLogo } from "@/components/CompanyLogo";

export function BrandingPanel({ isAdmin }: { isAdmin: boolean }) {
  const [logoUrl, setLogoUrl] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const { runWithLoading } = useLoading();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    (async () => {
      await loadCompanyBranding(true);
      const [logo, name] = await Promise.all([
        systemConfigRepo.getValue("company_logo_url"),
        systemConfigRepo.getValue("company_name"),
      ]);
      setLogoUrl(logo ?? DEFAULT_COMPANY_LOGO_URL);
      setCompanyName(name ?? "");
    })();
  }, []);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await runWithLoading(async () => {
        await systemConfigRepo.setValue(
          "company_logo_url",
          logoUrl.trim() === DEFAULT_COMPANY_LOGO_URL ? "" : logoUrl.trim(),
        );
        await systemConfigRepo.setValue("company_name", companyName.trim());
        setBrandingCache(
          logoUrl.trim() === DEFAULT_COMPANY_LOGO_URL ? null : logoUrl.trim(),
          companyName.trim() || null,
        );
        await audit({
          action: "settings.branding.update",
          entity: "system_config",
          entity_label: "company_branding",
          details: { logo_url: logoUrl.trim(), company_name: companyName.trim() },
        });
        setMsg({
          type: "ok",
          text: "Branding guardado. Los próximos PDF/Excel incluirán el logo.",
        });
      });
    } catch (e) {
      setMsg({ type: "err", text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function handleFile(file: File | undefined): Promise<void> {
    if (!file || !isAdmin) return;
    if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type)) {
      setMsg({ type: "err", text: "Selecciona un logo PNG, JPEG, WEBP o SVG." });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMsg({ type: "err", text: "El logo no puede superar los 2 MB." });
      return;
    }
    setUploading(true);
    setMsg(null);
    try {
      const url = await uploadCompanyLogo(file);
      setLogoUrl(url);
      setBrandingCache(url, companyName.trim() || null);
      await audit({
        action: "settings.branding.logo_upload",
        entity: "system_config",
        entity_label: file.name,
      });
      setMsg({ type: "ok", text: "Logo cargado correctamente." });
    } catch (error) {
      setMsg({
        type: "err",
        text: error instanceof Error ? error.message : "No se pudo cargar el logo.",
      });
    } finally {
      setUploading(false);
    }
  }

  async function resetLogo(): Promise<void> {
    setUploading(true);
    setMsg(null);
    try {
      await clearCompanyLogo();
      setLogoUrl(DEFAULT_COMPANY_LOGO_URL);
      setBrandingCache(null, companyName.trim() || null);
      setMsg({ type: "ok", text: "Se restauró el logo predeterminado." });
    } catch (error) {
      setMsg({
        type: "err",
        text: error instanceof Error ? error.message : "No se pudo restaurar el logo.",
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Palette size={18} className="text-blue-600" />
        <h3 className="text-sm font-semibold text-slate-800">Identidad Visual de la Empresa</h3>
      </div>

      {msg && (
        <div
          className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm ${msg.type === "err" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
        >
          {msg.type === "err" ? (
            <XCircle size={16} className="shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {!isAdmin && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
          <Info size={16} className="shrink-0 mt-0.5" />
          <span>Solo los administradores pueden modificar la identidad visual.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-4 items-center">
        <div className="h-24 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white flex items-center justify-center overflow-hidden shadow-inner">
          <CompanyLogo
            src={logoUrl}
            alt={`${companyName || "Empresa"} logo`}
            className="max-w-[160px] max-h-[72px] object-contain"
            fallbackClassName="h-14 w-14"
          />
        </div>
        <div
          className={`rounded-xl border-2 border-dashed p-4 transition-colors ${dragging ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-slate-50/60"} ${!isAdmin ? "opacity-60" : "cursor-pointer hover:border-blue-300 hover:bg-blue-50/40"}`}
          onDragOver={(event) => {
            event.preventDefault();
            if (isAdmin) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void handleFile(event.dataTransfer.files[0]);
          }}
          onClick={() => {
            if (isAdmin) document.getElementById("company-logo-file")?.click();
          }}
        >
          <div className="flex items-center gap-3">
            <Upload size={20} className="text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-slate-700">Arrastra tu logo aquí</p>
              <p className="text-xs text-slate-500">
                o haz clic para seleccionar · PNG, JPEG, WEBP o SVG · máximo 2 MB
              </p>
            </div>
          </div>
          <input
            id="company-logo-file"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            disabled={!isAdmin || uploading}
            onChange={(event) => {
              void handleFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <Link2 size={13} className="text-slate-400" /> URL del Logo
          </label>
          <Input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://ejemplo.com/logo.png"
            disabled={!isAdmin}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <Building2 size={13} className="text-slate-400" /> Nombre de la Empresa
          </label>
          <Input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Nombre de tu empresa"
            disabled={!isAdmin}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {isAdmin && (
          <Button size="sm" onClick={save} disabled={saving || uploading}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
            Guardar cambios
          </Button>
        )}
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={resetLogo} disabled={saving || uploading}>
            <RotateCcw size={15} />
            Restaurar logo predeterminado
          </Button>
        )}
      </div>

      <div className="pt-4 border-t border-slate-200">
        <p className="text-sm font-semibold text-slate-700 mb-1">Tema de la interfaz</p>
        <p className="text-xs text-slate-500 mb-3">
          Elige entre modo claro, oscuro o seguir el sistema.
        </p>
        <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden">
          {[
            { mode: "light" as ThemeMode, label: "Claro", icon: <Sun size={15} /> },
            { mode: "dark" as ThemeMode, label: "Oscuro", icon: <Moon size={15} /> },
            { mode: "system" as ThemeMode, label: "Sistema", icon: <Monitor size={15} /> },
          ].map((opt) => (
            <button
              key={opt.mode}
              onClick={() => setTheme(opt.mode)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${theme === opt.mode ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <ThemeCustomizerCard isAdmin={isAdmin} />
    </div>
  );
}
