import React, { useMemo, useState } from "react";
import { Plus, Trash2, X, Search, Printer, Download, Pencil, Copy, Check, Send, Ban, RotateCcw, ChevronLeft, FileText, ExternalLink } from "lucide-react";
import { money, fmtDate, toInputDate, prettyPhone, quoteCalc, quoteItemAmount, QUOTE_UNITS, QUOTE_STATUSES } from "../lib";
import { downloadQuotationPdf } from "../quotationPdf";
import { shareQuotation } from "../whatsapp";
import { Modal, Button, Empty, Segmented, Status } from "./ui";
import Logo from "./Logo";
import { WhatsAppIcon } from "./InvoiceModal";

const DEFAULT_TERMS = "Prices are based on site measurements and initial drawings.\nAny additional work requested will be billed separately.\nPayment terms as per agreed project stages contract.";
let counter = 0; const uid = () => ++counter;
const blankItem = () => ({ key: uid(), description: "", qty: "1", unit: "L/S", rate: "" });
const blankSection = (title = "") => ({ key: uid(), title, items: [blankItem()] });
const qtyText = n => (Number.isInteger(Number(n)) ? String(n) : Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 }));

const newDraft = () => ({ title: "", customer: "", customerPhone: "", customerEmail: "", house: "", address: "", date: toInputDate(), validUntil: "", sections: [blankSection()], discount: "", taxPercent: "", terms: "", notes: "", extras: [],
  show: { customer: false, validity: false, discount: false, tax: false, terms: false, notes: false } });
const draftFrom = q => ({ title: q.title, customer: q.customer, customerPhone: q.customerPhone, customerEmail: q.customerEmail, house: q.house, address: q.address, date: toInputDate(q.date), validUntil: q.validUntil ? toInputDate(q.validUntil) : "",
  sections: q.sections.length ? q.sections.map(s => ({ key: uid(), title: s.title, items: s.items.map(i => ({ key: uid(), description: i.description, qty: String(i.qty), unit: i.unit, rate: i.rate ? String(i.rate) : "" })) })) : [blankSection()],
  discount: q.discount ? String(q.discount) : "", taxPercent: q.taxPercent ? String(q.taxPercent) : "", terms: q.terms, notes: q.notes, extras: q.extras.map(e => ({ key: uid(), label: e.label, value: e.value })),
  show: { customer: !!(q.customer || q.customerPhone || q.customerEmail || q.house || q.address), validity: !!q.validUntil, discount: q.discount > 0, tax: q.taxPercent > 0, terms: !!q.terms, notes: !!q.notes } });
const payloadFrom = d => ({ title: d.title, customer: d.customer, customerPhone: d.customerPhone, customerEmail: d.customerEmail, house: d.house, address: d.address, date: d.date, validUntil: d.validUntil || null,
  discount: Number(d.discount) || 0, taxPercent: Number(d.taxPercent) || 0, terms: d.terms, notes: d.notes, extras: d.extras.map(e => ({ label: e.label, value: e.value })),
  sections: d.sections.map(s => ({ title: s.title, items: s.items.map(i => ({ description: i.description, qty: i.qty === "" ? 1 : Number(i.qty), unit: i.unit, rate: Number(i.rate) || 0 })) })) });

