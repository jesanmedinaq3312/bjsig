import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearGpsCache, GPS_CAPTURE_MAX_AGE_MS } from "@/lib/gps";
import { useGpsCapture } from "./useGpsCapture";

const mockPosition = (capturedAt = Date.now()) =>
  ({
    coords: {
      latitude: -33.4489,
      longitude: -70.6693,
      accuracy: 25,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: capturedAt,
  }) as GeolocationPosition;

describe("useGpsCapture", () => {
  let getCurrentPosition: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });
  });

  afterEach(() => {
    clearGpsCache();
    Reflect.deleteProperty(navigator, "geolocation");
    vi.restoreAllMocks();
  });

  it("solicita una posición GPS reciente al pulsar captura y pasa a lista", async () => {
    getCurrentPosition.mockImplementation((success: PositionCallback) => {
      success(mockPosition());
    });

    const { result } = renderHook(() => useGpsCapture());
    expect(result.current.status).toBe("idle");
    expect(getCurrentPosition).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.capture();
    });

    expect(getCurrentPosition).toHaveBeenCalledOnce();
    expect(getCurrentPosition.mock.calls[0][2]).toEqual({
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 0,
    });
    expect(result.current.status).toBe("ready");
    expect(result.current.position).toMatchObject({
      latitude: -33.4489,
      longitude: -70.6693,
      accuracy: 25,
    });
    expect(result.current.error).toBeNull();
  });

  it("descarta una posición de más de dos minutos", async () => {
    getCurrentPosition.mockImplementation((success: PositionCallback) => {
      success(mockPosition(Date.now() - GPS_CAPTURE_MAX_AGE_MS - 1000));
    });

    const { result } = renderHook(() => useGpsCapture());
    await act(async () => {
      await result.current.capture();
    });

    expect(result.current.status).toBe("denied");
    expect(result.current.position).toBeNull();
    expect(result.current.error).toContain("ubicación reciente");
  });

  it("reintenta con precisión estándar y muestra error si el navegador deniega la ubicación", async () => {
    getCurrentPosition.mockImplementation(
      (_success: PositionCallback, error: PositionErrorCallback) => {
        error({ code: 1, message: "Permission denied" } as GeolocationPositionError);
      },
    );

    const { result } = renderHook(() => useGpsCapture());
    await act(async () => {
      await result.current.capture();
    });

    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
    expect(getCurrentPosition.mock.calls[1][2]).toEqual({
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 0,
    });
    expect(result.current.status).toBe("denied");
    expect(result.current.position).toBeNull();
    expect(result.current.error).toContain("Activa la ubicación del navegador");
  });
});
