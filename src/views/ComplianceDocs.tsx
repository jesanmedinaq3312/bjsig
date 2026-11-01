import { useState, useMemo } from "react";
import {
  Scale,
  Search,
  ChevronDown,
  ChevronRight,
  BookOpen,
  ShieldCheck,
  Users,
  AlertTriangle,
  FileText,
  GraduationCap,
  Clock,
  Wallet,
  Plane,
  Calculator,
  Megaphone,
  Grid3x3,
  BarChart3,
  Cloud,
  ClipboardCheck,
  HardHat,
  FileSpreadsheet,
  Download,
} from "lucide-react";
import { Card, CardHeader, Button, Badge } from "@/components/ui";
import { ExportService } from "@/lib/export";

type ComplianceCategory = "sst" | "hr" | "privacy" | "quality" | "environment";

interface ComplianceEntry {
  id: string;
  module: string;
  moduleIcon: typeof ShieldCheck;
  law: string;
  decree: string;
  article: string;
  summary: string;
  obligation: string;
  category: ComplianceCategory;
  view?: string;
}

interface CategoryMeta {
  key: ComplianceCategory;
  label: string;
  icon: typeof ShieldCheck;
  color: string;
  bg: string;
  border: string;
  description: string;
}

const CATEGORIES: CategoryMeta[] = [
  {
    key: "sst",
    label: "Seguridad y Salud Ocupacional",
    icon: HardHat,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
    description:
      "Normativa aplicable a prevención de riesgos laborales, accidentabilidad y comités paritarios.",
  },
  {
    key: "hr",
    label: "Recursos Humanos y Laboral",
    icon: Users,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    description: "Código del Trabajo, contrato, finiquito, vacaciones, jornada y nómina.",
  },
  {
    key: "privacy",
    label: "Datos Personales y Ciberseguridad",
    icon: ShieldCheck,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    description: "Ley 21.719 de Protección de Datos y Ley 21.663 de Ciberseguridad.",
  },
  {
    key: "quality",
    label: "Calidad y Gestión",
    icon: BookOpen,
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
    description: "Normas ISO 9001, ISO 14001 e ISO 45001 para el Sistema Integrado de Gestión.",
  },
  {
    key: "environment",
    label: "Medio Ambiente",
    icon: BarChart3,
    color: "text-teal-600",
    bg: "bg-teal-50",
    border: "border-teal-200",
    description: "Gestión ambiental, residuos y emisiones aplicables a operaciones de mantención.",
  },
];

