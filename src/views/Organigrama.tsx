import { useMemo } from "react";
import { Network, Users, AlertTriangle } from "lucide-react";
import { Card, CardHeader, Badge, EmptyState, Spinner } from "@/components/ui";
import type { AppData } from "@/hooks/useAppData";
import type { Worker } from "@/lib/types";
import { WorkerAvatar } from "@/components/WorkerAvatar";

export function OrganigramaView({ data }: { data: AppData }) {
  const { workers, departments, loading } = data;

  const tree = useMemo(() => {
    // Build a map of worker id -> worker
    const workerMap = new Map<string, Worker>();
    workers.forEach((w) => workerMap.set(w.id, w));

    // Find root workers (those with reports_to = null or pointing to non-existent worker)
    const roots: Worker[] = [];
    const childrenMap = new Map<string | null, Worker[]>();

    workers.forEach((w) => {
      const parent = w.reports_to;
      if (!parent || !workerMap.has(parent)) {
        roots.push(w);
      } else {
        const list = childrenMap.get(parent) ?? [];
        list.push(w);
        childrenMap.set(parent, list);
      }
    });

    return { roots, childrenMap, workerMap };
  }, [workers]);

  const deptName = (id: string | null): string | null => {
    if (!id) return null;
    const d = departments.find((x) => x.id === id);
    return d?.name ?? null;
  };

  if (loading) return <Spinner />;

  function renderNode(worker: Worker, level: number, visited: Set<string>): React.ReactNode {
    if (visited.has(worker.id)) {
      return (
        <div
          key={`cycle-${worker.id}`}
          className="ml-4 py-2 px-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700"
        >
          <AlertTriangle size={12} className="inline mr-1" />
          Ciclo detectado: {worker.full_name} se reporta a sí mismo indirectamente. Corrige el campo
          "reporta a" para continuar.
        </div>
      );
    }
    const nextVisited = new Set(visited);
    nextVisited.add(worker.id);
    const children = tree.childrenMap.get(worker.id) ?? [];
    const dept = deptName(worker.department_id);
    return (
      <div key={worker.id}>
        <div
          className="flex items-center gap-3 py-2.5 px-4 rounded-xl border border-slate-100 bg-white hover:shadow-sm transition-shadow"
          style={{ marginLeft: level * 32 }}
        >
          <WorkerAvatar
            name={worker.full_name}
            rut={worker.rut}
            photoUrl={worker.photo_url}
            className="h-10 w-10 shrink-0"
            rounded="rounded-full"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{worker.full_name}</p>
            <p className="text-xs text-slate-500">{worker.position}</p>
          </div>
          {dept && <Badge className="bg-slate-100 text-slate-600 border-slate-200">{dept}</Badge>}
          {children.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Users size={12} /> {children.length}
            </span>
          )}
        </div>
        {children.length > 0 && (
          <div className="border-l-2 border-slate-100 ml-5">
            {children.map((c) => renderNode(c, level + 1, nextVisited))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Organigrama Jerárquico</h2>
        <p className="text-sm text-slate-500">Estructura de reporte de la organización</p>
      </div>

      {tree.roots.length === 0 ? (
        <Card>
          <EmptyState
            message="No hay estructura jerárquica definida. Asigna supervisores a los trabajadores desde la ficha de cada persona."
            icon={<Network size={32} />}
          />
        </Card>
      ) : (
        <Card>
          <CardHeader
            title="Jerarquía Organizacional"
            action={<Network size={18} className="text-slate-400" />}
          />
          <div className="px-5 pb-5 space-y-1">
            {tree.roots.map((w) => renderNode(w, 0, new Set()))}
          </div>
        </Card>
      )}
    </div>
  );
}
