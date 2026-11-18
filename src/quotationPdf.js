import { jsPDF } from "jspdf";
import { money, fmtDate, prettyPhone, loadLogo, quoteItemAmount } from "./lib";

// jsPDF's built-in fonts cannot draw every character, so anything outside Latin-1 / common punctuation is dropped.
const safe = s => String(s ?? "").replace(/[^\x20-\x7E\xA0-\xFF\u2022\u2013\u2014\u2018\u2019\u201C\u201D\u2026\n]/g, "");
const qty = n => (Number.isInteger(Number(n)) ? String(n) : Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 }));

// Draws the quotation in the same look as the invoice (logo, business name, dark header). Returns { doc, filename }.
export async function buildQuotationPdf(q, company = "Finora Services") {
  const logo = await loadLogo();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 14, BOTTOM = 276;
  const ink = [20, 26, 36], soft = [110, 119, 135], line = [227, 229, 222], band = [245, 246, 243];
  let logoData = null;
  if (logo) { const c = document.createElement("canvas"); c.width = c.height = 256; c.getContext("2d").drawImage(logo, 0, 0, 256, 256); logoData = c.toDataURL("image/png"); }
  const T = (txt, x, y, o) => doc.text(safe(txt), x, y, o);

  const header = (first) => {
    const h = first ? 44 : 24;
    doc.setFillColor(...ink); doc.rect(0, 0, W, h, "F");
    const ly = first ? 11 : 4, ls = first ? 20 : 16;
    if (logoData) doc.addImage(logoData, "PNG", M, ly, ls, ls);
    doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(first ? 15 : 12); T(company, M + ls + 5, first ? 21 : 13);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(170, 178, 192); if (first) T("Interior, civil & renovation works", M + ls + 5, 27);
    doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(first ? 26 : 16); T("QUOTATION", W - M, first ? 24 : 12, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(first ? 10 : 9); doc.setTextColor(170, 178, 192); T(q.id, W - M, first ? 31 : 18, { align: "right" });
    return h;
  };
  const tableHead = y => {
    doc.setFillColor(...band); doc.rect(M, y, W - 2 * M, 9, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...soft);
    T("NO", M + 2, y + 6); T("DESCRIPTION OF WORK / SPECIFICATIONS", M + 12, y + 6); T("QTY", 128, y + 6, { align: "right" }); T("UNIT", 131, y + 6); T("RATE", 168, y + 6, { align: "right" }); T("AMOUNT", W - M - 2, y + 6, { align: "right" });
    return y + 9;
  };

  // ----- first page: meta + customer + scope
  let y = header(true) + 14;
  const meta = [["Quote date", fmtDate(q.date)], ["Valid until", q.validUntil ? fmtDate(q.validUntil) : "-"], ["Status", q.status === "Confirmed" ? "Confirmed" : q.status === "Draft" ? "Estimate" : q.status]];
  meta.forEach(([k, v], i) => { const x = M + i * 62; doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...soft); T(k, x, y); doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...ink); T(v, x, y + 7); });
  y += 14; doc.setDrawColor(...line); doc.line(M, y, W - M, y); y += 8;

  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...soft); T("PREPARED FOR", M, y); T("SCOPE OF WORK", 112, y);
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...ink);
  T(q.customer || "Valued Client / Project Site", M, y + 7);
  const left = [q.customerPhone && `WhatsApp: ${prettyPhone(q.customerPhone)}`, q.customerEmail, [q.house, q.address].filter(Boolean).join(", ") && `Site: ${[q.house, q.address].filter(Boolean).join(", ")}`].filter(Boolean);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(...soft);
  let ly = y + 13; left.forEach(t => doc.splitTextToSize(safe(t), 92).slice(0, 2).forEach(s => { doc.text(s, M, ly); ly += 5; }));
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...ink);
  const scope = doc.splitTextToSize(safe(q.title || "Complete works as listed below"), 84).slice(0, 3); scope.forEach((s, i) => doc.text(s, 112, y + 7 + i * 5.5));
  y = Math.max(ly, y + 7 + scope.length * 5.5) + 6;
  (q.extras || []).filter(e => e.label || e.value).forEach(e => { doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...soft); T(`${e.label}:`, M, y); doc.setFont("helvetica", "normal"); doc.setTextColor(...ink); doc.splitTextToSize(safe(e.value), W - 2 * M - 42).slice(0, 3).forEach((s, i) => doc.text(s, M + 40, y + i * 4.6)); y += Math.max(1, Math.min(3, doc.splitTextToSize(safe(e.value), W - 2 * M - 42).length)) * 4.6 + 1.6; });
  y += 2;

  // ----- items table (breaks across pages, header repeats)
  const ensure = (need, withHead = true) => { if (y + need > BOTTOM) { doc.addPage(); y = header(false) + 8; if (withHead) y = tableHead(y); } };
  y = tableHead(y);
  let n = 0;
  q.sections.forEach(s => {
    if (s.title) { ensure(18); doc.setFillColor(...band); doc.rect(M, y, W - 2 * M, 8, "F"); doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...ink); T(`\u2022 ${s.title.toUpperCase()}`, M + 2, y + 5.5); y += 8; }
    s.items.forEach(it => {
      n++;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      const lines = doc.splitTextToSize(safe(it.description || "-"), 86), h = Math.max(8, lines.length * 4.2 + 4);
      ensure(h);
      doc.setTextColor(...soft); T(String(n), M + 2, y + 5.4);
      doc.setTextColor(...ink); lines.forEach((ln, i) => doc.text(ln, M + 12, y + 5.4 + i * 4.2));
      T(qty(it.qty), 128, y + 5.4, { align: "right" }); doc.setTextColor(...soft); T(it.unit, 131, y + 5.4);
      doc.setTextColor(...ink); T(Number(it.rate).toLocaleString("en-US"), 168, y + 5.4, { align: "right" }); doc.setFont("helvetica", "bold"); T(quoteItemAmount(it).toLocaleString("en-US"), W - M - 2, y + 5.4, { align: "right" });
      y += h; doc.setDrawColor(...line); doc.line(M, y, W - M, y);
    });
  });
  if (n === 0) { doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...soft); T("No items added yet.", M + 12, y + 7); y += 12; }

  // ----- totals
  const rows = [["Subtotal", money(q.subtotal)]];
  if (q.discount > 0) rows.push(["Discount", "- " + money(q.discount)]);
  if (q.tax > 0) rows.push([`Tax (${qty(q.taxPercent)}%)`, money(q.tax)]);
  ensure(rows.length * 7 + 24, false); y += 6;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  rows.forEach(([k, v]) => { doc.setTextColor(...soft); T(k, 128, y); doc.setTextColor(...ink); T(v, W - M - 2, y, { align: "right" }); y += 7; });
  doc.setFillColor(...ink); doc.roundedRect(112, y - 1, W - M - 112, 15, 3, 3, "F");
  doc.setTextColor(200, 206, 218); doc.setFontSize(9); T("TOTAL COST", 117, y + 8.6);
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(13); T(money(q.total), W - M - 4, y + 9, { align: "right" });
  y += 24;

  // ----- notes, terms, signature
  const block = (title, text) => {
    const lines = doc.splitTextToSize(safe(text), W - 2 * M).flatMap(l => l);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); ensure(14, false); doc.setTextColor(...soft); T(title, M, y); y += 5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(...ink);
    lines.forEach(l => { ensure(5, false); doc.text(l, M, y); y += 4.7; }); y += 4;
  };
  if (q.notes) block("DESCRIPTION", q.notes);
  if (q.terms) block("TERMS & CONDITIONS", q.terms);
  ensure(30, false); y += 10;
  doc.setDrawColor(...ink); doc.line(W - M - 60, y + 14, W - M, y + 14);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...soft); T("Authorized Signature", W - M - 30, y + 19, { align: "center" });

  // ----- footer on every page
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p); doc.setDrawColor(...line); doc.line(M, 284, W - M, 284);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...soft);
    T(`${company}  |  Quotation ${q.id}`, M, 290); T(`Page ${p} of ${pages}`, W - M, 290, { align: "right" });
  }
  return { doc, filename: `${q.id}.pdf` };
}

export async function downloadQuotationPdf(q, company) { const { doc, filename } = await buildQuotationPdf(q, company); doc.save(filename); }
export async function quotationPdfFile(q, company) { const { doc, filename } = await buildQuotationPdf(q, company); return new File([doc.output("blob")], filename, { type: "application/pdf" }); }
