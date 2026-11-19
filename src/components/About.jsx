import React, { useState } from "react";
import { ExternalLink, Mail, MessageCircle, Github, Linkedin, ReceiptText, FileText, Users, Wallet, HardHat, Share2, Database, Server, Smartphone, Lightbulb } from "lucide-react";
import { waNumber } from "../lib";
import { APP_VERSION, DEVELOPER } from "../about";
import { Modal, Button, Segmented } from "./ui";
import { initials } from "./Profile";
import Logo from "./Logo";

const FEATURES = [
  [ReceiptText, "Sales & invoices", "Create invoices with house and address, take part payments, and get a Paid stamp when fully received."],
  [FileText, "Quotations", "Prepare a price quotation, share it on WhatsApp, and confirm it to create the invoice."],
  [Users, "Customers", "Open a customer's profile to see every invoice and download it as Excel."],
  [Wallet, "Expenses & bills", "Track spending by profile (Home, Rent, Site A…) and by person, and pay bills in parts."],
  [HardHat, "Work & permissions", "Keep the working-permission dates of each area and renew them before they expire."],
  [Share2, "WhatsApp, PDF & Print", "Send updates on WhatsApp, download PDFs, print invoices and export Excel sheets."]
];
const TIPS = [
  "Add Finora to your phone's home screen from the browser menu to use it like an app.",
  "Tap the bell to see overdue invoices and permissions that need renewing.",
  "Use the refresh button after changing data on another device."
];
const TECH = ["React", "Vite", "Node.js", "Express", "MongoDB", "jsPDF"];

export default function About({ online, server, onClose }) {
  const [tab, setTab] = useState("finora");
  const d = DEVELOPER;
  return <Modal wide title="Help & about" subtitle="About this software and its developer" onClose={onClose}
    actions={<Button kind="ghost" onClick={onClose}>Close</Button>}>
    <div className="about-tabs"><Segmented label="About" value={tab} onChange={setTab} options={[["finora", "Finora"], ["developer", "Developer"]]} /></div>

    {tab === "finora" ? <div className="profile">
      <section className="profile-head">
        <span className="profile-avatar logo"><Logo size={56} /></span>
        <div className="profile-id"><h2>Finora</h2><p>Sales, invoices, quotations, expenses and profit for your business, in one place.</p></div>
        <div className="profile-chips"><span className="chip">Version {APP_VERSION}</span><span className="chip"><Smartphone size={15} />Phone, tablet &amp; computer</span></div>
      </section>
      <div className="profile-stats three">
        <div className={`pstat ${online ? "good" : "bad"}`}><small><Database size={12} /> Database</small><b>{online ? "Connected" : "Offline"}</b></div>
        <div className="pstat"><small><Server size={12} /> Server</small><b>{server?.label || "—"}</b></div>
        <div className="pstat"><small>Version</small><b>{APP_VERSION}</b></div>
      </div>
      <section className="panel">
        <div className="panel-head"><div><h3>What Finora does</h3><p>Everything you need to run sales, work and money.</p></div></div>
        <ul className="about-list">{FEATURES.map(([Icon, t, text]) => <li key={t}><span className="about-ico"><Icon size={18} /></span><div><b>{t}</b><p>{text}</p></div></li>)}</ul>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h3><Lightbulb size={17} /> Quick tips</h3></div></div>
        <ul className="about-tips">{TIPS.map(t => <li key={t}>{t}</li>)}</ul>
      </section>
    </div> : <div className="profile">
      <section className="profile-head">
        <span className="profile-avatar">{initials(d.name)}</span>
        <div className="profile-id"><h2>{d.name}</h2><p>{d.role}</p></div>
        <div className="profile-chips">
          <a className="chip wa" href={d.portfolio} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} />Portfolio</a>
          {d.whatsapp && <a className="chip" href={`https://wa.me/${waNumber(d.whatsapp)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} />WhatsApp</a>}
          {d.email && <a className="chip" href={`mailto:${d.email}`}><Mail size={15} />Email</a>}
          {d.github && <a className="chip" href={d.github} target="_blank" rel="noopener noreferrer"><Github size={15} />GitHub</a>}
          {d.linkedin && <a className="chip" href={d.linkedin} target="_blank" rel="noopener noreferrer"><Linkedin size={15} />LinkedIn</a>}
        </div>
      </section>
      <div className="profile-stats three">
        <div className="pstat"><small>Role</small><b>Full Stack</b></div>
        <div className="pstat"><small>Built</small><b>Finora</b></div>
        <div className="pstat"><small>Stack</small><b>MERN</b></div>
      </div>
      <section className="panel">
        <div className="panel-head"><div><h3>About the developer</h3></div></div>
        <p className="about-text">{d.name} is a full stack developer who designs and builds complete web applications, from the screens you tap to the server and database behind them. Finora was built end to end by {d.name}, for real business use on phone and computer.</p>
        <div className="profile-actions"><Button onClick={() => window.open(d.portfolio, "_blank", "noopener")}><ExternalLink size={15} />Visit portfolio</Button></div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h3>Technology behind Finora</h3><p>React on the front, Node.js and Express as the API, and MongoDB as the database.</p></div></div>
        <div className="tech-chips">{TECH.map(t => <span key={t}>{t}</span>)}</div>
      </section>
    </div>}
  </Modal>;
}
