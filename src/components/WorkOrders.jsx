import React, { useMemo, useState } from "react";
import { Search, RefreshCw, Trash2, CheckCircle2, HardHat, CalendarClock, History } from "lucide-react";
import { money, num, fmtDate, toInputDate, permitNeedsAction } from "../lib";
import { Modal, Button, Empty, Segmented } from "./ui";

const TONE = { expired: "overdue", soon: "pending", ok: "paid", none: "cancelled", closed: "cancelled" };
export const PermitBadge = ({ permit }) => <span className={`status status-${TONE[permit.level]}`}><i />{permit.label}</span>;

function RenewModal({ work, onClose, onRenew, onFix }) {
  const [renewal, setRenewal] = useState(true);
  const [f, setF] = useState({ permitNo: work.permitNo, permitAuthority: work.permitAuthority, permitStart: toInputDate(work.permitDue && renewalDefault(work)), permitDue: "", note: "" });
  const [busy, setBusy] = useState(false), [err, setErr] = useState("");
  function renewalDefault(w) { const d = new Date(); return w.permitDue && w.permitDue > d ? w.permitDue : d; }
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  // when correcting a mistake, start from the saved dates
  const switchMode = v => { setRenewal(v); setF(x => v ? { ...x, permitStart: toInputDate(renewalDefault(work)), permitDue: "" } : { ...x, permitStart: work.permitStart ? toInputDate(work.permitStart) : "", permitDue: work.permitDue ? toInputDate(work.permitDue) : "" }); };
  const submit = async e => {
    e.preventDefault(); setErr("");
    if (!f.permitDue) return setErr("Enter the permission due date.");
    if (f.permitStart && f.permitDue < f.permitStart) return setErr("Due date cannot be before the start date.");
    setBusy(true);
    try { await (renewal ? onRenew(work, f) : onFix(work, f)); onClose(); }
    catch (ex) { setErr(ex.message || "Could not save."); setBusy(false); }
  };
  return <Modal title="Working permission" subtitle={`${work.employee} · ${work.site}`} onClose={onClose}
    actions={<><Button kind="ghost" onClick={onClose}>Cancel</Button><Button form="renew-form" type="submit" disabled={busy}><RefreshCw size={15} />{busy ? "Saving…" : renewal ? "Save renewal" : "Save changes"}</Button></>}>
    <form id="renew-form" className="form" onSubmit={submit}>
      <div className="span-2"><Segmented label="Mode" value={renewal ? "renew" : "fix"} onChange={v => switchMode(v === "renew")} options={[["renew", "Renewed permission"], ["fix", "Correct the saved dates"]]} /></div>
      <p className="hint span-2">{renewal ? "The old period is kept in the history and the new dates become current." : "Use this only to fix a mistake in the saved dates."}{work.permitDue && <> Current: <b>{fmtDate(work.permitStart)} → {fmtDate(work.permitDue)}</b>.</>}</p>
      <label>Permission no.<input value={f.permitNo} onChange={e => set("permitNo", e.target.value)} placeholder="e.g. BCA-2026-1182" /></label>
      <label>Issued by<input value={f.permitAuthority} onChange={e => set("permitAuthority", e.target.value)} placeholder="e.g. Cantonment Board / SBCA" /></label>
      <label>Start date<input type="date" value={f.permitStart} onChange={e => set("permitStart", e.target.value)} /></label>
      <label>Due date (expires)<input type="date" value={f.permitDue} min={f.permitStart || undefined} onChange={e => set("permitDue", e.target.value)} autoFocus /></label>
      {renewal && <label className="span-2"><span>Note <em>optional</em></span><input value={f.note} onChange={e => set("note", e.target.value)} placeholder="e.g. renewed for 3 months, fee paid" /></label>}
      {err && <div className="form-error span-2" role="alert">{err}</div>}
    </form>
  </Modal>;
}