const ENTRIES: ComplianceEntry[] = [
  // ── SST ──
  {
    id: "sst-1",
    module: "Incidentes DS 44",
    moduleIcon: AlertTriangle,
    law: "Ley 16.744",
    decree: "DS 101 (1968)",
    article: "Art. 76°",
    summary:
      "Obligación de denunciar accidentes del trabajo y enfermedades profesionales a la mutualidad (ACHS) dentro de 24 horas.",
    obligation:
      "Registrar todo accidente del trabajo con diagnóstico, tratamiento y seguimiento. Mantener estadísticas de accidentabilidad y enfermedades profesionales.",
    category: "sst",
    view: "incidents",
  },
  {
    id: "sst-2",
    module: "Matriz IPER",
    moduleIcon: Grid3x3,
    law: "Ley 16.744",
    decree: "DS 40 (1969)",
    article: "Art. 10°",
    summary:
      "Obligación del empleador de identificar peligros y evaluar riesgos en cada puesto de trabajo.",
    obligation:
      "Mantener una matriz de identificación de peligros y evaluación de riesgos (IPER) actualizada por área y actividad, con medidas de control y responsable.",
    category: "sst",
    view: "ipermatrix",
  },
  {
    id: "sst-3",
    module: "Charlas de Seguridad DIT",
    moduleIcon: Megaphone,
    law: "Ley 16.744",
    decree: "DS 40 (1969)",
    article: "Art. 21°",
    summary:
      "Obligación de capacitar a los trabajadores en los riesgos del trabajo y procedimientos seguros.",
    obligation:
      "Registrar charlas diarias de seguridad (DIT) con tema, expositor, asistentes, duración y firma digital de asistencia.",
    category: "sst",
    view: "securitytalks",
  },
  {
    id: "sst-4",
    module: "Capacitaciones",
    moduleIcon: GraduationCap,
    law: "Ley 16.744",
    decree: "DS 40 (1969)",
    article: "Art. 21°",
    summary:
      "La empresa debe proporcionar capacitación en prevención de riesgos a todos los trabajadores.",
    obligation:
      "Mantener registro de capacitaciones con contenido, fecha, duración, asistencia y evaluación. Capacitación mínima de 8 horas cronológicas al año.",
    category: "sst",
    view: "trainings",
  },
  {
    id: "sst-5",
    module: "Control Diario de Terreno",
    moduleIcon: ClipboardCheck,
    law: "Ley 16.744",
    decree: "DS 594 (2000)",
    article: "Art. 184° Código del Trabajo",
    summary:
      "Deber de protección del empleador: mantener condiciones seguras en el lugar de trabajo.",
    obligation:
      "Realizar observaciones proactivas de terreno (OPL), verificar condiciones seguras, uso de EPP y procedimientos.",
    category: "sst",
    view: "terrain",
  },
  {
    id: "sst-6",
    module: "Indicadores ACHS / CPHS",
    moduleIcon: BarChart3,
    law: "Ley 16.744",
    decree: "DS 101 (1968)",
    article: "Art. 68°",
    summary:
      "Obligación de mantener y reportar indicadores de accidentabilidad: tasa de accidentabilidad, gravedad y frecuencia.",
    obligation:
      "Calcular y mantener indicadores SUSESO: tasa de accidentabilidad, frecuencia, gravedad, y días promedio perdidos por accidente.",
    category: "sst",
    view: "indicators",
  },
  {
    id: "sst-7",
    module: "EPP (Equipos de Protección Personal)",
    moduleIcon: HardHat,
    law: "Ley 16.744",
    decree: "DS 594 (2000)",
    article: "Art. 53°",
    summary: "El empleador debe proporcionar EPP adecuados al riesgo y vigilar su uso efectivo.",
    obligation:
      "Mantener registro de entrega de EPP por trabajador con fecha, tipo, talla, firma. Renovar cuando corresponda.",
    category: "sst",
    view: "workers",
  },
  {
    id: "sst-8",
    module: "Matriz de Documentación",
    moduleIcon: FileText,
    law: "DS 594 (2000)",
    decree: "DS 44 (1986)",
    article: "Título IV y V",
    summary:
      "Exámenes preocupacionales y ocupacionales vigentes. IRL/ODI por cargo firmada. Licencias y certificaciones al día.",
    obligation:
      "Controlar vencimiento de exámenes ocupacionales (alturas, espacios confinados), licencias de conducir y certificaciones (rigger, soldador). IRL/ODI firmada al ingresar al cargo.",
    category: "sst",
    view: "docs",
  },
  {
    id: "sst-9",
    module: "Gestión de Turnos",
    moduleIcon: Clock,
    law: "Código del Trabajo",
    decree: "Ley 21.561 (2023)",
    article: "Art. 28°",
    summary:
      "Jornada laboral máxima de 40 horas semanales. Registro obligatorio de asistencia y control de horas extras.",
    obligation:
      "Registrar asistencia diaria, hora de entrada y salida. Controlar horas extraordinarias con tope legal y pago recargo.",
    category: "sst",
    view: "shifts",
  },

  // ── HR ──
  {
    id: "hr-1",
    module: "Trabajadores",
    moduleIcon: Users,
    law: "Código del Trabajo",
    decree: "DFL 1 (2003)",
    article: "Art. 7°–10°",
    summary:
      "Contrato de trabajo escrito con: fecha de ingreso, funciones, remuneración, jornada, lugar de trabajo.",
    obligation:
      "Mantener ficha de cada trabajador con contrato, datos personales, cargo, fecha de ingreso, remuneración y beneficios.",
    category: "hr",
    view: "workers",
  },
  {
    id: "hr-2",
    module: "Vacaciones",
    moduleIcon: Plane,
    law: "Código del Trabajo",
    decree: "DFL 1 (2003)",
    article: "Art. 67°–70°",
    summary:
      "15 días de feriado legal por año de servicio. Feriado progresivo cada 3 años desde el 10° año.",
    obligation:
      "Llevar registro de saldo vacacional por trabajador y año. Solicitudes con fecha de inicio, término, días y estado de aprobación.",
    category: "hr",
    view: "vacations",
  },
  {
    id: "hr-3",
    module: "Finiquitos",
    moduleIcon: Calculator,
    law: "Código del Trabajo",
    decree: "DFL 1 (2003)",
    article: "Art. 159°–163°, 172°",
    summary:
      "Finiquito con indemnización por años de servicio (11% mensual por año), sustitutiva del aviso previo y vacaciones no gozadas.",
    obligation:
      "Calcular finiquito según causal: renuncia, despido justificado/injustificado, mutuo acuerdo. Incluir indemnización legal y pactada.",
    category: "hr",
    view: "finiquitos",
  },
  {
    id: "hr-4",
    module: "Nómina & Liquidaciones",
    moduleIcon: Wallet,
    law: "Código del Trabajo",
    decree: "DFL 1 (2003)",
    article: "Art. 54°, 56°",
    summary:
      "Entrega de liquidación de sueldo por escrito con: remuneración bruta, descuentos legales y neto a pagar.",
    obligation:
      "Generar liquidación mensual con: sueldo base, horas extras, gratificación, AFP, salud, seguro cesantía y descuentos judiciales.",
    category: "hr",
    view: "payroll",
  },
  {
    id: "hr-5",
    module: "Desempeño & Desarrollo",
    moduleIcon: Wallet,
    law: "Código del Trabajo",
    decree: "Ley 21.643 (2024)",
    article: "Art. 183° quater",
    summary: "Evaluación de desempeño obligatoria. Derecho a capacitación mínima anual.",
    obligation:
      "Realizar evaluación de desempeño al menos una vez al año. Registrar objetivos, evaluaciones y retroalimentación.",
    category: "hr",
    view: "performance",
  },

  // ── Privacy ──
  {
    id: "priv-1",
    module: "Trabajadores (Datos Personales)",
    moduleIcon: Users,
    law: "Ley 21.719 (2024)",
    decree: "Protección de Datos Personales",
    article: "Art. 2°, 9°",
    summary:
      "Tratamiento de datos personales con consentimiento del titular. Derechos ARCO+: acceso, rectificación, cancelación, oposición.",
    obligation:
      "Registrar consentimiento explícito del trabajador para tratamiento de datos. Permitir ejercicio de derechos ARCO+ mediante portal.",
    category: "privacy",
    view: "workers",
  },
  {
    id: "priv-2",
    module: "Portal del Trabajador",
    moduleIcon: Users,
    law: "Ley 21.719 (2024)",
    decree: "Protección de Datos Personales",
    article: "Art. 15°–19°",
    summary:
      "El titular puede solicitar acceso, rectificación, supresión y portabilidad de sus datos personales.",
    obligation:
      "Portal de autogestión donde el trabajador puede ejercer derechos ARCO+ sobre sus datos. Registro de solicitudes y respuesta en 10 días.",
    category: "privacy",
    view: "workerportal",
  },
  {
    id: "priv-3",
    module: "Registro de Actividad",
    moduleIcon: FileText,
    law: "Ley 21.663 (2024)",
    decree: "Ciberseguridad",
    article: "Art. 4°, 8°",
    summary:
      "Obligación de mantener registros de auditoría de acceso y tratamiento de datos por 5 años.",
    obligation:
      "Bitácora de actividad con usuario, acción, entidad, fecha y detalles. Conservar logs por mínimo 5 años para auditoría SUSESO/CMF.",
    category: "privacy",
    view: "logs",
  },
  {
    id: "priv-4",
    module: "Documentos en la Nube",
    moduleIcon: Cloud,
    law: "Ley 21.663 (2024)",
    decree: "Ciberseguridad",
    article: "Art. 9°, 10°",
    summary:
      "Medidas técnicas y organizativas para proteger datos almacenados: cifrado, control de acceso y trazabilidad.",
    obligation:
      "Almacenamiento con control de acceso por rol, cifrado en tránsito y reposo. Registro de quién accede, descarga o modifica cada documento.",
    category: "privacy",
    view: "clouddocs",
  },

  // ── Quality / ISO ──
  {
    id: "iso-1",
    module: "Auditoría ISO",
    moduleIcon: ShieldCheck,
    law: "ISO 9001:2015",
    decree: "NCh-ISO 9001",
    article: "Cláusula 9.2",
    summary:
      "Auditorías internas planificadas para evaluar la conformidad del sistema de gestión de calidad.",
    obligation:
      "Registrar hallazgos de auditoría: tipo (NC, observación, mejora), área, descripción, acción correctiva y estado de cierre.",
    category: "quality",
    view: "iso",
  },
  {
    id: "iso-2",
    module: "Auditoría ISO",
    moduleIcon: ShieldCheck,
    law: "ISO 14001:2015",
    decree: "NCh-ISO 14001",
    article: "Cláusula 9.2",
    summary: "Auditorías para evaluar la conformidad del sistema de gestión ambiental.",
    obligation:
      "Registrar hallazgos ambientales: aspectos e impactos, no conformidades y acciones correctivas con responsable y plazo.",
    category: "quality",
    view: "iso",
  },
  {
    id: "iso-3",
    module: "Auditoría ISO",
    moduleIcon: ShieldCheck,
    law: "ISO 45001:2018",
    decree: "NCh-ISO 45001",
    article: "Cláusula 9.2",
    summary: "Auditorías para evaluar la conformidad del sistema de gestión de SST.",
    obligation:
      "Registrar hallazgos SST: identificación de peligros, evaluación de riesgos, controles y acciones correctivas.",
    category: "quality",
    view: "iso",
  },
  {
    id: "iso-4",
    module: "Indicadores ACHS / CPHS",
    moduleIcon: BarChart3,
    law: "ISO 45001:2018",
    decree: "NCh-ISO 45001",
    article: "Cláusula 9.1",
    summary: "Seguimiento, medición, análisis y evaluación del desempeño SST.",
    obligation:
      "Calcular indicadores de desempeño SST: tasa de accidentabilidad, frecuencia, gravedad, cumplimiento de capacitaciones y inspecciones.",
    category: "quality",
    view: "indicators",
  },

  // ── Environment ──
  {
    id: "env-1",
    module: "Auditoría ISO 14001",
    moduleIcon: BarChart3,
    law: "ISO 14001:2015",
    decree: "NCh-ISO 14001",
    article: "Cláusula 6.1",
    summary:
      "Identificación de aspectos ambientales e impactos asociados a actividades, productos y servicios.",
    obligation:
      "Mantener registro de aspectos ambientales significativos: residuos, emisiones, consumo de agua/energía. Plan de gestión y reducción.",
    category: "environment",
    view: "iso",
  },
  {
    id: "env-2",
    module: "Documentos en la Nube",
    moduleIcon: Cloud,
    law: "Ley 20.920 (2016)",
    decree: "REP (Responsabilidad Extendida del Productor)",
    article: "Art. 12°",
    summary: "Gestión de residuos y obligaciones REP para productos prioritarios.",
    obligation:
      "Mantener documentación de gestión de residuos: certificados de disposición final, manifiestos de transporte y declaraciones REP.",
    category: "environment",
    view: "clouddocs",
  },
];

