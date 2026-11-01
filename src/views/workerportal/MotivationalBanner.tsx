import { useMemo } from "react";
import { Heart, Sparkles, TrendingUp, ShieldCheck, Coffee, Star, Zap, Award } from "lucide-react";

type MotivationalMessage = {
  text: string;
  icon: typeof Heart;
  gradient: string;
  iconBg: string;
};

const MESSAGES: MotivationalMessage[] = [
  {
    text: "Bienvenido de vuelta. Recuerda que eres un colaborador importante para nosotros.",
    icon: Heart,
    gradient: "from-rose-50/80 to-pink-50/60",
    iconBg: "from-rose-400 to-pink-500",
  },
  {
    text: "Tu esfuerzo y dedicacion hacen la diferencia cada dia. Sigue adelante.",
    icon: Star,
    gradient: "from-amber-50/80 to-yellow-50/60",
    iconBg: "from-amber-400 to-orange-500",
  },
  {
    text: "Cada dia es una nueva oportunidad para crecer y mejorar. Cuenta con nosotros.",
    icon: TrendingUp,
    gradient: "from-emerald-50/80 to-teal-50/60",
    iconBg: "from-emerald-400 to-teal-500",
  },
  {
    text: "Tu seguridad es lo mas importante. Trabaja con cuidado y vuelve a casa sano y salvo.",
    icon: ShieldCheck,
    gradient: "from-blue-50/80 to-sky-50/60",
    iconBg: "from-blue-400 to-sky-500",
  },
  {
    text: "Gracias por tu compromiso y profesionalismo. Eres parte fundamental de este equipo.",
    icon: Award,
    gradient: "from-violet-50/80 to-purple-50/60",
    iconBg: "from-violet-400 to-purple-500",
  },
  {
    text: "El trabajo que haces importa. Cada aporte tuyo construye el exito de todos.",
    icon: Sparkles,
    gradient: "from-cyan-50/80 to-blue-50/60",
    iconBg: "from-cyan-400 to-blue-500",
  },
  {
    text: "Toma un momento para ti. El descanso tambien es parte del buen desempeno.",
    icon: Coffee,
    gradient: "from-orange-50/80 to-amber-50/60",
    iconBg: "from-orange-400 to-amber-500",
  },
  {
    text: "Tu energia y actitud inspiran a quienes te rodean. No subestimes tu impacto.",
    icon: Zap,
    gradient: "from-yellow-50/80 to-lime-50/60",
    iconBg: "from-yellow-400 to-lime-500",
  },
];

function pickMessage(workerRut: string, dateKey: string): MotivationalMessage {
  const seed = (workerRut + dateKey).split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return MESSAGES[seed % MESSAGES.length];
}

export function MotivationalBanner({ workerRut }: { workerRut: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const message = useMemo(() => pickMessage(workerRut, today), [workerRut, today]);
  const Icon = message.icon;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${message.gradient} border border-white/40 animate-view-enter`}
    >
      <div className="relative flex items-start gap-3.5 p-4 sm:p-5">
        <div
          className={`w-11 h-11 rounded-xl bg-gradient-to-br ${message.iconBg} flex items-center justify-center text-white shrink-0 shadow-md animate-candy-pop`}
        >
          <Icon size={22} />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold text-slate-700 leading-relaxed">{message.text}</p>
        </div>
      </div>
    </div>
  );
}
