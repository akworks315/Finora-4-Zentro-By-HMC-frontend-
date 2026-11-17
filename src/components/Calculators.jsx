import React, { useState } from "react";
import { HardHat, CalendarClock, Plus } from "lucide-react";
import { permitState, toInputDate } from "../lib";
import { Button, Modal } from "./ui";
import WorkOrders, { PermitBadge } from "./WorkOrders";

// Pop-up form for a new work permission (opened by the "New permission" button).
function PermissionModal({ employees, onSave, onClose }) {
  const [f, setF] = useState({ employee: "", site: "", permitNo: "", permitAuthority: "", permitStart: toInputDate(), permitDue: "", notes: "" });
  const [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const due = f.permitDue ? new Date(f.permitDue + "T00:00:00") : null;
  const state = due ? permitState(due) : null;
  const submit = async e => {
    e.preventDefault(); setErr("");
    if (!f.site.trim()) return setErr("Enter the area / site this permission is for.");
    if (!f.permitDue) return setErr("Enter the permission due (expiry) date.");
    if (f.permitStart && f.permitDue < f.permitStart) return setErr("Permission due date cannot be before its start date.");
    setBusy(true);
    try { await onSave({ employee: f.employee.trim(), site: f.site.trim(), permitNo: f.permitNo, permitAuthority: f.permitAuthority, permitStart: f.permitStart || null, permitDue: f.permitDue, startedOn: f.permitStart || null, notes: f.notes }); onClose(); }
    catch (ex) { setErr(ex.message || "Could not save."); setBusy(false); }
  };
  return <Modal title="New work permission" subtitle="Officially required to work in an area. You are alerted before it expires." onClose={onClose}
    actions={<><Button kind="ghost" onClick={onClose}>Cancel</Button><Button form="perm-form" type="submit" disabled={busy}><HardHat size={15} />{busy ? "Saving…" : "Save permission"}</Button></>}>
    <form id="perm-form" className="form" onSubmit={submit}>
      <label><span>Area / site</span><input value={f.site} onChange={e => set("site", e.target.value)} placeholder="e.g. DHA Phase 6, Plot 12" autoFocus /></label>
      <label><span>Employee <em>who works there, optional</em></span><input list="emp-list" value={f.employee} onChange={e => set("employee", e.target.value)} placeholder="Name of the employee / contractor" /></label>
      <datalist id="emp-list">{employees.map(n => <option key={n} value={n} />)}</datalist>
      <label><span>Permission no. <em>optional</em></span><input value={f.permitNo} onChange={e => set("permitNo", e.target.value)} placeholder="e.g. BCA-2026-1182" /></label>
      <label><span>Issued by <em>optional</em></span><input value={f.permitAuthority} onChange={e => set("permitAuthority", e.target.value)} placeholder="e.g. Cantonment Board" /></label>
      <label><span>Permission starts</span><input type="date" value={f.permitStart} onChange={e => set("permitStart", e.target.value)} /></label>
      <label><span>Permission due / expires</span><input type="date" value={f.permitDue} min={f.permitStart || undefined} onChange={e => set("permitDue", e.target.value)} /></label>
      {state && <div className="span-2"><PermitBadge permit={state} /></div>}
      <label className="span-2"><span>Description <em>optional</em></span><textarea rows="3" value={f.notes} onChange={e => set("notes", e.target.value)} placeholder="Extra details: type of work, floors, conditions of the permission…" /></label>
      {err && <div className="form-error span-2" role="alert">{err}</div>}
    </form>
  </Modal>;
}

export default function Calculators({ works = [], employees = [], onSaveWork, onRenewWork, onWorkStatus, onDeleteWork, onBillWork, notify }) {
  const [adding, setAdding] = useState(false);
  return <div className="page-gap">
    <div className="action-bar">
      <div><h3>Work permissions</h3><p>Your saved permissions. Press “New permission” to add one.</p></div>
      <Button onClick={() => setAdding(true)}><Plus size={16} />New permission</Button>
    </div>
    <WorkOrders works={works} onRenew={onRenewWork} onStatus={onWorkStatus} onDelete={onDeleteWork} onBill={onBillWork} notify={notify} />
    {adding && <PermissionModal employees={employees} onSave={onSaveWork} onClose={() => setAdding(false)} />}
  </div>;
}
