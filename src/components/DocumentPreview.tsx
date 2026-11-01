import { useState, useEffect, useRef } from "react";
import { X, Download, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui";

interface DocumentPreviewProps {
  open: boolean;
  onClose: () => void;
  generatePdf: () => Promise<Blob>;
  fileName: string;
  title: string;
}

export function DocumentPreview({
  open,
  onClose,
  generatePdf,
  fileName,
  title,
}: DocumentPreviewProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blobRef = useRef<Blob | null>(null);

  useEffect(() => {
    if (!open) {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
      blobRef.current = null;
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    generatePdf()
      .then((blob) => {
        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Error al generar el documento");
      })
      .finally(() => setLoading(false));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps -- reviewed dependency set; unstable callback recreation is intentional to avoid loops

  function handleDownload() {
    if (!blobRef.current) return;
    const url = URL.createObjectURL(blobRef.current);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              disabled={!blobUrl || loading}
            >
              <Download size={14} /> Descargar
            </Button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden rounded-b-xl">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={32} className="animate-spin text-blue-500" />
            </div>
          )}
          {error && !loading && (
            <div className="flex items-center justify-center h-full text-sm text-red-600">
              {error}
            </div>
          )}
          {blobUrl && !loading && (
            <iframe src={blobUrl} className="w-full h-full border-0" title={title} />
          )}
        </div>
      </div>
    </div>
  );
}
