import { useState, useEffect, useCallback } from "react";
import { RotateCcw, Save, Check, Eye, SlidersHorizontal } from "lucide-react";
import { Card, CardHeader, Button, InfoTooltip, Select } from "@/components/ui";
import { ColorWheel } from "@/components/ColorWheel";
import { systemConfigRepo } from "@/lib/repositories";
import { audit } from "@/lib/audit";
import { useLoading } from "@/components/LoadingProvider";
import { useToast } from "@/components/Toast";

interface ColorTheme {
  primary: string;
  primaryHover: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  textPrimary?: string;
  textMuted?: string;
}

interface GlassOpacity {
  surface: number;
  sidebar: number;
  topbar: number;
  modal: number;
  input: number;
  border: number;
  highlight: number;
}

const DEFAULT_THEME: ColorTheme = {
  primary: "#1d4ed8",
  primaryHover: "#1e40af",
  accent: "#0ea5e9",
  success: "#059669",
  warning: "#d97706",
  error: "#dc2626",
  textPrimary: "#0f172a",
  textMuted: "#64748b",
};

const DEFAULT_GLASS: GlassOpacity = {
  surface: 0.72,
  sidebar: 0.82,
  topbar: 0.65,
  modal: 0.85,
  input: 0.55,
  border: 0.18,
  highlight: 0.45,
};

const GLASS_KEYS: { key: keyof GlassOpacity; label: string; description: string }[] = [
  {
    key: "surface",
    label: "Tarjetas y paneles",
    description: "Opacidad del fondo de tarjetas, paneles y secciones",
  },
  {
    key: "sidebar",
    label: "Barra lateral",
    description: "Opacidad del menú lateral de navegación",
  },
  {
    key: "topbar",
    label: "Barra superior",
    description: "Opacidad de la barra superior con el logo y estado",
  },
  {
    key: "modal",
    label: "Ventanas modales",
    description: "Opacidad de las ventanas emergentes y diálogos",
  },
  {
    key: "input",
    label: "Campos de formulario",
    description: "Opacidad de los campos de entrada y selects",
  },
  {
    key: "border",
    label: "Bordes",
    description: "Opacidad de los bordes translúcidos de los elementos glass",
  },
  {
    key: "highlight",
    label: "Brillo especular",
    description: "Intensidad del reflejo superior tipo vidrio líquido",
  },
];

const COLOR_KEYS: { key: keyof ColorTheme; label: string; description: string }[] = [
  {
    key: "primary",
    label: "Color Primario",
    description: "Botones principales, enlaces activos, elementos destacados",
  },
  {
    key: "primaryHover",
    label: "Hover Primario",
    description: "Color al pasar el mouse sobre botones primarios",
  },
  {
    key: "accent",
    label: "Acento",
    description: "Elementos secundarios, indicadores, badges especiales",
  },
  {
    key: "success",
    label: "Éxito",
    description: "Confirmaciones, estados positivos, guardados exitosos",
  },
  {
    key: "warning",
    label: "Advertencia",
    description: "Alertas, elementos pendientes, llamados de atención",
  },
  { key: "error", label: "Error", description: "Errores, eliminación, estados críticos" },
  {
    key: "textPrimary",
    label: "Color de Texto Principal",
    description: "Color del texto principal de toda la aplicación (títulos, párrafos, etiquetas)",
  },
  {
    key: "textMuted",
    label: "Color de Texto Secundario",
    description: "Color del texto tenue o subtítulos (descripciones, timestamps, hints)",
  },
];

const STORAGE_KEY = "gyc-color-theme";

function applyThemeToCSS(theme: ColorTheme) {
  const root = document.documentElement;
  root.style.setProperty("--color-primary", theme.primary);
  root.style.setProperty("--color-primary-hover", theme.primaryHover);
  root.style.setProperty("--color-accent", theme.accent);
  root.style.setProperty("--color-success", theme.success);
  root.style.setProperty("--color-warning", theme.warning);
  root.style.setProperty("--color-error", theme.error);
  if (theme.textPrimary) root.style.setProperty("--color-text", theme.textPrimary);
  if (theme.textMuted) root.style.setProperty("--color-text-muted", theme.textMuted);
}

function applyGlassToCSS(glass: GlassOpacity) {
  const root = document.documentElement;
  root.style.setProperty("--glass-surface-opacity", String(glass.surface));
  root.style.setProperty("--glass-sidebar-opacity", String(glass.sidebar));
  root.style.setProperty("--glass-topbar-opacity", String(glass.topbar));
  root.style.setProperty("--glass-modal-opacity", String(glass.modal));
  root.style.setProperty("--glass-input-opacity", String(glass.input));
  root.style.setProperty("--glass-border-opacity", String(glass.border));
  root.style.setProperty("--glass-highlight-opacity", String(glass.highlight));
}

