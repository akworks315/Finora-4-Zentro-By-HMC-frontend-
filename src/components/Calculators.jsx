import React, { useState } from "react";
import { HardHat, CalendarClock } from "lucide-react";
import { permitState, toInputDate } from "../lib";
import { Button } from "./ui";
import WorkOrders, { PermitBadge } from "./WorkOrders";

// Working permission for an area: where, who works there, and the official permission dates.
function PermissionForm({ employees, onSave, notify }) {
  const blank = { employee: "", site: "", permitNo: "", permitAuthority: "", permitStart: toInputDate(), permitDue: "", notes: "" };
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const due = f.permitDue ? new Date(f.permitDue + "T00:00:00") : null;
  const state = due ? permitState(due) : null;
  const save = async () => {
    if (!f.site.trim()) return notify("Enter the area / site this permission is for.", true);
    if (!f.permitDue) return notify("Enter the permission due (expiry) date.", true);
    if (f.permitStart && f.permitDue < f.permitStart) return notify("Permission due date cannot be before its start date.", true);
    setBusy(true);
    try { await onSave({ employee: f.employee.trim(), site: f.site.trim(), permitNo: f.permitNo, permitAuthority: f.permitAuthority, permitStart: f.permitStart || null, permitDue: f.permitDue, startedOn: f.permitStart || null, notes: f.notes }); setF(blank); }
    catch (e) { notify(e.message || "Could not save.", true); } finally { setBusy(false); }
  };
  return <section className="panel">
    <div className="panel-head"><div><h3><CalendarClock size={17} /> Working permission for this area</h3><p>Officially required to work in an area. Saved dates show in Needs follow-up before they expire, so you can renew in time.</p></div>
      {state && <PermitBadge permit={state} />}</div>
    <div className="form calc-form four">
      <label><span>Area / site</span><input value={f.site} onChange={e => set("site", e.target.value)} placeholder="e.g. DHA Phase 6, Plot 12" /></label>
      <label><span>Employee <em>who works there, optional</em></span><input list="emp-list" value={f.employee} onChange={e => set("employee", e.target.value)} placeholder="Name of the employee / contractor" /></label>
      <datalist id="emp-list">{employees.map(n => <option key={n} value={n} />)}</datalist>
      <label><span>Permission no. <em>optional</em></span><input value={f.permitNo} onChange={e => set("permitNo", e.target.value)} placeholder="e.g. BCA-2026-1182" /></label>
      <label><span>Issued by <em>optional</em></span><input value={f.permitAuthority} onChange={e => set("permitAuthority", e.target.value)} placeholder="e.g. Cantonment Board" /></label>
      <label><span>Permission starts</span><input type="date" value={f.permitStart} onChange={e => set("permitStart", e.target.value)} /></label>
      <label><span>Permission due / expires</span><input type="date" value={f.permitDue} min={f.permitStart || undefined} onChange={e => set("permitDue", e.target.value)} /></label>
    </div>
    <label className="notes-field"><span>Description <em>optional</em></span><textarea rows="3" value={f.notes} onChange={e => set("notes", e.target.value)} placeholder="Extra details: type of work, floors, conditions of the permission…" /></label>
    <div className="calc-save"><Button onClick={save} disabled={busy}><HardHat size={15} />{busy ? "Saving…" : "Save permission"}</Button></div>
  </section>;
}

export default function Calculators({ works = [], employees = [], onSaveWork, onRenewWork, onWorkStatus, onDeleteWork, onBillWork, notify }) {
  return <div className="page-gap">
    <PermissionForm employees={employees} onSave={onSaveWork} notify={notify} />
    <WorkOrders works={works} onRenew={onRenewWork} onStatus={onWorkStatus} onDelete={onDeleteWork} onBill={onBillWork} notify={notify} />
  </div>;
}
