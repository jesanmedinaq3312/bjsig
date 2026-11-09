import { useState, useRef, useCallback, useEffect } from "react";
import Swal from "sweetalert2";
import { qrScanRepo } from "@/lib/repositories";
import { audit } from "@/lib/audit";
import { getServerDeviceId, type GpsPosition } from "@/lib/gps";
import { saveScanOrQueue } from "@/lib/offlineQueue";
import { getCompanyName } from "@/lib/logo";
import { isOnline } from "@/hooks/useOnlineStatus";
import { getChileAttendanceTime } from "@/lib/chileAttendanceTime";
import { normalizeRut } from "@/lib/rut";
import type { Worker, QrScanType } from "@/lib/types";
import type { AppData } from "@/hooks/useAppData";
import { SCAN_COOLDOWN_MS, getScanTypeMeta } from "./constants";
import type { ScanResult } from "./types";

const swalMixin = Swal.mixin({
  customClass: {
    confirmButton: "swal2-confirm-gyc",
    cancelButton: "swal2-cancel-gyc",
    popup: "swal2-popup-gyc",
  },
  buttonsStyling: false,
});

interface ProcessScanDeps {
  workers: Worker[];
  selectedType: QrScanType;
  ensureGps: () => Promise<GpsPosition | null>;
  deviceIdRef: React.RefObject<string>;
  data: AppData;
}

