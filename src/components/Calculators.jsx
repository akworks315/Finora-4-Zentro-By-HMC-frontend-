import React, { useMemo, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { HardHat, CalendarClock } from "lucide-react";
import { money, num as fmtNum, workAmount, permitState, toInputDate } from "../lib";
import { Button } from "./ui";
import WorkOrders, { PermitBadge } from "./WorkOrders";

const num = v => { const n = Number(v); return Number.isFinite(n) ? n : NaN; };
const Field = ({ label, hint, ...p }) => <label><span>{label} {hint && <em>{hint}</em>}</span><input type="number" step="any" min="0" {...p} /></label>;
const Stat = ({ label, value, tone }) => <div className={`calc-stat ${tone || ""}`}><small>{label}</small><b className="num">{value}</b></div>;
const kfmt = v => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : v;

// ---- pure maths (exported for tests) ----
export function emi(principal, annualRate, months) {
  if (!(principal > 0) || !(months > 0) || annualRate < 0) return null;
  const r = annualRate / 12 / 100;
  const pay = r === 0 ? principal / months : principal * r * (1 + r) ** months / ((1 + r) ** months - 1);
  return { payment: pay, total: pay * months, interest: pay * months - principal };
}
export function growth({ principal, monthly, annualRate, years }) {
  const r = annualRate / 12 / 100, rows = [];
  let bal = principal, put = principal;
  for (let m = 1; m <= years * 12; m++) {
    bal = bal * (1 + r) + monthly; put += monthly;
    if (m % 12 === 0) rows.push({ year: m / 12, invested: Math.round(put), value: Math.round(bal) });
  }
  return { rows, final: bal, invested: put, gain: bal - put };
}

function EmiCalc() {
  const [p, setP] = useState("1000000"), [rate, setRate] = useState("15"), [n, setN] = useState("36");
  const res = useMemo(() => emi(num(p), num(rate), num(n)), [p, rate, n]);
  const [showAll, setShowAll] = useState(false);
  const schedule = useMemo(() => {
    if (!res) return [];
    let bal = num(p); const r = num(rate) / 1200, out = [];
    for (let i = 1; i <= num(n); i++) { const int = bal * r, prin = res.payment - int; bal = Math.max(0, bal - prin); out.push({ i, int, prin, bal }); }
    return out;
  }, [res, p, rate, n]);
  return <section className="panel">
    <div className="panel-head"><div><h3>Loan / EMI calculator</h3><p>Monthly repayment from amount, yearly interest rate and tenure.</p></div></div>
    <div className="form calc-form"><Field label="Loan amount (Rs)" value={p} onChange={e => setP(e.target.value)} /><Field label="Interest rate" hint="% per year" value={rate} onChange={e => setRate(e.target.value)} /><Field label="Tenure" hint="months" value={n} onChange={e => setN(e.target.value)} /></div>
    {res ? <><div className="calc-stats"><Stat label="Monthly EMI" value={money(res.payment)} tone="main" /><Stat label="Total interest" value={money(res.interest)} /><Stat label="Total payable" value={money(res.total)} /></div>
      <Button kind="ghost" onClick={() => setShowAll(x => !x)}>{showAll ? "Hide" : "Show"} repayment schedule</Button>
      {showAll && <div className="table-wrap"><table><thead><tr><th>Month</th><th className="r">Principal</th><th className="r">Interest</th><th className="r">Balance</th></tr></thead>
        <tbody>{schedule.map(r => <tr key={r.i}><td>{r.i}</td><td className="r num">{money(r.prin)}</td><td className="r num">{money(r.int)}</td><td className="r num">{money(r.bal)}</td></tr>)}</tbody></table></div>}</>
      : <p className="hint">Enter an amount and tenure above zero.</p>}
  </section>;
}

function GrowthCalc() {
  const [f, setF] = useState({ principal: "100000", monthly: "10000", rate: "12", years: "10" });
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const ok = num(f.principal) >= 0 && num(f.monthly) >= 0 && num(f.rate) >= 0 && num(f.years) > 0 && num(f.years) <= 60 && (num(f.principal) > 0 || num(f.monthly) > 0);
  const g = useMemo(() => ok ? growth({ principal: num(f.principal), monthly: num(f.monthly), annualRate: num(f.rate), years: Math.floor(num(f.years)) }) : null, [f, ok]);
  return <section className="panel">
    <div className="panel-head"><div><h3>Investment & compound interest</h3><p>SIP / retirement growth with monthly compounding.</p></div></div>
    <div className="form calc-form four">
      <Field label="Starting amount (Rs)" value={f.principal} onChange={e => set("principal", e.target.value)} />
      <Field label="Monthly investment (Rs)" value={f.monthly} onChange={e => set("monthly", e.target.value)} />
      <Field label="Expected return" hint="% per year" value={f.rate} onChange={e => set("rate", e.target.value)} />
      <Field label="Years" hint="max 60" value={f.years} onChange={e => set("years", e.target.value)} />
    </div>
    {g ? <><div className="calc-stats"><Stat label="Future value" value={money(g.final)} tone="main" /><Stat label="You invest" value={money(g.invested)} /><Stat label="Growth earned" value={money(g.gain)} tone="good" /></div>
      <div className="chart-box short"><ResponsiveContainer width="100%" height="100%"><AreaChart data={g.rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--line)" vertical={false} /><XAxis dataKey="year" tickFormatter={v => `Y${v}`} axisLine={false} tickLine={false} tick={{ fill: "var(--ink-3)", fontSize: 12 }} />
        <YAxis width={48} axisLine={false} tickLine={false} tick={{ fill: "var(--ink-3)", fontSize: 11 }} tickFormatter={kfmt} />
        <Tooltip formatter={v => money(v)} labelFormatter={v => `Year ${v}`} contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10 }} />
        <Area dataKey="invested" name="Invested" stroke="var(--ink-3)" fill="var(--line)" /><Area dataKey="value" name="Value" stroke="var(--brand)" fill="var(--brand-soft)" />
      </AreaChart></ResponsiveContainer></div></> : <p className="hint">Enter a positive amount and 1–60 years.</p>}
  </section>;
}

