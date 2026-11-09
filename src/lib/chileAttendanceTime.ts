export const CHILE_ATTENDANCE_TIME_ZONE = "America/Santiago";

const chileDatePartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CHILE_ATTENDANCE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const chileDisplayTimeFormatter = new Intl.DateTimeFormat("es-CL", {
  timeZone: CHILE_ATTENDANCE_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/**
 * Returns the business date/time for attendance display in Chile while keeping
 * the original instant separately in UTC for unambiguous audit storage.
 */
export function getChileAttendanceTime(instant: Date): {
  scanDate: string;
  timeLabel: string;
  isoInstant: string;
} {
  const parts = Object.fromEntries(
    chileDatePartsFormatter
      .formatToParts(instant)
      .filter((part) => part.type !== "literal")
      .map(({ type, value }) => [type, value]),
  );

  return {
    scanDate: `${parts.year}-${parts.month}-${parts.day}`,
    timeLabel: chileDisplayTimeFormatter.format(instant),
    isoInstant: instant.toISOString(),
  };
}
