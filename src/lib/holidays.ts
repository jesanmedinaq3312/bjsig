export interface ChileHoliday {
  date: string;
  name: string;
  type: "legal" | "irrenunciable" | "variable";
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export function getChileHolidays(year: number): ChileHoliday[] {
  const fixed: Array<[number, number, string, ChileHoliday["type"]]> = [
    [1, 1, "Año Nuevo", "irrenunciable"],
    [5, 1, "Día del Trabajo", "irrenunciable"],
    [5, 21, "Día de las Glorias Navales", "legal"],
    [6, 20, "Día Nacional de los Pueblos Indígenas", "legal"],
    [6, 29, "San Pedro y San Pablo", "legal"],
    [7, 16, "Día de la Virgen del Carmen", "legal"],
    [8, 15, "Asunción de la Virgen", "legal"],
    [9, 18, "Independencia Nacional", "irrenunciable"],
    [9, 19, "Día de las Glorias del Ejército", "irrenunciable"],
    [10, 12, "Encuentro de Dos Mundos", "legal"],
    [10, 31, "Día de las Iglesias Evangélicas y Protestantes", "legal"],
    [11, 1, "Día de Todos los Santos", "legal"],
    [12, 8, "Inmaculada Concepción", "legal"],
    [12, 25, "Navidad", "irrenunciable"],
  ];
  const holidays = fixed.map(([month, day, name, type]) => ({
    date: dateKey(year, month, day),
    name,
    type,
  }));
  const easter = easterSunday(year);
  const goodFriday = new Date(year, easter.getMonth(), easter.getDate() - 2);
  const holySaturday = new Date(year, easter.getMonth(), easter.getDate() - 1);
  holidays.push(
    {
      date: dateKey(year, goodFriday.getMonth() + 1, goodFriday.getDate()),
      name: "Viernes Santo",
      type: "legal",
    },
    {
      date: dateKey(year, holySaturday.getMonth() + 1, holySaturday.getDate()),
      name: "Sábado Santo",
      type: "legal",
    },
  );
  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}

export function isChileHoliday(date: string | Date): boolean {
  const key =
    typeof date === "string"
      ? date.slice(0, 10)
      : dateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const year = Number(key.slice(0, 4));
  return getChileHolidays(year).some((holiday) => holiday.date === key);
}

export function countBusinessDays(start: string, end: string): number {
  const from = new Date(`${start}T00:00:00`);
  const to = new Date(`${end}T00:00:00`);
  let count = 0;
  for (let date = from; date <= to; date.setDate(date.getDate() + 1)) {
    const weekday = date.getDay();
    if (weekday !== 0 && weekday !== 6 && !isChileHoliday(date)) count += 1;
  }
  return count;
}

export function formatHoliday(holiday: ChileHoliday): string {
  return `${new Date(`${holiday.date}T00:00:00`).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}: ${holiday.name}`;
}
