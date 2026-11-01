import {
  Cake,
  Sun,
  Coffee,
  Moon,
  Sparkles,
  Heart,
  Award,
  TrendingUp,
  CalendarCheck,
  HandHeart,
  Zap,
  Star,
  ShieldCheck,
} from "lucide-react";
import type { WorkerPortalData } from "@/hooks/useWorkerData";

function getGreeting(): { text: string; icon: React.ReactNode; gradient: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return {
      text: "Buenos dias",
      icon: <Sun size={22} className="text-amber-400" />,
      gradient: "from-amber-400/20 via-orange-300/10 to-transparent",
    };
  }
  if (hour >= 12 && hour < 18) {
    return {
      text: "Buenas tardes",
      icon: <Coffee size={22} className="text-sky-400" />,
      gradient: "from-sky-400/20 via-blue-300/10 to-transparent",
    };
  }
  return {
    text: "Buenas noches",
    icon: <Moon size={22} className="text-indigo-300" />,
    gradient: "from-indigo-400/20 via-blue-400/10 to-transparent",
  };
}

function getFirstName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || "Trabajador";
}

interface BirthdayInfo {
  date: Date;
  daysUntil: number;
  age: number;
  isToday: boolean;
}

function getNextBirthday(birthDate: string | null): BirthdayInfo | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate + "T00:00:00");
  if (isNaN(birth.getTime())) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const thisYear = now.getFullYear();
  let next = new Date(thisYear, birth.getMonth(), birth.getDate());
  next.setHours(0, 0, 0, 0);

  if (next < now) {
    next = new Date(thisYear + 1, birth.getMonth(), birth.getDate());
    next.setHours(0, 0, 0, 0);
  }

  const diffMs = next.getTime() - now.getTime();
  const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const age = next.getFullYear() - birth.getFullYear();
  const isToday = daysUntil === 0;

  return { date: next, daysUntil, age, isToday };
}

const BIRTHDAY_MESSAGES: Record<string, string> = {
  today:
    "Hoy es tu dia especial! Te deseamos un muy feliz cumpleanos, que tengas un ano lleno de exitos y momentos maravillosos.",
  tomorrow: "Manana es tu cumpleanos! Te esperamos con ansias para celebrarlo contigo.",
  thisWeek: "Tu cumpleanos se acerca! Lo esperamos con ansias para celebrar juntos.",
  soon: "Se acerca tu cumpleanos, te esperamos con carino para festejar.",
  far: "Falta un tiempo para tu cumpleanos, pero ya lo estamos esperando con carino.",
};

function getBirthdayMessage(daysUntil: number): string {
  if (daysUntil === 0) return BIRTHDAY_MESSAGES.today;
  if (daysUntil === 1) return BIRTHDAY_MESSAGES.tomorrow;
  if (daysUntil <= 7) return BIRTHDAY_MESSAGES.thisWeek;
  if (daysUntil <= 30) return BIRTHDAY_MESSAGES.soon;
  return BIRTHDAY_MESSAGES.far;
}

