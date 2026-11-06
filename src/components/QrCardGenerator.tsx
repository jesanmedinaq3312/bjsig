import { getCompanyName } from "@/lib/logo";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Printer, QrCode as QrIcon, Download, Search } from "lucide-react";
import { Card, Button, Badge, Spinner } from "@/components/ui";
import type { Worker } from "@/lib/types";
import type { AppData } from "@/hooks/useAppData";

interface QrCardProps {
  data: AppData;
}

export function buildQrPrintDocument(doc: Document, companyName: string, content: HTMLElement) {
  const title = doc.querySelector("title") ?? doc.createElement("title");
  title.textContent = `Tarjetas QR — ${companyName}`;
  if (!title.parentNode) doc.head.appendChild(title);

  const style = doc.createElement("style");
  style.textContent = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica', sans-serif; background: #fff; padding: 20px; }
    .cards-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; max-width: 800px; margin: 0 auto; }
    .qr-card {
      border: 2px solid #1e293b; border-radius: 12px; padding: 12px; text-align: center;
      background: white; page-break-inside: avoid; position: relative; overflow: hidden;
    }
    .qr-card::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 6px; background: #1e40af;
    }
    .qr-card-header { display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 6px; padding-top: 4px; }
    .qr-card-header span { font-size: 11px; font-weight: 700; color: #1e293b; }
    .qr-card-header .sub { font-size: 8px; color: #64748b; }
    .qr-img { width: 140px; height: 140px; margin: 0 auto; display: block; }
    .qr-name { font-size: 13px; font-weight: 700; color: #1e293b; margin-top: 6px; }
    .qr-rut { font-size: 11px; color: #475569; }
    .qr-position { font-size: 10px; color: #64748b; margin-top: 2px; }
    .qr-footer { font-size: 7px; color: #94a3b8; margin-top: 6px; border-top: 1px solid #e2e8f0; padding-top: 4px; }
    @media print { body { padding: 0; } .cards-grid { gap: 6px; } }
  `;
  doc.head.appendChild(style);
  doc.body.appendChild(content.cloneNode(true));
}

export function QrCardGenerator({ data }: QrCardProps) {
  const { workers, loading } = data;
  const companyName = getCompanyName();
  const [search, setSearch] = useState("");
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const activeWorkers = useMemo(() => workers.filter((w) => w.status === "ACTIVO"), [workers]);
  const filtered = useMemo(
    () =>
      activeWorkers.filter(
        (w) =>
          !search ||
          w.full_name.toLowerCase().includes(search.toLowerCase()) ||
          w.rut.includes(search) ||
          w.position.toLowerCase().includes(search.toLowerCase()),
      ),
    [activeWorkers, search],
  );

  const generateQr = useCallback(async (worker: Worker): Promise<string> => {
    const payload = JSON.stringify({
      type: "GYC_ATTENDANCE",
      rut: worker.rut,
      name: worker.full_name,
      v: 1,
    });
    try {
      const QRCode = (await import("qrcode")).default;
      return await QRCode.toDataURL(payload, {
        width: 250,
        margin: 1,
        color: { dark: "#1e293b", light: "#ffffff" },
        errorCorrectionLevel: "M",
      });
    } catch {
      return "";
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setGenerating(true);
      const map: Record<string, string> = {};
      for (const w of filtered.slice(0, 50)) {
        if (cancelled) return;
        if (!map[w.rut]) {
          map[w.rut] = await generateQr(w);
        }
      }
      if (!cancelled) {
        setQrDataUrls(map);
        setGenerating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filtered, generateQr]);

  function printCards() {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank", "width=800,height=600");
    if (!win) return;
    buildQrPrintDocument(win.document, companyName, content);
    win.setTimeout(() => {
      win.focus();
      win.print();
      win.setTimeout(() => win.close(), 500);
    }, 0);
  }

  function downloadQr(worker: Worker) {
    const url = qrDataUrls[worker.rut];
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `QR_${worker.rut.replace(/\./g, "")}.png`;
    a.click();
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <QrIcon size={22} className="text-slate-700" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Tarjetas QR de Asistencia</h3>
              <p className="text-xs text-slate-500">
                Genera e imprime tarjetas QR individuales para cada trabajador. Al escanear, la app
                valida entrada, salida, almuerzo o salida a terreno.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Buscar trabajador..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
              />
            </div>
            <Button size="sm" onClick={printCards} disabled={filtered.length === 0}>
              <Printer size={15} /> Imprimir tarjetas
            </Button>
          </div>
        </div>
      </Card>

      {generating && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-slate-500">
          <Spinner /> Generando códigos QR...
        </div>
      )}

      {/* Printable area (hidden on screen, used for print) */}
      <div className="hidden">
        <div ref={printRef} className="cards-grid">
          {filtered.map((w) => (
            <div key={w.rut} className="qr-card">
              <div className="qr-card-header">
                <span>{companyName.toUpperCase()}</span>
                <span className="sub">SIG Pro</span>
              </div>
              <img className="qr-img" src={qrDataUrls[w.rut] ?? ""} alt={`QR ${w.rut}`} />
              <p className="qr-name">{w.full_name}</p>
              <p className="qr-rut">{w.rut}</p>
              <p className="qr-position">{w.position}</p>
              <p className="qr-footer">
                Presentar al supervisor para registro de asistencia · Ley 16.744 · DS 44
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* On-screen card preview grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((w) => (
          <Card key={w.rut} className="overflow-hidden">
            <div className="h-1.5 bg-blue-700" />
            <div className="p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <span className="text-xs font-bold text-slate-800">
                  {companyName.toUpperCase()}
                </span>
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[9px]">
                  SIG Pro
                </Badge>
              </div>
              {qrDataUrls[w.rut] ? (
                <img
                  src={qrDataUrls[w.rut]}
                  alt={`QR ${w.rut}`}
                  className="w-32 h-32 mx-auto rounded-lg border border-slate-200"
                />
              ) : (
                <div className="w-32 h-32 mx-auto rounded-lg bg-slate-100 flex items-center justify-center">
                  <Spinner />
                </div>
              )}
              <p className="font-semibold text-slate-800 text-sm mt-3 truncate">{w.full_name}</p>
              <p className="text-xs text-slate-500">{w.rut}</p>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">{w.position}</p>
              <div className="mt-3 pt-3 border-t border-slate-100 flex justify-center gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadQr(w)}>
                  <Download size={13} /> PNG
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && !loading && (
        <Card className="p-8 text-center text-slate-400">
          No se encontraron trabajadores activos
        </Card>
      )}
    </div>
  );
}