// ---------- editor: build a quotation with the + buttons ----------
function Editor({ quote, onCancel, onSave, notify }) {
  const [d, setD] = useState(() => (quote ? draftFrom(quote) : newDraft()));
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setD(x => ({ ...x, [k]: v }));
  const show = (k, v = true, extra = {}) => setD(x => ({ ...x, ...extra, show: { ...x.show, [k]: v } }));
  const calc = useMemo(() => quoteCalc(payloadFrom(d)), [d]);
  const setSection = (key, patch) => setD(x => ({ ...x, sections: x.sections.map(s => s.key === key ? { ...s, ...patch } : s) }));
  const setItem = (sk, ik, patch) => setD(x => ({ ...x, sections: x.sections.map(s => s.key === sk ? { ...s, items: s.items.map(i => i.key === ik ? { ...i, ...patch } : i) } : s) }));
  const addItem = sk => setD(x => ({ ...x, sections: x.sections.map(s => s.key === sk ? { ...s, items: [...s.items, blankItem()] } : s) }));
  const delItem = (sk, ik) => setD(x => ({ ...x, sections: x.sections.map(s => s.key === sk ? { ...s, items: s.items.filter(i => i.key !== ik) } : s) }));
  const delSection = sk => setD(x => ({ ...x, sections: x.sections.filter(s => s.key !== sk) }));
  let n = 0;

  const save = async () => {
    const p = payloadFrom(d);
    if (!p.sections.some(s => s.items.some(i => i.description.trim() || i.rate > 0))) return notify("Add at least one item (description and rate).", true);
    setBusy(true);
    try { await onSave(p, quote?.id); } catch (e) { notify(e.message || "Could not save the quotation.", true); setBusy(false); }
  };

  const adders = [["customer", "Customer details"], ["validity", "Valid until"], ["discount", "Discount"], ["tax", "Tax"], ["notes", "Description"], ["terms", "Terms & conditions"]].filter(([k]) => !d.show[k]);

  return <div className="q-editor">
    <button className="back-btn" onClick={onCancel}><ChevronLeft size={19} />Quotations</button>
    <section className="panel">
      <div className="panel-head"><div><h3>{quote ? `Edit ${quote.id}` : "New quotation"}</h3><p>Fill only what you need. Customer details are optional, add them now or later. Use the + buttons to add more fields.</p></div></div>
      <div className="form">
        <label className="span-2"><span>Scope of work <em>title, optional</em></span><input value={d.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Complete interior renovation, Plot 12 DHA" /></label>
        <label>Quote date<input type="date" value={d.date} onChange={e => set("date", e.target.value)} /></label>
        {d.show.validity && <label><span>Valid until <button type="button" className="mini-x" onClick={() => show("validity", false, { validUntil: "" })} aria-label="Remove">×</button></span><input type="date" value={d.validUntil} min={d.date} onChange={e => set("validUntil", e.target.value)} /></label>}
      </div>
      <div className="q-adders" role="group" aria-label="Add fields">
        {adders.map(([k, label]) => <button key={k} type="button" className="q-add" onClick={() => show(k, true, k === "terms" && !d.terms ? { terms: DEFAULT_TERMS } : {})}><Plus size={14} />{label}</button>)}
        <button type="button" className="q-add" onClick={() => set("extras", [...d.extras, { key: uid(), label: "", value: "" }])}><Plus size={14} />Custom field</button>
      </div>
    </section>

    {d.show.customer && <section className="panel">
      <div className="panel-head"><div><h3>Customer details <em className="opt">optional</em></h3><p>Leave empty for a general quotation. You must add the customer's name before you confirm it.</p></div><button className="icon-btn" onClick={() => show("customer", false, { customer: "", customerPhone: "", customerEmail: "", house: "", address: "" })} aria-label="Remove customer details"><X size={16} /></button></div>
      <div className="form">
        <label>Customer name<input value={d.customer} onChange={e => set("customer", e.target.value)} placeholder="e.g. Vertex Studio" /></label>
        <label>WhatsApp number<input type="tel" inputMode="tel" value={d.customerPhone} onChange={e => set("customerPhone", e.target.value)} placeholder="0300 1234567" /></label>
        <label>House / plot no.<input value={d.house} onChange={e => set("house", e.target.value)} placeholder="e.g. House 12-B" /></label>
        <label>Address<input value={d.address} onChange={e => set("address", e.target.value)} placeholder="e.g. Street 4, DHA Phase 6" /></label>
        <label className="span-2">Email<input type="email" value={d.customerEmail} onChange={e => set("customerEmail", e.target.value)} placeholder="optional" /></label>
      </div>
    </section>}

    {d.extras.length > 0 && <section className="panel">
      <div className="panel-head"><div><h3>Custom fields</h3><p>Any extra detail you want printed on the quotation (e.g. Site, Floors, Warranty).</p></div></div>
      <ul className="q-extras">{d.extras.map(e => <li key={e.key}><input placeholder="Field name" value={e.label} onChange={ev => set("extras", d.extras.map(x => x.key === e.key ? { ...x, label: ev.target.value } : x))} /><input placeholder="Value" value={e.value} onChange={ev => set("extras", d.extras.map(x => x.key === e.key ? { ...x, value: ev.target.value } : x))} />
        <button className="icon-btn" onClick={() => set("extras", d.extras.filter(x => x.key !== e.key))} aria-label="Remove field"><X size={16} /></button></li>)}</ul>
    </section>}

    <section className="panel">
      <div className="panel-head"><div><h3>Items</h3><p>Add a section for each type of work (Bath room, Electric...), then the items. Amount = quantity × rate.</p></div></div>
      <datalist id="q-units">{QUOTE_UNITS.map(u => <option key={u} value={u} />)}</datalist>
      {d.sections.map(s => <div key={s.key} className="q-section">
        <div className="q-sec-head"><input value={s.title} onChange={e => setSection(s.key, { title: e.target.value })} placeholder="Section name, e.g. BATH ROOM WORK (optional)" /><button className="icon-btn" onClick={() => delSection(s.key)} aria-label="Remove section" title="Remove this section"><Trash2 size={15} /></button></div>
        {s.items.map(it => { n++; const amt = quoteItemAmount({ qty: it.qty, rate: it.rate }); return <div key={it.key} className="q-item">
          <span className="q-no">{n}</span>
          <textarea className="q-desc" rows="2" value={it.description} onChange={e => setItem(s.key, it.key, { description: e.target.value })} placeholder="Description of work / specification" />
          <label className="q-f"><small>Qty</small><input type="number" min="0" step="any" inputMode="decimal" value={it.qty} onChange={e => setItem(s.key, it.key, { qty: e.target.value })} /></label>
          <label className="q-f"><small>Unit</small><input list="q-units" value={it.unit} onChange={e => setItem(s.key, it.key, { unit: e.target.value })} /></label>
          <label className="q-f"><small>Rate</small><input type="number" min="0" step="any" inputMode="decimal" value={it.rate} onChange={e => setItem(s.key, it.key, { rate: e.target.value })} placeholder="0" /></label>
          <div className="q-amt"><small>Amount</small><b className="num">{money(amt)}</b></div>
          <button className="icon-btn q-del" onClick={() => delItem(s.key, it.key)} aria-label="Remove item"><X size={16} /></button>
        </div>; })}
        <button type="button" className="q-add" onClick={() => addItem(s.key)}><Plus size={14} />Add item</button>
      </div>)}
      <button type="button" className="q-add wide" onClick={() => setD(x => ({ ...x, sections: [...x.sections, blankSection()] }))}><Plus size={14} />Add section</button>
    </section>

    {(d.show.discount || d.show.tax) && <section className="panel"><div className="form">
      {d.show.discount && <label><span>Discount (Rs) <button type="button" className="mini-x" onClick={() => show("discount", false, { discount: "" })} aria-label="Remove">×</button></span><input type="number" min="0" step="any" inputMode="decimal" value={d.discount} onChange={e => set("discount", e.target.value)} placeholder="0" /></label>}
      {d.show.tax && <label><span>Tax (%) <button type="button" className="mini-x" onClick={() => show("tax", false, { taxPercent: "" })} aria-label="Remove">×</button></span><input type="number" min="0" max="100" step="any" inputMode="decimal" value={d.taxPercent} onChange={e => set("taxPercent", e.target.value)} placeholder="0" /></label>}
    </div></section>}
    {d.show.notes && <section className="panel"><label className="notes-field"><span>Description <em>optional, printed on the quotation</em> <button type="button" className="mini-x" onClick={() => show("notes", false, { notes: "" })} aria-label="Remove">×</button></span><textarea rows="3" value={d.notes} onChange={e => set("notes", e.target.value)} placeholder="Extra details about the work, materials, schedule…" /></label></section>}
    {d.show.terms && <section className="panel"><label className="notes-field"><span>Terms &amp; conditions <button type="button" className="mini-x" onClick={() => show("terms", false, { terms: "" })} aria-label="Remove">×</button></span><textarea rows="5" value={d.terms} onChange={e => set("terms", e.target.value)} /></label></section>}

    <div className="q-savebar">
      <div className="q-sum"><small>{calc.discount > 0 || calc.tax > 0 ? `Subtotal ${money(calc.subtotal)}` : "Total cost"}</small><b className="num">{money(calc.total)}</b></div>
      <Button kind="ghost" onClick={onCancel}>Cancel</Button>
      <Button onClick={save} disabled={busy}><Check size={15} />{busy ? "Saving…" : quote ? "Save changes" : "Save quotation"}</Button>
    </div>
  </div>;
}

// ---------- confirm: the customer accepted, make the invoice ----------
function ConfirmModal({ q, onClose, onConfirm }) {
  const due = new Date(); due.setDate(due.getDate() + 14);
  const [f, setF] = useState({ customer: q.customer, customerPhone: q.customerPhone, customerEmail: q.customerEmail, house: q.house, address: q.address, dueDate: toInputDate(due) });
  const [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const submit = async e => {
    e.preventDefault(); setErr("");
    if (!f.customer.trim()) return setErr("Enter the customer's name. The invoice is made for this customer.");
    setBusy(true);
    try { await onConfirm(q, f); } catch (ex) { setErr(ex.message || "Could not confirm."); setBusy(false); }
  };
  return <Modal title="Confirm quotation" subtitle={`${q.id} · ${money(q.total)}`} onClose={onClose}
    actions={<><Button kind="ghost" onClick={onClose}>Cancel</Button><Button kind="success" form="confirm-q" type="submit" disabled={busy}><Check size={15} />{busy ? "Creating invoice…" : "Confirm & create invoice"}</Button></>}>
    <form id="confirm-q" className="form" onSubmit={submit}>
      <p className="hint span-2">The customer accepted this quotation. An invoice of <b>{money(q.total)}</b> will be created for them now and the customer appears in your Customers list. A confirmed quotation can no longer be edited.</p>
      <label>Customer name<input value={f.customer} onChange={e => set("customer", e.target.value)} placeholder="e.g. Vertex Studio" autoFocus={!q.customer} /></label>
      <label>WhatsApp number <em>optional</em><input type="tel" inputMode="tel" value={f.customerPhone} onChange={e => set("customerPhone", e.target.value)} placeholder="0300 1234567" /></label>
      <label>House / plot no.<input value={f.house} onChange={e => set("house", e.target.value)} /></label>
      <label>Address<input value={f.address} onChange={e => set("address", e.target.value)} /></label>
      <label>Email <em>optional</em><input type="email" value={f.customerEmail} onChange={e => set("customerEmail", e.target.value)} /></label>
      <label>Invoice due date<input type="date" value={f.dueDate} onChange={e => set("dueDate", e.target.value)} /></label>
      {err && <div className="form-error span-2" role="alert">{err}</div>}
    </form>
  </Modal>;
}

// ---------- preview of the quotation (same look as the invoice) + actions ----------
function QuoteModal({ q, company, onClose, onEdit, onPatch, onDuplicate, onDelete, onOpenInvoice, onAskConfirm, notify }) {
  const [busy, setBusy] = useState(false), [del, setDel] = useState(false);
  const locked = q.status === "Confirmed";
  const share = async () => {
    setBusy(true);
    try {
      const r = await shareQuotation(q, company);
      if (r === "opened") notify("PDF downloaded and WhatsApp opened. Attach the PDF in the chat.");
      if (r !== "cancelled" && q.status === "Draft") onPatch(q, { status: "Sent" }, true);
    } catch (e) { notify(e.message || "Could not prepare the PDF.", true); } finally { setBusy(false); }
  };
  const pdf = async () => { try { await downloadQuotationPdf(q, company); notify(`${q.id}.pdf downloaded`); } catch (e) { notify(e.message, true); } };
  const print = () => { document.title = `${q.id}${q.customer ? " - " + q.customer : ""}`; window.print(); };
  let n = 0;
  return <Modal wide title="Quotation" subtitle={`${q.id}${q.customer ? " · " + q.customer : ""}`} onClose={onClose}
    actions={del ? <><span className="confirm-text">Delete this quotation permanently?</span><Button kind="ghost" onClick={() => setDel(false)}>Keep it</Button><Button kind="danger" onClick={() => onDelete(q)}><Trash2 size={15} />Yes, delete</Button></> : <>
      <Button kind="danger-soft" onClick={() => setDel(true)}><Trash2 size={15} />Delete</Button>
      {!locked && q.status !== "Rejected" && <Button kind="danger-soft" onClick={() => onPatch(q, { status: "Rejected" })}><Ban size={15} />Rejected</Button>}
      {q.status === "Rejected" && <Button kind="outline" onClick={() => onPatch(q, { status: "Draft" })}><RotateCcw size={15} />Reopen</Button>}
      <Button kind="outline" onClick={() => onDuplicate(q)} title="Copy this quotation without the customer, to use for someone else"><Copy size={15} /><span className="btn-text">Use for another customer</span></Button>
      {!locked && <Button kind="outline" onClick={() => onEdit(q)}><Pencil size={15} />Edit</Button>}
      <Button kind="outline" onClick={print}><Printer size={15} /><span className="btn-text">Print</span></Button>
      <Button kind="outline" onClick={pdf}><Download size={15} /><span className="btn-text">PDF</span></Button>
      <Button kind="whatsapp" onClick={share} disabled={busy}><WhatsAppIcon />{busy ? "Preparing…" : "WhatsApp"}</Button>
      {!locked && q.status !== "Rejected" && <Button kind="success" onClick={() => onAskConfirm(q)}><Check size={15} />Confirm</Button>}
    </>}>
    {locked && <div className="notice-bar no-print"><Check size={17} /><span><b>Confirmed.</b> {q.invoiceId ? `Invoice ${q.invoiceId} was created for ${q.customer}.` : "Invoice created."}</span>{q.invoiceId && <Button kind="outline" onClick={() => onOpenInvoice(q.invoiceId)}><ExternalLink size={15} />Open invoice</Button>}</div>}
    {!q.customer && !locked && <div className="notice-bar no-print"><FileText size={17} /><span>No customer yet. Add the customer's details with Edit, or when you press Confirm.</span></div>}
    <article className="paper quote-paper">
      <header className="paper-head">
        <div className="paper-brand"><Logo size={34} /><div><b>{company}</b><small>Price quotation</small></div></div>
        <div className="paper-title"><h3>QUOTATION</h3><span>{q.id}</span></div>
      </header>
      <div className="paper-meta">
        <div><small>Quote date</small><b>{fmtDate(q.date)}</b></div>
        <div><small>Valid until</small><b>{q.validUntil ? fmtDate(q.validUntil) : "—"}</b></div>
        <div><small>Items</small><b>{q.itemCount}</b></div>
        <div><small>Status</small><Status value={q.status} /></div>
      </div>
      <div className="q-parties">
        <div className="paper-bill"><small>Prepared for</small><b>{q.customer || "Valued Client / Project Site"}</b>{q.customerPhone && <span style={{ display: "block" }}>WhatsApp: {prettyPhone(q.customerPhone)}</span>}{q.customerEmail && <span style={{ display: "block" }}>{q.customerEmail}</span>}{[q.house, q.address].filter(Boolean).length > 0 && <span style={{ display: "block" }}>Site: {[q.house, q.address].filter(Boolean).join(", ")}</span>}</div>
        <div className="paper-bill"><small>Scope of work</small><b>{q.title || "Complete works as listed below"}</b></div>
      </div>
      {q.extras.length > 0 && <div className="q-extra-list">{q.extras.map((e, i) => <div key={i}><small>{e.label}</small><span>{e.value}</span></div>)}</div>}
      <table className="paper-lines q-lines">
        <thead><tr><th>No</th><th>Description of work / specifications</th><th className="r">Qty</th><th>Unit</th><th className="r">Rate</th><th className="r">Amount</th></tr></thead>
        <tbody>{q.sections.map((s, si) => <React.Fragment key={si}>
          {s.title && <tr className="q-sec-row"><td colSpan={6}>• {s.title}</td></tr>}
          {s.items.map((it, ii) => { n++; return <tr key={ii}><td className="q-n">{n}</td><td className="q-d">{it.description || "—"}</td><td className="r">{qtyText(it.qty)}<span className="q-unit">{it.unit}</span></td><td>{it.unit}</td><td className="r num">{Number(it.rate).toLocaleString("en-US")}</td><td className="r num"><b>{quoteItemAmount(it).toLocaleString("en-US")}</b></td></tr>; })}
        </React.Fragment>)}
        {n === 0 && <tr><td colSpan={6} className="q-empty">No items added yet.</td></tr>}</tbody>
      </table>
      <div className="paper-total">
        <div><span>Subtotal</span><b className="num">{money(q.subtotal)}</b></div>
        {q.discount > 0 && <div><span>Discount</span><b className="num">− {money(q.discount)}</b></div>}
        {q.tax > 0 && <div><span>Tax ({qtyText(q.taxPercent)}%)</span><b className="num">{money(q.tax)}</b></div>}
        <div className="grand"><span>Total cost</span><b className="num">{money(q.total)}</b></div>
      </div>
      {q.notes && <p className="paper-notes"><small>Description</small>{q.notes}</p>}
      {q.terms && <p className="paper-notes q-terms"><small>Terms &amp; conditions</small>{q.terms}</p>}
      <div className="q-sign"><span /><small>Authorized Signature</small></div>
      <footer className="paper-foot">{company} | Quotation {q.id}</footer>
      {q.status === "Confirmed" && <div className="stamp">Confirmed</div>}
    </article>
  </Modal>;
}

export default function Quotations({ quotes, company, onSave, onPatch, onDuplicate, onConfirm, onDelete, onOpenInvoice, notify }) {
  const [editing, setEditing] = useState(null);       // null = list, {} = new, {quote} = edit
  const [openId, setOpenId] = useState(null), [confirming, setConfirming] = useState(null);
  const [q, setQ] = useState(""), [tab, setTab] = useState("all");
  const open = quotes.find(x => x.id === openId) || null;
  const shown = useMemo(() => quotes.filter(x => (tab === "all" || x.status === tab) && [x.id, x.customer, x.title, x.address].join(" ").toLowerCase().includes(q.trim().toLowerCase())), [quotes, q, tab]);
  const count = s => quotes.filter(x => x.status === s).length;

  if (editing) return <Editor quote={editing.quote} notify={notify} onCancel={() => setEditing(null)}
    onSave={async (payload, id) => { const saved = await onSave(payload, id); setEditing(null); setOpenId(saved.id); }} />;

  return <>
    <section className="panel">
      <div className="panel-head"><div><h3>Quotations</h3><p>Prepare a price quotation for a client. It becomes an invoice only when you confirm it.</p></div>
        <div className="toolbar-right"><label className="search"><Search size={16} /><input placeholder="Search number, customer, scope" value={q} onChange={e => setQ(e.target.value)} /></label>
          <Button onClick={() => setEditing({})}><Plus size={15} />New quotation</Button></div></div>
      <div className="toolbar"><Segmented label="Status" value={tab} onChange={setTab} options={[["all", `All (${quotes.length})`], ...QUOTE_STATUSES.map(s => [s, `${s} (${count(s)})`])]} /></div>
      {shown.length === 0 ? <Empty title={quotes.length ? "No quotations match" : "No quotations yet"} text={quotes.length ? "Try another search or status." : "Press “New quotation”, add the items with the + buttons, and share it on WhatsApp."} /> :
        <div className="table-wrap"><table><thead><tr><th>Quotation</th><th>Customer / scope</th><th>Date</th><th className="r">Total</th><th>Status</th></tr></thead>
          <tbody>{shown.map(x => <tr key={x.id} className="clickable" onClick={() => setOpenId(x.id)}>
            <td><b>{x.id}</b>{x.invoiceId && <small>Invoice {x.invoiceId}</small>}</td>
            <td>{x.customer ? <b>{x.customer}</b> : <span className="muted">No customer yet</span>}<small>{x.title || `${x.itemCount} items`}</small></td>
            <td>{fmtDate(x.date)}</td><td className="r num"><b>{money(x.total)}</b></td><td><Status value={x.status} /></td></tr>)}</tbody></table></div>}
    </section>
    {open && <QuoteModal q={open} company={company} notify={notify} onClose={() => setOpenId(null)}
      onEdit={x => { setOpenId(null); setEditing({ quote: x }); }} onPatch={onPatch}
      onDuplicate={async x => { const c = await onDuplicate(x); setOpenId(c.id); }} onDelete={async x => { await onDelete(x); setOpenId(null); }}
      onOpenInvoice={id => { setOpenId(null); onOpenInvoice(id); }} onAskConfirm={x => setConfirming(x)} />}
    {confirming && <ConfirmModal q={quotes.find(x => x.id === confirming.id) || confirming} onClose={() => setConfirming(null)}
      onConfirm={async (x, f) => { await onConfirm(x, f); setConfirming(null); setOpenId(null); }} />}
  </>;
}