export default function WorkOrders({ works, onRenew, onFix, onStatus, onDelete, notify }) {
  const [q, setQ] = useState(""), [tab, setTab] = useState("all"), [renewing, setRenewing] = useState(null), [openHist, setOpenHist] = useState(null);
  const counts = useMemo(() => ({ action: works.filter(permitNeedsAction).length, active: works.filter(w => w.status === "Active").length, done: works.filter(w => w.status !== "Active").length }), [works]);
  const shown = useMemo(() => works.filter(w => (tab === "all" || (tab === "action" && permitNeedsAction(w)) || (tab === "active" && w.status === "Active") || (tab === "done" && w.status !== "Active"))
    && [w.employee, w.site, w.permitNo, w.permitAuthority].join(" ").toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (permitNeedsAction(b) - permitNeedsAction(a)) || ((a.permitDue || 9e15) - (b.permitDue || 9e15))), [works, q, tab]);

  return <section className="panel">
    <div className="panel-head"><div><h3>Work given & working permissions</h3><p>Every job you gave to an employee, with its permission dates. Permissions that expire this month or already expired are flagged.</p></div></div>
    <div className="toolbar">
      <Segmented label="Show" value={tab} onChange={setTab} options={[["all", `All (${works.length})`], ["action", `Permission needs action (${counts.action})`], ["active", `Active (${counts.active})`], ["done", `Closed (${counts.done})`]]} />
      <div className="toolbar-right"><label className="search"><Search size={16} /><input placeholder="Search employee, site, permit no." value={q} onChange={e => setQ(e.target.value)} /></label></div>
    </div>
    {shown.length === 0 ? <Empty title={works.length ? "Nothing matches" : "No work saved yet"} text={works.length ? "Try another filter or search." : "Use the calculator above and press “Save work order”."} /> :
      <div className="table-wrap"><table>
        <thead><tr><th>Employee / site</th><th className="r">Area × rate</th><th className="r">Amount</th><th>Permission</th><th className="r">Actions</th></tr></thead>
        <tbody>{shown.map(w => <React.Fragment key={w.id}>
          <tr>
            <td><div className="who"><span className="avatar"><HardHat size={15} /></span><div><b>{w.employee}</b><small>{w.site}</small>{w.status !== "Active" && <small>{w.status}</small>}</div></div></td>
            <td className="r num">{num(w.areaSqft)} sq ft<small>× {num(w.ratePerSqft)}</small></td>
            <td className="r num"><b>{money(w.amount)}</b></td>
            <td><PermitBadge permit={w.permit} />
              <small>{w.permitNo ? `${w.permitNo} · ` : ""}{w.permitDue ? `${fmtDate(w.permitStart)} → ${fmtDate(w.permitDue)}` : "Add permission dates"}</small>
              {w.permitAuthority && <small>{w.permitAuthority}</small>}</td>
            <td className="r"><div className="row-actions">
              <Button kind="outline" onClick={() => setRenewing(w)} title="Renew or update the permission"><CalendarClock size={15} />{w.permitDue ? "Renew" : "Set dates"}</Button>
              {w.history.length > 0 && <Button kind="ghost" onClick={() => setOpenHist(openHist === w.id ? null : w.id)} title="Earlier permission periods"><History size={15} />{w.history.length}</Button>}
              {w.status === "Active" && <Button kind="ghost" onClick={() => onStatus(w, "Completed")} title="Mark the work as completed"><CheckCircle2 size={15} /></Button>}
              {w.status !== "Active" && <Button kind="ghost" onClick={() => onStatus(w, "Active")}>Reopen</Button>}
              <Button kind="ghost" aria-label={`Delete work of ${w.employee}`} onClick={() => { if (window.confirm(`Delete the work saved for ${w.employee} (${w.site})?`)) onDelete(w); }}><Trash2 size={15} /></Button>
            </div></td>
          </tr>
          {openHist === w.id && <tr className="hist-row"><td colSpan={5}><b>Earlier permissions</b><ul className="pay-list">{w.history.map(h => <li key={h.id}><span>{h.permitNo || "—"}</span><span>{fmtDate(h.start)} → {fmtDate(h.due)}{h.note ? ` · ${h.note}` : ""}</span><span>Renewed {fmtDate(h.renewedAt)}</span></li>)}</ul></td></tr>}
        </React.Fragment>)}</tbody></table></div>}
    {renewing && <RenewModal work={renewing} onClose={() => setRenewing(null)} onRenew={onRenew} onFix={onFix} />}
  </section>;
}