const GLASS_STORAGE_KEY = "gyc-glass-opacity";

export function ThemeCustomizerCard({ isAdmin }: { isAdmin: boolean }) {
  const [theme, setTheme] = useState<ColorTheme>(DEFAULT_THEME);
  const [glass, setGlass] = useState<GlassOpacity>(DEFAULT_GLASS);
  const [selectedKey, setSelectedKey] = useState<keyof ColorTheme>("primary");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { runWithLoading } = useLoading();
  const toast = useToast();

  useEffect(() => {
    (async () => {
      const storedGlass = localStorage.getItem(GLASS_STORAGE_KEY);
      if (storedGlass) {
        try {
          const parsed = JSON.parse(storedGlass) as GlassOpacity;
          setGlass(parsed);
          applyGlassToCSS(parsed);
        } catch {
          applyGlassToCSS(DEFAULT_GLASS);
        }
      } else {
        applyGlassToCSS(DEFAULT_GLASS);
      }

      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = { ...DEFAULT_THEME, ...JSON.parse(stored) } as ColorTheme;
          setTheme(parsed);
          applyThemeToCSS(parsed);
          return;
        } catch {
          // fall through to DB
        }
      }
      const dbTheme = await systemConfigRepo.getValue("color_theme");
      if (dbTheme) {
        try {
          const parsed = { ...DEFAULT_THEME, ...JSON.parse(dbTheme) } as ColorTheme;
          setTheme(parsed);
          applyThemeToCSS(parsed);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        } catch {
          applyThemeToCSS(DEFAULT_THEME);
        }
      } else {
        applyThemeToCSS(DEFAULT_THEME);
      }
    })();
  }, []);

  const updateColor = useCallback((key: keyof ColorTheme, hex: string) => {
    setTheme((prev) => {
      const next = { ...prev, [key]: hex };
      applyThemeToCSS(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setSaved(false);
  }, []);

  const updateGlass = useCallback((key: keyof GlassOpacity, value: number) => {
    setGlass((prev) => {
      const next = { ...prev, [key]: value };
      applyGlassToCSS(next);
      localStorage.setItem(GLASS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setSaved(false);
  }, []);

  async function saveTheme() {
    setSaving(true);
    try {
      await runWithLoading(async () => {
        await systemConfigRepo.setValue("color_theme", JSON.stringify(theme));
        await systemConfigRepo.setValue("glass_opacity", JSON.stringify(glass));
        await audit({
          action: "settings.color_theme.save",
          entity: "system_config",
          entity_label: "color_theme",
          details: { ...theme, glass } as Record<string, unknown>,
        });
        setSaved(true);
        toast.success("Tema guardado", "Los colores se aplicaron a toda la aplicación");
      });
    } catch (e) {
      toast.error("Error al guardar", (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function resetTheme() {
    setTheme(DEFAULT_THEME);
    setGlass(DEFAULT_GLASS);
    applyThemeToCSS(DEFAULT_THEME);
    applyGlassToCSS(DEFAULT_GLASS);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(GLASS_STORAGE_KEY);
    document.documentElement.style.removeProperty("--color-text");
    document.documentElement.style.removeProperty("--color-text-muted");
    setSaved(false);
  }

  return (
    <Card>
      <CardHeader
        title="Círculo Cromático — Personalización de Colores"
        subtitle="Personaliza los colores de toda la aplicación: botones, textos, fondos, bordes y más."
        action={
          <InfoTooltip text="Usa el círculo cromático para elegir colores. Selecciona qué elemento quieres personalizar en el menú desplegable, ajusta el color con la rueda y el brillo, y guarda para aplicar los cambios a toda la aplicación." />
        }
      />
      <div className="px-5 pb-5 space-y-5">
        {!isAdmin && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
            <Eye size={16} className="shrink-0 mt-0.5" />
            <span>Solo lectura. Los administradores pueden modificar los colores.</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <div className="flex flex-col items-center">
            <ColorWheel
              color={theme[selectedKey] ?? "#000000"}
              onChange={(hex) => updateColor(selectedKey, hex)}
              size={220}
            />
          </div>

          <div className="space-y-4">
            <Select
              label="Elemento a personalizar"
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value as keyof ColorTheme)}
              disabled={!isAdmin}
            >
              {COLOR_KEYS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </Select>

            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500">
                {COLOR_KEYS.find((c) => c.key === selectedKey)?.description}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">
                Vista previa de componentes
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    className="px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm"
                    style={{ backgroundColor: theme.primary, color: "#fff" }}
                  >
                    Botón Primario
                  </button>
                  <button
                    className="px-4 py-2 text-sm font-medium rounded-lg border"
                    style={{
                      backgroundColor: "transparent",
                      borderColor: theme.primary,
                      color: theme.primary,
                    }}
                  >
                    Botón Outline
                  </button>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium border"
                    style={{
                      backgroundColor: theme.accent + "20",
                      color: theme.accent,
                      borderColor: theme.accent + "40",
                    }}
                  >
                    Badge Acento
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium border"
                    style={{
                      backgroundColor: theme.success + "20",
                      color: theme.success,
                      borderColor: theme.success + "40",
                    }}
                  >
                    Éxito
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium border"
                    style={{
                      backgroundColor: theme.warning + "20",
                      color: theme.warning,
                      borderColor: theme.warning + "40",
                    }}
                  >
                    Advertencia
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium border"
                    style={{
                      backgroundColor: theme.error + "20",
                      color: theme.error,
                      borderColor: theme.error + "40",
                    }}
                  >
                    Error
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Campo de texto"
                    className="px-3 py-2 text-sm border rounded-lg flex-1 max-w-xs"
                    style={{
                      borderColor: "var(--color-input-border)",
                      backgroundColor: "var(--color-input-bg)",
                      color: "var(--color-text)",
                    }}
                    readOnly
                  />
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: theme.primary }} />
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">Todos los colores</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {COLOR_KEYS.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setSelectedKey(c.key)}
                    disabled={!isAdmin}
                    className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${selectedKey === c.key ? "ring-2 ring-primary border-transparent" : "border-slate-200 hover:border-slate-300"} ${!isAdmin ? "cursor-default" : "cursor-pointer"}`}
                  >
                    <div
                      className="w-6 h-6 rounded shrink-0"
                      style={{ backgroundColor: theme[c.key] }}
                    />
                    <div className="min-w-0 text-left">
                      <p className="text-xs font-medium text-slate-700 truncate">{c.label}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {theme[c.key]?.toUpperCase()}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {isAdmin && (
                <Button size="sm" onClick={saveTheme} disabled={saving || saved}>
                  {saved ? <Check size={15} /> : saving ? null : <Save size={15} />}
                  {saved ? "Guardado" : "Guardar tema"}
                </Button>
              )}
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={resetTheme} disabled={saving}>
                  <RotateCcw size={15} /> Restablecer
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Liquid Glass opacity controls */}
        <div className="border-t border-slate-200/60 pt-5">
          <div className="flex items-center gap-2 mb-4">
            <SlidersHorizontal size={18} className="text-primary" />
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Opacidad de efectos Glass</h3>
              <p className="text-xs text-slate-500">
                Ajusta la translucidez de cada tipo de superficie{" "}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {GLASS_KEYS.map((g) => (
              <div key={g.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-700">{g.label}</label>
                  <span className="text-xs font-mono text-slate-500 tabular-nums">
                    {Math.round(glass[g.key] * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={glass[g.key]}
                  onChange={(e) => updateGlass(g.key, parseFloat(e.target.value))}
                  disabled={!isAdmin}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary disabled:cursor-default"
                  style={{
                    background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${glass[g.key] * 100}%, #e2e8f0 ${glass[g.key] * 100}%, #e2e8f0 100%)`,
                  }}
                />
                <p className="text-[10px] text-slate-400">{g.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Live glass preview */}
        <div className="border-t border-slate-200/60 pt-5">
          <p className="text-xs font-semibold text-slate-700 mb-3">Vista previa Liquid Glass</p>
          <div
            className="relative overflow-hidden rounded-2xl p-6"
            style={{ background: "linear-gradient(135deg, #1e3a5f, #0ea5e9, #6366f1, #8b5cf6)" }}
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
              <div className="glass-surface rounded-xl p-3 text-center">
                <p className="text-xs font-semibold text-slate-800">Tarjeta</p>
                <p className="text-[10px] text-slate-600 mt-1">Surface</p>
              </div>
              <div className="glass-modal rounded-xl p-3 text-center">
                <p className="text-xs font-semibold text-slate-800">Modal</p>
                <p className="text-[10px] text-slate-600 mt-1">Dialog</p>
              </div>
              <div className="glass-input rounded-xl p-3 text-center">
                <p className="text-xs font-semibold text-slate-800">Input</p>
                <p className="text-[10px] text-slate-600 mt-1">Field</p>
              </div>
              <div className="glass-topbar rounded-xl p-3 text-center">
                <p className="text-xs font-semibold text-slate-800">Topbar</p>
                <p className="text-[10px] text-slate-600 mt-1">Header</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
