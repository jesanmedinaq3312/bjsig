import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import { Modal, Spinner } from "@/components/ui";
import { CredentialModal } from "@/components/CredentialModal";
import { ExportService } from "@/lib/export";
import { getCompanyName } from "@/lib/logo";
import { ExpiryService } from "@/lib/expiry";
import {
  workerRepo,
  cloudDocRepo,
  shiftRepo,
  VersionConflictError,
  workerPhotoStorage,
} from "@/lib/repositories";
import { audit } from "@/lib/audit";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/hooks/useConfirm";
import { useLoading } from "@/components/LoadingProvider";
import type { Worker, AttendanceStatus, CloudProvider } from "@/lib/types";
import type { AppData } from "@/hooks/useAppData";
import { normalizeRut, formatRut } from "@/lib/rut";
import { callEdgeFunction } from "@/lib/edgeFunctions";
import { logger } from "@/lib/logger";
import { canManageWorkers } from "@/lib/roleHierarchy";
import { WorkerTable } from "./workers/WorkerTable";
import { WorkerModal } from "./workers/WorkerModal";

const WorkerPortal = lazy(() =>
  import("@/views/WorkerPortal").then((m) => ({ default: m.WorkerPortal })),
);

export function WorkersView({
  data,
  userRole,
  permissions,
}: {
  data: AppData;
  userRole: string;
  permissions?: Record<string, boolean>;
}) {
  const { workers, cloudDocs, qrScans, shifts, loading } = data;
  const canEditWorkers = canManageWorkers(userRole, permissions);
  const canDeleteWorker =
    userRole === "superadmin" ||
    userRole === "developer" ||
    permissions?.["can_delete_workers"] === true;
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Worker | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewRut, setPreviewRut] = useState<string | null>(null);
  const [credentialModal, setCredentialModal] = useState<{
    name: string;
    rut: string;
    email: string;
    password?: string;
  } | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const toast = useToast();
  const { confirm } = useConfirm();
  const { runWithLoading } = useLoading();

  const todayStr = new Date().toISOString().slice(0, 10);

  const qrByWorker = useMemo(() => {
    const map = new Map<string, { type: string; time: string }[]>();
    qrScans.forEach((q) => {
      if (!q.validated || q.scan_date !== todayStr) return;
      const arr = map.get(q.worker_rut) ?? [];
      arr.push({
        type: q.scan_type,
        time: new Date(q.scan_time).toLocaleTimeString("es-CL", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
      map.set(q.worker_rut, arr);
    });
    return map;
  }, [qrScans, todayStr]);

  const todayAtt = useMemo(() => {
    const map = new Map<string, AttendanceStatus>();
    shifts.forEach((s) => {
      if (s.date === todayStr) map.set(s.worker_rut, s.attendance_status);
    });
    return map;
  }, [shifts, todayStr]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return workers;
    return workers.filter(
      (w) =>
        w.full_name.toLowerCase().includes(q) ||
        w.rut.toLowerCase().includes(q) ||
        w.position.toLowerCase().includes(q),
    );
  }, [workers, search]);

  useEffect(() => {
    const paths = filtered
      .map((w) => w.photo_url)
      .filter((url): url is string => !!url && !url.startsWith("http"));
    if (paths.length === 0) return;
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        paths.map(async (path) => {
          const signedUrl = await workerPhotoStorage.getSignedUrl(path);
          return [path, signedUrl ?? ""] as [string, string];
        }),
      );
      if (!cancelled) {
        setPhotoUrls((prev) => {
          const next = { ...prev };
          for (const [path, url] of results) next[path] = url;
          return next;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filtered]);

  function resolvePhotoUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return photoUrls[url] ?? null;
  }

  function openNew() {
    if (!canEditWorkers) return;
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(w: Worker) {
    if (!canEditWorkers) return;
    setEditing(w);
    setModalOpen(true);
  }

  async function handleSave(form: Omit<Worker, "id" | "created_at">) {
    if (!canEditWorkers) {
      toast.error("Permiso insuficiente", "Tu rol no puede crear ni editar trabajadores.");
      return;
    }
    const normalizedRut = normalizeRut(form.rut);
    const normalizedForm = { ...form, rut: normalizedRut };
    setSaving(true);
    try {
      await runWithLoading(async () => {
        if (editing) {
          await workerRepo.updateWithVersion(
            editing.id,
            normalizedForm,
            editing.updated_at ?? editing.created_at ?? "",
          );
          await audit({
            action: "worker.update",
            entity: "workers",
            entity_id: editing.id,
            entity_label: normalizedForm.full_name,
          });

          const oldEmail = editing.email ?? "";
          const newEmail = normalizedForm.email ?? "";

          if (!oldEmail && newEmail) {
            try {
              const { data: portalData, error: portalErr } = await callEdgeFunction<{
                success: boolean;
                temporary_password?: string;
              }>("admin-user-manage", {
                action: "create_worker",
                email: newEmail.toLowerCase(),
                worker_rut: normalizedForm.rut,
              });
              if (portalErr) {
                toast.warning(
                  "Cuenta de portal no creada",
                  portalErr ?? "Créala manualmente en Configuración → Usuarios.",
                );
              } else {
                await audit({
                  action: "access.worker_account.create",
                  entity: "allowed_emails",
                  entity_label: newEmail.toLowerCase(),
                  details: {
                    worker_rut: normalizedForm.rut,
                    worker_name: normalizedForm.full_name,
                  },
                });
                const tempPw = portalData?.temporary_password;
                toast.success(
                  "Cuenta de portal creada",
                  tempPw
                    ? `Contraseña temporal generada. Entrégala al trabajador.`
                    : `Ingresa con RUT ${formatRut(normalizedForm.rut)} y correo ${newEmail}.`,
                );
                setCredentialModal({
                  name: normalizedForm.full_name,
                  rut: formatRut(normalizedForm.rut),
                  email: newEmail,
                  password: tempPw,
                });
              }
            } catch {
              toast.warning(
                "Cuenta de portal no creada",
                "No se pudo crear la cuenta del portal. Hazlo manualmente en Configuración → Usuarios.",
              );
            }
          } else if (oldEmail && newEmail && oldEmail.toLowerCase() !== newEmail.toLowerCase()) {
            try {
              const { error: syncErr } = await callEdgeFunction("admin-user-manage", {
                action: "change_email",
                old_email: oldEmail.toLowerCase(),
                new_email: newEmail.toLowerCase(),
              });
              if (syncErr) {
                toast.warning(
                  "Email de acceso no sincronizado",
                  "El email del trabajador se actualizó en su ficha, pero no se pudo actualizar en la lista de accesos. Actualízalo manualmente en Configuración.",
                );
              } else {
                await audit({
                  action: "access.worker_account.change_email",
                  entity: "allowed_emails",
                  entity_label: oldEmail,
                  details: { new_email: newEmail.toLowerCase() },
                });
                toast.success(
                  "Email de acceso actualizado",
                  `Ahora el trabajador ingresa con ${newEmail}`,
                );
              }
            } catch {
              toast.warning(
                "Email de acceso no sincronizado",
                "El email se actualizó en la ficha pero no en la lista de accesos. Hazlo manualmente en Configuración.",
              );
            }
          }

          const oldRut = editing.rut ?? "";
          const newRut = normalizedForm.rut ?? "";
          if (oldEmail && newEmail && oldRut && newRut && oldRut !== newRut) {
            try {
              const { error: rutErr } = await callEdgeFunction("admin-user-manage", {
                action: "change_worker_rut",
                email: newEmail.toLowerCase(),
                new_rut: newRut,
              });
              if (rutErr) {
                toast.warning(
                  "RUT de acceso no sincronizado",
                  "El RUT del trabajador se actualizó en su ficha, pero no se pudo actualizar en la lista de accesos. Actualízalo manualmente en Configuración.",
                );
              } else {
                await audit({
                  action: "access.worker_account.change_rut",
                  entity: "allowed_emails",
                  entity_label: oldRut,
                  details: { new_rut: newRut, email: newEmail.toLowerCase() },
                });
                toast.success("RUT de acceso actualizado", `RUT actualizado a ${newRut}`);
              }
            } catch {
              toast.warning(
                "RUT de acceso no sincronizado",
                "El RUT se actualizó en la ficha pero no en la lista de accesos. Hazlo manualmente en Configuración.",
              );
            }
          }
        } else {
          await workerRepo.insert(normalizedForm);
          await audit({
            action: "worker.create",
            entity: "workers",
            entity_label: normalizedForm.full_name,
          });

          if (normalizedForm.hire_date) {
            try {
              await shiftRepo.generateForWorker(
                normalizedRut,
                normalizedForm.shift_cycle,
                normalizedForm.hire_date,
              );
              await audit({
                action: "shift.auto_generate",
                entity: "daily_shifts",
                entity_label: `${normalizedForm.full_name} — ${normalizedForm.shift_cycle}`,
              });
            } catch (e) {
              logger.warn("Shift auto-generation failed:", e);
            }
          }

          if (normalizedForm.email) {
            try {
              const { data: portalData, error: portalErr } = await callEdgeFunction<{
                success: boolean;
                temporary_password?: string;
              }>("admin-user-manage", {
                action: "create_worker",
                email: normalizedForm.email.toLowerCase(),
                worker_rut: normalizedRut,
              });
              if (portalErr) {
                toast.warning(
                  "Cuenta de portal no creada",
                  portalErr ?? "Revisa el correo o créala manualmente en Configuración → Usuarios.",
                );
              } else {
                await audit({
                  action: "access.worker_account.create",
                  entity: "allowed_emails",
                  entity_label: normalizedForm.email.toLowerCase(),
                  details: { worker_rut: normalizedRut, worker_name: normalizedForm.full_name },
                });
                const tempPw = portalData?.temporary_password;
                toast.success(
                  "Cuenta de portal creada",
                  tempPw
                    ? `Contraseña temporal generada. Entrégala al trabajador.`
                    : `Ingresa con RUT ${formatRut(normalizedRut)} y correo ${normalizedForm.email}.`,
                );
                setCredentialModal({
                  name: normalizedForm.full_name,
                  rut: formatRut(normalizedRut),
                  email: normalizedForm.email,
                  password: tempPw,
                });
              }
            } catch {
              toast.warning(
                "Cuenta de portal no creada",
                "No se pudo crear la cuenta del portal. Hazlo manualmente en Configuración → Usuarios.",
              );
            }
          }
        }
        setModalOpen(false);
        toast.success(
          editing ? "Trabajador actualizado" : "Trabajador creado",
          normalizedForm.full_name,
        );
        await data.reload();
      });
    } catch (e) {
      if (e instanceof VersionConflictError) {
        toast.warning(
          "Registro modificado por otra persona",
          "Recarga la página antes de volver a guardar para no sobrescribir los cambios.",
        );
      } else {
        toast.error("Error al guardar", (e as Error).message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoUpload(worker: Worker, file: File): Promise<void> {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Formato no válido", "Usa PNG, JPEG o WEBP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Archivo muy grande", "Máximo 2 MB.");
      return;
    }
    setPhotoUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
      const path = `${worker.id}/photo.${ext}`;
      await workerPhotoStorage.upload(path, file);
      await workerRepo.update(worker.id, { photo_url: path } as Partial<Worker>);
      await audit({
        action: "worker.photo_upload",
        entity: "workers",
        entity_id: worker.id,
        entity_label: worker.full_name,
      });
      toast.success("Foto actualizada", worker.full_name);
      await data.reload();
    } catch (e) {
      toast.error("Error al subir foto", (e as Error).message);
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleQuickAtt(w: Worker, status: AttendanceStatus) {
    try {
      const today = new Date().toISOString().slice(0, 10);
      await shiftRepo.upsertMany([
        {
          date: today,
          worker_rut: w.rut,
          attendance_status: status,
          shift_name: w.shift_cycle,
          ast_signed: false,
          calculated_hht: status === "Presente" ? 8 : 0,
          epp_inicio: {},
          epp_termino: {},
          notes: null,
        },
      ]);
      await audit({
        action: "shift.quick_att",
        entity: "daily_shifts",
        entity_label: `${w.full_name} — ${status}`,
      });
      toast.success("Asistencia registrada", `${w.full_name}: ${status}`);
      await data.reload();
    } catch (e) {
      toast.error("Error al registrar asistencia", (e as Error).message);
    }
  }

  async function handleDelete(w: Worker) {
    const ok = await confirm({
      title: "Eliminar trabajador",
      message: `Se eliminará a ${w.full_name} (${w.rut}) y TODOS sus datos asociados: turnos, EPP, incidentes, capacitaciones, registros QR, nómina, evaluaciones, vacaciones, finiquitos y documentos. Esta acción no se puede deshacer.`,
      confirmText: "Eliminar permanentemente",
      type: "danger",
    });
    if (!ok) return;
    try {
      await runWithLoading(async () => {
        const { error } = await callEdgeFunction("admin-user-manage", {
          action: "delete_worker_cascade",
          worker_rut: w.rut,
        });
        if (error) throw new Error(error);
        await audit({
          action: "worker.delete_cascade",
          entity: "workers",
          entity_id: w.id,
          entity_label: `${w.full_name} — ${w.rut}`,
        });
        toast.success(
          "Trabajador eliminado",
          `${w.full_name} y todos sus datos asociados fueron eliminados.`,
        );
        await data.reload();
      });
    } catch (e) {
      toast.error("Error al eliminar", (e as Error).message);
    }
  }

  function exportExcel() {
    ExportService.toExcel(
      filtered.map((w) => ({
        RUT: w.rut,
        Nombre: w.full_name,
        Cargo: w.position,
        "Ciclo Turno": w.shift_cycle,
        Contrato: w.contract_status,
        "Examen Ocup. Vence": w.occupational_exam_exp_date ?? "",
        "Licencia Conducir Vence": w.driver_license_exp_date ?? "",
        "IRL Firmada": w.irl_signed_date ?? "",
      })),
      "Trabajadores",
      "trabajadores_gyc",
    );
  }

  function exportPdf() {
    ExportService.toPdf(
      `Registro de Trabajadores — ${getCompanyName()}`,
      ["RUT", "Nombre", "Cargo", "Turno", "Contrato", "Examen Vence", "IRL"],
      filtered.map((w) => [
        w.rut,
        w.full_name,
        w.position,
        w.shift_cycle,
        w.contract_status,
        w.occupational_exam_exp_date ?? "—",
        w.irl_signed_date ?? "—",
      ]),
      "trabajadores_gyc",
      "DS 44 · DS 594 · Ley 16.744",
    );
  }

  return (
    <div className="space-y-5">
      <WorkerTable
        workers={workers}
        loading={loading}
        qrByWorker={qrByWorker}
        todayAtt={todayAtt}
        shiftDefs={data.shiftDefs ?? []}
        canEditWorkers={canEditWorkers}
        canDeleteWorker={canDeleteWorker}
        search={search}
        setSearch={setSearch}
        onEdit={openEdit}
        onPreview={(worker) => setPreviewRut(worker.rut)}
        onDelete={handleDelete}
        onQuickAtt={handleQuickAtt}
        onPhotoUpload={canEditWorkers ? handlePhotoUpload : undefined}
        resolvePhotoUrl={resolvePhotoUrl}
        onExportExcel={exportExcel}
        onExportPdf={exportPdf}
        onNew={openNew}
      />

      {previewRut && (
        <Modal
          open
          onClose={() => setPreviewRut(null)}
          title="Vista previa del Portal del Trabajador"
          size="xl"
        >
          <div className="max-h-[75vh] overflow-y-auto">
            <Suspense
              fallback={
                <div className="flex justify-center py-10">
                  <Spinner />
                </div>
              }
            >
              <WorkerPortal
                workerRut={previewRut}
                previewEmail={workers.find((w) => w.rut === previewRut)?.email ?? ""}
              />
            </Suspense>
          </div>
        </Modal>
      )}

      {credentialModal && (
        <CredentialModal
          open={!!credentialModal}
          onClose={() => setCredentialModal(null)}
          workerName={credentialModal.name}
          rut={credentialModal.rut}
          email={credentialModal.email}
          temporaryPassword={credentialModal.password}
        />
      )}

      {modalOpen && (
        <WorkerModal
          worker={editing}
          saving={saving}
          cloudDocs={cloudDocs.filter((d) => !editing || d.worker_rut === editing.rut)}
          departments={data.departments}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          resolvePhotoUrl={resolvePhotoUrl}
          onAddDoc={async (rut, doc) => {
            if (!rut) {
              toast.warning("RUT requerido", "Primero ingresa el RUT del trabajador.");
              return;
            }
            const status = doc.expiration_date
              ? ExpiryService.check(doc.expiration_date).status === "vencido"
                ? "VENCIDO"
                : ExpiryService.check(doc.expiration_date).status === "por-vencer"
                  ? "POR_VENCER"
                  : "VIGENTE"
              : "VIGENTE";
            await cloudDocRepo.insert({ ...doc, worker_rut: rut, worker_id: null, status });
            await data.reload();
          }}
          onDelDoc={async (id) => {
            await cloudDocRepo.remove(id);
            await data.reload();
          }}
          onPhotoUpload={handlePhotoUpload}
        />
      )}
    </div>
  );
}