export function useScanProcessor({
  workers,
  selectedType,
  ensureGps,
  deviceIdRef,
  data,
}: ProcessScanDeps) {
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [saving, setSaving] = useState(false);

  const lastScanTimeRef = useRef(0);
  const lastScannedRutRef = useRef<string | null>(null);
  const processingRef = useRef(false);
  const selectedTypeRef = useRef(selectedType);
  const workersRef = useRef(workers);

  useEffect(() => {
    selectedTypeRef.current = selectedType;
  }, [selectedType]);
  useEffect(() => {
    workersRef.current = workers;
  }, [workers]);

  const workerByRut = useCallback((rut: string): Worker | undefined => {
    const normalized = normalizeRut(rut);
    return workersRef.current.find((w) => normalizeRut(w.rut) === normalized);
  }, []);

  const toast = useCallback(
    (icon: "success" | "error" | "warning" | "info", title: string, text?: string) => {
      swalMixin.fire({
        toast: true,
        position: "top-end",
        icon,
        title,
        text,
        showConfirmButton: false,
        timer: 3500,
        timerProgressBar: true,
      });
    },
    [],
  );

  const addResult = useCallback((result: ScanResult) => {
    setLastResult(result);
    setScanHistory((prev) => [result, ...prev].slice(0, 20));
  }, []);

  const logAudit = useCallback(
    async (
      worker: Worker,
      currentType: QrScanType,
      deviceId: string,
      gps: GpsPosition | null,
      gpsMissing: boolean,
    ) => {
      await audit({
        action: "qr.scan",
        entity: "qr_scan_events",
        entity_label: `${worker.full_name} — ${currentType}`,
        details: { rut: worker.rut, scan_type: currentType, gps_missing: gpsMissing },
        device_id: deviceId,
        latitude: gps?.latitude ?? null,
        longitude: gps?.longitude ?? null,
      });
      if (gpsMissing) {
        await audit({
          action: "qr.scan_no_gps",
          entity: "qr_scan_events",
          entity_label: `Marcaje sin GPS — ${worker.full_name} — ${currentType}`,
          details: { rut: worker.rut, scan_type: currentType, device_id: deviceId },
          device_id: deviceId,
        });
      }
    },
    [],
  );

  const processScan = useCallback(
    async (decodedText: string) => {
      const now = Date.now();

      if (processingRef.current) return;

      let payload: { rut?: string; name?: string };
      try {
        payload = JSON.parse(decodedText);
      } catch {
        lastScanTimeRef.current = now;
        toast("error", "Codigo QR no valido", `Use una tarjeta QR de ${getCompanyName()}.`);
        return;
      }

      if (!payload.rut) {
        lastScanTimeRef.current = now;
        toast("error", "QR sin RUT", "El codigo no contiene un RUT de trabajador.");
        return;
      }

      const normalizedRut = normalizeRut(payload.rut);
      if (
        normalizedRut === lastScannedRutRef.current &&
        now - lastScanTimeRef.current < SCAN_COOLDOWN_MS * 2
      ) {
        return;
      }
      if (
        normalizedRut !== lastScannedRutRef.current &&
        now - lastScanTimeRef.current < SCAN_COOLDOWN_MS
      ) {
        toast(
          "warning",
          "Escaneo demasiado rápido",
          `Espera un momento entre escaneos de trabajadores diferentes.`,
        );
        return;
      }

      processingRef.current = true;
      lastScanTimeRef.current = now;
      lastScannedRutRef.current = normalizedRut;
      setSaving(true);

      const currentType = selectedTypeRef.current;
      const typeMeta = getScanTypeMeta(currentType);
      const nowDate = new Date();
      const chileTime = getChileAttendanceTime(nowDate);
      const today = chileTime.scanDate;
      const timeStr = chileTime.timeLabel;
      const deviceId = deviceIdRef.current || (await getServerDeviceId());

      const gps = await ensureGps();
      const gpsMissing = gps === null;

      try {
        const worker = workerByRut(payload.rut);

        if (!worker) {
          addResult({
            ok: false,
            message: `Trabajador no encontrado: ${payload.rut}`,
            scanType: currentType,
            time: timeStr,
          });
          toast("error", "Trabajador no encontrado", payload.rut);
          return;
        }

        if (worker.status !== "ACTIVO") {
          addResult({
            ok: false,
            worker,
            message: `Trabajador inactivo (${worker.status}). No se puede registrar.`,
            scanType: currentType,
            time: timeStr,
          });
          toast("warning", "Trabajador inactivo", `${worker.full_name} no puede ser registrado.`);
          return;
        }

        const offline = !isOnline();
        const alreadyExists = offline
          ? false
          : await qrScanRepo.hasValidatedScan(worker.rut, currentType, today);

        if (alreadyExists) {
          addResult({
            ok: false,
            worker,
            duplicate: true,
            message: `Ya existe una ${typeMeta.label.toLowerCase()} registrada hoy para este trabajador.`,
            scanType: currentType,
            time: timeStr,
          });
          toast(
            "warning",
            "Registro duplicado",
            "La marca existente se conserva sin cambios. Si requiere corrección, use el proceso formal de regularización.",
          );
          return;
        }

        const { queued, duplicate } = await saveScanOrQueue({
          worker_rut: worker.rut,
          scan_type: currentType,
          scan_date: today,
          scan_time: chileTime.isoInstant,
          latitude: gps?.latitude ?? null,
          longitude: gps?.longitude ?? null,
          gps_accuracy: gps?.accuracy ?? null,
          gps_missing: gpsMissing,
          notes: null,
        });

        if (duplicate) {
          addResult({
            ok: false,
            worker,
            duplicate: true,
            message: `Ya existe una ${typeMeta.label.toLowerCase()} registrada hoy.`,
            scanType: currentType,
            time: timeStr,
          });
          toast(
            "warning",
            "Registro duplicado",
            `${worker.full_name} ya tiene ${typeMeta.label} hoy.`,
          );
          return;
        }

        await logAudit(worker, currentType, deviceId, gps, gpsMissing);

        const result: ScanResult = {
          ok: true,
          worker,
          message: `${typeMeta.label} registrada`,
          scanType: currentType,
          time: timeStr,
          gpsMissing,
          gps,
        };
        addResult(result);

        await swalMixin.fire({
          icon: "success",
          title: "Asistencia registrada",
          html: `<div style="text-align:left;font-size:14px;line-height:1.7">
          <p style="margin:0 0 10px;font-size:16px;font-weight:600;color:${typeMeta.swalColor}">${typeMeta.label}</p>
          <p style="margin:0 0 4px"><strong>Trabajador:</strong> ${worker.full_name}</p>
          <p style="margin:0 0 4px"><strong>RUT:</strong> ${worker.rut}</p>
          <p style="margin:0 0 4px"><strong>Fecha:</strong> ${today}</p>
          <p style="margin:0 0 4px"><strong>Hora:</strong> ${timeStr}</p>
          <p style="margin:0 0 4px"><strong>Dispositivo:</strong> ${deviceId.slice(0, 12)}...</p>
          ${
            gpsMissing
              ? '<p style="margin:0;color:#d97706"><strong>GPS:</strong> No disponible (Marcaje sin GPS)</p>'
              : gps
                ? `<p style="margin:0 0 4px"><strong>GPS:</strong> ${gps.latitude.toFixed(5)}, ${gps.longitude.toFixed(5)}${gps.accuracy ? ` (±${Math.round(gps.accuracy)}m)` : ""}</p>`
                : '<p style="margin:0;color:#64748b"><strong>GPS:</strong> No disponible</p>'
          }
        </div>`,
          confirmButtonText: "Aceptar",
          timer: 6000,
          timerProgressBar: true,
        });

        if (gpsMissing) {
          toast("warning", "Marcaje sin GPS", "Se registro el scan sin coordenadas GPS.");
        }
        if (queued) {
          toast(
            "info",
            "Guardado sin conexion",
            `${worker.full_name} — ${typeMeta.label} se enviara cuando se recupere la red.`,
          );
        }
        data.reload().catch(() => {});
      } catch (e) {
        const msg = (e as Error).message || "";
        if (msg.includes("23505")) {
          toast("warning", "Registro duplicado", "El trabajador ya tiene este registro hoy.");
        } else {
          toast("error", "Error", "No se pudo guardar el registro.");
        }
      } finally {
        processingRef.current = false;
        setSaving(false);
      }
    },
    [workerByRut, toast, addResult, logAudit, ensureGps, data], // eslint-disable-line react-hooks/exhaustive-deps -- reviewed dependency set; unstable callback recreation is intentional to avoid loops
  );

  return { lastResult, scanHistory, saving, processScan };
}
