import { describe, expect, it } from "vitest";
import { CHILE_ATTENDANCE_TIME_ZONE, getChileAttendanceTime } from "./chileAttendanceTime";

describe("getChileAttendanceTime", () => {
  it("usa la fecha y hora de Santiago aunque el navegador esté en otra zona horaria", () => {
    const mark = getChileAttendanceTime(new Date("2026-11-09T02:13:17.000Z"));

    expect(CHILE_ATTENDANCE_TIME_ZONE).toBe("America/Santiago");
    expect(mark.scanDate).toBe("2026-11-08");
    expect(mark.timeLabel).toBe("23:13:17");
    expect(mark.isoInstant).toBe("2026-11-09T02:13:17.000Z");
  });

  it("preserva el instante UTC en los cambios de fecha", () => {
    const mark = getChileAttendanceTime(new Date("2026-11-09T03:00:00.000Z"));

    expect(mark.scanDate).toBe("2026-11-09");
    expect(mark.timeLabel).toBe("00:00:00");
    expect(mark.isoInstant).toBe("2026-11-09T03:00:00.000Z");
  });
});
