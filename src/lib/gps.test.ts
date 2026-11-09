import { describe, expect, it } from "vitest";
import { GPS_CAPTURE_MAX_AGE_MS, isFreshGpsCapture } from "./gps";

const now = 1_800_000_000_000;
const position = (overrides: Record<string, number> = {}) => ({
  latitude: -33.4489,
  longitude: -70.6693,
  accuracy: 50,
  capturedAt: now,
  ...overrides,
});

describe("isFreshGpsCapture", () => {
  it("acepta coordenadas válidas con captura de hasta dos minutos", () => {
    expect(isFreshGpsCapture(position(), now)).toBe(true);
    expect(isFreshGpsCapture(position({ capturedAt: now - GPS_CAPTURE_MAX_AGE_MS }), now)).toBe(
      true,
    );
  });

  it("rechaza capturas antiguas, demasiado futuras o coordenadas inválidas", () => {
    expect(isFreshGpsCapture(position({ capturedAt: now - GPS_CAPTURE_MAX_AGE_MS - 1 }), now)).toBe(
      false,
    );
    expect(isFreshGpsCapture(position({ capturedAt: now + 30_001 }), now)).toBe(false);
    expect(isFreshGpsCapture(position({ latitude: 91 }), now)).toBe(false);
    expect(isFreshGpsCapture(position({ longitude: -181 }), now)).toBe(false);
  });

  it("rechaza precisión negativa o valores no finitos sin imponer un umbral de precisión", () => {
    expect(isFreshGpsCapture(position({ accuracy: -1 }), now)).toBe(false);
    expect(isFreshGpsCapture(position({ accuracy: Number.NaN }), now)).toBe(false);
    expect(isFreshGpsCapture(position({ accuracy: 500_000 }), now)).toBe(true);
  });
});