function getTenure(
  hireDate: string | null,
): { years: number; months: number; totalMonths: number } | null {
  if (!hireDate) return null;
  const start = new Date(hireDate + "T00:00:00");
  if (isNaN(start.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (months < 0) {
    years--;
    months += 12;
  }
  const totalMonths = years * 12 + months;
  if (totalMonths < 0) return null;
  return { years, months, totalMonths };
}

function tenureLabel(t: { years: number; months: number }): string {
  if (t.years === 0 && t.months === 0) return "recien incorporado";
  if (t.years === 0) return t.months === 1 ? "1 mes" : `${t.months} meses`;
  if (t.years === 1 && t.months === 0) return "1 ano";
  if (t.years === 1) return `1 ano y ${t.months === 1 ? "1 mes" : `${t.months} meses`}`;
  if (t.months === 0) return `${t.years} anos`;
  return `${t.years} anos y ${t.months === 1 ? "1 mes" : `${t.months} meses`}`;
}

const WEEKDAYS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

interface PersonalAlert {
  icon: React.ReactNode;
  title: string;
  message: string;
  gradient: string;
  iconBg: string;
}

function buildPersonalAlerts(
  firstName: string,
  position: string | null,
  department: string | null,
  tenure: { years: number; months: number; totalMonths: number } | null,
): PersonalAlert[] {
  const hour = new Date().getHours();
  const dayName = WEEKDAYS[new Date().getDay()];
  const dept = department ?? "el equipo";
  const pos = position ?? "tu cargo";
  const tenureStr = tenure ? tenureLabel(tenure) : "";

  const alerts: PersonalAlert[] = [];

  // Welcome back / time-of-day greeting
  if (hour >= 5 && hour < 12) {
    alerts.push({
      icon: <Sun size={18} />,
      title: `Que bueno verte de nuevo, ${firstName}`,
      message: `Es un nuevo dia y tu presencia en ${dept} hace la diferencia. Recordando que eres una pieza clave de este equipo.`,
      gradient: "from-amber-50/80 to-orange-50/60",
      iconBg: "from-amber-400 to-orange-500",
    });
  } else if (hour >= 12 && hour < 18) {
    alerts.push({
      icon: <Coffee size={18} />,
      title: `Buenas tardes, ${firstName}`,
      message: `Esperamos que tu jornada este yendo genial. Tu trabajo como ${pos} es fundamental para ${dept}.`,
      gradient: "from-sky-50/80 to-blue-50/60",
      iconBg: "from-sky-400 to-blue-500",
    });
  } else {
    alerts.push({
      icon: <Moon size={18} />,
      title: `Buenas noches, ${firstName}`,
      message: `Gracias por tu dedicacion hoy. Descansa bien, mañana te esperamos con energias renovadas.`,
      gradient: "from-indigo-50/80 to-blue-50/60",
      iconBg: "from-indigo-400 to-blue-500",
    });
  }

  // Tenure recognition
  if (tenure) {
    if (tenure.totalMonths === 0) {
      alerts.push({
        icon: <Sparkles size={18} />,
        title: `Bienvenido oficialmente, ${firstName}`,
        message: `Estamos muy contentos de que te hayas sumado a ${dept}. Tu primer mes con nosotros es el comienzo de algo grande.`,
        gradient: "from-emerald-50/80 to-teal-50/60",
        iconBg: "from-emerald-400 to-teal-500",
      });
    } else if (tenure.years >= 1 && tenure.months === 0) {
      alerts.push({
        icon: <Award size={18} />,
        title: `${firstName}, ya completaste ${tenure.years} ${tenure.years === 1 ? "ano" : "anos"} con nosotros`,
        message: `Tu lealtad y compromiso como ${pos} son un ejemplo para todos en ${dept}. Gracias por seguir creciendo junto a nosotros.`,
        gradient: "from-violet-50/80 to-purple-50/60",
        iconBg: "from-violet-400 to-purple-500",
      });
    } else if (tenure.years >= 5) {
      alerts.push({
        icon: <Award size={18} />,
        title: `${firstName}, ${tenureStr} de trayectoria`,
        message: `Tu experiencia y constancia son un pilar para ${dept}. Valoramos profundamente todo lo que aportas dia a dia.`,
        gradient: "from-violet-50/80 to-purple-50/60",
        iconBg: "from-violet-400 to-purple-500",
      });
    } else if (tenure.totalMonths >= 3 && tenure.totalMonths <= 6) {
      alerts.push({
        icon: <TrendingUp size={18} />,
        title: `Vas muy bien, ${firstName}`,
        message: `Ya llevas ${tenureStr} con nosotros y se nota tu crecimiento. Estamos viendo tu progreso en ${dept}.`,
        gradient: "from-emerald-50/80 to-teal-50/60",
        iconBg: "from-emerald-400 to-teal-500",
      });
    }
  }

  // Day-of-week motivational
  if (dayName === "lunes") {
    alerts.push({
      icon: <Zap size={18} />,
      title: `Feliz lunes, ${firstName}`,
      message: `Arrancamos la semana con energia. Tu rol como ${pos} es clave para que ${dept} cumpla sus metas esta semana.`,
      gradient: "from-cyan-50/80 to-blue-50/60",
      iconBg: "from-cyan-400 to-blue-500",
    });
  } else if (dayName === "viernes") {
    alerts.push({
      icon: <CalendarCheck size={18} />,
      title: `Ya es viernes, ${firstName}`,
      message: `Cerraste otra semana de trabajo con esfuerzo y dedicacion. Disfruta tu merecido descanso este fin de semana.`,
      gradient: "from-teal-50/80 to-emerald-50/60",
      iconBg: "from-teal-400 to-emerald-500",
    });
  } else if (dayName === "sabado" || dayName === "domingo") {
    alerts.push({
      icon: <Heart size={18} />,
      title: `Fin de semana, ${firstName}`,
      message: `Es momento de descansar y recargar energias. Te esperamos el lunes listo para una nueva semana de exitos.`,
      gradient: "from-rose-50/80 to-pink-50/60",
      iconBg: "from-rose-400 to-pink-500",
    });
  }

  // General appreciation
  alerts.push({
    icon: <HandHeart size={18} />,
    title: `Eres un colaborador importante, ${firstName}`,
    message: `Nunca olvides que tu aporte en ${dept} hace la diferencia. Cada tarea que realizas como ${pos} contribuye al exito de toda la empresa.`,
    gradient: "from-rose-50/80 to-amber-50/60",
    iconBg: "from-rose-400 to-amber-500",
  });

  // Safety reminder
  alerts.push({
    icon: <ShieldCheck size={18} />,
    title: `Tu seguridad es lo primero, ${firstName}`,
    message: `Recuerda siempre usar tus EPP y seguir los protocolos. Cuidarte a ti mismo es cuidar a todo tu equipo de ${dept}.`,
    gradient: "from-blue-50/80 to-cyan-50/60",
    iconBg: "from-blue-400 to-cyan-500",
  });

  // Excellence
  alerts.push({
    icon: <Star size={18} />,
    title: `Sigamos creciendo juntos, ${firstName}`,
    message: `Tu dedicacion y compromiso nos inspiran a ser mejores cada dia. Gracias por ser parte fundamental de este equipo.`,
    gradient: "from-amber-50/80 to-yellow-50/60",
    iconBg: "from-amber-400 to-yellow-500",
  });

  return alerts;
}

function pickAlert(alerts: PersonalAlert[]): PersonalAlert {
  // Use the day of year to pick a deterministic but varying alert per day
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000,
  );
  return alerts[dayOfYear % alerts.length];
}

export function WelcomeHero({
  profile,
  fullName,
}: {
  profile: WorkerPortalData["profile"];
  fullName: string;
}) {
  const greeting = getGreeting();
  const firstName = getFirstName(fullName);
  const birthday = getNextBirthday(profile?.birth_date ?? null);
  const tenure = getTenure(profile?.hire_date ?? null);

  const monthNames = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  const birthdayFormatted = birthday
    ? `${birthday.date.getDate()} de ${monthNames[birthday.date.getMonth()]}`
    : null;

  const allAlerts = buildPersonalAlerts(
    firstName,
    profile?.position ?? null,
    profile?.department_name ?? null,
    tenure,
  );
  const dailyAlert = pickAlert(allAlerts);

  return (
    <div className="relative overflow-hidden rounded-2xl glass-surface glass-hover animate-view-enter">
      <div
        className={`absolute inset-0 bg-gradient-to-br ${greeting.gradient} pointer-events-none`}
      />
      <div className="relative p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-xl shadow-lg shrink-0">
            {fullName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-1">
              {greeting.icon}
              <p className="text-sm font-medium text-slate-500">{greeting.text},</p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
              {firstName}
              <Sparkles size={20} className="inline-block ml-2 text-amber-400" />
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {profile?.position ?? "Sin cargo"}
              {profile?.department_name ? ` · ${profile.department_name}` : ""}
            </p>
          </div>
        </div>

        {birthday && (
          <div className="mt-5 flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-pink-50/80 to-rose-50/60 border border-rose-200/50">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white shrink-0 shadow-md animate-candy-pop">
              <Cake size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-700">
                {birthday.isToday
                  ? "Feliz Cumpleanos!"
                  : `Proximo cumpleanos: ${birthdayFormatted}`}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {getBirthdayMessage(birthday.daysUntil)}
              </p>
              {!birthday.isToday && birthday.daysUntil <= 30 && (
                <p className="text-xs text-rose-500 font-medium mt-1">
                  {birthday.daysUntil === 1 ? "Falta 1 dia" : `Faltan ${birthday.daysUntil} dias`}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Personalized daily alert */}
        <div
          className={`mt-4 flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r ${dailyAlert.gradient} border border-white/40 animate-view-enter`}
        >
          <div
            className={`w-11 h-11 rounded-xl bg-gradient-to-br ${dailyAlert.iconBg} flex items-center justify-center text-white shrink-0 shadow-md`}
          >
            {dailyAlert.icon}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-700">{dailyAlert.title}</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{dailyAlert.message}</p>
          </div>
        </div>

        {/* Tenure badge */}
        {tenure && tenure.totalMonths >= 0 && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/80 border border-slate-200/60">
            <Award size={14} className="text-amber-500" />
            <span className="text-xs font-medium text-slate-600">
              {tenure.totalMonths === 0
                ? "Recien incorporado"
                : `${tenureLabel(tenure)} en el equipo`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