function ConstructionCalc({ employees, onSave, notify }) {
  const blank = { employee: "", employeePhone: "", site: "", area: "", rate: "", permitNo: "", permitAuthority: "", permitStart: toInputDate(), permitDue: "", notes: "" };
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const amount = workAmount(f.area, f.rate);
  const due = f.permitDue ? new Date(f.permitDue + "T00:00:00") : null;
  const state = due ? permitState(due) : null;
  const save = async () => {
    if (!f.employee.trim()) return notify("Enter the employee name.", true);
    if (!f.site.trim()) return notify("Enter the area / site where the work is.", true);
    if (!(amount > 0)) return notify("Enter the area and the rate per sq ft first.", true);
    if (f.permitDue && f.permitStart && f.permitDue < f.permitStart) return notify("Permission due date cannot be before its start date.", true);
    setBusy(true);
    try { await onSave({ employee: f.employee.trim(), employeePhone: f.employeePhone.trim(), site: f.site.trim(), areaSqft: Number(f.area), ratePerSqft: Number(f.rate), permitNo: f.permitNo, permitAuthority: f.permitAuthority, permitStart: f.permitStart || null, permitDue: f.permitDue || null, startedOn: f.permitStart || null, notes: f.notes }); setF(blank); }
    catch (e) { notify(e.message || "Could not save the work.", true); } finally { setBusy(false); }
  };
  return <section className="panel">
    <div className="panel-head"><div><h3>Construction work calculator</h3><p>Enter your rate per square foot and the area you gave to the employee. The amount to pay is worked out for you.</p></div></div>
    <div className="form calc-form four">
      <label><span>Employee</span><input list="emp-list" value={f.employee} onChange={e => set("employee", e.target.value)} placeholder="Name of the employee / contractor" /></label>
      <datalist id="emp-list">{employees.map(n => <option key={n} value={n} />)}</datalist>
      <label><span>Area / site <em>where the work is</em></span><input value={f.site} onChange={e => set("site", e.target.value)} placeholder="e.g. DHA Phase 6, Plot 12" /></label>
      <Field label="Area given" hint="square feet" value={f.area} onChange={e => set("area", e.target.value)} placeholder="e.g. 200" />
      <Field label="Rate" hint="per square foot" value={f.rate} onChange={e => set("rate", e.target.value)} placeholder="e.g. 5000" />
    </div>
    <div className="calc-stats">
      <Stat label="Amount to pay the employee" value={amount > 0 ? money(amount) : "—"} tone="main" />
      <Stat label="Worked out as" value={amount > 0 ? `${fmtNum(f.area)} sq ft × ${fmtNum(f.rate)}` : "area × rate"} />
    </div>

    <div className="permit-box">
      <div className="panel-head"><div><h4><CalendarClock size={16} /> Working permission for this area</h4><p>Officially required to work here. Saved dates show in Needs follow-up before they expire, so you can renew in time.</p></div>
        {state && <PermitBadge permit={state} />}</div>
      <div className="form calc-form four">
        <label><span>Permission no. <em>optional</em></span><input value={f.permitNo} onChange={e => set("permitNo", e.target.value)} placeholder="e.g. BCA-2026-1182" /></label>
        <label><span>Issued by <em>optional</em></span><input value={f.permitAuthority} onChange={e => set("permitAuthority", e.target.value)} placeholder="e.g. Cantonment Board" /></label>
        <label><span>Permission starts</span><input type="date" value={f.permitStart} onChange={e => set("permitStart", e.target.value)} /></label>
        <label><span>Permission due / expires</span><input type="date" value={f.permitDue} min={f.permitStart || undefined} onChange={e => set("permitDue", e.target.value)} /></label>
      </div>
    </div>
    <label className="notes-field"><span>Notes <em>optional</em></span><input value={f.notes} onChange={e => set("notes", e.target.value)} placeholder="e.g. plaster work, 2 floors" /></label>
    <div className="calc-save"><Button onClick={save} disabled={busy}><HardHat size={15} />{busy ? "Saving…" : "Save work order"}</Button></div>
  </section>;
}

export default function Calculators({ works = [], employees = [], onSaveWork, onRenewWork, onFixWork, onWorkStatus, onDeleteWork, notify }) {
  return <div className="page-gap">
    <ConstructionCalc employees={employees} onSave={onSaveWork} notify={notify} />
    <WorkOrders works={works} onRenew={onRenewWork} onFix={onFixWork} onStatus={onWorkStatus} onDelete={onDeleteWork} notify={notify} />
    <div className="calc-grid"><EmiCalc /><GrowthCalc /></div>
  </div>;
}