const CATEGORY_LABEL: Record<ComplianceCategory, string> = {
  sst: "SST",
  hr: "Laboral",
  privacy: "Datos",
  quality: "ISO",
  environment: "Ambiental",
};

export function ComplianceDocsView() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<ComplianceCategory | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return ENTRIES.filter((e) => {
      const matchCat = activeCategory === "all" || e.category === activeCategory;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        e.module.toLowerCase().includes(q) ||
        e.law.toLowerCase().includes(q) ||
        e.decree.toLowerCase().includes(q) ||
        e.summary.toLowerCase().includes(q) ||
        e.obligation.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [search, activeCategory]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    ENTRIES.forEach((e) => {
      c[e.category] = (c[e.category] ?? 0) + 1;
    });
    return c;
  }, []);

  function exportExcel() {
    ExportService.toExcel(
      filtered.map((e) => ({
        Módulo: e.module,
        Categoría: CATEGORY_LABEL[e.category],
        Ley: e.law,
        Decreto: e.decree,
        Artículo: e.article,
        Resumen: e.summary,
        Obligación: e.obligation,
      })),
      "Documentación Normativa Chile",
      "documentacion_normativa_chile",
    );
  }

  function exportPdf() {
    ExportService.toPdf(
      "Documentación Normativa — Cumplimiento Legal Chile",
      ["Módulo", "Ley", "Decreto", "Artículo", "Resumen"],
      filtered.map((e) => [e.module, e.law, e.decree, e.article, e.summary]),
      "documentacion_normativa_chile",
      "Ley 16.744 · DS 40 · DS 44 · DS 594 · Código del Trabajo · Ley 21.719 · Ley 21.663 · ISO 9001/14001/45001",
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
            <Scale size={24} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800 leading-tight">
              Documentación Normativa Chile
            </h2>
            <p className="text-xs text-slate-500">
              Mapeo de cada módulo del sistema a su normativa legal aplicable
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <FileSpreadsheet size={15} /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportPdf}>
            <Download size={15} /> PDF
          </Button>
        </div>
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setActiveCategory("all")}
          className={`p-3 rounded-xl border text-left transition-all ${
            activeCategory === "all"
              ? "border-blue-500 ring-2 ring-blue-100 bg-blue-50/30"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={16} className="text-slate-500" />
            <span className="text-xs font-semibold text-slate-700">Todas</span>
          </div>
          <p className="text-lg font-bold text-slate-800">{ENTRIES.length}</p>
        </button>
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const isActive = activeCategory === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setActiveCategory(isActive ? "all" : c.key)}
              className={`p-3 rounded-xl border text-left transition-all ${
                isActive
                  ? `ring-2 ${c.border} ${c.bg}`
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon size={16} className={c.color} />
                <span className="text-xs font-semibold text-slate-700 truncate">{c.label}</span>
              </div>
              <p className="text-lg font-bold text-slate-800">{counts[c.key] ?? 0}</p>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por módulo, ley, decreto u obligación..."
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Active category description */}
      {activeCategory !== "all" &&
        (() => {
          const cat = CATEGORIES.find((c) => c.key === activeCategory);
          if (!cat) return null;
          const Icon = cat.icon;
          return (
            <div
              className={`flex items-start gap-3 p-3.5 rounded-xl ${cat.bg} ${cat.border} border`}
            >
              <Icon size={18} className={`${cat.color} shrink-0 mt-0.5`} />
              <div>
                <p className={`text-sm font-semibold ${cat.color}`}>{cat.label}</p>
                <p className="text-xs text-slate-600 mt-0.5">{cat.description}</p>
              </div>
            </div>
          );
        })()}

      {/* Entries */}
      <Card>
        <CardHeader
          title="Mapeo Normativo por Módulo"
          subtitle={`${filtered.length} de ${ENTRIES.length} registros normativos`}
        />
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No se encontraron registros que coincidan con la búsqueda.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((e) => {
              const cat = CATEGORIES.find((c) => c.key === e.category)!;
              const Icon = e.moduleIcon;
              const isOpen = expanded === e.id;
              return (
                <div key={e.id} className="px-5 py-4 hover:bg-slate-50/60 transition-colors">
                  <button
                    onClick={() => setExpanded(isOpen ? null : e.id)}
                    className="w-full flex items-start gap-3 text-left"
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${cat.bg} ${cat.border} border`}>
                      <Icon size={18} className={cat.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-slate-800">{e.module}</span>
                        <Badge
                          className={`${cat.bg} ${cat.color} ${cat.border} border text-[10px]`}
                        >
                          {CATEGORY_LABEL[e.category]}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                        <span className="font-medium">{e.law}</span>
                        <span>·</span>
                        <span>{e.decree}</span>
                        <span>·</span>
                        <span>{e.article}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">{e.summary}</p>
                    </div>
                    {isOpen ? (
                      <ChevronDown size={18} className="text-slate-400 shrink-0 mt-1" />
                    ) : (
                      <ChevronRight size={18} className="text-slate-400 shrink-0 mt-1" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="mt-3 ml-11 space-y-3 animate-fade-in">
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
                          Resumen Normativo
                        </p>
                        <p className="text-sm text-slate-700">{e.summary}</p>
                      </div>
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 mb-1">
                          Obligación de la Empresa
                        </p>
                        <p className="text-sm text-slate-700">{e.obligation}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                          <FileText size={11} className="mr-1" /> {e.law}
                        </Badge>
                        <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                          {e.decree}
                        </Badge>
                        <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                          {e.article}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Footer notice */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <Scale size={20} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Aviso Legal</p>
            <p className="text-blue-700 text-xs leading-relaxed">
              Esta documentación es una referencia de apoyo y no constituye asesoría legal. Las
              normas citadas corresponden al marco regulatorio vigente en Chile a la fecha de
              publicación. Para cumplimiento específico consulte a su prevencionista de riesgos o
              asesor legal. Las normas pueden actualizarse; verifique vigencia en{" "}
              <span className="font-medium">leychile.cl</span> y{" "}
              <span className="font-medium">achs.cl</span>.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
