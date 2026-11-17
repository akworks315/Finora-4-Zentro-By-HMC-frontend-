import React, { useMemo, useState } from "react";
import { Search, RefreshCw, Trash2, CheckCircle2, HardHat, CalendarClock, History, Banknote } from "lucide-react";
import { money, num, fmtDate, toInputDate, permitNeedsAction } from "../lib";
import { Modal, Button, Empty, Segmented } from "./ui";

const TONE = { expired: "overdue", soon: "pending", ok: "paid", none: "cancelled", closed: "cancelled" };
export const PermitBadge = ({ permit }) => <span className={`status status-${TONE[permit.level]}`}><i />{permit.label}</span>;

function RenewModal({ work, onClose, onRenew }) {
  // New period starts when the current one ends (or today if it already ended).
  const start = work.permitDue && work.permitDue > new Date() ? work.permitDue : new Date();
  const [f, setF] = useState({ permitNo: work.permitNo, permitAuthority: work.permitAuthority, permitStart: toInputDate(start), permitDue: "", note: "" });
  const [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const submit = async e => {
    e.preventDefault(); setErr("");
    if (!f.permitDue) return setErr("Enter the new due date.");
    if (f.permitStart && f.permitDue < f.permitStart) return setErr("Due date cannot be before the start date.");
    setBusy(true);
    try { await onRenew(work, f); onClose(); }
    catch (ex) { setErr(ex.message || "Could not save."); setBusy(false); }
  };
  return <Modal title="Renew permission" subtitle={[work.site, work.employee].filter(Boolean).join(" · ")} onClose={onClose}
    actions={<><Button kind="ghost" onClick={onClose}>Cancel</Button><Button form="renew-form" type="submit" disabled={busy}><RefreshCw size={15} />{busy ? "Saving…" : "Save renewal"}</Button></>}>
    <form id="renew-form" className="form" onSubmit={submit}>
      <p className="hint span-2">{work.permitDue ? <>Current permission: <b>{fmtDate(work.permitStart)} → {fmtDate(work.permitDue)}</b>. </> : null}The old period is kept in the history and the new dates become current.</p>
      <label>Permission no.<input value={f.permitNo} onChange={e => set("permitNo", e.target.value)} placeholder="e.g. BCA-2026-1182" /></label>
      <label>Issued by<input value={f.permitAuthority} onChange={e => set("permitAuthority", e.target.value)} placeholder="e.g. Cantonment Board / SBCA" /></label>
      <label>New start date<input type="date" value={f.permitStart} onChange={e => set("permitStart", e.target.value)} /></label>
      <label>New due date (expires)<input type="date" value={f.permitDue} min={f.permitStart || undefined} onChange={e => set("permitDue", e.target.value)} autoFocus /></label>
      <label className="span-2"><span>Description <em>optional</em></span><input value={f.note} onChange={e => set("note", e.target.value)} placeholder="e.g. renewed for 3 months, fee paid" /></label>
      {err && <div className="form-error span-2" role="alert">{err}</div>}
    </form>
  </Modal>;
}

export default function WorkOrders({ works, onRenew, onStatus, onDelete, onBill, notify }) {
  const [q, setQ] = useState(""), [tab, setTab] = useState("all"), [renewing, setRenewing] = useState(null), [openHist, setOpenHist] = useState(null);
  const counts = useMemo(() => ({ action: works.filter(permitNeedsAction).length, active: works.filter(w => w.status === "Active").length, done: works.filter(w => w.status !== "Active").length }), [works]);
  const shown = useMemo(() => works.filter(w => (tab === "all" || (tab === "action" && permitNeedsAction(w)) || (tab === "active" && w.status === "Active") || (tab === "done" && w.status !== "Active"))
    && [w.employee, w.site, w.permitNo, w.permitAuthority].join(" ").toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (permitNeedsAction(b) - permitNeedsAction(a)) || ((a.permitDue || 9e15) - (b.permitDue || 9e15))), [works, q, tab]);

  return <section className="panel">
    <div className="panel-head"><div><h3>Permission list</h3><p>Every area with its permission dates. Permissions that expire this month or already expired are flagged. Renew them here.</p></div></div>
    <div className="toolbar">
      <Segmented label="Show" value={tab} onChange={setTab} options={[["all", `All (${works.length})`], ["action", `Needs action (${counts.action})`], ["active", `Active (${counts.active})`], ["done", `Closed (${counts.done})`]]} />
      <div className="toolbar-right"><label className="search"><Search size={16} /><input placeholder="Search area, employee, permit no." value={q} onChange={e => setQ(e.target.value)} /></label></div>
    </div>
    {shown.length === 0 ? <Empty title={works.length ? "Nothing matches" : "No work saved yet"} text={works.length ? "Try another filter or search." : "Press “New permission” above to add the first one."} /> :
      <div className="table-wrap"><table className="work-table">
        <thead><tr><th>Area / employee</th><th>Permission</th><th className="r">Actions</th></tr></thead>
        <tbody>{shown.map(w => <React.Fragment key={w.id}>
          <tr>
            <td><div className="who"><span className="avatar"><HardHat size={15} /></span><div><b>{w.site}</b><small>{w.employee || "No employee added"}</small>{w.notes && <small>{w.notes}</small>}{w.amount > 0 && <small>{num(w.areaSqft)} sq ft × {num(w.ratePerSqft)} = {money(w.amount)}</small>}{w.status !== "Active" && <small>{w.status}</small>}</div></div></td>
            <td><PermitBadge permit={w.permit} />
              <small>{w.permitNo ? `${w.permitNo} · ` : ""}{w.permitDue ? `${fmtDate(w.permitStart)} → ${fmtDate(w.permitDue)}` : "Add permission dates"}</small>
              {w.permitAuthority && <small>{w.permitAuthority}</small>}</td>
            <td className="r"><div className="row-actions">
              <Button kind="outline" onClick={() => setRenewing(w)} title="Renew or update the permission"><CalendarClock size={15} />{w.permitDue ? "Renew" : "Set dates"}</Button>
              {onBill && w.amount > 0 && w.employee && w.status !== "Cancelled" && <Button kind="outline" onClick={() => { if (window.confirm(`Create a bill of ${money(w.amount)} to pay ${w.employee}? You can pay it in parts and send WhatsApp updates.`)) onBill(w); }} title="Create a bill to pay this employee (part payments + WhatsApp)"><Banknote size={15} />Bill</Button>}
              {w.history.length > 0 && <Button kind="outline" onClick={() => setOpenHist(openHist === w.id ? null : w.id)} title="Earlier permission periods"><History size={15} />History ({w.history.length})</Button>}
              {w.status === "Active" && <Button kind="success" onClick={() => onStatus(w, "Completed")} title="The work is finished: moves it to Closed"><CheckCircle2 size={15} />Work completed</Button>}
              {w.status !== "Active" && <Button kind="outline" onClick={() => onStatus(w, "Active")} title="Move this work back to Active"><RefreshCw size={15} />Reopen work</Button>}
              <Button kind="danger-soft" aria-label={`Delete permission of ${w.site}`} title="Delete this permission permanently" onClick={() => { if (window.confirm(`Delete the permission saved for ${w.site}?`)) onDelete(w); }}><Trash2 size={15} />Delete</Button>
            </div></td>
          </tr>
          {openHist === w.id && <tr className="hist-row"><td colSpan={3}><b>Earlier permissions</b><ul className="pay-list">{w.history.map(h => <li key={h.id}><span>{h.permitNo || "—"}</span><span>{fmtDate(h.start)} → {fmtDate(h.due)}{h.note ? ` · ${h.note}` : ""}</span><span>Renewed {fmtDate(h.renewedAt)}</span></li>)}</ul></td></tr>}
        </React.Fragment>)}</tbody></table></div>}
    {renewing && <RenewModal work={renewing} onClose={() => setRenewing(null)} onRenew={onRenew} />}
  </section>;
}
