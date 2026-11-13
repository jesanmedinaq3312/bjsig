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
