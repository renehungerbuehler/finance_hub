import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, ResponsiveContainer, AreaChart, Area, ComposedChart, ReferenceLine } from "recharts";
import { LayoutDashboard, Target, TrendingUp, Activity, CreditCard, Shield, Plus, Pencil, Trash2, Check, X, DollarSign, Wallet, PiggyBank, BarChart3, GripVertical, Power, Sparkles, AlertTriangle, ArrowUpRight, Info, Lightbulb, ShieldCheck, Landmark, Paperclip, Upload, Download, Sun, Moon, ChevronLeft, ChevronRight, User, Building2, Eye, EyeOff, RefreshCw, ChevronDown, MessageSquarePlus, ExternalLink, Maximize2, Minimize2, BookOpen, Settings, Key, Bot, WifiOff, Lock, Cloud, Pin, ClipboardList, Menu, Receipt } from "lucide-react";
import { jsPDF } from "jspdf";
import translations from './i18n.js';

const API_URL = `http://${window.location.hostname}:3003/api`;

const DARK = {
  bg: "#141310", card: "#1e1c18", cardHover: "#28261f", border: "#3a3630",
  text: "#e8e5de", textMuted: "#9a9688", textDim: "#6b6760",
  accent: "#e8c96a", accentLight: "#f0d88a", accentDim: "#c8a84b",
  green: "#3d7a52", greenBg: "rgba(61,122,82,0.1)",
  red: "#c45454", redBg: "rgba(196,84,84,0.1)",
  blue: "#6a9ab0", blueBg: "rgba(106,154,176,0.1)",
  orange: "#e8a840", orangeBg: "rgba(232,168,64,0.1)",
  teal: "#5aaa9a", tealBg: "rgba(90,170,154,0.1)",
  yellow: "#f0d88a", cyan: "#7aaa8a",
};
const LIGHT = {
  bg: "#f5f3ee", card: "#ffffff", cardHover: "#eeebe3", border: "#e4e0d5",
  text: "#1a1a18", textMuted: "#3d3d38", textDim: "#7a7a72",
  accent: "#c8a84b", accentLight: "#e8c96a", accentDim: "#b08f3a",
  green: "#2d5a3d", greenBg: "rgba(45,90,61,0.08)",
  red: "#8b2e2e", redBg: "rgba(139,46,46,0.08)",
  blue: "#5a7a8a", blueBg: "rgba(90,122,138,0.08)",
  orange: "#d4940a", orangeBg: "rgba(212,148,10,0.08)",
  teal: "#3a7a7a", tealBg: "rgba(58,122,122,0.08)",
  yellow: "#e8c96a", cyan: "#5a8a6a",
};
let C = DARK;
const pieColors = () => [C.accent, C.green, C.orange, C.blue, C.teal, C.yellow, C.cyan, C.red];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmt = (n) => (n === null || n === undefined) ? "—" : n.toLocaleString("de-CH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtD = (n) => n.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n) => (n * 100).toFixed(1) + "%";
const uid = () => "id-" + Math.random().toString(36).slice(2,10) + Date.now().toString(36).slice(-4);

const RATE_TYPES = ['Savings', 'Deposit', 'Pension 2A', 'Pension 3A'];

const FREQ_OPTIONS = [{value:1,label:'Monthly'},{value:3,label:'Quarterly'},{value:6,label:'Half-yearly'},{value:12,label:'Yearly'}];
const toMonthly = (amount, freq) => (amount || 0) / (freq || 1);
const subMonthly = (s) => s.amount != null ? toMonthly(s.amount, s.frequency || 1) : (s.monthly||0) + (s.yearly||0)/12;
const recMonthly = (e) => e.amount != null ? toMonthly(e.amount, e.frequency || 12) : e.monthly || e.yearly/12 || 0;
const insMonthlyCalc = (p) => p.amount != null ? toMonthly(p.amount, p.frequency || 12) : p.yearly/12 || 0;

const AiThinking = ({status}) => (
  <div style={{display:'flex',alignItems:'center',gap:8,padding:'4px 0'}}>
    <div style={{display:'flex',gap:3}}>
      {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:'50%',background:C.accent,animation:`aipulse 1.2s ease-in-out ${i*0.2}s infinite`}}/>)}
    </div>
    <span style={{fontSize:13,color:C.textMuted}}>{status||'Thinking...'}</span>
    <style>{`@keyframes aipulse{0%,80%,100%{opacity:.25;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}`}</style>
  </div>
);

const timeAgo = iso => {
  if (!iso) return null;
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d/60)}m ago`;
  if (d < 86400) return `${Math.floor(d/3600)}h ago`;
  return `${Math.floor(d/86400)}d ago`;
};

function useWindowWidth() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
}

// ─── Reusable Components ───
const Badge = ({ children, color = C.accent, bg, onRemove }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: 9999, fontSize: 12, fontWeight: 600, color, background: bg || color + "1a", marginRight: 4 }}>
    {children}
    {onRemove && <X size={10} style={{ cursor: "pointer", marginLeft: 2 }} onClick={e => { e.stopPropagation(); onRemove(); }} />}
  </span>
);

const Card = ({ title, subtitle, children, style: s, headerRight }) => (
  <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: "20px 24px", ...s }}>
    {(title || headerRight) && <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: subtitle ? 4 : 16 }}>
      {title && <h3 style={{ margin: 0, fontSize: 16, fontWeight: 400, fontFamily:"'Fraunces',serif", fontWeight:400, color: C.text }}>{title}</h3>}
      {headerRight}
    </div>}
    {subtitle && <p style={{ margin: "0 0 16px", fontSize: 14, color: C.textMuted }}>{subtitle}</p>}
    {children}
  </div>
);

const StatCard = ({ label, value, sub, icon: Icon, color = C.accent, iconColor, compact }) => (
  <Card style={{ display: "flex", alignItems: "center", gap: compact ? 10 : 16 }}>
    <div style={{ width: compact?34:44, height: compact?34:44, borderRadius: 10, background: (iconColor||color) + "1a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink:0 }}><Icon size={compact?17:22} color={iconColor||color} /></div>
    <div style={{minWidth:0}}>
      <div style={{ fontSize: compact?12:13, fontFamily:"'DM Mono',monospace", letterSpacing:"0.06em", textTransform:"uppercase", color: C.textMuted, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: compact?16:24, fontWeight: 300, fontFamily:"'Fraunces',serif", fontWeight:400, color: C.text, lineHeight:1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: compact?11:13, color: C.textDim, marginTop: 2 }}>{sub}</div>}
    </div>
  </Card>
);

const Tab = ({ active, children, onClick }) => (
  <button onClick={onClick} style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, color: active ? C.text : C.textMuted, background: active ? C.accent + "22" : "transparent" }}>{children}</button>
);

const TH = ({ children, w }) => <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: 400, fontFamily:"'DM Mono',monospace", color: C.textDim, borderBottom: `1px solid ${C.border}`, textTransform: "uppercase", letterSpacing: "0.08em", width: w }}>{children}</th>;

// Inline editable text — click to edit, Enter to save, Escape to cancel
function InlineEdit({ value, onChange, style: s, placeholder, inputWidth }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const start = () => { setDraft(value); setEditing(true); };
  const save = () => { setEditing(false); if (draft.trim()) onChange(draft.trim()); };
  if (editing) return <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }} onBlur={save} style={{ padding: "2px 6px", fontSize: "inherit", fontWeight: "inherit", background: C.bg, border: `1px solid ${C.accent}`, borderRadius: 4, color: C.text, outline: "none", width: inputWidth || "auto", ...s }} />;
  return <span onClick={start} style={{ cursor: "pointer", borderBottom: `1px dashed ${C.border}`, ...s }} title="Click to edit">{value || placeholder || "—"}</span>;
}

// Inline editable number
function InlineNum({ value, onChange, style: s, placeholder, width = 70 }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const start = () => { setDraft(value != null ? String(value) : ""); setEditing(true); };
  const save = () => { setEditing(false); const p = draft.trim() === "" ? null : Number(draft.replace(/'/g,"").replace(/,/g,"")); if (p === null || !isNaN(p)) onChange(p); };
  if (editing) return <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }} onBlur={save} style={{ width, padding: "2px 5px", fontSize: 13, background: C.bg, border: `1px solid ${C.accent}`, borderRadius: 4, color: C.text, outline: "none", textAlign: "right", fontVariantNumeric: "tabular-nums" }} />;
  return <span onClick={start} style={{ cursor: "pointer", fontVariantNumeric: "tabular-nums", ...s }} title="Click to edit">{value != null ? (typeof value === "number" ? fmtD(value) : value) : (placeholder || "—")}</span>;
}

// Add row button
const AddRow = ({ onClick, label = "Add row", colSpan = 1 }) => (
  <tr><td colSpan={colSpan} style={{ padding: "6px 12px" }}>
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", border: `1px dashed ${C.border}`, borderRadius: 6, background: "transparent", color: C.textDim, fontSize: 13, cursor: "pointer", width: "100%" }}>
      <Plus size={14} />{label}
    </button>
  </td></tr>
);

// Delete button shown on hover
function DelBtn({ onClick }) {
  const [confirming, setConfirming] = React.useState(false);
  if (confirming) return (
    <span style={{display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>
      <span style={{fontSize:10,color:C.textDim}}>Delete?</span>
      <button onClick={e=>{e.stopPropagation();onClick();setConfirming(false);}} style={{padding:"2px 6px",borderRadius:4,border:"none",background:C.red,color:"#fff",fontSize:10,cursor:"pointer",fontWeight:600}}>Yes</button>
      <button onClick={e=>{e.stopPropagation();setConfirming(false);}} style={{padding:"2px 6px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.textDim,fontSize:10,cursor:"pointer"}}>No</button>
    </span>
  );
  return <button onClick={e=>{e.stopPropagation();setConfirming(true);}} style={{padding:2,background:"transparent",border:"none",cursor:"pointer",color:C.textDim,opacity:0.5,display:"flex"}} title="Delete"><Trash2 size={13}/></button>;
}

// Toggle switch
const Toggle = ({ on, onToggle, size = "sm" }) => {
  const w = size === "sm" ? 32 : 40; const h = size === "sm" ? 16 : 20; const d = h - 4;
  return <button onClick={onToggle} style={{ width: w, height: h, borderRadius: h, border: "none", cursor: "pointer", background: on ? C.green : C.border, position: "relative", transition: "background .2s", flexShrink: 0 }}>
    <div style={{ width: d, height: d, borderRadius: d, background: "#fff", position: "absolute", top: 2, left: on ? w - d - 2 : 2, transition: "left .2s" }} />
  </button>;
};

// ─── INITIAL DATA (as mutable state seeds) ───
const INIT_ACCOUNTS = [];

const INIT_SCENARIOS = [];

const INIT_TRACKER = [];


const INIT_SUBS_PERSONAL = [];

const INIT_YEARLY = [];

const TAX_TYPES = [
  "State/Municipal Tax (Provisional)",
  "State/Municipal Tax (Final Settlement)",
  "Federal Direct Tax (Provisional)",
  "Federal Direct Tax (Final Settlement)",
];

const makeTaxYear = (year, lines) => ({
  id: uid(), year,
  lines: TAX_TYPES.map((type, i) => ({ id: uid(), type, amount: (lines[i] && lines[i][0]) ?? lines[i] ?? 0, paidAt: (lines[i] && lines[i][1]) || "" })),
});

const INIT_TAXES = [];

const INIT_INSURANCE = [];

// ───────────────────────────────────────────────────────────────
// SMART RECOMMENDATIONS
// ───────────────────────────────────────────────────────────────
const INSIGHT_ICONS = { tax: DollarSign, alert: AlertTriangle, trend: ArrowUpRight, info: Info, pension: PiggyBank, shield: ShieldCheck, check: Check, lightbulb: Lightbulb };
const PRIORITY_COLORS = { high: C.red, medium: C.orange, low: C.green };
const CATEGORY_LABELS = { tax: "Tax", pension: "Pension", insurance: "Insurances", investment: "Investment", savings: "Savings", debt: "Debt" };

const ONBOARDING_STEPS = [
  { id: 'welcome', label: 'Welcome to FinanceHub', desc: 'Your personal Swiss finance hub — AI-powered, fully private, runs locally.', type: 'one-time', icon: Sparkles, action: 'ack' },
  { id: 'clearData', label: 'Clear sample data & start fresh', desc: 'Browse the pages to see how everything works, then click Clear to wipe the sample data and begin with your own.', type: 'one-time', icon: Trash2, action: 'clear' },
  { id: 'profile', label: 'Complete your profile', desc: 'Add your name, canton, and marital status. The AI advisor uses this to give personalised Swiss tax and financial advice.', type: 'one-time', icon: User, action: 'profile' },
  { id: 'aiAdviser', label: 'Customise the AI Adviser prompt', desc: 'The AI Adviser chat uses a default system prompt. You can edit it to focus on your goals, risk tolerance, or any topic you care about.', type: 'one-time', icon: Sparkles, action: 'prompt', badge: 'prompt' },
  { id: 'accounts', label: 'Add or import accounts', desc: 'Add accounts manually — or click Import on the Accounts page and upload a bank statement or PDF. AI extracts balances and investment positions automatically. Each account also has a notes field for AI-specific context.', type: 'one-time', icon: Landmark, action: 'accounts', badge: 'import' },
  { id: 'expenses', label: 'Add or Import your expenses', desc: 'Each Expenses tab (Insurances, Taxes, Recurring, Subscriptions) has an Import button. Upload a bank statement CSV, insurance PDF, or tax notice — AI extracts the data. Use the Prompt ✓ button to customise the extraction prompt per section.', type: 'one-time', icon: CreditCard, action: 'expenses', badge: 'import' },
  { id: 'transactions', label: 'Import your transactions', desc: 'Upload bank statement CSVs on the Transactions page — AI extracts dates, amounts, merchants, and currencies automatically. Filter, search, and track spending across accounts.', type: 'one-time', icon: Receipt, action: 'transactions', badge: 'import' },
  { id: 'scenario', label: 'Create a budget scenario', desc: 'Build a scenario manually or use Import Payroll on the Scenarios page — upload a payroll PDF and AI generates your income, net salary, and all deductions (AHV, BVG, etc.) including percentage-based items.', type: 'one-time', icon: Target, action: 'scenarios', badge: 'import' },
  { id: 'aiSettings', label: 'Review AI settings', desc: 'Choose your AI provider (Anthropic, OpenAI, Gemini, or Ollama for full privacy), set API keys, and pick chat/import models. Switch any time in AI Settings.', type: 'one-time', icon: Settings, action: 'ai-settings' },
  { id: 'backup', label: 'Create a backup', desc: 'Download a full JSON backup of your data and store it somewhere safe (cloud drive, external disk). Restore it any time via the Import button in the sidebar.', type: 'one-time', icon: Download, action: 'backup' },
  { id: 'monthlyBalances', label: 'Update account balances', desc: 'Import or edit your account balances this month.', type: 'recurring', icon: RefreshCw, action: 'accounts' },
  { id: 'monthlyTracker', label: 'Sync Tracker', desc: 'Sync your tracker with current account balances.', type: 'recurring', icon: Activity, action: 'tracker' },
];

function generateInsights({ accounts, scenarios, insurance, inc, exp, sav, inv, liquidTotal, lockedTotal, totalWealth, debtTotal = 0, t = k=>k }) {
  const insights = [];
  const sc = scenarios.find(s => s.isActive);

  // 1. Pillar 3a max contribution check
  const franklyContrib = sc ? (sc.savings.find(l => l.label.toLowerCase().includes("3a")) || sc.investments.find(l => l.label.toLowerCase().includes("3a"))) : null;
  const monthlyTo3a = franklyContrib ? (franklyContrib.pct != null ? +(inc * franklyContrib.pct / 100) : franklyContrib.amount) : 0;
  const yearly3a = monthlyTo3a * 12;
  const max3a = 7258;
  if (yearly3a < max3a) {
    const gap = max3a - yearly3a;
    insights.push({ priority: "high", category: "tax", icon: "tax", title: t('rec.3aNotMaxed'),
      detail: t('rec.3aNotMaxedDetail', {yearly: String(Math.round(yearly3a)), max: fmt(max3a), gap: fmt(Math.round(gap)), savings: fmt(Math.round(gap * 0.33))}),
      action: t('rec.3aNotMaxedAction', {current: fmt(Math.round(monthlyTo3a)), target: fmt(Math.ceil(max3a / 12))}),
      impact: t('rec.3aNotMaxedImpact', {amount: fmt(Math.round(gap * 0.33))}),
    });
  } else {
    insights.push({ priority: "low", category: "tax", icon: "check", title: t('rec.3aMaxed'),
      detail: t('rec.3aMaxedDetail', {yearly: fmt(Math.round(yearly3a)), max: fmt(max3a)}),
      action: t('rec.3aMaxedAction'), impact: t('rec.3aMaxedImpact'),
    });
  }

  // 2. Emergency fund check
  const emergencyAcct = accounts.find(a => a.name.toLowerCase().includes("emergency"));
  const emergencyBal = emergencyAcct ? emergencyAcct.balance : 0;
  const monthlyExpenses = exp > 0 ? exp : 5000;
  const targetEmergency = monthlyExpenses * 6;
  if (emergencyBal < targetEmergency && emergencyBal < 20000) {
    insights.push({ priority: emergencyBal < monthlyExpenses * 3 ? "high" : "medium", category: "savings", icon: "alert", title: t('rec.emergencyLow'),
      detail: t('rec.emergencyDetail', {balance: fmt(emergencyBal), expenses: fmt(Math.round(monthlyExpenses)), target: fmt(Math.round(targetEmergency))}),
      action: t('rec.emergencyAction', {target: fmt(Math.round(targetEmergency))}), impact: t('rec.emergencyImpact'),
    });
  }

  // 3. BVG buy-in opportunity
  const bvgAccount = accounts.find(a => a.name.toLowerCase().includes("swisslife") || a.name.toLowerCase().includes("2a"));
  if (bvgAccount && inc > 0) {
    insights.push({ priority: "medium", category: "pension", icon: "pension", title: t('rec.bvgBuyIn'),
      detail: t('rec.bvgDetail', {balance: fmt(bvgAccount.balance)}),
      action: t('rec.bvgAction'), impact: t('rec.bvgImpact'),
    });
  }

  // 4. Savings rate analysis
  const savingsRate = inc > 0 ? ((sav + inv) / inc) : 0;
  if (savingsRate > 0) {
    const rateLabel = savingsRate >= 0.3 ? t('rec.savingsRateExcellent') : savingsRate >= 0.2 ? t('rec.savingsRateGood') : savingsRate >= 0.1 ? t('rec.savingsRateModerate') : t('rec.savingsRateLow');
    insights.push({ priority: savingsRate < 0.15 ? "high" : "low", category: "savings", icon: "trend",
      title: t('rec.savingsRate', {rate: (savingsRate * 100).toFixed(1), label: rateLabel}),
      detail: savingsRate >= 0.2 ? t('rec.savingsRateDetailHigh', {amount: fmt(Math.round(sav + inv)), income: fmt(Math.round(inc))}) : t('rec.savingsRateDetailLow', {amount: fmt(Math.round(sav + inv)), income: fmt(Math.round(inc))}),
      action: savingsRate >= 0.25 ? t('rec.savingsActionHigh') : t('rec.savingsActionLow'),
      impact: t('rec.savingsImpact', {amount: fmt(Math.round((sav + inv) * 12))}),
    });
  }

  // 5. Insurance cost check
  const krankenkasse = insurance.find(i => i.name.toLowerCase().includes("health insurance") || i.name.toLowerCase().includes("krankenkasse"));
  if (krankenkasse) {
    insights.push({ priority: "low", category: "insurance", icon: "check", title: t('rec.healthInsurance'),
      detail: t('rec.healthDetail', {yearly: fmtD(insMonthlyCalc(krankenkasse)*12)}),
      action: t('rec.healthAction'), impact: t('rec.healthImpact'),
    });
  }

  // 6. Crypto allocation
  const cryptoAcct = accounts.find(a => a.type === "Crypto");
  const investAccts = accounts.filter(a => ["Investment", "Crypto"].includes(a.type));
  const totalInvested = investAccts.reduce((s, a) => s + a.balance, 0);
  if (cryptoAcct && totalInvested > 0) {
    const cryptoPct = (cryptoAcct.balance / totalInvested) * 100;
    if (cryptoPct < 2) {
      insights.push({ priority: "low", category: "investment", icon: "info", title: t('rec.cryptoMinimal'),
        detail: t('rec.cryptoDetail', {pct: cryptoPct.toFixed(1), balance: fmt(cryptoAcct.balance), total: fmt(totalInvested)}),
        action: t('rec.cryptoAction'), impact: t('rec.cryptoImpact'),
      });
    }
  }

  // 7. Wealth tax planning
  if (totalWealth > 50000) {
    insights.push({ priority: "low", category: "tax", icon: "info", title: t('rec.wealthTax'),
      detail: t('rec.wealthTaxDetail', {wealth: fmt(totalWealth)}),
      action: t('rec.wealthTaxAction'), impact: t('rec.wealthTaxImpact'),
    });
  }

  // 8. Debt load & loan interest deduction
  if (debtTotal > 0) {
    const grossAssets = totalWealth + debtTotal;
    const debtRatio = grossAssets > 0 ? debtTotal / grossAssets : 1;
    const priority = debtRatio > 0.5 ? "high" : debtRatio > 0.25 ? "medium" : "low";
    insights.push({ priority, category: "debt", icon: "alert",
      title: t('rec.debtTitle', {amount: fmt(debtTotal), pct: (debtRatio * 100).toFixed(0)}),
      detail: debtRatio > 0.5 ? t('rec.debtDetailHigh') : t('rec.debtDetailLow'),
      action: debtRatio > 0.4 ? t('rec.debtActionHigh') : t('rec.debtActionLow'),
      impact: t('rec.debtImpact'),
    });
  }

  // 9. Withholding tax reclaim (Verrechnungssteuer / DA-1)
  if (totalInvested > 5000) {
    insights.push({ priority: "medium", category: "tax", icon: "tax",
      title: t('rec.withholdingTax'),
      detail: t('rec.withholdingTaxDetail', {amount: fmt(totalInvested)}),
      action: t('rec.withholdingTaxAction'),
      impact: t('rec.withholdingTaxImpact'),
    });
  }

  return insights;
}

// ───────────────────────────────────────────────────────────────
// ACCOUNTS PAGE
// ───────────────────────────────────────────────────────────────
const DEFAULT_EXTRACTION_PROMPT = `You are a financial data extractor. Examine the attached file(s) carefully and extract the data.\n\nRespond with ONLY a raw JSON object — no explanation, no markdown, no code fences, no extra text before or after. Just the JSON.\n\nRequired JSON shape:\n{"accountBalance":null,"interestRate":null,"positions":[{"ticker":"","name":"","shares":0,"avgBuyPrice":0,"value":null}]}\n\nRules:\n- accountBalance: total account/portfolio value as a number, or null if not visible\n- interestRate: annual interest/savings rate as a percentage number (e.g. 1.5 for 1.5%), or null\n- positions: array of holdings. Use [] if none found.\n- ticker: Yahoo Finance symbol if available. Swiss ETFs use .SW suffix (e.g. IWDC.SW, CSSMI.SW, CHSPI.SW, EQQQ.SW, ZSIL.SW, ZGLD.SW, VUSD.SW, VWRL.SW). US stocks: AAPL, MSFT, NVDA, GOOGL, TSLA. Crypto: BTC-USD, ETH-USD. For proprietary tokens (e.g. Swissqoin/SWQ) or funds without a public ticker (e.g. Swiss 3a pillar funds like frankly, VIAC, finpension), leave ticker empty "".\n- name: full fund/product name as shown (e.g. "Developed World (iShares MSCI World CHF Hedged)")\n- shares: exact number of units/shares held as shown — preserve ALL decimal places (e.g. 63.6787, not 63.68). Use 0 only if not shown at all.\n- avgBuyPrice: average purchase price per unit (cost basis). If cost basis is not directly shown but you can see the gain% and current value, CALCULATE it: avgBuyPrice = currentValue / shares / (1 + gainPercent/100). If neither cost basis nor gain data is available, use 0.\n- value: total position value/market value as a number if shown (e.g. CHF 5457.26 → 5457.26), or null. This is especially important when shares/avgBuyPrice are not available.\n- IMPORTANT: Extract data from ALL images/pages. If multiple screenshots show different positions, combine them all into one positions array.`;

function AccountsPage({ accounts, setAccounts, hideBalances, onAccountsUpdated, extractionPrompt, setExtractionPrompt, t }) {
  const mask = (v) => hideBalances ? "••••" : v;
  const winW = useWindowWidth(); const isMobile = winW < 768;
  const editAcct = (id, field, val) => { setAccounts(p => p.map(a => a.id === id ? { ...a, [field]: val } : a)); if (field === 'balance' && onAccountsUpdated) onAccountsUpdated(); };
  const addAcct = () => setAccounts(p => [...p, { id: uid(), name: "New Account", institution: "", type: "Checking", balance: 0, color: C.textDim }]);
  const delAcct = (id) => setAccounts(p => p.filter(a => a.id !== id));

  // ── AI File Import (per account row) ──
  const [importingAcctId, setImportingAcctId] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importSelected, setImportSelected] = useState(new Set());
  const [importMode, setImportMode] = useState('replace'); // 'replace' | 'merge'
  const [extractionPromptOpen, setExtractionPromptOpen] = useState(false);
  const acctImportRef = useRef(null);
  const acctImportTarget = useRef(null);
  useEffect(() => {
    if (importPreview?.data?.positions) setImportSelected(new Set(importPreview.data.positions.map((_,i)=>i)));
  }, [importPreview]);
  const triggerAcctImport = id => { acctImportTarget.current=id; acctImportRef.current?.click(); };
  const handleAcctImport = async e => {
    const files = Array.from(e.target.files||[]);
    if (!files.length||!acctImportTarget.current) return;
    e.target.value='';
    const accountId = acctImportTarget.current; acctImportTarget.current=null;
    if (files.reduce((s,f)=>s+f.size,0)>20*1024*1024) { alert('Files too large (max 20MB total).'); return; }
    setImportingAcctId(accountId);
    try {
      const attachments = [];
      for (const file of files) {
        const isXlsx = /\.(xlsx|xls)$/i.test(file.name);
        let attType=file.type||'application/octet-stream', attName=file.name, attData;
        if (isXlsx) {
          const {read,utils} = await import('xlsx');
          const buf=await file.arrayBuffer(); const wb=read(buf);
          const csv=utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
          attData=btoa(unescape(encodeURIComponent(csv))); attType='text/plain'; attName=attName.replace(/\.(xlsx|xls)$/i,'.csv');
        } else {
          const buf=await file.arrayBuffer(); const bytes=new Uint8Array(buf);
          let bin=''; bytes.forEach(b=>bin+=String.fromCharCode(b)); attData=btoa(bin);
        }
        attachments.push({name:attName,type:attType,data:attData,size:file.size});
      }
      if (!await scanAndConfirmImport(attachments)) { setImportingAcctId(null); return; }
      const account = accounts.find(a=>a.id===accountId);
      const basePrompt = extractionPrompt?.trim() || DEFAULT_EXTRACTION_PROMPT;
      const msg = basePrompt + `\n- Account type hint: ${account?.type}${account?.instructions ? `\n\nAccount-specific instructions: ${account.instructions}` : ''}`;
      const resp = await fetch(`${API_URL}/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,context:{accounts:accounts.map(a=>({name:a.name,type:a.type}))},history:[],attachments})});
      const reader=resp.body.getReader(); const dec=new TextDecoder(); let buf='',fullText='',done=false;
      while(!done){const chunk=await reader.read();done=chunk.done;if(chunk.value)buf+=dec.decode(chunk.value,{stream:true});const lines=buf.split('\n');buf=lines.pop();for(const line of lines){if(!line.startsWith('data: '))continue;const p=line.slice(6);if(p==='[DONE]'){done=true;break;}try{const d=JSON.parse(p);if(d.text)fullText+=d.text;else if(d.error)fullText='API Error: '+d.error;}catch{}}}
      try{
        const cleaned=fullText.replace(/```(?:json)?\s*/gi,'').replace(/```/g,'').trim();
        const m=cleaned.match(/\{[\s\S]*\}/);
        const parsed=m?JSON.parse(m[0]):null;
        setImportPreview({accountId,data:parsed,rawText:parsed?null:fullText||'(empty response — check API key and file size)'});
      }catch{setImportPreview({accountId,data:null,rawText:fullText||'(empty response — check API key and file size)'});}
    } catch(err){alert('Import failed: '+err.message);}
    setImportingAcctId(null);
  };
  const confirmAcctImport = () => {
    if (!importPreview?.data) return;
    const {accountId,data}=importPreview;
    setAccounts(prev=>prev.map(a=>{
      if(a.id!==accountId)return a;
      const updates={lastImported:new Date().toISOString()};
      if(data.accountBalance!=null)updates.balance=data.accountBalance;
      if(data.interestRate!=null)updates.interestRate=data.interestRate;
      const incoming=(data.positions||[]).filter((_,i)=>importSelected.has(i)).filter(p=>p.ticker||p.name).map(p=>({id:uid(),ticker:p.ticker||'',name:p.name||p.ticker||'Unknown',shares:p.shares||0,avgBuyPrice:p.avgBuyPrice||0,...(p.value!=null&&{value:p.value})}));
      if(importMode==='replace'){updates.positions=incoming;}
      else{const existing=[...(a.positions||[])];const matched=new Set();const updated=existing.map(ep=>{const match=incoming.find((ip,i)=>!matched.has(i)&&((ep.ticker&&ip.ticker&&ep.ticker===ip.ticker)||(ep.name&&ip.name&&!ep.ticker&&!ip.ticker&&ep.name===ip.name)));if(match){matched.add(incoming.indexOf(match));return{...ep,shares:match.shares||ep.shares,avgBuyPrice:match.avgBuyPrice||ep.avgBuyPrice,...(match.value!=null&&{value:match.value}),name:match.name||ep.name};}return ep;});const newPos=incoming.filter((_,i)=>!matched.has(i));updates.positions=[...updated,...newPos];}
      return{...a,...updates};
    }));
    setImportPreview(null);
    if (onAccountsUpdated) onAccountsUpdated();
  };

  const [notesOpen, setNotesOpen] = useState(new Set());
  const toggleNotes = id => setNotesOpen(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const totalWealth = accounts.filter(a=>a.type!=="Debt").reduce((s,a)=>s+a.balance,0) - accounts.filter(a=>a.type==="Debt").reduce((s,a)=>s+a.balance,0);
  const ACCT_TYPES = ["Checking","Savings","Investment","Crypto","Pension 2A","Pension 3A","Deposit","Lent Out","Debt"];
  const [sortCol, setSortCol] = useState("institution");
  const [sortDir, setSortDir] = useState(-1);
  const handleSort = col => { if(sortCol===col) setSortDir(d=>d*-1); else { setSortCol(col); setSortDir(1); } };
  const sorted = sortCol ? [...accounts].sort((a,b)=>{
    const av = sortCol==="balance" ? a.balance : (a[sortCol]||"").toLowerCase();
    const bv = sortCol==="balance" ? b.balance : (b[sortCol]||"").toLowerCase();
    return av < bv ? -sortDir : av > bv ? sortDir : 0;
  }) : accounts;
  const SortTH = ({col, children, w}) => {
    const active = sortCol===col;
    return <th onClick={()=>handleSort(col)} style={{padding:"10px 12px",textAlign:"left",fontSize:13,fontWeight:600,color:active?C.accentLight:C.textDim,borderBottom:`1px solid ${C.border}`,textTransform:"uppercase",letterSpacing:0.5,cursor:"pointer",userSelect:"none",width:w}}>
      {children} {active ? (sortDir===1?"↑":"↓") : <span style={{opacity:0.3}}>↕</span>}
    </th>;
  };

  return <div>
    {/* Import modal */}
    {importPreview && <div onClick={()=>setImportPreview(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,width:'100%',maxWidth:1140,maxHeight:'84vh',overflowY:'auto',padding:28,boxShadow:'0 24px 80px rgba(0,0,0,0.6)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <div>
            <h3 style={{margin:'0 0 2px',fontSize:17,fontWeight:700,color:C.text}}>{t('accounts.importPreview', {name: accounts.find(a=>a.id===importPreview.accountId)?.name})}</h3>
            <div style={{fontSize:12,color:C.textDim}}>{t('accounts.importSupported')}</div>
          </div>
          <button onClick={()=>setImportPreview(null)} style={{background:'transparent',border:'none',cursor:'pointer',color:C.textDim}}><X size={18}/></button>
        </div>
        {importPreview.data ? <>
          {importPreview.data.accountBalance!=null && <div style={{marginBottom:10,fontSize:14,color:C.textMuted}}>{t('accounts.detectedBalance')} <strong style={{color:C.text}}>CHF {fmt(importPreview.data.accountBalance)}</strong></div>}
          {importPreview.data.interestRate!=null && <div style={{marginBottom:10,fontSize:14,color:C.textMuted}}>{t('accounts.interestRate')} <strong style={{color:C.green}}>{importPreview.data.interestRate}%</strong></div>}
          {(importPreview.data.positions||[]).length>0 && <>
            <div style={{fontSize:14,color:C.textMuted,marginBottom:8}}>{t('accounts.positionsToImport')}</div>
            <table style={{width:'100%',borderCollapse:'collapse',marginBottom:16,fontSize:12}}>
              <thead><tr>
                {['',t('accounts.ticker'),t('common.name'),t('accounts.shares'),t('accounts.avgBuy'),t('accounts.value')].map((h,i)=><th key={i} style={{padding:'6px 8px',textAlign:i>=3?'right':'left',fontSize:12,color:C.textDim,fontWeight:600,borderBottom:`1px solid ${C.border}`}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {(importPreview.data.positions||[]).map((p,i)=>(
                  <tr key={i} style={{borderBottom:`1px solid ${C.border}22`}}>
                    <td style={{padding:'6px 8px'}}><input type="checkbox" checked={importSelected.has(i)} onChange={e=>{setImportSelected(prev=>{const n=new Set(prev);e.target.checked?n.add(i):n.delete(i);return n;})}}/></td>
                    <td style={{padding:'6px 8px',color:p.ticker?C.accentLight:C.textDim,fontWeight:600}}>{p.ticker||'—'}</td>
                    <td style={{padding:'6px 8px',color:C.text}}>{p.name}</td>
                    <td style={{padding:'6px 8px',textAlign:'right',color:C.text}}>{p.shares||'—'}</td>
                    <td style={{padding:'6px 8px',textAlign:'right',color:C.text}}>{p.avgBuyPrice?`CHF ${p.avgBuyPrice}`:'—'}</td>
                    <td style={{padding:'6px 8px',textAlign:'right',color:p.value?C.green:C.textDim}}>{p.value!=null?`CHF ${fmt(p.value)}`:'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>}
          {(importPreview.data.positions||[]).some(p=>!p.ticker) && !accounts.find(a=>a.id===importPreview.accountId)?.instructions && (
            <div style={{marginBottom:12,padding:'10px 12px',borderRadius:8,background:C.yellow+'15',border:`1px solid ${C.yellow}33`,fontSize:13,color:C.textMuted}}>
              {t('accounts.noTickerWarning')}
              <button onClick={()=>{const acct=accounts.find(a=>a.id===importPreview.accountId);if(acct){const names=(importPreview.data.positions||[]).filter(p=>!p.ticker&&p.name).map(p=>p.name).join(', ');editAcct(acct.id,'instructions',(acct.instructions?acct.instructions+'\n':'')+'Proprietary funds (no market ticker): '+names+'. Use position value as balance.');setNotesOpen(prev=>{const n=new Set(prev);n.add(acct.id);return n;})}}} style={{display:'inline-block',marginLeft:8,padding:'3px 10px',borderRadius:6,border:`1px solid ${C.yellow}55`,background:C.yellow+'22',color:C.text,fontSize:12,fontWeight:600,cursor:'pointer'}}>{t('accounts.autoAddNotes')}</button>
            </div>
          )}
          <div style={{display:'flex',gap:8,justifyContent:'space-between',alignItems:'center'}}>
            <div style={{display:'flex',gap:4,alignItems:'center',fontSize:12}}>
              <button onClick={()=>setImportMode('replace')} style={{padding:'5px 12px',borderRadius:6,border:`1px solid ${importMode==='replace'?C.accent:C.border}`,background:importMode==='replace'?C.accent+'22':'transparent',color:importMode==='replace'?C.accentLight:C.textDim,fontSize:13,fontWeight:importMode==='replace'?600:400,cursor:'pointer'}}>{t('common.replaceAll')}</button>
              <button onClick={()=>setImportMode('merge')} style={{padding:'5px 12px',borderRadius:6,border:`1px solid ${importMode==='merge'?C.accent:C.border}`,background:importMode==='merge'?C.accent+'22':'transparent',color:importMode==='merge'?C.accentLight:C.textDim,fontSize:13,fontWeight:importMode==='merge'?600:400,cursor:'pointer'}}>{t('common.merge')}</button>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setImportPreview(null)} style={{padding:'8px 16px',borderRadius:8,border:`1px solid ${C.border}`,background:'transparent',color:C.textMuted,fontSize:14,cursor:'pointer'}}>{t('common.cancel')}</button>
              <button onClick={confirmAcctImport} style={{padding:'8px 16px',borderRadius:8,border:'none',background:C.accent,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer'}}>{t('accounts.confirmImport')}</button>
            </div>
          </div>
        </> : <>
          <div style={{marginBottom:10,fontSize:14,color:C.textMuted}}>{t('accounts.couldNotParse')}</div>
          <pre style={{background:C.bg,padding:12,borderRadius:8,fontSize:12,color:C.text,overflowX:'auto',maxHeight:300,overflowY:'auto',whiteSpace:'pre-wrap'}}>{importPreview.rawText}</pre>
          <button onClick={()=>setImportPreview(null)} style={{marginTop:12,padding:'8px 16px',borderRadius:8,border:`1px solid ${C.border}`,background:'transparent',color:C.textMuted,fontSize:14,cursor:'pointer'}}>{t('common.close')}</button>
        </>}
      </div>
    </div>}
    <input type="file" ref={acctImportRef} style={{display:'none'}} accept=".csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.webp,.gif" multiple onChange={handleAcctImport}/>

    {extractionPromptOpen && <div onClick={()=>setExtractionPromptOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,width:'100%',maxWidth:1140,maxHeight:'84vh',overflowY:'auto',padding:28,boxShadow:'0 24px 80px rgba(0,0,0,0.6)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
          <h2 style={{margin:0,fontSize:18,fontWeight:700,color:C.text}}>{t('accounts.extractionPromptTitle')}</h2>
          <button onClick={()=>setExtractionPromptOpen(false)} style={{background:'transparent',border:'none',cursor:'pointer',color:C.textDim}}><X size={18}/></button>
        </div>
        <p style={{margin:'0 0 12px',fontSize:13,color:C.textDim}}>
          {t('accounts.extractionPromptDesc')}
        </p>
        <div style={{display:'flex',gap:8,marginBottom:10}}>
          <button onClick={()=>setExtractionPrompt(DEFAULT_EXTRACTION_PROMPT)}
            style={{padding:'6px 12px',borderRadius:6,border:`1px solid ${C.border}`,background:'transparent',color:C.textMuted,fontSize:13,cursor:'pointer'}}>
            {t('common.loadDefault')}
          </button>
          <button onClick={()=>setExtractionPrompt('')}
            style={{padding:'6px 12px',borderRadius:6,border:`1px solid ${C.border}`,background:'transparent',color:C.textMuted,fontSize:13,cursor:'pointer'}}>
            {t('common.resetBlank')}
          </button>
        </div>
        <textarea
          value={extractionPrompt}
          onChange={e=>setExtractionPrompt(e.target.value)}
          placeholder={t('accounts.extractionPromptPlaceholder')}
          rows={28}
          style={{width:'100%',padding:'10px 12px',borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,
            fontSize:13,outline:'none',resize:'vertical',boxSizing:'border-box',fontFamily:"'DM Mono',monospace",lineHeight:1.5}}
        />
        {extractionPrompt && <div style={{marginTop:6,fontSize:12,color:C.green}}>{t('accounts.customPromptActive')}</div>}
        <button onClick={()=>setExtractionPromptOpen(false)} style={{width:'100%',padding:'11px',borderRadius:8,border:'none',background:C.accent,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',marginTop:12}}>
          {t('common.saveClose')}
        </button>
      </div>
    </div>}

    <Card title={t('accounts.title')} headerRight={
      <button onClick={()=>setExtractionPromptOpen(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 10px',borderRadius:6,border:`1px solid ${C.border}`,background:'transparent',cursor:'pointer',color:extractionPrompt?C.accentLight:C.textMuted,fontSize:12}}>
        <Sparkles size={12}/>{t('accounts.extractionPrompt')}{extractionPrompt?' ✓':''}
      </button>
    }>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:isMobile?560:undefined}}><thead><tr>
        <SortTH col="name">{t('accounts.column.name')}</SortTH>
        {!isMobile && <SortTH col="institution">{t('accounts.column.institution')}</SortTH>}
        <SortTH col="type">{t('accounts.column.type')}</SortTH>
        <SortTH col="balance">{t('accounts.column.balance')}</SortTH>
        <TH w={isMobile?60:110}></TH>
      </tr></thead>
      <tbody>{sorted.map(a=>{
        const typeColor = ["Checking"].includes(a.type)?C.accent:["Savings"].includes(a.type)?C.yellow:["Investment","Crypto"].includes(a.type)?C.teal:a.type.includes("Pension")?C.blue:a.type==="Deposit"?C.textDim:a.type==="Lent Out"?C.orange:a.type==="Debt"?C.red:C.textMuted;
        return <React.Fragment key={a.id}>
          <tr onMouseEnter={e=>e.currentTarget.style.background=C.cardHover} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <td style={{padding:"10px 12px",fontSize:14,color:C.text,borderBottom:`1px solid ${C.border}11`}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:8,height:8,borderRadius:4,background:a.color,flexShrink:0}}/><InlineEdit value={a.name} onChange={v=>editAcct(a.id,"name",v)} inputWidth={isMobile?120:160}/></div></td>
          {!isMobile && <td style={{padding:"10px 12px",fontSize:14,color:C.textMuted,borderBottom:`1px solid ${C.border}11`}}><InlineEdit value={a.institution} onChange={v=>editAcct(a.id,"institution",v)} inputWidth={100} style={{color:C.textMuted}}/></td>}
          <td style={{padding:"10px 12px",borderBottom:`1px solid ${C.border}11`}}>
            <select value={a.type} onChange={e=>editAcct(a.id,"type",e.target.value)} style={{padding:"3px 8px",borderRadius:6,border:`1px solid ${typeColor}44`,background:typeColor+"15",color:typeColor,fontSize:12,fontWeight:600,cursor:"pointer",outline:"none",appearance:"auto"}}>
              {ACCT_TYPES.map(at=><option key={at} value={at}>{t(`acctType.${at}`)}</option>)}
            </select>
          </td>
          <td style={{padding:"10px 12px",fontSize:14,textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums",borderBottom:`1px solid ${C.border}11`,color:a.type==="Debt"?C.red:undefined}}>{hideBalances ? <span style={{color:C.textDim}}>••••</span> : <>{a.type==="Debt" && a.balance>0 && <span style={{color:C.red}}>−</span>}<InlineNum value={a.balance} onChange={v=>editAcct(a.id,"balance",v??0)} width={80} style={a.type==="Debt"?{color:C.red}:undefined}/></>}</td>
          <td style={{padding:"8px 12px",borderBottom:`1px solid ${C.border}11`}}>
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <button
                onClick={e=>{e.stopPropagation();if(a.loginUrl){window.open(a.loginUrl,'_blank','noopener');}else{toggleNotes(a.id);}}}
                title={a.loginUrl ? `Open: ${a.loginUrl}` : 'Add login URL'}
                style={{background:'transparent',border:'none',cursor:'pointer',padding:3,display:'flex',alignItems:'center',
                  color:a.loginUrl ? C.accentLight : C.textDim}}>
                <ExternalLink size={13}/>
              </button>
              <button onClick={e=>{e.stopPropagation();toggleNotes(a.id);}}
                title={t('accounts.editNotes')}
                style={{background:'transparent',border:'none',cursor:'pointer',padding:3,display:'flex',alignItems:'center',
                  color:(a.instructions||a.loginUrl) ? C.accentLight : C.textDim}}>
                <MessageSquarePlus size={13}/>
              </button>
              <button onClick={()=>triggerAcctImport(a.id)} disabled={importingAcctId===a.id}
                title="Supported: PNG, JPG, PDF, CSV, XLSX"
                style={{display:'flex',alignItems:'center',gap:4,padding:'4px 8px',borderRadius:6,border:`1px solid ${C.border}`,background:'transparent',cursor:importingAcctId===a.id?'not-allowed':'pointer',color:importingAcctId===a.id?C.textDim:C.textMuted,fontSize:12,whiteSpace:'nowrap'}}>
                {importingAcctId===a.id
                  ? <><RefreshCw size={12} style={{animation:'spin 1s linear infinite'}}/>{t('accounts.parsing')}</>
                  : <><Upload size={12}/>{t('accounts.import')}</>}
              </button>
              <DelBtn onClick={()=>delAcct(a.id)}/>
            </div>
          </td>
        </tr>
        {notesOpen.has(a.id) && <tr key={`${a.id}-notes`}>
          <td colSpan={isMobile?4:5} style={{padding:'0 12px 12px',borderBottom:`1px solid ${C.border}11`}}>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:10}}>
              <div>
                <div style={{fontSize:10,fontWeight:600,color:C.textDim,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:4}}>{t('accounts.loginUrl')}</div>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <input
                    value={a.loginUrl||''}
                    onChange={e=>editAcct(a.id,'loginUrl',e.target.value)}
                    placeholder={t('accounts.loginUrlPlaceholder')}
                    style={{flex:1,padding:'6px 10px',borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,
                      fontSize:13,outline:'none',boxSizing:'border-box',fontFamily:'inherit',minWidth:0}}
                  />
                  {a.loginUrl && <a href={a.loginUrl} target="_blank" rel="noopener noreferrer"
                    style={{display:'flex',alignItems:'center',gap:3,padding:'6px 10px',borderRadius:8,border:`1px solid ${C.accentLight}44`,
                      background:C.accentLight+'15',color:C.accentLight,fontSize:12,fontWeight:600,textDecoration:'none',whiteSpace:'nowrap',flexShrink:0}}>
                    <ExternalLink size={11}/>{t('accounts.open')}
                  </a>}
                </div>
              </div>
              <div>
                <div style={{fontSize:10,fontWeight:600,color:C.textDim,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:4}}>{t('accounts.aiNotes')}</div>
                <textarea
                  value={a.instructions||''}
                  onChange={e=>editAcct(a.id,'instructions',e.target.value)}
                  placeholder={t('accounts.instructionsPlaceholder')}
                  rows={2}
                  style={{width:'100%',padding:'6px 10px',borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,
                    fontSize:13,outline:'none',resize:'vertical',boxSizing:'border-box',fontFamily:'inherit'}}
                />
                <div style={{fontSize:10,color:C.textDim,marginTop:2}}>{t('accounts.aiNotesHint')}</div>
              </div>
            </div>
          </td>
        </tr>}
        </React.Fragment>;
      })}
      <tr style={{background:C.bg}}><td style={{padding:"10px 12px",fontWeight:700}} colSpan={isMobile?2:3}>{t('accounts.total')}</td><td style={{padding:"10px 12px",textAlign:"right",fontWeight:700,fontSize:17,color:C.accent}}>{mask(fmt(totalWealth))}</td><td/></tr>
      <AddRow onClick={addAcct} label={t('accounts.addRow')} colSpan={isMobile?4:5}/>
      </tbody></table></div>
    </Card>
  </div>;
}

// ───────────────────────────────────────────────────────────────
// ONBOARDING CHECKLIST
// ───────────────────────────────────────────────────────────────
function OnboardingChecklist({ accounts, scenarios, subsP, yearly, profile, onboarding, setOnboarding, setPage, setProfileOpen, setPromptOpen, onClearAll, t }) {
  const now = new Date();
  const currentYM = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const toYM = iso => iso ? iso.slice(0, 7) : null;

  const oneTimeSteps = ONBOARDING_STEPS.filter(s => s.type === 'one-time');
  const recurringSteps = ONBOARDING_STEPS.filter(s => s.type === 'recurring');

  const isComplete = (step) => {
    switch (step.id) {
      case 'welcome': return onboarding.welcomeAck === true;
      case 'clearData': return onboarding.dataCleared === true;
      case 'profile': return !!(profile.firstName);
      case 'aiAdviser': return onboarding.aiAdviserAck === true;
      case 'backup': return onboarding.backupDone === true;
      case 'transactions': return onboarding.transactionsAck === true;
      case 'aiSettings': return onboarding.aiSettingsAck === true;
      case 'accounts': return accounts.length >= 1;
      case 'expenses': return subsP.length >= 1 || yearly.length >= 1;
      case 'scenario': return scenarios.length >= 1;
      case 'monthlyBalances': return toYM(onboarding.lastMonthlyUpdate) === currentYM;
      case 'monthlyTracker': return toYM(onboarding.lastTrackerSync) === currentYM;
      default: return false;
    }
  };

  const doneCount = oneTimeSteps.filter(isComplete).length;
  const allOneTimeDone = doneCount === oneTimeSteps.length;
  const allMonthlyDone = recurringSteps.every(isComplete);

  if (onboarding.dismissed && allOneTimeDone && allMonthlyDone) return null;
  if (onboarding.dismissed) return null;

  const handleAction = (step) => {
    switch (step.action) {
      case 'ack':
        if (step.id === 'welcome') setOnboarding(o => ({ ...o, welcomeAck: true }));
        break;
      case 'clear': break;
      case 'profile': setProfileOpen(true); break;
      case 'prompt':
        setPromptOpen(true);
        setOnboarding(o => ({ ...o, aiAdviserAck: true }));
        break;
      case 'accounts': setPage('accounts'); break;
      case 'expenses': setPage('expenses'); break;
      case 'scenarios': setPage('scenarios'); break;
      case 'transactions': setPage('transactions'); setOnboarding(o => ({ ...o, transactionsAck: true })); break;
      case 'ai-settings': setPage('ai-settings'); setOnboarding(o => ({ ...o, aiSettingsAck: true })); break;
      case 'tracker': setPage('tracker'); break;
      case 'backup':
        (async () => {
          try {
            const keys = ['accounts','scenarios','tracker','subscriptions_personal','yearly','taxes','insurance','settings','profile','transactions'];
            const out = {};
            for (const k of keys) { const r = await fetch(`${API_URL}/${k}`); out[k] = r.status === 404 ? null : await r.json(); }
            const ts = new Date().toISOString().slice(0,16).replace('T','_').replace(':','');
            const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:'application/json'})); a.download = `finance_hub_${ts}.json`; a.style.display = 'none'; document.body.appendChild(a); a.click(); URL.revokeObjectURL(a.href); document.body.removeChild(a);
            setOnboarding(o => ({ ...o, backupDone: true }));
          } catch(e) { alert('Backup failed: ' + e.message); }
        })();
        break;
      default: break;
    }
  };

  const progressPct = oneTimeSteps.length > 0 ? (doneCount / oneTimeSteps.length) * 100 : 100;

  return <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, marginBottom: 20 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <BookOpen size={20} color={C.accent} />
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{t('onboarding.title')}</h3>
      </div>
      <button onClick={() => setOnboarding(o => ({ ...o, dismissed: true }))}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.textDim, fontSize: 12 }}>{t('onboarding.dismiss')}</button>
    </div>

    {/* Progress bar */}
    {!allOneTimeDone && <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.textMuted, marginBottom: 6 }}>
        <span>{t('onboarding.progress')}</span>
        <span>{doneCount}/{oneTimeSteps.length} complete</span>
      </div>
      <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: progressPct + '%', background: C.accent, borderRadius: 3, transition: 'width .3s ease' }} />
      </div>
    </div>}

    {/* One-time steps */}
    {!allOneTimeDone && <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: recurringSteps.length ? 20 : 0 }}>
      {oneTimeSteps.map(step => {
        const done = isComplete(step);
        const Icon = step.icon;
        return <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, background: done ? 'transparent' : C.bg, opacity: done ? 0.5 : 1 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: done ? C.green + '22' : C.accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {done ? <Check size={14} color={C.green} /> : <Icon size={14} color={C.accent} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: done ? C.textDim : C.text }}>{t('onboarding.' + step.id)}</span>
              {!done && step.badge === 'import' && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: C.blue + '22', color: C.blue, fontWeight: 600, letterSpacing: 0.3 }}>AI Import</span>}
              {!done && step.badge === 'prompt' && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: C.accentLight + '22', color: C.accentLight, fontWeight: 600, letterSpacing: 0.3 }}>Prompt</span>}
            </div>
            <div style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>{t('onboarding.' + step.id + 'Desc')}</div>
          </div>
          {!done && step.id === 'clearData' ? (
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => { onClearAll && onClearAll('skip'); setOnboarding(o => ({ ...o, dataCleared: true })); }}
                style={{ padding: '5px 14px', borderRadius: 6, border: `1px solid ${C.accent}44`, background: C.accent + '18', color: C.accentLight, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>{ t('common.clear') }</button>
              <button onClick={() => setOnboarding(o => ({ ...o, dataCleared: true }))}
                style={{ padding: '5px 14px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.textDim, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Skip</button>
            </div>
          ) : !done && (
            <button onClick={() => handleAction(step)}
              style={{ padding: '5px 14px', borderRadius: 6, border: `1px solid ${C.accent}44`, background: C.accent + '18', color: C.accentLight, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {step.action === 'ack' ? t('onboarding.gotIt') : step.action === 'prompt' ? t('onboarding.review') : step.action === 'backup' ? t('onboarding.download') : t('onboarding.go')}
            </button>
          )}
        </div>;
      })}
    </div>}

    {/* Monthly tasks */}
    {(allOneTimeDone || recurringSteps.some(s => !isComplete(s))) && <div>
      {!allOneTimeDone && <div style={{ borderTop: `1px solid ${C.border}`, marginBottom: 12 }} />}
      <div style={{ fontSize: 13, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>{ t('onboarding.monthlyTasks') }</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {recurringSteps.map(step => {
          const done = isComplete(step);
          const Icon = step.icon;
          return <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, background: done ? 'transparent' : C.bg, opacity: done ? 0.5 : 1 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: done ? C.green + '22' : C.orange + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {done ? <Check size={14} color={C.green} /> : <Icon size={14} color={C.orange} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: done ? C.textDim : C.text }}>{t('onboarding.' + step.id)}</div>
              <div style={{ fontSize: 12, color: C.textDim, marginTop: 1 }}>{t('onboarding.' + step.id + 'Desc')}</div>
            </div>
            {!done && <button onClick={() => handleAction(step)}
              style={{ padding: '5px 14px', borderRadius: 6, border: `1px solid ${C.orange}44`, background: C.orange + '18', color: C.orange, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {t('onboarding.go')}
            </button>}
          </div>;
        })}
      </div>
    </div>}
  </div>;
}

// DASHBOARD
// ───────────────────────────────────────────────────────────────
function Dashboard({ accounts, scenarios, subsP, subsPInScenario, yearly, taxes, insurance, profile, hideBalances, setChatOpen, setChatInput, notesVersion, t }) {
  const mask = (v) => hideBalances ? "••••" : v;
  const winW = useWindowWidth(); const isMobile = winW < 768;
  const debtTotal = accounts.filter(a => a.type === "Debt").reduce((s,a)=>s+a.balance,0);
  const totalAssets = accounts.filter(a => a.type !== "Debt").reduce((s, a) => s + a.balance, 0);
  const totalWealth = totalAssets - debtTotal;
  const liquidTypes = ["Checking","Savings","Investment","Crypto"];
  const lockedTypes = ["Pension 2A","Pension 3A","Deposit"];
  const liquidTotal = accounts.filter(a => liquidTypes.includes(a.type)).reduce((s,a)=>s+a.balance,0);
  const lockedTotal = accounts.filter(a => lockedTypes.includes(a.type)).reduce((s,a)=>s+a.balance,0);
  const loanTotal = accounts.filter(a => a.type === "Lent Out").reduce((s,a)=>s+a.balance,0);
  const liquidPct = totalAssets > 0 ? ((liquidTotal / totalAssets) * 100).toFixed(0) : 0;
  const lockedPct = totalAssets > 0 ? ((lockedTotal / totalAssets) * 100).toFixed(0) : 0;
  const debtPct = totalAssets > 0 ? ((debtTotal / totalAssets) * 100).toFixed(0) : 0;

  const sc = scenarios.find(s=>s.isActive);
  const getA = (item) => item.pct != null ? +(sc ? sc.incomes.reduce((s,x)=>s+x.amount,0) : 0) * item.pct / 100 : item.amount;
  const sumA = (arr) => arr ? arr.reduce((s,x)=>s+getA(x),0) : 0;
  const inc0 = sc ? sc.incomes.reduce((s,x)=>s+x.amount,0) : 0;

  // Linked expenses totals
  const linkedSubsP = subsPInScenario ? subsP.reduce((s,x)=>s+subMonthly(x),0) : 0;
  const linkedRecurring = yearly.reduce((s,e)=>s+recMonthly(e),0);
  const linkedInsurance = insurance.reduce((s,p)=>s+insMonthlyCalc(p),0);
  const latestTax = taxes[taxes.length-1];
  const linkedTax = latestTax ? latestTax.lines.reduce((s,l)=>s+l.amount,0)/12 : 0;
  const linkedTotal = linkedSubsP + linkedRecurring + linkedInsurance + linkedTax;

  const inc = inc0;
  // Apply active scenario's linkedOverrides to linked totals
  const ov = sc?.linkedOverrides || {};
  const effLinked = (key, raw) => ov[key] != null ? ov[key] : raw;
  const linkedTotalEff = effLinked('subsP', linkedSubsP) + effLinked('recurring', linkedRecurring) + effLinked('insurance', linkedInsurance) + effLinked('tax', linkedTax);
  const expManual = sc ? sumA(sc.expenses) : 0;
  const essentialExpenses = sc ? sc.expenses.filter(e=>e.essential!==false).reduce((s,x)=>s+getA(x),0) : 0;
  const essentialSavings = sc ? sc.savings.filter(e=>e.essential!==false).reduce((s,x)=>s+getA(x),0) : 0;
  const essentialTotal = essentialExpenses + linkedTotalEff + essentialSavings;
  const exp = expManual + linkedTotalEff;
  const sav = sc?sumA(sc.savings):0, inv = sc?sumA(sc.investments):0;
  const rem = Math.round(inc - exp - sav - inv);
  const survivalMonths = essentialTotal > 0 ? Math.floor(liquidTotal / essentialTotal) : 0;

  const pieData = accounts.filter(a=>a.balance>0 && a.type !== "Debt").map(a=>({name:a.name,value:a.balance}));

  const insights = useMemo(() => generateInsights({
    accounts, scenarios, insurance, inc, exp, sav, inv, liquidTotal, lockedTotal, totalWealth, debtTotal, t,
  }), [accounts, scenarios, insurance, inc, exp, sav, inv, liquidTotal, lockedTotal, totalWealth, debtTotal, t]);

  return <div>
    {/* Net Worth headline with liquid/locked bar */}
    <Card style={{marginBottom:24,padding:"24px 28px"}}>
      <div style={{display:"flex",alignItems:isMobile?"flex-start":"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:isMobile?12:0}}>
        <div>
          <div style={{fontSize:14,color:C.textMuted,marginBottom:4}}>{t('dashboard.netWorth')}{debtTotal>0&&<span style={{fontSize:11,color:C.textDim,marginLeft:6}}>{t('dashboard.netWorthSub')}</span>}</div>
          <div style={{fontSize:isMobile?24:32,fontWeight:700,color:totalWealth>=0?C.text:C.red}}>CHF {mask(fmt(totalWealth))}</div>
        </div>
        <div style={{display:"flex",gap:isMobile?16:24,alignItems:"flex-end",flexWrap:"wrap"}}>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:12,color:C.textDim,marginBottom:2}}>{t('dashboard.liquid')}</div>
            <div style={{fontSize:20,fontWeight:700,color:C.green}}>CHF {mask(fmt(liquidTotal))}</div>
            <div style={{fontSize:12,color:C.textDim}}>{liquidPct}{t('dashboard.liquidPct')}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:12,color:C.textDim,marginBottom:2}}>{t('dashboard.lockedPensionDeposit')}</div>
            <div style={{fontSize:20,fontWeight:700,color:C.blue}}>CHF {mask(fmt(lockedTotal))}</div>
            <div style={{fontSize:12,color:C.textDim}}>{lockedPct}{t('dashboard.liquidPct')}</div>
          </div>
          {loanTotal > 0 && <div style={{textAlign:"right"}}>
            <div style={{fontSize:12,color:C.textDim,marginBottom:2}}>{t('dashboard.lentOut')}</div>
            <div style={{fontSize:20,fontWeight:700,color:C.orange}}>CHF {mask(fmt(loanTotal))}</div>
            <div style={{fontSize:12,color:C.textDim}}>{totalAssets>0?((loanTotal/totalAssets)*100).toFixed(0):0}{t('dashboard.pctOfAssets')}</div>
          </div>}
          {debtTotal > 0 && <div style={{textAlign:"right"}}>
            <div style={{fontSize:12,color:C.textDim,marginBottom:2}}>{t('dashboard.debt')}</div>
            <div style={{fontSize:20,fontWeight:700,color:C.red}}>−CHF {mask(fmt(debtTotal))}</div>
            <div style={{fontSize:12,color:C.textDim}}>{totalAssets>0?((debtTotal/totalAssets)*100).toFixed(0):0}{t('dashboard.pctOfAssets')}</div>
          </div>}
        </div>
      </div>
      {/* Stacked bar showing composition */}
      <div style={{display:"flex",height:8,borderRadius:4,overflow:"hidden",background:C.border}}>
        {liquidTotal > 0 && <div style={{width:`${liquidPct}%`,background:C.green,transition:"width .3s"}} title={`${t('dashboard.composition.liquid')}: CHF ${fmt(liquidTotal)}`}/>}
        {lockedTotal > 0 && <div style={{width:`${lockedPct}%`,background:C.blue,transition:"width .3s"}} title={`${t('dashboard.composition.locked')}: CHF ${fmt(lockedTotal)}`}/>}
        {loanTotal > 0 && <div style={{width:`${totalAssets>0?((loanTotal/totalAssets)*100).toFixed(0):0}%`,background:C.orange,transition:"width .3s"}} title={`${t('dashboard.composition.lentOut')}: CHF ${fmt(loanTotal)}`}/>}
        {debtTotal > 0 && <div style={{width:`${debtPct}%`,background:C.red,transition:"width .3s"}} title={`${t('dashboard.composition.debt')}: CHF ${fmt(debtTotal)}`}/>}
      </div>
      <div style={{display:"flex",gap:16,marginTop:8}}>
        <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.textDim}}><div style={{width:8,height:8,borderRadius:2,background:C.green}}/>{t('dashboard.composition.liquid')}</div>
        <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.textDim}}><div style={{width:8,height:8,borderRadius:2,background:C.blue}}/>{t('dashboard.composition.locked')}</div>
        {loanTotal > 0 && <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.textDim}}><div style={{width:8,height:8,borderRadius:2,background:C.orange}}/>{t('dashboard.composition.lentOut')}</div>}
        {debtTotal > 0 && <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.textDim}}><div style={{width:8,height:8,borderRadius:2,background:C.red}}/>{t('dashboard.composition.debt')}</div>}
      </div>
    </Card>

    {/* Row 1: Income & Scenario overview */}
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16, marginBottom:16 }}>
      <StatCard label={t('dashboard.totalMonthlyIncome')} value={`CHF ${mask(fmt(Math.round(inc)))}`} sub={sc?t('dashboard.from',{name:sc.name}):t('dashboard.noActiveScenario')} icon={DollarSign} color={C.green}/>
      <StatCard label={t('dashboard.savingsRate')} value={inc>0?`${Math.round((sav+inv)/inc*100)}%`:"—"} sub={inc>0?`CHF ${mask(fmt(Math.round(sav+inv)))}${t('dashboard.moSaved')}`:t('dashboard.noActiveScenario')} icon={PiggyBank} color={C.teal}/>
      <StatCard label={t('dashboard.activeScenario')} value={sc?sc.name:"None"} sub={sc?`${sc.incomes.length} ${t('dashboard.incomes')} · ${sc.expenses.length} ${t('dashboard.expensesCount')}`:t('dashboard.setScenarioActive')} icon={Activity} color={C.accent}/>
    </div>

    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16, marginBottom:24 }}>
      <StatCard label={t('dashboard.monthlySavingsInvest')} value={`CHF ${mask(fmt(Math.round(sav+inv)))}`} sub={sc?t('dashboard.from',{name:sc.name}):t('dashboard.noActiveScenario')} icon={TrendingUp} color={C.teal}/>
      <StatCard label={t('dashboard.monthlyFixedCosts')} value={`CHF ${mask(fmt(Math.round(essentialTotal)))}`} sub={sc?t('dashboard.fixedCostsSub'):t('dashboard.noActiveScenario')} icon={CreditCard} color={C.red}/>
      {sc ? (() => {
        const allocated = rem === 0;
        const over = rem < 0;
        const subText = allocated ? t('dashboard.zeroBudget') : over ? t('dashboard.exceedsIncome') : `${inc>0?((inc-rem)/inc*100).toFixed(1):0}${t('dashboard.allocated')}`;
        return <StatCard label={t('dashboard.unallocated')} value={`CHF ${mask(fmt(Math.abs(rem)))}${over?` ${t('dashboard.over')}`:""}`} sub={subText} icon={Target} color={C.yellow}/>;
      })() : <StatCard label={t('dashboard.unallocated')} value="—" sub={t('dashboard.noActiveScenario')} icon={Target} color={C.yellow}/>}
      <StatCard label={t('dashboard.survivalRunway')} value={sc?`${survivalMonths} ${t('dashboard.months')}`:"—"} sub={sc?t('dashboard.survivalSub',{liquid:mask(fmt(liquidTotal)),monthly:mask(fmt(Math.round(essentialTotal)))}):t('dashboard.noActiveScenario')} icon={Shield} color={survivalMonths>=6?C.green:survivalMonths>=3?C.yellow:C.red} iconColor={C.cyan}/>
      <StatCard label={t('dashboard.taxInsurance')} value={`CHF ${mask(fmt(Math.round(linkedTax+linkedInsurance)))}${t('common.mo')}`} sub={`CHF ${mask(fmt(Math.round((linkedTax+linkedInsurance)*12)))}${t('common.yr')}`} icon={ShieldCheck} color={C.red}/>
    </div>

    <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(auto-fit,minmax(300px,1fr))", gap:16, marginBottom:24 }}>
      <Card title={t('dashboard.portfolioBreakdown')}>
        <ResponsiveContainer width="100%" height={isMobile?200:280}><PieChart><Pie data={pieData} cx="50%" cy="50%" outerRadius={100} innerRadius={55} dataKey="value" paddingAngle={2} stroke="none">{pieData.map((_,i)=><Cell key={i} fill={pieColors()[i%pieColors().length]}/>)}</Pie><Tooltip formatter={v=>`CHF ${fmt(v)}`} contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13}} labelStyle={{color:C.textMuted}} itemStyle={{color:C.text}}/></PieChart></ResponsiveContainer>
        {pieData.map((d,i)=>{const total=pieData.reduce((s,x)=>s+x.value,0); return <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"5px 0",borderBottom:i<pieData.length-1?`1px solid ${C.border}22`:"none"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:10,height:10,borderRadius:3,background:pieColors()[i%pieColors().length],flexShrink:0}}/><span style={{fontSize:13,color:C.textMuted}}>{d.name}</span></div>
          <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:13,fontWeight:600,color:C.text,fontVariantNumeric:"tabular-nums"}}>CHF {mask(fmt(d.value))}</span><span style={{fontSize:12,color:C.textDim,width:40,textAlign:"right"}}>{total>0?(d.value/total*100).toFixed(1):0}%</span></div>
        </div>})}
      </Card>
      <Card title={t('dashboard.monthlyCashflow')} subtitle={sc?`${t('dashboard.active')}: ${sc.name}`:t('dashboard.noScenario')}>
        {sc && <>
          <ResponsiveContainer width="100%" height={200}><BarChart data={[{name:t('dashboard.income'),value:inc,fill:C.green},{name:t('dashboard.expenses'),value:exp,fill:C.red},{name:t('dashboard.savingsLabel'),value:sav,fill:C.blue},{name:t('dashboard.investmentsLabel'),value:inv,fill:C.teal}]} layout="vertical" margin={{left:80}}><XAxis type="number" tick={{fill:C.textDim,fontSize:11}} tickFormatter={v=>hideBalances?"•••":fmt(v)}/><YAxis type="category" dataKey="name" tick={{fill:C.textMuted,fontSize:12}} width={80}/><Tooltip formatter={v=>`CHF ${fmt(v)}`} contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13}} labelStyle={{color:C.textMuted}} itemStyle={{color:C.text}}/><Bar dataKey="value" radius={[0,6,6,0]}>{[C.green,C.red,C.blue,C.teal].map((c,i)=><Cell key={i} fill={c}/>)}</Bar></BarChart></ResponsiveContainer>
          <div style={{marginTop:12,padding:"12px 16px",background:C.bg,borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13}}><span style={{color:C.textMuted}}>{t('dashboard.unallocated')}</span><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{color:rem===0?C.green:rem<0?C.red:C.yellow,fontWeight:600}}>CHF {mask(fmt(rem))}</span>{rem===0&&<Check size={12} color={C.green}/>}</div></div>
        </>}
      </Card>
    </div>

    {/* Smart Recommendations */}
    <Card headerRight={<Badge color={C.cyan}>{t('dashboard.ruleBased')}</Badge>}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <div style={{width:36,height:36,borderRadius:10,background:C.cyan+"1a",display:"flex",alignItems:"center",justifyContent:"center"}}><Sparkles size={20} color={C.cyan}/></div>
        <div>
          <h3 style={{margin:0,fontSize:17,fontWeight:700,color:C.text}}>{t('dashboard.smartRecommendations')}</h3>
          <p style={{margin:0,fontSize:13,color:C.textDim}}>{t('dashboard.recommendationsSub')}</p>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fit,minmax(280px,1fr))",gap:12}}>
        {[...insights].sort((a,b)=>({high:0,medium:1,low:2}[a.priority]??3)-({high:0,medium:1,low:2}[b.priority]??3)).map((ins,i) => {
          const Icon = INSIGHT_ICONS[ins.icon] || Lightbulb;
          const prioColor = PRIORITY_COLORS[ins.priority];
          return <div key={i} style={{padding:"16px 18px",borderRadius:10,border:`1px solid ${C.border}`,background:C.bg,position:"relative"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <div style={{width:28,height:28,borderRadius:7,background:prioColor+"1a",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon size={15} color={prioColor}/></div>
              <div style={{flex:1}}>
                <span style={{fontSize:14,fontWeight:600,color:C.text}}>{ins.title}</span>
                <div style={{display:"flex",gap:4,marginTop:2}}><Badge color={prioColor}>{t('dashboard.priority.'+ins.priority)}</Badge><Badge color={C.textDim}>{t('dashboard.cat.'+ins.category)}</Badge></div>
              </div>
            </div>
            <p style={{fontSize:13,color:C.textMuted,lineHeight:1.6,margin:"0 0 10px"}}>{ins.detail}</p>
            {ins.impact && <div style={{fontSize:12,color:C.green,fontWeight:600,marginBottom:6}}>{ins.impact}</div>}
            <div style={{fontSize:13,color:C.cyan,display:"flex",alignItems:"center",gap:4}}><ArrowUpRight size={12}/>{ins.action}</div>
          </div>;
        })}
      </div>
    </Card>

    {/* AI Adviser */}
    <Card style={{marginTop:16}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{width:36,height:36,borderRadius:10,background:C.accent+"1a",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Sparkles size={20} color={C.accentLight}/></div>
        <div>
          <h3 style={{margin:0,fontSize:17,fontWeight:700,color:C.text}}>{t('dashboard.aiAdvisor')}</h3>
          <p style={{margin:0,fontSize:13,color:C.textDim}}>{t('dashboard.aiAdvisorSub')}</p>
        </div>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
        {[
          { q: t('dashboard.q1'), color: C.accent },
          { q: t('dashboard.q2'), color: C.teal },
          { q: t('dashboard.q3'), color: C.yellow },
          { q: t('dashboard.q4'), color: C.red },
          { q: t('dashboard.q5'), color: C.orange },
          { q: t('dashboard.q6'), color: C.green },
        ].map(({ q, color }) => (
          <button key={q} onClick={() => { setChatInput && setChatInput(q); setChatOpen && setChatOpen(true); }}
            style={{padding:"10px 16px",borderRadius:8,border:`1px solid ${color}44`,background:color+'18',color,fontSize:14,cursor:"pointer",textAlign:"left",lineHeight:1.4}}>
            {q}
          </button>
        ))}
      </div>
    </Card>
    <PinnedNotes version={notesVersion} t={t}/>
  </div>;
}

function renderInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, (_, m) => `<strong style="color:${C.text}">${m}</strong>`)
    .replace(/`(.+?)`/g, (_, m) => `<code style="background:${C.border};padding:1px 6px;border-radius:3px;font-size:11px;color:${C.text}">${m}</code>`);
}

function MarkdownBlock({ text }) {
  const lines = text.split('\n');
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Table detection
    if (line.trim().startsWith('|') && i + 1 < lines.length && lines[i+1].trim().startsWith('|---')) {
      const headerCells = line.split('|').filter((_,idx,a)=>idx>0&&idx<a.length-1).map(c=>c.trim());
      i += 2; // skip header + separator
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i].split('|').filter((_,idx,a)=>idx>0&&idx<a.length-1).map(c=>c.trim()));
        i++;
      }
      elements.push(
        <div key={i} style={{overflowX:'auto',marginBottom:12,marginTop:8}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr style={{borderBottom:`2px solid ${C.border}`}}>
                {headerCells.map((h,hi)=><th key={hi} style={{padding:'6px 12px',textAlign:'left',fontSize:12,fontWeight:700,color:C.textDim,textTransform:'uppercase',letterSpacing:0.5,whiteSpace:'nowrap'}}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row,ri)=>(
                <tr key={ri} style={{borderBottom:`1px solid ${C.border}22`,background:ri%2===0?'transparent':C.bg}}>
                  {row.map((cell,ci)=><td key={ci} style={{padding:'7px 12px',color:C.text,lineHeight:1.5}} dangerouslySetInnerHTML={{__html:renderInline(cell)}}/>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }
    // Horizontal rule
    if (line.trim() === '---' || line.trim() === '***') {
      elements.push(<hr key={i} style={{border:'none',borderTop:`1px solid ${C.border}33`,margin:'16px 0'}}/>);
      i++; continue;
    }
    // H1
    if (line.startsWith('# ')) {
      elements.push(<div key={i} style={{fontSize:17,fontWeight:700,color:C.text,marginTop:18,marginBottom:8}} dangerouslySetInnerHTML={{__html:renderInline(line.slice(2))}}/>);
      i++; continue;
    }
    // H2
    if (line.startsWith('## ')) {
      elements.push(<div key={i} style={{fontSize:14,fontWeight:700,color:C.text,marginTop:16,marginBottom:6,paddingBottom:4,borderBottom:`1px solid ${C.border}33`}} dangerouslySetInnerHTML={{__html:renderInline(line.slice(3))}}/>);
      i++; continue;
    }
    // H3
    if (line.startsWith('### ')) {
      elements.push(<div key={i} style={{fontSize:14,fontWeight:700,color:C.accentLight,marginTop:12,marginBottom:4}} dangerouslySetInnerHTML={{__html:renderInline(line.slice(4))}}/>);
      i++; continue;
    }
    // Bullet
    if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
      const content = line.replace(/^[-*•]\s+/,'');
      elements.push(
        <div key={i} style={{display:'flex',gap:8,fontSize:14,color:C.textMuted,lineHeight:1.7,marginBottom:2,marginLeft:8}}>
          <span style={{color:C.accent,flexShrink:0}}>•</span>
          <span dangerouslySetInnerHTML={{__html:renderInline(content)}}/>
        </div>
      );
      i++; continue;
    }
    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)[1];
      const content = line.replace(/^\d+\.\s*/,'');
      elements.push(
        <div key={i} style={{display:'flex',gap:8,fontSize:14,color:C.textMuted,lineHeight:1.7,marginBottom:2,marginLeft:8}}>
          <span style={{color:C.accent,flexShrink:0,minWidth:18}}>{num}.</span>
          <span dangerouslySetInnerHTML={{__html:renderInline(content)}}/>
        </div>
      );
      i++; continue;
    }
    // Empty line
    if (!line.trim()) {
      elements.push(<div key={i} style={{height:6}}/>);
      i++; continue;
    }
    // Normal paragraph
    elements.push(<div key={i} style={{fontSize:14,color:C.textMuted,lineHeight:1.7,marginBottom:2}} dangerouslySetInnerHTML={{__html:renderInline(line)}}/>);
    i++;
  }
  return <>{elements}</>;
}

const getNoteColors = () => [
  { bg: C.greenBg, border: C.green + "44", accent: C.green },
  { bg: C.blueBg, border: C.blue + "44", accent: C.accentLight },
  { bg: "rgba(168,85,247,0.1)", border: "#a855f744", accent: "#a855f7" },
  { bg: C.orangeBg, border: C.yellow + "44", accent: C.yellow },
  { bg: C.redBg, border: C.red + "44", accent: C.red },
];

function extractTitle(text) {
  const headingLine = text.split('\n').find(l => l.startsWith('# ') || l.startsWith('## ') || l.startsWith('🔥'));
  if (headingLine) return headingLine.replace(/^#+\s*/, '').replace(/🔥\s*/, '').slice(0, 60);
  return text.slice(0, 60).replace(/\n/g, ' ');
}

function PinnedNotes({ version = 0, t = k=>k }) {
  const [notes, setNotes] = useState([]);
  const [open, setOpen] = useState(null); // id of expanded note
  const [confirmDel, setConfirmDel] = useState(null); // id of note pending delete confirmation

  useEffect(() => {
    fetch(`${API_URL}/ai_analysis`)
      .then(r => r.status === 404 ? null : r.json())
      .then(d => { if (Array.isArray(d)) setNotes(d); else if (d && d.text) setNotes([d]); })
      .catch(() => {});
  }, [version]);

  const deleteNote = async (id) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    if (open === id) setOpen(null);
    setConfirmDel(null);
    await fetch(`${API_URL}/ai_analysis`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(updated) });
  };

  if (!notes.length) return null;

  const openNote = notes.find(n => n.id === open);

  return <>
    {/* Modal overlay */}
    {openNote && <div onClick={()=>setOpen(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,width:'100%',maxWidth:1140,height:'84vh',display:'flex',flexDirection:'column',boxShadow:'0 24px 80px rgba(0,0,0,0.6)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:`1px solid ${C.border}`}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <Pin size={14}/>
            <span style={{fontSize:17,fontWeight:700,color:C.text}}>{extractTitle(openNote.text)}</span>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            {openNote.savedAt && <span style={{fontSize:12,color:C.textDim}}>{new Date(openNote.savedAt).toLocaleDateString('de-CH')}</span>}
            {confirmDel===openNote.id
              ? <div style={{display:'flex',gap:4,alignItems:'center'}}><span style={{fontSize:10,color:C.textDim}}>Delete?</span><button onClick={()=>deleteNote(openNote.id)} style={{padding:'3px 8px',borderRadius:4,border:'none',background:C.red,color:'#fff',fontSize:10,cursor:'pointer'}}>Yes</button><button onClick={()=>setConfirmDel(null)} style={{padding:'3px 8px',borderRadius:4,border:`1px solid ${C.border}`,background:'transparent',color:C.textDim,fontSize:10,cursor:'pointer'}}>No</button></div>
              : <button onClick={()=>setConfirmDel(openNote.id)} style={{background:'transparent',border:`1px solid ${C.border}`,borderRadius:6,padding:'4px 10px',color:C.red,fontSize:12,cursor:'pointer'}}>Delete</button>}
            <button onClick={()=>setOpen(null)} style={{background:'transparent',border:'none',cursor:'pointer',color:C.textDim}}><X size={18}/></button>
          </div>
        </div>
        <div style={{overflowY:'auto',padding:'20px 24px'}}>
          <MarkdownBlock text={openNote.text}/>
        </div>
      </div>
    </div>}

    {/* Post-it grid */}
    <div style={{marginBottom:24}}>
      <div style={{fontSize:13,color:C.textDim,marginBottom:10,marginTop:24,display:'flex',alignItems:'center',gap:6}}>
        <Pin size={14}/> {t('dashboard.pinnedAnalyses')}
      </div>
      <div style={{display:'flex',flexWrap:'wrap',gap:12}}>
        {notes.map((note, ni) => {
          const col = getNoteColors()[ni % getNoteColors().length];
          const title = extractTitle(note.text);
          const preview = note.text.replace(/#{1,3}\s+/g,'').replace(/\*\*/g,'').replace(/\|[^\n]+\|/g,'[table]').trim().slice(0, 120);
          const date = note.savedAt ? new Date(note.savedAt).toLocaleDateString('de-CH') : '';
          return <div key={note.id} onClick={()=>setOpen(note.id)}
            style={{width:200,height:150,background:col.bg,border:`1px solid ${col.border}`,borderRadius:10,padding:'12px 14px',cursor:'pointer',position:'relative',flexShrink:0,transition:'transform .15s,box-shadow .15s'}}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow=`0 8px 24px rgba(0,0,0,0.4)`;}}
            onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none';}}>
            {confirmDel===note.id
              ? <div onClick={ev=>ev.stopPropagation()} style={{position:'absolute',top:4,right:4,display:'flex',alignItems:'center',gap:3,background:C.card,borderRadius:6,padding:'2px 4px',border:`1px solid ${C.border}`}}>
                  <span style={{fontSize:9,color:C.textDim}}>Delete?</span>
                  <button onClick={()=>deleteNote(note.id)} style={{padding:'1px 5px',borderRadius:3,border:'none',background:C.red,color:'#fff',fontSize:9,cursor:'pointer'}}>Yes</button>
                  <button onClick={()=>setConfirmDel(null)} style={{padding:'1px 5px',borderRadius:3,border:`1px solid ${C.border}`,background:'transparent',color:C.textDim,fontSize:9,cursor:'pointer'}}>No</button>
                </div>
              : <button onClick={ev=>{ev.stopPropagation();setConfirmDel(note.id);}} style={{position:'absolute',top:6,right:6,background:'transparent',border:'none',cursor:'pointer',color:C.textDim,opacity:0.5,padding:2}}><X size={11}/></button>}
            <div style={{fontSize:12,fontWeight:700,color:col.accent,marginBottom:6,paddingRight:16,lineHeight:1.3}}>{title}</div>
            <div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:5,WebkitBoxOrient:'vertical'}}>{preview}</div>
            {date && <div style={{position:'absolute',bottom:8,right:10,fontSize:10,color:C.textDim}}>{date}</div>}
          </div>;
        })}
      </div>
    </div>
  </>;
}

function AiWealthCard({ accounts, scenarios, yearly, taxes, insurance, subsP, profile }) {
  const [messages, setMessages] = useState([]); // {role, content, attachmentName?}
  const [history, setHistory] = useState([]);   // API history {role, content}
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [saved, setSaved] = useState(false);
  const [extraContext, setExtraContext] = useState("");
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [aiProvider, setAiProvider] = useState({ label: '…', description: 'Loading…' });
  const fileRef = useRef(null);

  useEffect(() => {
    fetch(`${API_URL}/provider`).then(r => r.json()).then(d => setAiProvider(d)).catch(() => {});
  }, []);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const started = messages.length > 0;

  useEffect(() => { if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  const handleFile = (e) => {
    const f = e.target.files[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = () => setAttachment({ name:f.name, type:f.type, data:reader.result.split(',')[1], size:f.size });
    reader.readAsDataURL(f);
    e.target.value='';
  };

  const buildContext = () => {
    const sc = scenarios.find(s=>s.isActive);
    const debtTotal = accounts.filter(a=>a.type==="Debt").reduce((s,a)=>s+a.balance,0);
    const totalWealth = accounts.filter(a=>a.type!=="Debt").reduce((s,a)=>s+a.balance,0) - debtTotal;
    const liquidTypes = ["Checking","Savings","Investment","Crypto"];
    const liquidTotal = accounts.filter(a=>liquidTypes.includes(a.type)).reduce((s,a)=>s+a.balance,0);
    const getA = (item) => item.pct != null ? (sc ? sc.incomes.reduce((s,x)=>s+x.amount,0) * item.pct / 100 : 0) : item.amount;
    const inc = sc ? sc.incomes.reduce((s,x)=>s+x.amount,0) : 0;
    const exp = sc ? sc.expenses.reduce((s,x)=>s+getA(x),0) : 0;
    const sav = sc ? sc.savings.reduce((s,x)=>s+getA(x),0) : 0;
    const inv = sc ? sc.investments.reduce((s,x)=>s+getA(x),0) : 0;
    const essentialCosts = sc ? sc.expenses.filter(e=>e.essential!==false).reduce((s,x)=>s+getA(x),0) + sc.savings.filter(e=>e.essential!==false).reduce((s,x)=>s+getA(x),0) : 0;
    const latestTax = taxes[taxes.length-1];
    const ov = sc?.linkedOverrides || {};
    const effL = (key, raw) => ov[key] != null ? ov[key] : raw;
    const rawLinkedSubsP = subsPInScenario ? subsP.reduce((s,x)=>s+subMonthly(x),0) : 0;
    const rawLinkedRecurring = yearly.reduce((s,e)=>s+recMonthly(e),0);
    const rawLinkedInsurance = insurance.reduce((s,p)=>s+insMonthlyCalc(p),0);
    const rawLinkedTax = latestTax ? latestTax.lines.reduce((s,l)=>s+l.amount,0)/12 : 0;
    const linkedSubsP = effL('subsP', rawLinkedSubsP);
    const linkedRecurring = effL('recurring', rawLinkedRecurring);
    const linkedInsurance = effL('insurance', rawLinkedInsurance);
    const linkedTax = effL('tax', rawLinkedTax);
    const linkedTotal = linkedSubsP + linkedRecurring + linkedInsurance + linkedTax;
    return { today: new Date().toISOString().slice(0, 10),
      totalWealth, liquidTotal, lockedTotal: totalWealth - liquidTotal,
      survivalMonths: essentialCosts > 0 ? Math.floor(liquidTotal / essentialCosts) : 0,
      activeScenario: sc ? {
        name: sc.name,
        incomes:     (sc.incomes||[]).map(x => ({ label: x.label, amount: Math.round(getA(x)||0) })),
        expenses:    (sc.expenses||[]).map(x => ({ label: x.label, amount: Math.round(getA(x)||0), essential: x.essential !== false })),
        savings:     (sc.savings||[]).map(x => ({ label: x.label, amount: Math.round(getA(x)||0) })),
        investments: (sc.investments||[]).map(x => ({ label: x.label, amount: Math.round(getA(x)||0) })),
        provisions: {
          subscriptions: Math.round(linkedSubsP),
          recurring: Math.round(linkedRecurring),
          insurance: Math.round(linkedInsurance),
          tax: Math.round(linkedTax),
          total: Math.round(linkedTotal),
          note: 'Linked external expenses — part of total monthly outflow',
        },
        totals: { income: Math.round(inc), expenses: Math.round(exp), provisions: Math.round(linkedTotal), savings: Math.round(sav), investments: Math.round(inv), unallocated: Math.round(inc - exp - linkedTotal - sav - inv) },
      } : null,
      accounts: accounts.map(a=>({name:a.name,type:a.type,balance:a.balance})),
      subscriptions: subsP.map(x => ({ name: x.name, monthly: Math.round(subMonthly(x)) })),
      yearlyExpenses: yearly,
      insurance: insurance.map(i => ({ name: i.name, insurer: i.insurer || '', monthly: Math.round(insMonthlyCalc(i)) })),
      latestTaxYear: latestTax ? { year: latestTax.year, total: latestTax.lines.reduce((s,l)=>s+l.amount,0) } : null,
      _profile: profile || null,
    };
  };

  const friendlyError = (raw) => {
    if (!raw) return "Unknown error from AI service.";
    if (raw.includes("credit balance is too low") || raw.includes("insufficient_balance")) return "[!] Anthropic API credits exhausted. Go to console.anthropic.com → Plans & Billing to top up.";
    if (raw.includes("ANTHROPIC_API_KEY not configured")) return "[!] API key not set. Add ANTHROPIC_API_KEY to your .env file and restart.";
    if (raw.includes("401") || raw.includes("authentication")) return "[!] Invalid API key. Check your ANTHROPIC_API_KEY in .env.";
    if (raw.includes("529") || raw.includes("overloaded")) return "[!] Anthropic API is overloaded right now. Try again in a minute.";
    if (raw.includes("rate_limit") || raw.includes("429")) return "[!] Rate limit hit. Wait a moment and try again.";
    return "[!] AI error: " + raw.replace(/^AI service error:\s*/,"").slice(0, 200);
  };

  const stream = async (userMsg, msgHistory, sentAttachment) => {
    setLoading(true); setStatusMsg("Thinking...");
    setMessages(prev => [...prev, { role:"assistant", content:"" }]);
    try {
      const resp = await fetch(`${API_URL}/chat`, { method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ message: userMsg, context: buildContext(), history: msgHistory, ...(sentAttachment ? {attachment:sentAttachment} : {}) }) });
      if (!resp.ok) { const t = await resp.text(); setMessages(prev => { const u=[...prev]; u[u.length-1]={...u[u.length-1],content:friendlyError(t)}; return u; }); setLoading(false); setStatusMsg(""); return; }
      const reader = resp.body.getReader(); const decoder = new TextDecoder(); let buf = ""; let full = "";
      while(true) {
        const {done, value} = await reader.read(); if(done) break;
        buf += decoder.decode(value, {stream:true});
        const lines = buf.split("\n"); buf = lines.pop();
        for(const line of lines) {
          if(!line.startsWith("data: ")) continue;
          const d = line.slice(6); if(d==="[DONE]") break;
          try { const {text, error, status} = JSON.parse(d);
            if(status) { setStatusMsg(status); }
            if(error){ setMessages(prev => { const u=[...prev]; u[u.length-1]={...u[u.length-1],content:friendlyError(error)}; return u; }); setStatusMsg(""); break; }
            if(text){ setStatusMsg(""); full+=text; setMessages(prev => { const u=[...prev]; u[u.length-1]={...u[u.length-1],content:u[u.length-1].content+text}; return u; }); }
          } catch{}
        }
      }
      setHistory(prev => [...prev, {role:"user",content:userMsg}, {role:"assistant",content:full}]);
    } catch(e) { setMessages(prev => { const u=[...prev]; u[u.length-1]={...u[u.length-1],content:"[!] Cannot reach the API server. Make sure Docker is running (`make docker-up`)."}; return u; }); }
    setLoading(false); setStatusMsg("");
  };

  const runAnalysis = () => {
    const prompt = `Give me a concise but ambitious wealth-building analysis and action plan based on my current financial situation. Cover:
1. Where I stand today (net worth, savings rate, runway)
2. My realistic path to financial independence — with actual numbers and timeline
3. The top 3 highest-impact actions I should take RIGHT NOW
4. What Hungerbuehler Digital needs to generate to accelerate my FIRE timeline significantly
Use web search if helpful for current Swiss rates, ETF benchmarks, or relevant opportunities. Be direct and specific — no generic advice.${extraContext.trim() ? `\n\n## Additional Context\n${extraContext.trim()}` : ''}`;
    const sentAttachment = attachment; setAttachment(null);
    setMessages([{ role:"user", content: "▶ Run FIRE Analysis" + (extraContext.trim() ? ` (+ context)` : ""), attachmentName: sentAttachment?.name }]);
    setHistory([]);
    stream(prompt, [], sentAttachment);
  };

  const sendFollowUp = () => {
    if (!input.trim() || loading) return;
    const msg = input.trim(); setInput("");
    const sentAttachment = attachment; setAttachment(null);
    setMessages(prev => [...prev, { role:"user", content:msg, attachmentName: sentAttachment?.name }]);
    stream(msg, history, sentAttachment);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const pinLastResponse = async () => {
    const lastAssistant = [...messages].reverse().find(m => m.role === "assistant" && m.content && !m.content.startsWith("[!]"));
    if (!lastAssistant) return;
    const existing = await fetch(`${API_URL}/ai_analysis`).then(r => r.status === 404 ? [] : r.json()).catch(()=>[]);
    const list = Array.isArray(existing) ? existing : (existing && existing.text ? [existing] : []);
    await fetch(`${API_URL}/ai_analysis`, { method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify([...list, { id:`note-${Date.now()}`, text: lastAssistant.content, savedAt: new Date().toISOString() }]) });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const newSession = () => { setMessages([]); setHistory([]); setExtraContext(""); setInput(""); setAttachment(null); };

  return <Card style={{marginTop:16}} headerRight={
    <div style={{display:"flex",gap:8,alignItems:"center"}}>
      {started && <button onClick={newSession} style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.textDim,fontSize:12,cursor:"pointer"}}>↺ New Session</button>}
      {started && <button onClick={pinLastResponse} style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:saved?C.green:C.textDim,fontSize:12,cursor:"pointer"}}>{saved?"✓ Pinned":<><Pin size={11} style={{marginRight:2}}/> Pin</>}</button>}
      <Badge color={C.accent}>{aiProvider.label}</Badge>
    </div>
  }>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
      <div style={{width:36,height:36,borderRadius:10,background:C.accent+"1a",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Sparkles size={20} color={C.accentLight}/></div>
      <div><h3 style={{margin:0,fontSize:17,fontWeight:700,color:C.text}}>AI Wealth Analysis</h3>
        <p style={{margin:0,fontSize:13,color:C.textDim}}>{aiProvider.description}</p></div>
    </div>

    {/* Messages */}
    {started && <div ref={scrollRef} style={{maxHeight:440,overflowY:"auto",padding:"8px 0",marginBottom:12,borderTop:`1px solid ${C.border}22`,borderBottom:`1px solid ${C.border}22`}}>
      {messages.map((m,i) => <div key={i} style={{marginBottom:12}}>
        {m.role==="user"
          ? <div style={{display:"flex",justifyContent:"flex-end"}}>
              <div style={{maxWidth:"80%",padding:"8px 12px",borderRadius:"10px 10px 2px 10px",background:C.accent+"22",fontSize:13,color:C.accentLight}}>
                {m.attachmentName && <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:4,fontSize:11}}><Paperclip size={10}/>{m.attachmentName}</div>}
                {m.content}
              </div>
            </div>
          : <div style={{fontSize:13}}>
              {!m.content && loading && i===messages.length-1
                ? <AiThinking status={statusMsg}/>
                : <><MarkdownBlock text={m.content}/>{loading && i===messages.length-1 && m.content && <AiThinking status={statusMsg||'Generating...'}/>}</>}
            </div>}
      </div>)}
    </div>}

    {/* Start or follow-up */}
    {!started ? <>
      <textarea value={extraContext} onChange={e=>setExtraContext(e.target.value)} placeholder="Optional: add business status, deals in progress, upcoming income…" rows={2} disabled={loading} style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:13,lineHeight:1.6,resize:"vertical",outline:"none",marginBottom:6,boxSizing:"border-box",fontFamily:"inherit"}}/>
      <input type="file" ref={fileRef} onChange={handleFile} accept="image/*,.pdf,.txt,.csv,.md,.json" style={{display:"none"}}/>
      {attachment && <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6,fontSize:12}}>
        <Paperclip size={12} color={C.accent}/><span style={{color:C.accentLight}}>{attachment.name}</span>
        <button onClick={()=>setAttachment(null)} style={{background:"transparent",border:"none",cursor:"pointer",color:C.textDim,padding:0}}><X size={12}/></button>
      </div>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button onClick={()=>fileRef.current?.click()} style={{padding:"8px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:attachment?C.accent:C.textDim,cursor:"pointer",display:"flex"}}><Paperclip size={14}/></button>
        <button onClick={runAnalysis} style={{padding:"9px 20px",borderRadius:8,border:`1px solid ${C.accent}`,background:C.accent+"18",color:C.accentLight,fontSize:14,fontWeight:600,cursor:"pointer"}}>▶ Run Analysis</button>
      </div>
    </> : <>
      <input type="file" ref={fileRef} onChange={handleFile} accept="image/*,.pdf,.txt,.csv,.md,.json" style={{display:"none"}}/>
      {attachment && <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6,fontSize:12}}>
        <Paperclip size={12} color={C.accent}/><span style={{color:C.accentLight}}>{attachment.name}</span>
        <button onClick={()=>setAttachment(null)} style={{background:"transparent",border:"none",cursor:"pointer",color:C.textDim,padding:0}}><X size={12}/></button>
      </div>}
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <button onClick={()=>fileRef.current?.click()} style={{padding:"8px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:attachment?C.accent:C.textDim,cursor:"pointer",display:"flex",flexShrink:0}}><Paperclip size={14}/></button>
        <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendFollowUp();}}} placeholder="Ask a follow-up question…" disabled={loading} style={{flex:1,padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:14,outline:"none"}}/>
        <button onClick={sendFollowUp} disabled={loading||!input.trim()} style={{padding:"9px 14px",borderRadius:8,border:"none",background:loading||!input.trim()?C.border:C.accent,color:loading||!input.trim()?C.textDim:"#fff",fontSize:14,fontWeight:600,cursor:loading||!input.trim()?"not-allowed":"pointer",flexShrink:0}}>{loading?"…":"Send"}</button>
      </div>
    </>}
  </Card>;
}

// ───────────────────────────────────────────────────────────────
// SCENARIOS — fully editable
// ───────────────────────────────────────────────────────────────
function ScenarioDelBtn({ onDelete }) {
  const [conf, setConf] = useState(false);
  return conf
    ? <div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:6,right:6,display:"flex",alignItems:"center",gap:3}}>
        <span style={{fontSize:10,color:C.textDim}}>Delete?</span>
        <button onClick={onDelete} style={{padding:"1px 5px",borderRadius:3,border:"none",background:C.red,color:"#fff",fontSize:10,cursor:"pointer"}}>Yes</button>
        <button onClick={()=>setConf(false)} style={{padding:"1px 5px",borderRadius:3,border:`1px solid ${C.border}`,background:"transparent",color:C.textDim,fontSize:10,cursor:"pointer"}}>No</button>
      </div>
    : <button onClick={e=>{e.stopPropagation();setConf(true);}} style={{position:"absolute",top:8,right:6,background:"transparent",border:"none",cursor:"pointer",color:C.textDim,padding:2}}><Trash2 size={14}/></button>;
}

const DEFAULT_PAYROLL_PROMPT = `You are a payroll data extractor for Swiss salary slips. Examine the attached payroll document(s) and extract structured data to populate a monthly budget scenario.\n\nRespond with ONLY a raw JSON object — no explanation, no markdown, no code fences. Just the JSON.\n\nRequired JSON shape:\n{"scenarioName":"","incomes":[{"label":"","amount":0,"notes":""}],"expenses":[{"label":"","pct":null,"amount":0,"essential":true,"notes":""}],"savings":[{"label":"","pct":null,"amount":0,"essential":true,"liq":"locked","notes":""}],"investments":[]}\n\nRules:\n- scenarioName: employer name + pay period (e.g. "Red Hat – Feb 2026", "Tecan – Dec 2018")\n- incomes: base monthly salary as one item. Label with employer name. Use the GROSS / pre-deduction salary amount.\n- expenses: mandatory Swiss payroll deductions — AHV, ALV, UVG/UVGZ, KTG, ESPP. Use positive amounts.\n  - Label clearly: "AHV (Social Security)", "ALV (Unemployment)", "UVG (Accident Ins.)", "KTG (Loss of Salary Ins.)", "ESPP"\n  - essential: true for statutory deductions (AHV, ALV, UVG, KTG), false for voluntary (ESPP)\n  - PERCENTAGE RULE: if the payslip shows a rate % for a deduction, set pct to that number (e.g. 5.3) and amount to the calculated CHF value. If no rate is shown, set pct to null and amount to the CHF amount.\n  - notes: format as "<employer> – <rate>% of gross" when a rate is shown (e.g. "Red Hat – 5.300% of gross"), otherwise just the employer name\n  - If ESPP appears as both "in" and "out" that net to zero, omit it\n- savings: BVG/PK/PP pension employee contribution → label "BVG / Pension (2nd Pillar)", liq: "locked", essential: true\n  - PERCENTAGE RULE: same as expenses — set pct if a rate % is shown, else null\n  - notes: format as "<employer> – <rate>% of gross" when rate is shown\n- investments: always []\n- All amounts are monthly in CHF. Annual figures must be divided by 12.`;

function ScenariosPage({ scenarios, setScenarios, subsP, subsPInScenario, yearly, taxes, insurance, hideBalances, darkMode, payrollExtractionPrompt, setPayrollExtractionPrompt, t }) {
  const mask = (v) => hideBalances ? "••••" : v;
  const winW = useWindowWidth(); const isMobile = winW < 768;
  const [selId, setSelId] = useState(()=>scenarios.find(s=>s.isActive)?.id || scenarios[0]?.id);
  const [addingTag, setAddingTag] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [linkedExpanded, setLinkedExpanded] = useState(new Set());
  const [payrollImporting, setPayrollImporting] = useState(false);
  const [payrollPreview, setPayrollPreview] = useState(null);
  const [payrollImportMode, setPayrollImportMode] = useState('new');
  const [payrollPromptOpen, setPayrollPromptOpen] = useState(false);
  const payrollImportRef = useRef(null);
  const sc = scenarios.find(s=>s.id===selId) ?? scenarios.find(s=>s.isActive) ?? scenarios[0];
  const update = (id, fn) => setScenarios(prev=>prev.map(s=>s.id===id?fn({...s}):s));

  if (!sc) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"60vh",gap:16,color:C.textDim}}>
      <ClipboardList size={48} color={C.textDim}/>
      <div style={{fontSize:18,fontWeight:600,color:C.text}}>{t('scenarios.empty')}</div>
      <div style={{fontSize:14}}>{t('scenarios.emptySub')}</div>
      <button onClick={()=>{ const n={id:uid(),name:t('scenarios.newScenario'),tags:[],isActive:true,incomes:[],expenses:[],savings:[],investments:[],linkedOverrides:{}}; setScenarios([n]); setSelId(n.id); }} style={{padding:"10px 20px",borderRadius:8,background:C.accent,color:"#fff",border:"none",cursor:"pointer",fontSize:14,fontWeight:600}}>{t('scenarios.addScenario')}</button>
    </div>
  );

  const sum = arr=>arr.reduce((s,x)=>s+x.amount,0);
  const incRaw = sum(sc.incomes);
  const getAmt = (item) => item.pct != null ? +(incRaw * item.pct / 100).toFixed(2) : item.amount;
  const sumSec = (arr) => arr.reduce((s,x)=>s+getAmt(x),0);
  const inc=incRaw, exp=sumSec(sc.expenses), sav=sumSec(sc.savings), inv=sumSec(sc.investments);

  // Linked expenses from Expenses page by category
  const linkedSubsP = subsPInScenario ? subsP.reduce((s,x)=>s+subMonthly(x),0) : 0;
  const linkedRecurring = yearly.reduce((s,e)=>s+recMonthly(e),0);
  const linkedInsurance = insurance.reduce((s,p)=>s+insMonthlyCalc(p),0);
  const latestTax = taxes[taxes.length-1];
  const taxTotal = latestTax ? latestTax.lines.reduce((s,l)=>s+l.amount,0) : 0;
  const linkedTax = taxTotal/12;
  const freqLabel = f => f===1?t('common.perMo'):f===4?t('common.perQt'):f===12?t('common.perYr'):`/${f}`;
  const linkedCategories = [
    subsPInScenario && {key:"subsP", label:"Subscriptions", icon:CreditCard, color:C.accent, amount:linkedSubsP, items:subsP.map(s=>({name:s.name,monthly:subMonthly(s),notes:s.notes,freq:s.frequency||1,total:s.amount||((s.monthly||0)+(s.yearly||0))}))},
    {key:"recurring", label:"Recurring", icon:DollarSign, color:C.cyan, amount:linkedRecurring, items:yearly.map(e=>({name:e.name,monthly:recMonthly(e),notes:e.notes,freq:e.frequency||12,total:e.amount||(e.yearly||e.monthly*12||0)}))},
    {key:"insurance", label:"Insurances", icon:Shield, color:C.green, amount:linkedInsurance, items:insurance.map(p=>({name:p.name,monthly:insMonthlyCalc(p),notes:p.notes,freq:p.frequency||12,total:p.amount||(p.yearly||0)}))},
    {key:"tax", label:"Tax Provision", icon:BarChart3, color:C.red, amount:linkedTax, items:latestTax?[{name:"Tax Provision (est.)",monthly:linkedTax,freq:12,total:taxTotal}]:[]},
  ].filter(Boolean);
  const overrides = sc.linkedOverrides || {};
  const setOverride = (key, val) => update(sc.id, s => { s.linkedOverrides = {...(s.linkedOverrides||{}), [key]: val}; return s; });
  const linkedCategoriesWithOverride = linkedCategories.map(c => ({
    ...c,
    calc: c.amount,
    amount: overrides[c.key] != null ? overrides[c.key] : c.amount,
  }));
  const linkedTotal = linkedCategoriesWithOverride.reduce((s,c)=>s+c.amount,0);
  const linkedCalcTotal = linkedCategoriesWithOverride.reduce((s,c)=>s+c.calc,0);

  const totalExp = exp + linkedTotal;
  const rem = inc - totalExp - sav - inv;
  const flow=[{name:t('scenarios.expenses'),value:Math.max(0,totalExp),pct:totalExp/inc,color:C.red},{name:t('scenarios.savings'),value:Math.max(0,sav),pct:sav/inc,color:C.blue},{name:t('scenarios.investments'),value:Math.max(0,inv),pct:inv/inc,color:C.teal},{name:t('scenarios.unallocated'),value:Math.max(0,rem),pct:rem/inc,color:C.yellow}];

  const handlePayrollImport = async e => {
    const files = Array.from(e.target.files||[]);
    if (!files.length) return;
    e.target.value='';
    if (files.reduce((s,f)=>s+f.size,0)>20*1024*1024) { alert('Files too large (max 20MB total).'); return; }
    setPayrollImporting(true);
    try {
      const attachments = [];
      for (const file of files) {
        const buf=await file.arrayBuffer(); const bytes=new Uint8Array(buf);
        let bin=''; bytes.forEach(b=>bin+=String.fromCharCode(b));
        attachments.push({name:file.name,type:file.type||'application/octet-stream',data:btoa(bin),size:file.size});
      }
      if (!await scanAndConfirmImport(attachments)) { setPayrollImporting(false); return; }
      const basePrompt = payrollExtractionPrompt?.trim() || DEFAULT_PAYROLL_PROMPT;
      const resp = await fetch(`${API_URL}/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:basePrompt,context:{},history:[],attachments})});
      const reader=resp.body.getReader(); const dec=new TextDecoder(); let buf='',fullText='',done=false;
      while(!done){const chunk=await reader.read();done=chunk.done;if(chunk.value)buf+=dec.decode(chunk.value,{stream:true});const lines=buf.split('\n');buf=lines.pop();for(const line of lines){if(!line.startsWith('data: '))continue;const p=line.slice(6);if(p==='[DONE]'){done=true;break;}try{const d=JSON.parse(p);if(d.text)fullText+=d.text;else if(d.error)fullText='API Error: '+d.error;}catch{}}}
      try{
        const cleaned=fullText.replace(/```(?:json)?\s*/gi,'').replace(/```/g,'').trim();
        const m=cleaned.match(/\{[\s\S]*\}/);
        const parsed=m?JSON.parse(m[0]):null;
        setPayrollPreview({data:parsed,rawText:parsed?null:fullText||'(empty response — check API key and file size)'});
      }catch{setPayrollPreview({data:null,rawText:fullText||'(empty response — check API key and file size)'});}
    } catch(err){alert('Import failed: '+err.message);}
    setPayrollImporting(false);
  };

  const confirmPayrollImport = () => {
    if (!payrollPreview?.data) return;
    const d = payrollPreview.data;
    const mkLine = (item) => ({id:uid(), label:item.label||'Item', amount:item.amount||0, ...(item.pct!=null&&{pct:item.pct}), notes:item.notes||'', ...(item.essential!=null&&{essential:item.essential}), ...(item.liq&&{liq:item.liq})});
    if (payrollImportMode==='new') {
      const n = {
        id:uid(), name:d.scenarioName||'Imported Payroll', tags:[], isActive:false,
        incomes:(d.incomes||[]).map(mkLine),
        expenses:(d.expenses||[]).map(mkLine),
        savings:(d.savings||[]).map(mkLine),
        investments:(d.investments||[]).map(mkLine),
        linkedOverrides:{}
      };
      setScenarios(p=>[...p,n]);
      setSelId(n.id);
    } else {
      update(sc.id, s => {
        s.incomes=[...s.incomes,...(d.incomes||[]).map(mkLine)];
        s.expenses=[...s.expenses,...(d.expenses||[]).map(mkLine)];
        s.savings=[...s.savings,...(d.savings||[]).map(mkLine)];
        s.investments=[...s.investments,...(d.investments||[]).map(mkLine)];
        return s;
      });
    }
    setPayrollPreview(null);
  };

  const addLine = (section) => update(sc.id, s => { const item = { id:uid(), label:"New item", amount:0, notes:"" }; if(section==="savings"||section==="investments") item.liq="liquid"; if(section==="expenses"||section==="savings") item.essential=true; s[section] = [...s[section], item]; return s; });
  const removeLine = (section, lid) => update(sc.id, s => { s[section] = s[section].filter(l=>l.id!==lid); return s; });
  const editLine = (section, lid, field, val) => update(sc.id, s => { s[section] = s[section].map(l=>l.id===lid?{...l,[field]:val}:l); return s; });
  const togglePct = (section, lid) => update(sc.id, s => { s[section] = s[section].map(l => { if(l.id!==lid) return l; if(l.pct!=null){ const {pct:_, ...rest}=l; return {...rest, amount:+(inc*l.pct/100).toFixed(2)}; } else { return {...l, pct: inc>0 ? +((l.amount/inc)*100).toFixed(3) : 0}; } }); return s; });
  const addScenario = () => { const n = { id:uid(), name:t('scenarios.newScenario'), tags:[], isActive:false, incomes:[], expenses:[], savings:[], investments:[], linkedOverrides:{} }; setScenarios(p=>[...p,n]); setSelId(n.id); };
  const duplicateScenario = () => { const dup = JSON.parse(JSON.stringify(sc)); dup.id=uid(); dup.name=sc.name+" (copy)"; dup.isActive=false; dup.incomes.forEach(l=>l.id=uid()); dup.expenses.forEach(l=>l.id=uid()); dup.savings.forEach(l=>l.id=uid()); dup.investments.forEach(l=>l.id=uid()); setScenarios(p=>[...p,dup]); setSelId(dup.id); };
  const deleteScenario = (id) => {
    const remaining = scenarios.filter(s=>s.id!==id);
    setScenarios(remaining);
    if(selId===id) setSelId(remaining.find(s=>s.isActive)?.id ?? remaining[0]?.id);
  };
  const exportPDF = () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210, M = 18, CW = W - 2 * M;
    const fmtC = (n) => "CHF " + Math.round(n).toLocaleString("de-CH").replace(/[^\d\-]/g, "'");
    const safe = (s) => s.replace(/[^\x20-\x7E]/g, c => ({ "\u2013": "-", "\u2014": "-", "\u2019": "'", "\u2018": "'", "\u201C": '"', "\u201D": '"', "\u00E4": "ae", "\u00F6": "oe", "\u00FC": "ue", "\u00C4": "Ae", "\u00D6": "Oe", "\u00DC": "Ue" }[c] || "-"));
    let y = 20;

    // Colors — adapt to current theme
    const dark    = darkMode ? [15,17,23]      : [245,245,247];
    const cardBg  = darkMode ? [26,29,39]      : [255,255,255];
    const accent  = [37,99,235];
    const green   = darkMode ? [34,197,94]     : [22,163,74];
    const red     = darkMode ? [239,68,68]     : [220,38,38];
    const blue    = darkMode ? [59,130,246]    : [37,99,235];
    const teal    = darkMode ? [20,184,166]    : [13,148,136];
    const yellow  = darkMode ? [234,179,8]     : [202,138,4];
    const textCol   = darkMode ? [228,228,231] : [26,26,46];
    const textMuted = darkMode ? [161,161,170] : [82,82,91];
    const textDim   = darkMode ? [113,113,122] : [161,161,170];
    const border    = darkMode ? [42,46,58]    : [224,224,228];

    // Background
    doc.setFillColor(...dark);
    doc.rect(0, 0, W, 297, "F");

    // Header bar
    doc.setFillColor(...accent);
    doc.rect(0, 0, W, 32, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(safe(sc.name), M, 14);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 220, 255);
    const today = new Date();
    doc.text(`Generated ${today.toLocaleDateString("de-CH")} | ${sc.isActive ? "Active Scenario" : "Scenario"}`, M, 22);
    doc.text("Finance Hub", W - M, 14, { align: "right" });
    y = 40;

    // Helper: draw a section
    const drawSection = (title, color, totalLabel, total, items, sign) => {
      const h = 14 + items.length * 5 + 2;
      // Card background
      doc.setFillColor(...cardBg);
      doc.roundedRect(M - 2, y - 2, CW + 4, h, 3, 3, "F");
      // Color bar
      doc.setFillColor(...color);
      doc.rect(M - 2, y - 2, 2.5, h, "F");
      // Title + total
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...color);
      doc.text(title, M + 4, y + 5);
      doc.setFontSize(9);
      doc.text(totalLabel + " " + fmtC(total), W - M - 2, y + 5, { align: "right" });
      // Items
      let iy = y + 12;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      items.forEach(item => {
        doc.setTextColor(...textMuted);
        doc.text(`${sign} ${safe(item.label)}`, M + 5, iy);
        doc.setTextColor(...textCol);
        doc.text(fmtC(item.amount), W - M - 2, iy, { align: "right" });
        if (item.note) {
          doc.setTextColor(...textDim);
          doc.setFontSize(7);
          doc.text(item.note, W - M - 28, iy, { align: "right" });
          doc.setFontSize(9);
        }
        if (item.comments) {
          const labelW = doc.getTextWidth(`${sign} ${safe(item.label)}`);
          doc.setTextColor(...textDim);
          doc.setFontSize(7);
          doc.setFont("helvetica", "italic");
          doc.text(safe(item.comments), M + 5 + labelW + 3, iy);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
        }
        iy += 5;
      });
      y = y + h + 4;
    };

    // Prepare item arrays
    const incomeItems = sc.incomes.filter(e => e.amount > 0).map(e => ({ label: e.label, amount: e.amount, note: e.pct != null ? `${e.pct.toFixed(2)}%` : null, comments: e.notes || null }));
    const expenseItems = sc.expenses.filter(e => (e.pct != null ? getAmt(e) : e.amount) > 0).map(e => ({ label: e.label, amount: e.pct != null ? getAmt(e) : e.amount, note: e.pct != null ? `${e.pct.toFixed(2)}%` : null, comments: e.notes || null }));
    const linkedItems = linkedCategoriesWithOverride.filter(c => c.amount > 0).map(c => ({ label: c.label, amount: c.amount, note: overrides[c.key] != null ? `(need: ${fmtC(c.calc)})` : null }));
    const savingsItems = sc.savings.filter(e => (e.pct != null ? getAmt(e) : e.amount) > 0).map(e => ({ label: e.label, amount: e.pct != null ? getAmt(e) : e.amount, note: e.pct != null ? `${e.pct.toFixed(2)}%` : null, comments: e.notes || null }));
    const investItems = sc.investments.filter(e => (e.pct != null ? getAmt(e) : e.amount) > 0).map(e => ({ label: e.label, amount: e.pct != null ? getAmt(e) : e.amount, comments: e.notes || null }));

    // --- SECTIONS ---
    drawSection(t('pdf.income'), green, "+", inc, incomeItems, "+");
    drawSection(t('pdf.expenses'), red, "-", exp, expenseItems, "-");
    drawSection(t('pdf.provisions'), red, "-", linkedTotal, linkedItems, "-");
    drawSection(t('pdf.savings'), blue, ">", sav, savingsItems, ">");
    drawSection(t('pdf.investments'), teal, ">", inv, investItems, ">");

    // --- SUMMARY BAR ---
    doc.setFillColor(...cardBg);
    doc.roundedRect(M - 2, y, CW + 4, 18, 3, 3, "F");
    doc.setFillColor(...border);
    doc.rect(M, y + 1, CW, 0.3, "F");
    const summaryY = y + 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const remCol = rem >= 0 ? yellow : red;
    doc.setTextColor(...remCol);
    doc.text(t('pdf.unallocated'), M + 4, summaryY);
    doc.text(fmtC(rem), W - M - 2, summaryY, { align: "right" });

    // Breakdown line
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...textDim);
    const breakdown = `${fmtC(inc)} - ${fmtC(exp)} - ${fmtC(linkedTotal)} - ${fmtC(sav)} - ${fmtC(inv)} = ${fmtC(rem)}`;
    doc.text(breakdown, W - M - 2, summaryY + 6, { align: "right" });

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(...textDim);
    doc.text("Finance Hub - Scenario Export", M, 290);
    doc.text(today.toLocaleDateString("de-CH") + " " + today.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" }), W - M, 290, { align: "right" });

    const filename = `${sc.name.replace(/[^a-zA-Z0-9]/g, "_")}_${today.toISOString().slice(0,10)}.pdf`;
    const dataUri = doc.output("datauristring");
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(`<!DOCTYPE html><html><head><title>${filename}</title><style>*{margin:0;padding:0}body{background:#222}iframe{width:100%;height:100vh;border:none}</style></head><body><iframe src="${dataUri}"></iframe></body></html>`);
      w.document.close();
    }
  };

  const toggleActive = (id) => setScenarios(prev=>prev.map(s=>({...s, isActive: s.id===id ? !s.isActive : false })));
  const addTag = () => setAddingTag(true);
  const confirmTag = () => { if(newTag.trim()) update(sc.id, s=>{s.tags=[...s.tags,newTag.trim()]; return s;}); setNewTag(""); setAddingTag(false); };
  const cancelTag = () => { setNewTag(""); setAddingTag(false); };
  const removeTag = (tag) => update(sc.id, s=>{s.tags=s.tags.filter(t=>t!==tag); return s;});

  const allSavInv = [...sc.savings, ...sc.investments];
  const liqTotal = allSavInv.filter(i=>(i.liq||"liquid")==="liquid").reduce((s,x)=>s+getAmt(x),0);
  const lockTotal = allSavInv.filter(i=>i.liq==="locked").reduce((s,x)=>s+getAmt(x),0);

  const Section = ({title, section, color}) => (
    <div style={{marginBottom:20}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <div style={{width:4,height:20,borderRadius:2,background:color}}/>
        <h4 style={{margin:0,fontSize:14,fontWeight:600,color:C.text}}>{title}</h4>
        <span style={{fontSize:14,color:C.textMuted,marginLeft:"auto"}}>CHF {mask(fmtD(sumSec(sc[section])))}</span>
      </div>
      <table style={{width:"100%",borderCollapse:"collapse"}}><tbody>
        {sc[section].map(item=>{
          const isPct = item.pct != null;
          const computed = isPct ? +(inc * item.pct / 100).toFixed(2) : item.amount;
          return (
          <tr key={item.id} onMouseEnter={e=>e.currentTarget.querySelector('.del-btn')&&(e.currentTarget.querySelector('.del-btn').style.opacity=1)} onMouseLeave={e=>e.currentTarget.querySelector('.del-btn')&&(e.currentTarget.querySelector('.del-btn').style.opacity=0)}>
            <td style={{padding:"7px 12px",fontSize:14,color:C.text,borderBottom:`1px solid ${C.border}11`,width:"30%"}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span className="del-btn" style={{opacity:0,transition:"opacity .15s"}}><DelBtn onClick={()=>removeLine(section,item.id)}/></span>
                <InlineEdit value={item.label} onChange={v=>editLine(section,item.id,"label",v)} inputWidth={140}/>
              </div>
            </td>
            <td style={{padding:"7px 12px",fontSize:13,color:C.textDim,borderBottom:`1px solid ${C.border}11`}}><InlineEdit value={item.notes||""} onChange={v=>editLine(section,item.id,"notes",v)} placeholder={t('scenarios.notesPlaceholder')} style={{color:C.textDim}} inputWidth={100}/></td>
            <td style={{padding:"7px 12px",fontSize:14,textAlign:"right",fontVariantNumeric:"tabular-nums",borderBottom:`1px solid ${C.border}11`}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:5}}>
                {isPct && <InlineNum value={item.pct} onChange={v=>editLine(section,item.id,"pct",v??0)} width={50} style={{fontSize:12,color:C.accent,fontWeight:600}}/>}
                {isPct && <span style={{fontSize:12,color:C.accent,marginRight:2}}>%</span>}
                {isPct
                  ? <span style={{color:C.textMuted,fontSize:12}}>{mask(fmtD(computed))}</span>
                  : hideBalances ? <span style={{color:C.text,fontSize:13}}>••••</span> : <InlineNum value={item.amount} onChange={v=>editLine(section,item.id,"amount",v??0)}/>
                }
                <button onClick={()=>togglePct(section,item.id)} title={isPct?"Switch to fixed CHF amount":"Switch to % of income"} style={{padding:"2px 8px",borderRadius:9999,border:`1px solid ${isPct?C.accent:C.border}`,background:isPct?C.accent+"18":"transparent",color:isPct?C.accent:C.textDim,fontSize:9,cursor:"pointer",whiteSpace:"nowrap",fontWeight:600}}>{isPct?t('scenarios.pctOfInc'):t('scenarios.chf')}</button>
                {(section==="expenses"||section==="savings") && <button onClick={()=>{const next=(item.essential!==false)?false:true; editLine(section,item.id,"essential",next);}} title={item.essential!==false?t('scenarios.markEssential'):t('scenarios.markOptional')} style={{padding:"2px 8px",borderRadius:9999,border:`1px solid ${item.essential!==false?C.green:C.textDim}`,background:(item.essential!==false?C.green:C.textDim)+"18",color:item.essential!==false?C.green:C.textDim,fontSize:9,cursor:"pointer",fontWeight:600}}>{item.essential!==false?t('scenarios.essential'):t('scenarios.optional')}</button>}
                {(section==="savings"||section==="investments") && <button onClick={()=>{const next=(item.liq||"liquid")==="liquid"?"locked":"liquid"; editLine(section,item.id,"liq",next);}} title={item.liq==="locked"?t('scenarios.markLiquid'):t('scenarios.markLocked')} style={{padding:"2px 8px",borderRadius:9999,border:`1px solid ${item.liq==="locked"?C.orange:C.teal}`,background:(item.liq==="locked"?C.orange:C.teal)+"18",color:item.liq==="locked"?C.orange:C.teal,fontSize:9,cursor:"pointer",fontWeight:600}}>{(item.liq||"liquid")==="locked"?t('scenarios.locked'):t('scenarios.liquid')}</button>}
              </div>
            </td>
          </tr>
          );
        })}
        <AddRow onClick={()=>addLine(section)} label={t('scenarios.addItem', {section: title.toLowerCase()})} colSpan={3}/>
      </tbody></table>
    </div>
  );

  return <div>
    <input type="file" ref={payrollImportRef} style={{display:'none'}} accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.xlsx,.xls" multiple onChange={handlePayrollImport}/>

    {/* Payroll extraction prompt modal */}
    {payrollPromptOpen && <div onClick={()=>setPayrollPromptOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,width:'100%',maxWidth:1140,maxHeight:'84vh',overflowY:'auto',padding:28,boxShadow:'0 24px 80px rgba(0,0,0,0.6)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
          <h2 style={{margin:0,fontSize:18,fontWeight:700,color:C.text}}>{t('scenarios.payrollPromptTitle')}</h2>
          <button onClick={()=>setPayrollPromptOpen(false)} style={{background:'transparent',border:'none',cursor:'pointer',color:C.textDim}}><X size={18}/></button>
        </div>
        <p style={{margin:'0 0 12px',fontSize:13,color:C.textDim}}>
          {t('scenarios.payrollPromptDesc')}
        </p>
        <div style={{display:'flex',gap:8,marginBottom:10}}>
          <button onClick={()=>setPayrollExtractionPrompt(DEFAULT_PAYROLL_PROMPT)}
            style={{padding:'6px 12px',borderRadius:6,border:`1px solid ${C.border}`,background:'transparent',color:C.textMuted,fontSize:13,cursor:'pointer'}}>
            Load default
          </button>
          <button onClick={()=>setPayrollExtractionPrompt('')}
            style={{padding:'6px 12px',borderRadius:6,border:`1px solid ${C.border}`,background:'transparent',color:C.textMuted,fontSize:13,cursor:'pointer'}}>
            Reset to blank
          </button>
        </div>
        <textarea
          value={payrollExtractionPrompt}
          onChange={e=>setPayrollExtractionPrompt(e.target.value)}
          placeholder={t('scenarios.payrollPromptPlaceholder')}
          rows={28}
          style={{width:'100%',padding:'10px 12px',borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,
            fontSize:13,outline:'none',resize:'vertical',boxSizing:'border-box',fontFamily:"'DM Mono',monospace",lineHeight:1.5}}
        />
        {payrollExtractionPrompt && <div style={{marginTop:6,fontSize:12,color:C.green}}>{t('scenarios.payrollPromptActive')}</div>}
        <button onClick={()=>setPayrollPromptOpen(false)} style={{width:'100%',padding:'11px',borderRadius:8,border:'none',background:C.accent,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',marginTop:12}}>
          Save & Close
        </button>
      </div>
    </div>}

    {/* Payroll preview modal */}
    {payrollPreview && <div onClick={()=>setPayrollPreview(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,width:'100%',maxWidth:860,maxHeight:'84vh',overflowY:'auto',padding:28,boxShadow:'0 24px 80px rgba(0,0,0,0.6)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <div>
            <h3 style={{margin:'0 0 2px',fontSize:17,fontWeight:700,color:C.text}}>{t('scenarios.payrollPreview')}</h3>
            <div style={{fontSize:12,color:C.textDim}}>{t('scenarios.payrollPreviewSub')}</div>
          </div>
          <button onClick={()=>setPayrollPreview(null)} style={{background:'transparent',border:'none',cursor:'pointer',color:C.textDim}}><X size={18}/></button>
        </div>
        {payrollPreview.data ? <>
          <div style={{marginBottom:16}}>
            <label style={{fontSize:12,color:C.textDim,fontWeight:600,textTransform:'uppercase',letterSpacing:0.5}}>{t('scenarios.scenarioName')}</label>
            <input value={payrollPreview.data.scenarioName||''} onChange={e=>setPayrollPreview(p=>({...p,data:{...p.data,scenarioName:e.target.value}}))}
              style={{display:'block',width:'100%',marginTop:4,padding:'7px 10px',borderRadius:6,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:14,outline:'none',boxSizing:'border-box'}}/>
          </div>
          {[['incomes',t('scenarios.incomes'),C.green],['expenses',t('scenarios.expenses'),C.red],['savings',t('scenarios.savings'),C.blue]].map(([key,label,color])=>{
            const items = payrollPreview.data[key]||[];
            if(!items.length) return null;
            return <div key={key} style={{marginBottom:14}}>
              <div style={{fontSize:13,fontWeight:600,color,marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>{label}</div>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead><tr>
                  {['Label',t('scenarios.rateAmount'),'Notes'].map((h,i)=><th key={i} style={{padding:'5px 8px',textAlign:i===1?'right':'left',fontSize:12,color:C.textDim,fontWeight:600,borderBottom:`1px solid ${C.border}`}}>{h}</th>)}
                </tr></thead>
                <tbody>{items.map((item,i)=>(
                  <tr key={i} style={{borderBottom:`1px solid ${C.border}22`}}>
                    <td style={{padding:'5px 8px',color:C.text}}>{item.label}</td>
                    <td style={{padding:'5px 8px',textAlign:'right',fontWeight:600}}>
                      {item.pct!=null
                        ? <span><span style={{color:C.accentLight}}>{item.pct}%</span><span style={{color:C.textDim,fontSize:12,fontWeight:400}}> = </span><span style={{color}}>{item.amount!=null?`CHF ${item.amount.toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2})}`:'—'}</span></span>
                        : <span style={{color}}>{item.amount!=null?`CHF ${item.amount.toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2})}`:'—'}</span>
                      }
                    </td>
                    <td style={{padding:'5px 8px',color:C.textDim,fontSize:11}}>{item.notes||'—'}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>;
          })}
          <div style={{display:'flex',gap:8,marginBottom:16,marginTop:8}}>
            {[['new',t('scenarios.createNew')],['append',t('scenarios.appendCurrent')]].map(([m,lbl])=>(
              <button key={m} onClick={()=>setPayrollImportMode(m)}
                style={{flex:1,padding:'8px',borderRadius:8,border:`1px solid ${payrollImportMode===m?C.accent:C.border}`,background:payrollImportMode===m?C.accent+'18':'transparent',color:payrollImportMode===m?C.accentLight:C.textMuted,fontSize:13,cursor:'pointer',fontWeight:payrollImportMode===m?600:400}}>
                {lbl}
              </button>
            ))}
          </div>
          <button onClick={confirmPayrollImport} style={{width:'100%',padding:'11px',borderRadius:8,border:'none',background:C.accent,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer'}}>
            {payrollImportMode==='new'?t('scenarios.createScenario'):t('scenarios.addToCurrent')}
          </button>
        </> : <>
          <div style={{marginBottom:10,fontSize:14,color:C.textMuted}}>Could not parse structured data. Raw AI response:</div>
          <pre style={{background:C.bg,padding:12,borderRadius:8,fontSize:12,color:C.text,overflowX:'auto',maxHeight:300,overflowY:'auto',whiteSpace:'pre-wrap'}}>{payrollPreview.rawText}</pre>
          <button onClick={()=>setPayrollPreview(null)} style={{marginTop:12,padding:'8px 16px',borderRadius:8,border:`1px solid ${C.border}`,background:'transparent',color:C.textMuted,fontSize:14,cursor:'pointer'}}>Close</button>
        </>}
      </div>
    </div>}

    <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
      {[...scenarios].sort((a,b)=> a.isActive ? -1 : b.isActive ? 1 : 0).map((s,si,arr)=>{
        const realIdx = scenarios.findIndex(x=>x.id===s.id);
        const move = (dir) => {
          const next = scenarios.findIndex(x=>x.id===arr[si+dir]?.id);
          if(next<0) return;
          const copy=[...scenarios]; [copy[realIdx],copy[next]]=[copy[next],copy[realIdx]]; setScenarios(copy);
        };
        return (
        <div key={s.id} onClick={()=>setSelId(s.id)} style={{padding:"10px 16px",borderRadius:10,border:`1px solid ${selId===s.id?C.accent:C.border}`,background:selId===s.id?C.accent+"15":C.card,cursor:"pointer",minWidth:180,position:"relative"}}>
          <div style={{fontSize:14,fontWeight:600,color:selId===s.id?C.accentLight:C.text,marginBottom:4,paddingRight:20}}>{s.name}</div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {s.isActive && <Badge color={C.green} bg={C.greenBg}>Active</Badge>}
            {s.tags.map(t=><Badge key={t} color={C.textDim}>{t}</Badge>)}
          </div>
          <div style={{position:"absolute",top:6,right:selId===s.id?26:6,display:"flex",gap:1}}>
            {!s.isActive && si>1 && <button onClick={e=>{e.stopPropagation();move(-1);}} title={t('scenarios.moveLeft')} style={{background:"transparent",border:"none",cursor:"pointer",color:C.textDim,padding:"1px 2px",fontSize:10}}>◀</button>}
            {!s.isActive && si<arr.length-1 && <button onClick={e=>{e.stopPropagation();move(1);}} title={t('scenarios.moveRight')} style={{background:"transparent",border:"none",cursor:"pointer",color:C.textDim,padding:"1px 2px",fontSize:10}}>▶</button>}
          </div>
          {selId===s.id && !s.isActive && <ScenarioDelBtn onDelete={()=>deleteScenario(s.id)}/>}
        </div>
        );
      })}
      <button onClick={addScenario} style={{padding:"10px 16px",borderRadius:10,border:`2px dashed ${C.border}`,background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",gap:6,color:C.textDim,fontSize:13}}><Plus size={16}/>{t('scenarios.newScenario')}</button>
      <button onClick={()=>payrollImportRef.current?.click()} disabled={payrollImporting}
        title="Import payroll PDF/image to populate a scenario"
        style={{padding:"10px 16px",borderRadius:10,border:`1px solid ${C.border}`,background:"transparent",cursor:payrollImporting?'not-allowed':'pointer',display:"flex",alignItems:"center",gap:6,color:payrollImporting?C.textDim:C.textMuted,fontSize:13}}>
        {payrollImporting ? <><RefreshCw size={14} style={{animation:'spin 1s linear infinite'}}/>Parsing…</> : <><Upload size={14}/>{t('scenarios.importPayroll')}</>}
      </button>
      <button onClick={()=>setPayrollPromptOpen(true)}
        style={{padding:"10px 16px",borderRadius:10,border:`1px solid ${payrollExtractionPrompt?C.accent:C.border}`,background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",gap:6,color:payrollExtractionPrompt?C.accentLight:C.textDim,fontSize:13}}>
        <Sparkles size={14}/>{t('scenarios.payrollPrompt')}{payrollExtractionPrompt?' ✓':''}
      </button>
    </div>
    {sc && <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"2fr 1fr",gap:16}}>
      <Card headerRight={<div style={{display:"flex",gap:6}}>
        <button onClick={()=>toggleActive(sc.id)} style={{padding:"6px 12px",borderRadius:6,border:`1px solid ${sc.isActive?C.green:C.border}`,background:sc.isActive?C.greenBg:"transparent",color:sc.isActive?C.green:C.textMuted,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><Power size={14}/>{sc.isActive?"Active":"Set Active"}</button>
        <button onClick={duplicateScenario} style={{padding:"6px 12px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.textMuted,fontSize:13,cursor:"pointer"}}>{t('scenarios.duplicate')}</button>
        <button onClick={exportPDF} style={{padding:"6px 12px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.textMuted,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><Download size={13}/>PDF</button>
      </div>}>
        <div style={{marginBottom:16}}>
          <InlineEdit value={sc.name} onChange={v=>update(sc.id,s=>{s.name=v;return s;})} style={{fontSize:18,fontWeight:700,color:C.text}}/>
          <div style={{display:"flex",gap:4,marginTop:8,alignItems:"center"}}>
            {sc.tags.map(t=><Badge key={t} color={C.textDim} onRemove={()=>removeTag(t)}>{t}</Badge>)}
            {addingTag ? <span style={{display:"inline-flex",alignItems:"center",gap:4}}><input autoFocus value={newTag} onChange={e=>setNewTag(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")confirmTag();if(e.key==="Escape")cancelTag();}} placeholder={t('scenarios.tagPlaceholder')} style={{padding:"2px 6px",borderRadius:6,border:`1px solid ${C.accent}`,background:C.bg,color:C.text,fontSize:12,width:80,outline:"none"}}/><button onClick={confirmTag} style={{padding:"2px 6px",borderRadius:6,border:"none",background:C.accent,color:"#fff",fontSize:12,cursor:"pointer"}}>Add</button><button onClick={cancelTag} style={{padding:"2px 6px",borderRadius:6,border:"none",background:"transparent",color:C.textDim,fontSize:12,cursor:"pointer"}}>×</button></span> : <button onClick={addTag} style={{padding:"2px 8px",borderRadius:9999,border:`1px dashed ${C.border}`,background:"transparent",color:C.textDim,fontSize:12,cursor:"pointer"}}>{t('scenarios.addTag')}</button>}
          </div>
        </div>
        <Section title={t('scenarios.incomes')} section="incomes" color={C.green}/>
        <Section title={t('scenarios.expenses')} section="expenses" color={C.red}/>

        {/* Provisions — monthly allocations by category */}
        <div style={{marginBottom:20,padding:16,borderRadius:10,background:C.red+"0a",border:`1px solid ${C.red}30`}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
            <div style={{width:4,height:20,borderRadius:2,background:C.red}}/>
            <h4 style={{margin:0,fontSize:14,fontWeight:600,color:C.red}}>{t('scenarios.linkedExpenses')}</h4>
            <span style={{fontSize:14,color:C.red,fontWeight:700,marginLeft:"auto"}}>CHF {mask(fmtD(linkedTotal))}</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:2}}>
            {linkedCategoriesWithOverride.map((cat,ci)=>{
              const isOverridden = overrides[cat.key] != null;
              const CatIcon = cat.icon || DollarSign;
              const delta = cat.amount - cat.calc;
              const deltaColor = delta > 0 ? C.green : delta < 0 ? C.red : C.textDim;
              return <React.Fragment key={ci}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",borderRadius:8,transition:"background .15s"}}
                onMouseEnter={e=>e.currentTarget.style.background=C.cardHover}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",flex:1,minWidth:0}} onClick={()=>setLinkedExpanded(p=>{const n=new Set(p);n.has(cat.key)?n.delete(cat.key):n.add(cat.key);return n;})}>
                  <div style={{width:28,height:28,borderRadius:6,background:cat.color+"1a",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <CatIcon size={14} color={cat.color}/>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <ChevronDown size={12} color={C.textDim} style={{transform:linkedExpanded.has(cat.key)?'rotate(180deg)':'none',transition:'transform .2s'}}/>
                    <span style={{fontSize:14,color:C.text,fontWeight:500}}>{cat.label}</span>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <span style={{fontSize:12,color:C.textDim}}>{t('scenarios.need')}</span>
                    <span style={{fontSize:13,color:C.textDim,fontVariantNumeric:"tabular-nums"}}>{mask(fmtD(cat.calc))}</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <span style={{fontSize:12,color:C.textDim}}>{t('scenarios.actual')}</span>
                    {hideBalances ? <span style={{color:C.text,fontWeight:600,fontSize:13}}>••••</span> : <InlineNum value={cat.amount} onChange={v=>setOverride(cat.key,v??null)} style={{color:isOverridden?C.red:C.text,fontWeight:600,fontVariantNumeric:"tabular-nums"}} width={70}/>}
                  </div>
                  {isOverridden && delta !== 0 && <span style={{fontSize:10,padding:"1px 6px",borderRadius:4,background:deltaColor+"18",color:deltaColor,fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{delta>0?"+":""}{fmtD(delta)}</span>}
                  {isOverridden && <button onClick={()=>setOverride(cat.key,null)} title={t('scenarios.resetToCalc')} style={{fontSize:10,padding:"1px 5px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.textDim,cursor:"pointer"}}>{t('scenarios.reset')}</button>}
                </div>
              </div>
              {linkedExpanded.has(cat.key) && cat.items && cat.items.length > 0 && (()=>{
                const active = cat.items.filter(it=>it.monthly>0);
                const monthly = active.filter(it=>!it.freq||it.freq===1);
                const potItems = active.filter(it=>it.freq&&it.freq>1);
                const potTotal = potItems.reduce((s,it)=>s+it.monthly,0);
                const monthlyTotal = monthly.reduce((s,it)=>s+it.monthly,0);
                return <div style={{marginLeft:40,marginBottom:8,display:'flex',flexDirection:'column',gap:0}}>
                  {potItems.length > 0 && <div style={{background:C.red+'08',borderRadius:6,padding:'6px 0',marginBottom:monthly.length>0?6:0}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0 8px 4px'}}>
                      <span style={{fontSize:10,fontWeight:700,color:C.red,textTransform:'uppercase',letterSpacing:.5}}>{t('scenarios.provisions')}</span>
                      <span style={{fontSize:10,fontWeight:700,color:C.red,fontVariantNumeric:'tabular-nums'}}>{fmtD(potTotal)}{t('common.perMo')}</span>
                    </div>
                    {potItems.map((it,ii)=>(
                      <div key={ii} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'2px 8px',fontSize:12,color:C.text}}>
                        <span style={{flex:1,minWidth:0}}>{it.name}{it.notes ? <span style={{color:C.border,marginLeft:6,fontStyle:'italic'}}>{it.notes}</span> : null}</span>
                        <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                          <span style={{color:C.textDim,fontVariantNumeric:'tabular-nums',fontSize:10}}>{fmtD(it.total)}{freqLabel(it.freq)}</span>
                          <span style={{fontVariantNumeric:'tabular-nums',fontWeight:600,color:C.red,width:60,textAlign:'right'}}>{fmtD(it.monthly)}</span>
                        </div>
                      </div>
                    ))}
                  </div>}
                  {monthly.length > 0 && <div style={{padding:'6px 0'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0 8px 4px'}}>
                      <span style={{fontSize:10,fontWeight:700,color:C.textDim,textTransform:'uppercase',letterSpacing:.5}}>{t('scenarios.linkedExpenseLabel')}</span>
                      <span style={{fontSize:10,fontWeight:600,color:C.textDim,fontVariantNumeric:'tabular-nums'}}>{fmtD(monthlyTotal)}{t('common.perMo')}</span>
                    </div>
                    {monthly.map((it,ii)=>(
                      <div key={ii} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'2px 8px',fontSize:12,color:C.textDim}}>
                        <span style={{flex:1,minWidth:0}}>{it.name}{it.notes ? <span style={{color:C.border,marginLeft:6,fontStyle:'italic'}}>{it.notes}</span> : null}</span>
                        <span style={{fontVariantNumeric:'tabular-nums',flexShrink:0,width:60,textAlign:'right'}}>{fmtD(it.monthly)}</span>
                      </div>
                    ))}
                  </div>}
                </div>;
              })()}
              </React.Fragment>;
            })}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",marginTop:4,borderTop:`1px solid ${C.red}30`}}>
              <span style={{fontSize:14,fontWeight:700,color:C.red}}>{t('scenarios.totalProvisions')}</span>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:12,color:C.textDim}}>{t('scenarios.need')} <span style={{fontVariantNumeric:"tabular-nums"}}>{mask(fmtD(linkedCalcTotal))}</span></span>
                <span style={{fontSize:14,fontWeight:700,fontVariantNumeric:"tabular-nums",color:C.red}}>{t('scenarios.actual')} CHF {mask(fmtD(linkedTotal))}</span>
              </div>
            </div>
          </div>
        </div>

        <Section title={t('scenarios.savings')} section="savings" color={C.blue}/>
        <Section title={t('scenarios.investments')} section="investments" color={C.teal}/>
      </Card>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <Card title={t('scenarios.cashflowSplit')}>
          <ResponsiveContainer width="100%" height={180}><PieChart><Pie data={flow} cx="50%" cy="50%" outerRadius={70} innerRadius={40} dataKey="value" paddingAngle={2} stroke="none">{flow.map((d,i)=><Cell key={i} fill={d.color}/>)}</Pie><Tooltip formatter={v=>`CHF ${fmt(v)}`} contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13}} labelStyle={{color:C.textMuted}} itemStyle={{color:C.text}}/></PieChart></ResponsiveContainer>
          {flow.map((d,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:i<flow.length-1?`1px solid ${C.border}11`:"none"}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:10,height:10,borderRadius:3,background:d.color}}/><span style={{fontSize:14,color:C.textMuted}}>{d.name}</span></div><div><span style={{fontSize:14,fontWeight:600,color:C.text}}>{mask(fmtD(d.value))}</span><span style={{fontSize:12,color:C.textDim,marginLeft:6}}>{inc>0?pct(d.pct):""}</span></div></div>)}
        </Card>
        <Card title={t('scenarios.liquidLocked')} subtitle={t('scenarios.liquidLockedSub')}>
          <div style={{display:"flex",gap:12,marginBottom:12}}>
            <div style={{flex:1,padding:"10px 12px",borderRadius:8,background:C.teal+"12",border:`1px solid ${C.teal}30`}}>
              <div style={{fontSize:12,color:C.teal,marginBottom:4}}>{t('scenarios.liquidLabel')}</div>
              <div style={{fontSize:17,fontWeight:700,color:C.teal}}>CHF {mask(fmt(Math.round(liqTotal)))}</div>
            </div>
            <div style={{flex:1,padding:"10px 12px",borderRadius:8,background:C.orange+"12",border:`1px solid ${C.orange}30`}}>
              <div style={{fontSize:12,color:C.orange,marginBottom:4}}>{t('scenarios.lockedLabel')}</div>
              <div style={{fontSize:17,fontWeight:700,color:C.orange}}>CHF {mask(fmt(Math.round(lockTotal)))}</div>
            </div>
          </div>
        </Card>
        {(() => {
          const essentialExp = sc.expenses.filter(e=>e.essential!==false).reduce((s,x)=>s+getAmt(x),0);
          const essentialSav = sc.savings.filter(e=>e.essential!==false).reduce((s,x)=>s+getAmt(x),0);
          const essentialTotal = essentialExp + linkedTotal + essentialSav;
          const allCosts = totalExp + sav;
          const nonEssentialTotal = allCosts - essentialTotal;
          return <Card title={t('scenarios.essentialOptional')} subtitle={t('scenarios.essentialOptionalSub')}>
            <div style={{display:"flex",gap:12,marginBottom:12}}>
              <div style={{flex:1,padding:"10px 12px",borderRadius:8,background:C.red+"12",border:`1px solid ${C.red}30`}}>
                <div style={{fontSize:12,color:C.red,marginBottom:4}}>Essential</div>
                <div style={{fontSize:17,fontWeight:700,color:C.red}}>CHF {mask(fmt(Math.round(essentialTotal)))}</div>
              </div>
              <div style={{flex:1,padding:"10px 12px",borderRadius:8,background:C.textDim+"12",border:`1px solid ${C.textDim}30`}}>
                <div style={{fontSize:12,color:C.textDim,marginBottom:4}}>Optional</div>
                <div style={{fontSize:17,fontWeight:700,color:C.textDim}}>CHF {mask(fmt(Math.round(nonEssentialTotal)))}</div>
              </div>
            </div>
            <div style={{height:6,borderRadius:3,overflow:"hidden",background:C.border,display:"flex"}}>
              <div style={{width:`${allCosts>0?(essentialTotal/allCosts*100):0}%`,background:C.red,transition:"width .3s"}}/>
              <div style={{width:`${allCosts>0?(nonEssentialTotal/allCosts*100):0}%`,background:C.textDim,transition:"width .3s"}}/>
            </div>
            <div style={{fontSize:12,color:C.textDim,marginTop:6}}>{allCosts>0?(essentialTotal/allCosts*100).toFixed(0):0}% essential · {allCosts>0?(nonEssentialTotal/allCosts*100).toFixed(0):0}% optional</div>
          </Card>;
        })()}
        <Card title={t('scenarios.distributionPlan')} subtitle={t('scenarios.distributionSub')}>
          {[
            {title:t('scenarios.incomes'), items:sc.incomes, color:C.green, sign:"+"},
            {title:t('scenarios.expenses'), items:sc.expenses, color:C.red, sign:"−"},
            {title:t('scenarios.totalProvisions'), items:linkedCategoriesWithOverride.map(c=>({label:c.label,amount:c.amount})), color:C.red, sign:"−"},
            {title:t('scenarios.savings'), items:sc.savings, color:C.blue, sign:"→"},
            {title:t('scenarios.investments'), items:sc.investments, color:C.teal, sign:"→"},
          ].filter(g=>g.items.length>0).map((g,gi)=>{
            const groupTotal = g.items.reduce((s,x)=>s+(x.pct!=null?getAmt(x):(x.amount||0)),0);
            return <div key={gi} style={{marginBottom:gi<4?10:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:`1px solid ${g.color}30`,marginBottom:4}}>
                <span style={{fontSize:12,fontWeight:700,color:g.color,textTransform:"uppercase",letterSpacing:.5}}>{g.title}</span>
                <span style={{fontSize:12,fontWeight:700,color:g.color}}>{g.sign} CHF {mask(fmt(Math.round(groupTotal)))}</span>
              </div>
              {g.items.filter(e=>(e.pct!=null?getAmt(e):(e.amount||0))>0).map((e,i)=>
                <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"2px 0",fontSize:12}}>
                  <span style={{color:C.textMuted}}>{g.sign} {e.label}</span>
                  <span style={{color:C.text,fontVariantNumeric:"tabular-nums"}}>{mask(fmt(Math.round(e.pct!=null?getAmt(e):(e.amount||0))))}</span>
                </div>
              )}
            </div>;
          })}
          <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0 0",borderTop:`1px solid ${C.border}`,marginTop:8}}>
            <span style={{fontSize:13,fontWeight:700,color:rem<0?C.red:C.yellow}}>{t('scenarios.unallocated')}</span>
            <span style={{fontSize:13,fontWeight:700,color:rem<0?C.red:C.yellow}}>CHF {mask(fmt(rem))}</span>
          </div>
        </Card>
      </div>
    </div>}
  </div>;
}

// ───────────────────────────────────────────────────────────────
// TRACKER — editable grid with toggle, cutoff, add/delete rows
// ───────────────────────────────────────────────────────────────
function TrackerPage({ tracker, setTracker, accounts: portfolioAccounts, hideBalances, onTrackerSynced, t }) {
  const mask = (v) => hideBalances ? "••••" : v;
  const winW = useWindowWidth(); const isMobile = winW < 768;
  const sortedYears = Object.keys(tracker).map(Number).sort((a,b)=>b-a);
  const allYearsSorted = Object.keys(tracker).map(Number).sort((a,b)=>a-b);
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [endYear, setEndYear] = useState(new Date().getFullYear());
  const [view, setView] = useState("grid");
  const [growthRate, setGrowthRate] = useState(5);
  const [monthlyAdd, setMonthlyAdd] = useState(2854);
  const [years, setYears] = useState(10);

  const rangeYears = Object.keys(tracker).map(Number).filter(y => y >= startYear && y <= endYear).sort((a,b)=>a-b);
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const [editCell, setEditCell] = useState(null); // {name, year, mi}
  const [editVal, setEditVal] = useState("");
  const [sortAsc, setSortAsc] = useState(null); // null=unsorted, true=asc, false=desc

  const [syncMonth, setSyncMonth] = useState(currentMonth);
  const syncFromAccounts = () => {
    const balanceMap = Object.fromEntries(portfolioAccounts.map(a => [a.name, a.balance]));
    setTracker(p => ({
      ...p,
      [currentYear]: (p[currentYear] || []).map(row => {
        const bal = balanceMap[row.name];
        if (bal == null) return row;
        const results = [...row.results];
        results[syncMonth] = bal;
        return { ...row, results };
      }),
    }));
    if (onTrackerSynced) onTrackerSynced();
  };

  const addYear = () => {
    const newYear = Math.max(...Object.keys(tracker).map(Number)) + 1;
    const prevRows = tracker[newYear - 1] || [];
    const newRows = prevRows.map(a => {
      const lastResult = [...a.results].reverse().find(r => r !== null);
      return { ...a, id: uid(), startBal: lastResult ?? a.startBal, results: Array(12).fill(null) };
    });
    setTracker(p => ({ ...p, [newYear]: newRows }));
    setStartYear(newYear);
    setEndYear(newYear);
  };

  const deleteYear = (yr) => {
    if (!window.confirm(t('tracker.deleteConfirm', {year: yr}))) return;
    setTracker(p => {
      const next = { ...p };
      delete next[yr];
      return next;
    });
    const remaining = Object.keys(tracker).map(Number).filter(y => y !== yr).sort((a,b) => a-b);
    if (remaining.length) {
      if (startYear === yr) setStartYear(remaining[0]);
      if (endYear === yr) setEndYear(remaining[remaining.length - 1]);
    }
  };

  // Build column definitions for the range
  const columns = useMemo(() =>
    rangeYears.flatMap(yr => MONTHS.map((m, mi) => ({
      year: yr, month: m, mi, label: rangeYears.length > 1 ? `${m.slice(0,3)} '${String(yr).slice(2)}` : m,
      isCurrent: yr === currentYear && mi === currentMonth,
      isJan: mi === 0,
    }))),
    [rangeYears.join(","), currentYear, currentMonth]
  );

  // Build unified account data across range years
  const multiYearAccounts = useMemo(() => {
    const accountNames = [];
    const seen = new Set();
    rangeYears.forEach(yr => (tracker[yr] || []).forEach(a => {
      if (!seen.has(a.name)) { seen.add(a.name); accountNames.push(a.name); }
    }));

    const accounts = accountNames.map(name => {
      const yearData = rangeYears.map(yr => {
        const row = (tracker[yr] || []).find(r => r.name === name);
        if (!row) return { forecast: Array(12).fill(null), results: Array(12).fill(null), active: true, row: null, year: yr };
        const f = [];
        for (let m = 0; m < 12; m++) {
          if (m === 0) f.push(row.startBal);
          else if (m < (row.activeUntil ?? 12)) f.push(f[m-1] + (row.recurring ?? 0));
          else f.push(f[m-1]);
        }
        return { forecast: f, results: row.results, active: row.active !== false, row, year: yr };
      });

      const active = yearData.some(d => d.active);
      return { name, yearData, active };
    });

    if (sortAsc === null) return accounts;
    return [...accounts].sort((a, b) => sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
  }, [tracker, rangeYears.join(","), sortAsc]);

  const upd = (year, name, fn) => setTracker(p => ({
    ...p,
    [year]: (p[year] || []).map(a => a.name === name ? fn({...a}) : a)
  }));
  const delRow = (name) => {
    // Delete from all years in range
    setTracker(p => {
      const next = {...p};
      rangeYears.forEach(yr => {
        if (next[yr]) next[yr] = next[yr].filter(a => a.name !== name);
      });
      return next;
    });
  };

  // Auto-sync: keep tracker rows in sync with Accounts page
  useEffect(()=>{
    const acctNames = new Set(portfolioAccounts.map(a=>a.name));
    const current = tracker[currentYear] || [];
    const pruned = current.filter(r => acctNames.has(r.name) || r.results.some(v=>v!==null));
    const existingNames = new Set(pruned.map(r=>r.name));
    const newRows = portfolioAccounts.filter(a=>!existingNames.has(a.name) && a.type!=="Debt").map(a=>({id:uid(),name:a.name,recurring:0,startBal:a.balance,results:Array(12).fill(null),active:true,activeUntil:12}));
    if(pruned.length !== current.length || newRows.length > 0){
      setTracker(p=>({...p,[currentYear]:[...pruned,...newRows]}));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[portfolioAccounts.map(a=>a.name).join(",")]);

  const debtNames = new Set(portfolioAccounts.filter(a=>a.type==="Debt").map(a=>a.name));
  const multiTotals = columns.map((col) => {
    const yrIdx = rangeYears.indexOf(col.year);
    let forecast = 0, result = 0, hasResult = false;
    multiYearAccounts.forEach(acc => {
      if (!acc.active || debtNames.has(acc.name)) return;
      const yd = acc.yearData[yrIdx];
      if (!yd) return;
      forecast += yd.forecast[col.mi] ?? 0;
      if (yd.results[col.mi] != null) { result += yd.results[col.mi]; hasResult = true; }
    });
    return { ...col, forecast, result, hasResult };
  });
  const currentTotal = portfolioAccounts.filter(a=>a.type!=="Debt").reduce((s,a)=>s+a.balance,0);
  const proj = useMemo(()=>{ const d=[]; let b=currentTotal; for(let y=0;y<=years;y++){ d.push({year:endYear+y,balance:Math.round(b),contributed:currentTotal+monthlyAdd*12*y}); b=(b+monthlyAdd*12)*(1+growthRate/100); } return d; },[growthRate,monthlyAdd,years,currentTotal,endYear]);

  return <div>
    {/* Year selector + view tabs — unified bar */}
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:20,flexWrap:"wrap"}}>
      <div style={{display:"flex",alignItems:"center",gap:4,background:C.bg,borderRadius:10,padding:4}}>
        {Object.keys(tracker).map(Number).sort((a,b)=>a-b).map(yr=>{
          const inRange = yr >= startYear && yr <= endYear;
          const isEdge = yr === startYear || yr === endYear;
          const isOnly = startYear === endYear && yr === startYear;
          return <button key={yr}
            onClick={()=>{
              if (isOnly) return; // already the only selected year
              // Shift-click or if already in range: toggle range edge
              if (inRange && !isOnly) {
                // Clicking inside range: focus single year
                setStartYear(yr); setEndYear(yr);
              } else {
                // Clicking outside range: extend range to include this year
                setStartYear(Math.min(startYear, yr));
                setEndYear(Math.max(endYear, yr));
              }
            }}
            onContextMenu={e=>{
              e.preventDefault();
              if (yr !== currentYear) deleteYear(yr);
            }}
            style={{
              padding:"6px 14px",borderRadius:8,border:"none",fontSize:13,fontWeight:inRange?600:400,
              cursor:"pointer",transition:"all 0.15s ease",position:"relative",
              background: isEdge ? C.accent+"22" : inRange ? C.accent+"0c" : "transparent",
              color: isEdge ? C.accentLight : inRange ? C.accentLight+"cc" : C.textDim,
            }}>{yr}</button>;
        })}
        <button onClick={addYear} style={{padding:"6px 8px",borderRadius:8,border:"none",background:"transparent",color:C.textDim,cursor:"pointer",display:"flex",alignItems:"center",opacity:0.5}} title={t('tracker.addYear')}><Plus size={14}/></button>
      </div>
      {startYear !== endYear && <span style={{fontSize:12,color:C.textDim,letterSpacing:0.5}}>{startYear}–{endYear}</span>}
      <div style={{display:"flex",gap:4,background:C.bg,borderRadius:10,padding:4}}>
        {[["grid",t('tracker.grid')],["chart",t('tracker.chart')],["compound",t('tracker.compound')]].map(([k,l])=>
          <button key={k} onClick={()=>setView(k)} style={{padding:"6px 14px",borderRadius:8,border:"none",fontSize:13,fontWeight:view===k?600:400,cursor:"pointer",background:view===k?C.accent+"22":"transparent",color:view===k?C.accentLight:C.textDim,transition:"all 0.15s ease"}}>{l}</button>
        )}
      </div>
    </div>

    {view==="grid" && <Card headerRight={
      rangeYears.includes(currentYear) && <div style={{display:"flex",alignItems:"center",gap:6}}>
        <select value={syncMonth} onChange={e=>setSyncMonth(Number(e.target.value))} style={{padding:"5px 8px",borderRadius:8,border:`1px solid ${C.border}`,background:C.card,color:C.text,fontSize:13,cursor:"pointer",outline:"none"}}>
          {MONTHS.slice(0, currentMonth + 1).map((m,mi)=><option key={mi} value={mi}>{m}</option>)}
        </select>
        <button onClick={syncFromAccounts} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:8,border:`1px solid ${C.accent}`,background:C.accent+"18",color:C.accentLight,fontSize:13,fontWeight:600,cursor:"pointer"}}>
          {t('tracker.syncFromAccounts')}
        </button>
      </div>
    }>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:Math.max(1100, columns.length * 62 + 200)}}>
        <thead>
          <tr style={{borderBottom:`2px solid ${C.border}`}}>
            <th onClick={()=>setSortAsc(s=>s===null?true:s===true?false:null)} style={{padding:"8px 12px",textAlign:"left",fontSize:12,fontWeight:700,color:C.textDim,textTransform:"uppercase",letterSpacing:0.5,cursor:"pointer",userSelect:"none",width:200,position:"sticky",left:0,background:C.card,zIndex:2}}>
              Account {sortAsc===null?<span style={{opacity:0.3}}>↕</span>:sortAsc?"↑":"↓"}
            </th>
            {columns.map((col,ci)=>(
              <th key={ci} style={{padding:"8px 4px",textAlign:"right",fontSize:11,fontWeight:700,color:col.isCurrent?C.accentLight:C.textDim,textTransform:"uppercase",letterSpacing:0.3,background:col.isCurrent?C.accent+"18":"transparent",minWidth:56,borderLeft:col.isJan&&ci>0?`2px solid ${C.border}`:"none"}}>
                {col.label}{col.isCurrent?" ◂":""}
              </th>
            ))}
            <th style={{width:28}}/>
          </tr>
        </thead>
        <tbody>
          {multiYearAccounts.map((acc)=>{
            const dim = !acc.active;
            const primaryYrIdx = acc.yearData.findIndex(d => d.row);
            const primaryRow = primaryYrIdx >= 0 ? acc.yearData[primaryYrIdx].row : null;
            const primaryYear = primaryYrIdx >= 0 ? acc.yearData[primaryYrIdx].year : rangeYears[0];
            if (!primaryRow) return null;
            return <React.Fragment key={acc.name}>
              {/* Forecast row */}
              <tr style={{opacity:dim?0.3:1,borderTop:`1px solid ${C.border}22`}}>
                <td rowSpan={2} style={{padding:"10px 12px",verticalAlign:"top",borderRight:`1px solid ${C.border}22`,position:"sticky",left:0,background:C.card,zIndex:1}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                    <Toggle on={primaryRow.active} onToggle={()=>upd(primaryYear, acc.name, a=>{a.active=!a.active;return a;})}/>
                    <div style={{flex:1,minWidth:0}}>
                      <span style={{fontSize:14,fontWeight:600,color:dim?C.textDim:C.text,display:"block"}}>{acc.name}</span>
                      {rangeYears.map(yr => {
                        const yd = acc.yearData[rangeYears.indexOf(yr)];
                        if (!yd || !yd.row) return null;
                        const r = yd.row;
                        return <div key={yr} style={{display:"flex",alignItems:"center",gap:4,marginTop:3,flexWrap:"wrap"}}>
                          {rangeYears.length > 1 && <span style={{fontSize:10,color:C.textDim+"88",minWidth:28}}>{yr}</span>}
                          <span style={{fontSize:10,color:C.textDim+"88"}}>start</span>
                          <InlineNum value={r.startBal} onChange={v=>upd(yr, acc.name, a=>{a.startBal=v??0;return a;})}
                            style={{fontSize:10,color:C.textDim+"aa"}} width={50}/>
                          <span style={{fontSize:10,color:C.textDim+"66"}}>·</span>
                          <span style={{fontSize:10,color:C.textDim+"88"}}>+</span>
                          <InlineNum value={r.recurring} onChange={v=>upd(yr, acc.name, a=>{a.recurring=v??0;return a;})}
                            style={{fontSize:10,color:r.recurring>0?C.accent:C.textDim+"88",fontWeight:600}} width={40}/>
                          <span style={{fontSize:10,color:C.textDim+"66"}}>/mo</span>
                        </div>;
                      })}
                    </div>
                  </div>
                </td>
                {columns.map((col,ci)=>{
                  const yrIdx = rangeYears.indexOf(col.year);
                  const yd = acc.yearData[yrIdx];
                  const v = yd ? yd.forecast[col.mi] : null;
                  const past = yd && yd.row ? col.mi >= (yd.row.activeUntil ?? 12) : false;
                  return <td key={ci} style={{
                    padding:"8px 4px",fontSize:12,textAlign:"right",fontVariantNumeric:"tabular-nums",
                    color: v == null ? C.textDim+"33" : past ? C.textDim+"66" : C.textMuted,
                    background: col.isCurrent ? C.accent+"18" : past ? "transparent" : v != null ? C.accent+"06" : "transparent",
                    borderLeft: col.isJan&&ci>0 ? `2px solid ${C.border}` : col.isCurrent ? `2px solid ${C.accent}44` : "none",
                    borderRight: col.isCurrent ? `2px solid ${C.accent}44` : "none",
                    fontStyle: past ? "italic" : "normal",
                  }}>{v != null && !past ? mask(fmt(v)) : ""}</td>;
                })}
                <td rowSpan={2} style={{padding:"4px 6px",verticalAlign:"middle",textAlign:"center"}}>
                  <DelBtn onClick={()=>delRow(acc.name)}/>
                </td>
              </tr>
              {/* Actual row */}
              <tr style={{opacity:dim?0.3:1,borderBottom:`2px solid ${C.border}22`}}>
                {columns.map((col,ci)=>{
                  const yrIdx = rangeYears.indexOf(col.year);
                  const yd = acc.yearData[yrIdx];
                  const v = yd ? yd.results[col.mi] : null;
                  const forecastV = yd ? yd.forecast[col.mi] : null;
                  const diff = v != null && forecastV != null ? v - forecastV : null;
                  const isEditing = editCell && editCell.name === acc.name && editCell.year === col.year && editCell.mi === col.mi;
                  const commitEdit = () => {
                    const n = editVal.trim() === "" ? null : Number(editVal.replace(/[',]/g,""));
                    if (n === null || !isNaN(n)) {
                      setTracker(p => ({
                        ...p,
                        [col.year]: (p[col.year] || []).map(a =>
                          a.name === acc.name ? { ...a, results: a.results.map((rv, i) => i === col.mi ? n : rv) } : a
                        ),
                      }));
                    }
                    setEditCell(null);
                  };
                  return <td key={ci}
                    onClick={()=>{ if(!isEditing && yd?.row){ setEditCell({name:acc.name,year:col.year,mi:col.mi}); setEditVal(v!=null?String(v):""); } }}
                    onMouseEnter={e=>{ if(!isEditing && yd?.row) e.currentTarget.style.background = C.accent+"22"; }}
                    onMouseLeave={e=>{ if(!isEditing) e.currentTarget.style.background = col.isCurrent ? C.accent+"18" : v!=null ? (diff>=0?C.green+"0a":C.red+"0a") : "transparent"; }}
                    style={{padding:"4px 4px",textAlign:"right",cursor:yd?.row?"text":"default",
                      background: col.isCurrent ? C.accent+"18" : v != null ? (diff>=0 ? C.green+"0a" : C.red+"0a") : "transparent",
                      borderLeft: col.isJan&&ci>0 ? `2px solid ${C.border}` : col.isCurrent ? `2px solid ${C.accent}44` : "none",
                      borderRight: col.isCurrent ? `2px solid ${C.accent}44` : "none",
                    }}>
                    {isEditing
                      ? <input autoFocus value={editVal} onChange={e=>setEditVal(e.target.value)}
                          onKeyDown={e=>{ if(e.key==="Enter") commitEdit(); if(e.key==="Escape") setEditCell(null); }}
                          onBlur={commitEdit}
                          style={{width:48,padding:"2px 4px",fontSize:12,background:C.bg,border:`1px solid ${C.accent}`,borderRadius:4,color:C.text,outline:"none",fontVariantNumeric:"tabular-nums",textAlign:"right"}}/>
                      : <span style={{fontSize:12,fontWeight:v!=null?700:400,color:v==null?C.textDim+"55":(diff>=0?C.green:C.red),fontVariantNumeric:"tabular-nums"}}>
                          {v != null ? mask(fmt(v)) : yd?.row ? "\u00b7" : ""}
                        </span>
                    }
                  </td>;
                })}
              </tr>
            </React.Fragment>;
          })}
          {/* Totals */}
          <tr style={{background:C.bg,borderTop:`2px solid ${C.border}`}}>
            <td style={{padding:"10px 12px",fontWeight:700,fontSize:14,color:C.text,position:"sticky",left:0,background:C.bg,zIndex:1}}>Total (active)</td>
            {multiTotals.map((t,i)=>(
              <td key={i} style={{padding:"8px 4px",textAlign:"right",background:t.isCurrent?C.accent+"18":"transparent",
                borderLeft:t.isJan&&i>0?`2px solid ${C.border}`:t.isCurrent?`2px solid ${C.accent}44`:"none",borderRight:t.isCurrent?`2px solid ${C.accent}44`:"none"}}>
                <div style={{fontSize:12,color:C.accentLight,fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{mask(fmt(t.forecast))}</div>
                {t.hasResult && <div style={{fontSize:11,color:t.result>=t.forecast?C.green:C.red,fontWeight:700,fontVariantNumeric:"tabular-nums",marginTop:2}}>{mask(fmt(t.result))}</div>}
              </td>
            ))}
            <td/>
          </tr>
        </tbody>
      </table></div>
    </Card>}

    {view==="chart" && <Card title={startYear === endYear ? `${startYear}: ${t('tracker.forecastVsActual')}` : `${startYear}\u2013${endYear}: ${t('tracker.forecastVsActual')}`}>
      <ResponsiveContainer width="100%" height={isMobile?220:350}><ComposedChart data={multiTotals}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="label" tick={{fill:C.textDim,fontSize:11}} interval={rangeYears.length > 1 ? 2 : 0}/><YAxis tick={{fill:C.textDim,fontSize:11}} tickFormatter={v=>`${Math.round(v/1000)}k`}/><Tooltip formatter={v=>`CHF ${fmt(v)}`} contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13}} labelStyle={{color:C.textMuted}} itemStyle={{color:C.text}}/><Legend/><Area type="monotone" dataKey="forecast" fill={C.accent+"22"} stroke={C.accent} strokeWidth={2} name={t('tracker.forecast')}/><Line type="monotone" dataKey="result" stroke={C.green} strokeWidth={2.5} dot={{fill:C.green,r:4}} name={t('tracker.result')} connectNulls={false}/></ComposedChart></ResponsiveContainer>
    </Card>}

    {view==="compound" && <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"320px 1fr",gap:16}}>
      <Card title={t('tracker.parameters')}><div style={{display:"flex",flexDirection:"column",gap:20}}>
        <div><label style={{fontSize:13,color:C.textMuted}}>{t('tracker.startingBalance')}</label><div style={{fontSize:26,fontWeight:400,fontFamily:"'Fraunces',serif",color:C.accent}}>CHF {mask(fmt(currentTotal))}</div></div>
        <div><label style={{fontSize:13,color:C.textMuted,display:"flex",justifyContent:"space-between"}}><span>{t('tracker.annualGrowthRate')}</span><span style={{color:C.accent,fontWeight:600}}>{growthRate}%</span></label><input type="range" min={0} max={15} step={0.5} value={growthRate} onChange={e=>setGrowthRate(Number(e.target.value))} style={{width:"100%",accentColor:C.accent}}/></div>
        <div><label style={{fontSize:13,color:C.textMuted,display:"flex",justifyContent:"space-between"}}><span>{t('tracker.monthlyContribution')}</span><span style={{color:C.accent,fontWeight:600}}>CHF {fmt(monthlyAdd)}</span></label><input type="range" min={0} max={8000} step={100} value={monthlyAdd} onChange={e=>setMonthlyAdd(Number(e.target.value))} style={{width:"100%",accentColor:C.accent}}/></div>
        <div><label style={{fontSize:13,color:C.textMuted,display:"flex",justifyContent:"space-between"}}><span>{t('tracker.timeHorizon')}</span><span style={{color:C.accent,fontWeight:600}}>{t('tracker.years', {n: years})}</span></label><input type="range" min={1} max={40} step={1} value={years} onChange={e=>setYears(Number(e.target.value))} style={{width:"100%",accentColor:C.accent}}/></div>
        <div style={{padding:16,background:C.bg,borderRadius:10}}><div style={{fontSize:13,color:C.textMuted}}>{t('tracker.projectedIn', {n: years})}</div><div style={{fontSize:30,fontWeight:400,fontFamily:"'Fraunces',serif",color:C.green}}>CHF {mask(fmt(proj[proj.length-1].balance))}</div><div style={{fontSize:13,color:C.textDim,marginTop:4}}>{t('tracker.contributed')}: CHF {mask(fmt(proj[proj.length-1].contributed))}</div><div style={{fontSize:13,color:C.accentLight}}>{t('tracker.growth')}: CHF {mask(fmt(proj[proj.length-1].balance-proj[proj.length-1].contributed))}</div></div>
      </div></Card>
      <Card title={t('tracker.compoundProjection')}>
        <ResponsiveContainer width="100%" height={isMobile?250:400}><AreaChart data={proj}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="year" tick={{fill:C.textDim,fontSize:11}}/><YAxis tick={{fill:C.textDim,fontSize:11}} tickFormatter={v=>v>=1e6?`${(v/1e6).toFixed(1)}M`:`${Math.round(v/1000)}k`}/><Tooltip formatter={v=>`CHF ${fmt(v)}`} contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13}} labelStyle={{color:C.textMuted}} itemStyle={{color:C.text}}/><Legend/><Area type="monotone" dataKey="contributed" fill={C.blue+"33"} stroke={C.blue} strokeWidth={1.5} name={t('tracker.contributed')}/><Area type="monotone" dataKey="balance" fill={C.green+"33"} stroke={C.green} strokeWidth={2} name={t('tracker.withGrowth')}/></AreaChart></ResponsiveContainer>
      </Card>
    </div>}
  </div>;
}

// ───────────────────────────────────────────────────────────────
// EXPENSES — editable subscriptions, yearly expenses, taxes
// ───────────────────────────────────────────────────────────────
const DEFAULT_INS_PROMPT = `You are a Swiss insurance document extractor. Examine the attached file(s) and extract insurance policy data.\n\nRespond with ONLY a raw JSON object — no explanation, no markdown, no code fences.\n\n{"policies":[{"name":"","insurer":"","amount":0,"frequency":1,"notes":""}]}\n\nRules:\n- name: policy type in English (e.g. "Health Insurance (Krankenkasse)", "Supplemental Health (Zusatzversicherung)", "Liability Insurance (Haftpflicht)", "Car Insurance", "Household Insurance", "Life Insurance", "Accident Insurance (UVG)")\n- insurer: insurance company name (e.g. "SWICA", "Helsana", "CSS", "Concordia", "Zurich", "AXA", "Mobiliar")\n- amount: the premium amount exactly as shown in the document (CHF)\n- frequency: match the billing period — 1=Monthly (monatlich), 3=Quarterly (vierteljährlich), 6=Half-yearly (halbjährlich/semester), 12=Yearly (jährlich)\n  IMPORTANT: if document shows "Prämie pro Monat" use frequency=1. If it shows a 6-month total (e.g. Jan–Jun), use frequency=6. If annual, use frequency=12.\n- notes: versicherten-Nr / policy number, coverage type (Grundversicherung / Zusatz), period if relevant\n- Extract ALL policies visible. A single document may cover one policy.`;

const DEFAULT_TAX_PROMPT = `You are a Swiss tax document extractor. Examine the attached tax notice (German, French, or English) and extract the tax amounts.\n\nRespond with ONLY a raw JSON object — no explanation, no markdown, no code fences.\n\n{"year":2026,"lines":[{"type":"State/Municipal Tax (Provisional)","amount":0,"paidAt":""},{"type":"State/Municipal Tax (Final Settlement)","amount":0,"paidAt":""},{"type":"Federal Direct Tax (Provisional)","amount":0,"paidAt":""},{"type":"Federal Direct Tax (Final Settlement)","amount":0,"paidAt":""}]}\n\nRules:\n- year: the Steuerperiode / tax year (4-digit). If not explicitly stated, infer from the document date or period.\n- lines: ALWAYS return exactly all 4 lines with the exact type strings above. Use amount=0 for types not in the document.\n- State/Municipal Tax = Staats- und Gemeindesteuern / Impôt cantonal et communal / Cantonal & Municipal Tax / State Tax / Municipal Tax / Gemeindesteuern / Kantonssteuern\n- Federal Direct Tax = Direkte Bundessteuer (DBSt) / Impôt fédéral direct / Federal Tax / Direct Federal Tax\n- Provisional = Provisorische Rechnung / Vorauszahlung / Provisional / Interim / Advance payment / acomptes provisionnels\n- Final Settlement = Schlussabrechnung / Definitive Veranlagung / Final / Settlement / décompte final\n- amount: total CHF amount (look for "Total", "Total mutmasslicher Steuerbetrag", "Betrag", "Amount due", "Total dû", "Gesamtbetrag")\n- paidAt: first or only payment due date as dd.mm.yyyy if shown, else empty string\n- If the document only covers State/Municipal (e.g. from Gemeinde/municipality) set Federal lines to 0\n- If the document says "Provisional Tax" without specifying federal vs state, map to State/Municipal Tax (Provisional)`;

const DEFAULT_REC_PROMPT = `You are a recurring expenses extractor. Examine the attached file — it may be an invoice, bill, contract, OR a bank/card statement (CSV or PDF with transaction rows).\n\nRespond with ONLY a raw JSON object — no explanation, no markdown, no code fences.\n\n{"expenses":[{"name":"","amount":0,"frequency":12,"notes":""}]}\n\nRules:\n- IF the file is a BANK/CARD STATEMENT with transaction rows:\n  * Scan all rows and identify charges that appear repeatedly (same or very similar description, consistent amounts)\n  * Determine frequency from how often the charge recurs: 1=Monthly, 3=Quarterly, 6=Half-yearly, 12=Yearly\n  * Use the most recent or most common amount for each item\n  * EXCLUDE: income/deposits, transfers between own accounts, one-time purchases, ATM withdrawals\n  * INCLUDE: recurring bills, memberships, transport passes, regular services — NOT digital streaming/app subscriptions (those belong in Subscriptions)\n  * Group transactions with the same merchant under one entry\n- IF the file is an INVOICE/CONTRACT/BILL: extract each recurring cost directly\n- name: descriptive expense name (e.g. "SBB GA Travelcard", "Parking Permit", "Phone Contract", "Gym Membership")\n- amount: cost in CHF\n- frequency: 1=Monthly, 3=Quarterly, 6=Half-yearly, 12=Yearly\n- notes: merchant name or source context\n- If nothing recurring is found, return {"expenses":[]}`;

const DEFAULT_SUB_PROMPT = `You are a subscriptions extractor. Examine the attached file — it may be a bank statement (CSV or PDF), credit card bill, or subscription confirmation email.\n\nRespond with ONLY a raw JSON object — no explanation, no markdown, no code fences.\n\n{"subscriptions":[{"name":"","amount":0,"frequency":1,"account":"","notes":""}]}\n\nRules:\n- IF the file is a BANK/CARD STATEMENT with transaction rows:\n  * Scan all rows and identify recurring digital/streaming/app/software charges\n  * Look for known subscription services: Netflix, Spotify, Apple, Google, Adobe, Microsoft, Amazon Prime, YouTube, Disney+, LinkedIn, Dropbox, iCloud, etc.\n  * Also include any other recurring small charges to digital merchants\n  * Determine frequency from recurrence pattern: 1=Monthly, 3=Quarterly, 6=Half-yearly, 12=Yearly\n  * Use the most recent amount\n- IF the file is a subscription email/invoice: extract directly\n- name: service/product name (e.g. "Netflix", "Spotify", "Adobe CC", "iCloud+")\n- amount: cost in CHF (convert EUR/USD approximately if needed)\n- frequency: 1=Monthly, 3=Quarterly, 6=Half-yearly, 12=Yearly\n- account: payment method or card last 4 digits if visible, else empty string\n- notes: plan tier or other context\n- If nothing found, return {"subscriptions":[]}`;

function ExpensesPage({ subsP, setSubsP, subsPInScenario, setSubsPInScenario, yearly, setYearly, taxes, setTaxes, insurance, setInsurance, hideBalances, profile, accounts, scenarios, darkMode, insPrompt, setInsPrompt, taxPrompt, setTaxPrompt, recPrompt, setRecPrompt, subPrompt, setSubPrompt, t }) {
  const mask = (v) => hideBalances ? "••••" : v;
  const winW = useWindowWidth(); const isMobile = winW < 768;
  const [tab, setTab] = useState("total");
  const [sort, setSort] = useState({key:null,dir:'asc'});
  const toggleSort = (key) => setSort(p => p.key===key ? {key, dir:p.dir==='asc'?'desc':'asc'} : {key, dir:'asc'});

  // ── AI File Import (shared across tabs) ──
  const [expImporting, setExpImporting] = useState(null); // 'insurance'|'taxes'|'recurring'|'subscriptions'
  const [expPreview, setExpPreview] = useState(null);     // {section, data, rawText}
  const [expPromptSection, setExpPromptSection] = useState(null);
  const expImportRef = useRef(null);
  const expImportTargetRef = useRef(null);
  const EXP_PROMPTS = { insurance:[insPrompt,setInsPrompt,DEFAULT_INS_PROMPT], taxes:[taxPrompt,setTaxPrompt,DEFAULT_TAX_PROMPT], recurring:[recPrompt,setRecPrompt,DEFAULT_REC_PROMPT], subscriptions:[subPrompt,setSubPrompt,DEFAULT_SUB_PROMPT] };
  const EXP_LABELS  = { insurance:'Insurance Policies', taxes:'Taxes', recurring:'Recurring Expenses', subscriptions:'Subscriptions' };

  const triggerExpImport = (section) => { expImportTargetRef.current=section; expImportRef.current?.click(); };

  const handleExpImport = async e => {
    const files = Array.from(e.target.files||[]);
    if (!files.length) return;
    e.target.value='';
    const section = expImportTargetRef.current; expImportTargetRef.current=null;
    if (!section) return;
    if (files.reduce((s,f)=>s+f.size,0)>20*1024*1024) { alert('Files too large (max 20MB total).'); return; }
    setExpImporting(section);
    try {
      const attachments = [];
      for (const file of files) {
        const buf=await file.arrayBuffer(); const bytes=new Uint8Array(buf);
        let bin=''; bytes.forEach(b=>bin+=String.fromCharCode(b));
        attachments.push({name:file.name,type:file.type||'application/octet-stream',data:btoa(bin),size:file.size});
      }
      if (!await scanAndConfirmImport(attachments)) { setExpImporting(null); return; }
      const [customPrompt,,defaultPrompt] = EXP_PROMPTS[section];
      const msg = customPrompt?.trim() || defaultPrompt;
      const resp = await fetch(`${API_URL}/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,context:{},history:[],attachments})});
      const reader=resp.body.getReader(); const dec=new TextDecoder(); let buf='',fullText='',done=false;
      while(!done){const chunk=await reader.read();done=chunk.done;if(chunk.value)buf+=dec.decode(chunk.value,{stream:true});const lines=buf.split('\n');buf=lines.pop();for(const line of lines){if(!line.startsWith('data: '))continue;const p=line.slice(6);if(p==='[DONE]'){done=true;break;}try{const d=JSON.parse(p);if(d.text)fullText+=d.text;else if(d.error)fullText='API Error: '+d.error;}catch{}}}
      try{
        const cleaned=fullText.replace(/```(?:json)?\s*/gi,'').replace(/```/g,'').trim();
        const m=cleaned.match(/\{[\s\S]*\}/);
        const parsed=m?JSON.parse(m[0]):null;
        setExpPreview({section,data:parsed,rawText:parsed?null:fullText||'(empty response)'});
      }catch{setExpPreview({section,data:null,rawText:fullText||'(empty response)'});}
    } catch(err){alert('Import failed: '+err.message);}
    setExpImporting(null);
  };

  const confirmExpImport = () => {
    if (!expPreview?.data) return;
    const {section,data} = expPreview;
    if (section==='insurance') {
      const items=(data.policies||[]).map(p=>({id:uid(),name:p.name||'Policy',insurer:p.insurer||'',amount:p.amount||0,frequency:p.frequency||12,notes:p.notes||''}));
      setInsurance(p=>[...p,...items]);
    } else if (section==='taxes') {
      const yr=data.year||new Date().getFullYear();
      const gl=(type)=>{ const l=(data.lines||[]).find(x=>x.type===type); return [l?.amount||0, l?.paidAt||'']; };
      setTaxes(p=>[...p, makeTaxYear(yr,[gl(TAX_TYPES[0]),gl(TAX_TYPES[1]),gl(TAX_TYPES[2]),gl(TAX_TYPES[3])])]);
    } else if (section==='recurring') {
      const items=(data.expenses||[]).map(e=>({id:uid(),name:e.name||'Expense',amount:e.amount||0,frequency:e.frequency||12,notes:e.notes||''}));
      setYearly(p=>[...p,...items]);
    } else if (section==='subscriptions') {
      const items=(data.subscriptions||[]).map(s=>({id:uid(),name:s.name||'Subscription',amount:s.amount||0,frequency:s.frequency||1,account:s.account||'',notes:s.notes||''}));
      setSubsP(p=>[...p,...items]);
    }
    setExpPreview(null);
  };
  const SortTH = ({field, children, w}) => <th onClick={()=>toggleSort(field)} style={{padding:"10px 12px",textAlign:"left",fontSize:13,fontWeight:600,color:C.textDim,borderBottom:`1px solid ${C.border}`,textTransform:"uppercase",letterSpacing:0.5,width:w,cursor:"pointer",userSelect:"none",whiteSpace:"nowrap"}}>
    {children} <span style={{color:sort.key===field?C.accent:C.border,fontSize:10}}>{sort.key===field?(sort.dir==='asc'?'▲':'▼'):'▲'}</span>
  </th>;
  const sortItems = (items, getVal) => {
    if(!sort.key) return items;
    const sorted = [...items].sort((a,b)=>{const va=getVal(a,sort.key),vb=getVal(b,sort.key);if(typeof va==='number'&&typeof vb==='number') return va-vb; return String(va||'').localeCompare(String(vb||''));});
    return sort.dir==='desc'?sorted.reverse():sorted;
  };
  const pTotal = subsPInScenario ? subsP.reduce((s,x)=>s+subMonthly(x),0) : 0;
  const yTotal = yearly.reduce((s,e)=>s+recMonthly(e),0);
  const insTotal = insurance.reduce((s,p)=>s+insMonthlyCalc(p)*12,0);
  const insMonthly = insurance.reduce((s,p)=>s+insMonthlyCalc(p),0);
  const latestTax = taxes[taxes.length-1];
  const latestTaxTotal = latestTax ? latestTax.lines.reduce((s,l)=>s+l.amount,0) : 0;
  const taxMonthly = latestTaxTotal/12;

  const exportTaxReport = () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210, M = 18, CW = W - 2 * M;
    const safe = (s) => String(s||"").replace(/[^\x20-\x7E]/g, c => ({ "\u2013":"-","\u2014":"-","\u2019":"'","\u2018":"'","\u201C":'"',"\u201D":'"',"\u00E4":"ae","\u00F6":"oe","\u00FC":"ue","\u00C4":"Ae","\u00D6":"Oe","\u00DC":"Ue" }[c]||"-"));
    const fmtChf = (n) => "CHF " + Math.round(n).toLocaleString("de-CH").replace(/[\u2019\u2018']/g,"'").replace(/[^\d\-']/g,"'");
    const today = new Date();
    const year = today.getFullYear();

    // Color constants — adapt to current theme
    const dark    = darkMode ? [15,17,23]      : [245,245,247];
    const cardBg  = darkMode ? [26,29,39]      : [255,255,255];
    const accent  = [37,99,235];
    const green   = darkMode ? [34,197,94]     : [22,163,74];
    const red     = darkMode ? [239,68,68]     : [220,38,38];
    const teal    = darkMode ? [20,184,166]    : [13,148,136];
    const yellow  = darkMode ? [234,179,8]     : [202,138,4];
    const orange  = darkMode ? [249,115,22]    : [234,88,12];
    const textCol   = darkMode ? [228,228,231] : [26,26,46];
    const textMuted = darkMode ? [161,161,170] : [82,82,91];
    const textDim   = darkMode ? [113,113,122] : [161,161,170];
    const border    = darkMode ? [42,46,58]    : [224,224,228];

    // Background
    doc.setFillColor(...dark); doc.rect(0,0,W,297,"F");

    // Header bar
    doc.setFillColor(...accent); doc.rect(0,0,W,32,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(18); doc.setTextColor(255,255,255);
    doc.text("Swiss Tax Report",M,14);
    doc.setFontSize(10); doc.setFont("helvetica","normal"); doc.setTextColor(200,220,255);
    doc.text(`Generated ${today.toLocaleDateString("de-CH")} | Tax Year ${year}`,M,22);
    doc.text("Finance Hub",W-M,14,{align:"right"});
    let y = 40;

    // Helper: draw a labeled card
    const drawCard = (title, rows, accentColor) => {
      const h = 14 + rows.length * 7 + 4;
      doc.setFillColor(...cardBg); doc.roundedRect(M-2,y-2,CW+4,h,3,3,"F");
      doc.setFillColor(...(accentColor||accent)); doc.rect(M-2,y-2,2.5,h,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(10); doc.setTextColor(...(accentColor||accent));
      doc.text(safe(title),M+4,y+5);
      let iy = y+13;
      rows.forEach(([label,val,valColor])=>{
        doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(...textMuted);
        doc.text(safe(label),M+5,iy);
        doc.setTextColor(...(valColor||textCol));
        doc.text(safe(val),W-M-2,iy,{align:"right"});
        iy+=7;
      });
      y += h + 5;
    };

    // Two-column helper (Staat | Bund)
    const drawTwoCol = (title, rows, accentColor) => {
      const h = 14 + rows.length * 7 + 4;
      const col1x = M+5, col2x = W/2+2, col3x = W-M-2;
      doc.setFillColor(...cardBg); doc.roundedRect(M-2,y-2,CW+4,h,3,3,"F");
      doc.setFillColor(...(accentColor||accent)); doc.rect(M-2,y-2,2.5,h,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(10); doc.setTextColor(...(accentColor||accent));
      doc.text(safe(title),M+4,y+5);
      doc.setFontSize(8); doc.setTextColor(...textDim);
      doc.text("Staat",col2x,y+5,{align:"right"});
      doc.text("Bund",col3x,y+5,{align:"right"});
      let iy=y+13;
      rows.forEach(([label,staat,bund,rowColor])=>{
        doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(...textMuted);
        doc.text(safe(label),col1x,iy);
        doc.setTextColor(...(rowColor||textCol));
        doc.text(safe(staat),col2x,iy,{align:"right"});
        doc.text(safe(bund),col3x,iy,{align:"right"});
        iy+=7;
      });
      y += h + 5;
    };

    // ── Calculations ──
    const sc = scenarios && (scenarios.find(s=>s.isActive) || scenarios[0]);
    const grossMonthly = sc ? sc.incomes.reduce((s,x)=>s+(x.amount||0),0) : 0;
    const grossAnnual = grossMonthly * 12;
    const ahv = grossAnnual * 0.053;
    const bvgMonthly = sc ? sc.savings.filter(x=>(x.label||"").toLowerCase().includes("bvg")||(x.label||"").toLowerCase().includes("2a")).reduce((s,x)=>s+(x.amount||0),0) : 0;
    const bvg = bvgMonthly * 12;
    const is3a = s => { const n=(s.label||s.name||"").toLowerCase(); return n.includes("3a")||n.includes("pillar 3")||n.includes("frankly")||n.includes("viac")||n.includes("finpension")||n.includes("3. s"); };
    const pillar3aFromInvestments = sc ? (sc.investments||[]).filter(is3a).reduce((s,x)=>s+(x.amount||0),0)*12 : 0;
    const pillar3aFromYearly = yearly.filter(e=>is3a(e)).reduce((s,e)=>s+recMonthly(e)*12,0);
    const pillar3a = Math.min(Math.max(pillar3aFromInvestments, pillar3aFromYearly), 7258);
    const hasChildren = profile && profile.children && parseInt(profile.children)>0;
    const healthKeywords = ["swica","css","concordia","helsana","visana","sanitas","assura","atupri","krankenkasse","health insurance","krankenversicherung"];
    const versAnnual = insurance.filter(p=>healthKeywords.some(k=>(p.name||"").toLowerCase().includes(k))||["health","krankenversicherung"].includes((p.category||"").toLowerCase())).reduce((s,p)=>s+insMonthlyCalc(p)*12,0);
    const hasBvg = bvg > 0;
    const versCapStaat = hasChildren ? (hasBvg?5800:5200) : (hasBvg?2900:2600);
    const versCapBund  = hasChildren ? (hasBvg?3600:3200) : (hasBvg?1800:1700);
    const versStaat = Math.min(versAnnual, versCapStaat);
    const versBund  = Math.min(versAnnual, versCapBund);
    const berufsauslagen = Math.min(grossAnnual*0.03, 4000);
    const taxableStaat = Math.max(0, grossAnnual - ahv - bvg - pillar3a - berufsauslagen - versStaat);
    const taxableBund = Math.max(0, grossAnnual - ahv - bvg - pillar3a - berufsauslagen - versBund);
    const isPension = a => ["Pension 2A","Pension 3A"].includes(a.type)||(a.name||"").toLowerCase().includes("2a pillar")||(a.name||"").toLowerCase().includes("3a pillar")||(a.name||"").toLowerCase().includes("pillar 2")||(a.name||"").toLowerCase().includes("pillar 3");
    const taxableDebt = accounts ? accounts.filter(a=>a.type==="Debt").reduce((s,a)=>s+(a.balance||0),0) : 0;
    const taxableWealth = accounts ? Math.max(0, accounts.filter(a=>!isPension(a)&&a.type!=="Debt").reduce((s,a)=>s+(a.balance||0),0) - taxableDebt) : 0;

    // ── Document Checklist ──
    const docs = [
      ["Lohnausweis",              "Salary cert from employer  ->  Ziffer 100"],
      ["Saule 3A Bescheinigungen", "One cert per 3A account (Frankly/VIAC/...)  ->  Ziffer 260"],
      ["BVG Vorsorgeausweis",      "Annual pension statement  ->  check Einkaufspotenzial"],
      ["Krankenkasse Pramien",     "All health insurance invoices  ->  Ziffer 270 / 606"],
      ["Kontoauszug 31.12.",       "Year-end balance for every bank account  ->  Ziffer 400"],
      ["Depotauszug 31.12.",       "Year-end investment statement (Swissquote/Yuh)  ->  Ziffer 400"],
      ["Weiterbildungs-Belege",    "Course receipts, ebooks, conferences  ->  Ziffer 292"],
      ["Steuerrechnungen",         "All provisional + final invoices  ->  for history"],
      ["Schuldenverzeichnis",      "Mortgage / loan statements  ->  Ziffer 470 (wealth deduction)"],
      ["AHV-Abrechnung",           "Required if self-employed or side income  ->  Ziffer 120"],
      ["Bank Steuerausweis",        "Annual tax statement: interest + dividends received  ->  Wertschriftenverzeichnis"],
      ["DA-1 Form",                 "Reclaim 35% withholding tax on dividends  ->  Ziffer 650 / auto in ZHprivateTax"],
    ];
    const docsHalf = Math.ceil(docs.length/2);
    const docsH = 16 + docsHalf * 8 + 4;
    doc.setFillColor(...cardBg); doc.roundedRect(M-2,y-2,CW+4,docsH,3,3,"F");
    doc.setFillColor(...teal); doc.rect(M-2,y-2,2.5,docsH,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(10); doc.setTextColor(...teal);
    doc.text("DOCUMENTS TO COLLECT",M+4,y+5);
    doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(...textMuted);
    doc.text("Gather all of these before opening ZHprivateTax / eSteuer",M+5,y+11);
    const dc1=M+5, dc2=W/2+2;
    docs.forEach(([title,hint],i)=>{
      const cx = i<docsHalf ? dc1 : dc2;
      const iy = y+17+(i%docsHalf)*8;
      doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(...textCol);
      doc.text("[ ] "+safe(title), cx, iy);
      doc.setFont("helvetica","normal"); doc.setFontSize(6.5); doc.setTextColor(...textDim);
      doc.text(safe(hint), cx+5, iy+3.5);
    });
    y += docsH + 5;

    // ── Deduction Tips (categorised) ──
    // Each group: { label, color, items: [[title, hint], ...] }
    const tipGroups = [
      { label:"PENSION & VORSORGE", color:accent, items:[
        ["Saule 3A  (Ziff. 260)",    "Max CHF 7'258/yr — top up before 31.12. Deductible Staat + Bund. Split across multiple accounts OK."],
        ["BVG Einkauf  (Ziff. 280)", "Most powerful deduction: 100% tax-free. Request Vorsorgeausweis, check Einkaufspotenzial. Often CHF 5k-50k+."],
      ]},
      { label:"BERUFSAUSLAGEN", color:green, items:[
        ["Fahrkosten  (Ziff. 205)",  "GA/Halbtax receipt or km to work. Cap CHF 5'200 Staat / CHF 3'300 Bund. Keep all ticket stubs."],
        ["Verpflegung  (Ziff. 208)", "CHF 3'200 pauschal if >60 days/yr away from main workplace. Usually auto-added."],
        ["Berufskosten  (Ziff. 212)","3% of net salary, min CHF 2'000, max CHF 4'000. Covers tools, books, equipment."],
        ["Weiterbildung  (Ziff. 292)","Job-related courses, certs, conferences up to CHF 12'900/yr. Keep all invoices & certificates."],
      ]},
      { label:"EINZELFIRMA / NEBENERWERB", color:orange, items:[
        ["Verlust verrechnen  (Ziff. 120)","Einzelfirma loss directly reduces employment income — no separate business tax. One combined return."],
        ["Geschaeftsaufwand",         "All business costs deductible: home office, equipment, travel, marketing, phone, software, materials."],
        ["AHV auf Selbsterwerb",      "AHV/IV contributions on self-employment income are deductible from taxable income (Ziff. 280)."],
        ["Abschreibungen",            "Depreciate business assets (laptop, tools, car). Split private/business usage proportionally."],
      ]},
      { label:"VERSICHERUNG & GESUNDHEIT", color:teal, items:[
        ["Versicherungsabzug  (Ziff. 270)","Lower of actual premiums or flat rate. With 2. Saule: CHF 2'900 Staat / CHF 1'800 Bund."],
        ["Krankenkosten  (Ziff. 320)","Medical costs above 5% of Reineinkommen deductible. Include Franchise, Selbstbehalt, dental."],
      ]},
      { label:"WEITERE ABZUGE", color:yellow, items:[
        ["Spenden  (Ziff. 324)",      "Swiss charities above CHF 100 fully deductible. Need written confirmation — no upper limit."],
        ["Schuldzinsen  (Ziff. 250)", "Mortgage & loan interest fully deductible. Attach Schuldenverzeichnis with statement."],
      ]},
      { label:"KAPITALANLAGEN & QUELLENSTEUER", color:blue, items:[
        ["Wertschriftenverzeichnis  (Ziff. 400/650)", "Declare ALL securities (stocks, ETFs, funds, crypto). Triggers automatic DA-1 refund for Swiss withholding tax. Required to declare dividend/interest income."],
        ["Verrechnungssteuer DA-1  (Ziff. 650)", "Swiss companies deduct 35% from dividends. As resident you reclaim 100% via DA-1. Foreign dividends: partial reclaim via double-taxation treaty (DA-1 / R-US / R-D etc.)"],
        ["Quellensteuer auf Bankzins  (Ziff. 400)", "Banks deduct 35% withholding on interest income. Declare account balance — refund processed automatically by ZH tax authority."],
      ]},
    ];
    // measure total height: header 14 + per group: groupHeader 9 + items * 9
    const totalTipItems = tipGroups.reduce((s,g)=>s+g.items.length,0);
    const totalTipGroups = tipGroups.length;
    const tipsH = 14 + totalTipGroups*9 + totalTipItems*9 + 4;
    // split groups into two columns
    const leftGroups=[], rightGroups=[];
    let leftItems=0, rightItems=0;
    tipGroups.forEach(g=>{ if(leftItems<=rightItems){leftGroups.push(g);leftItems+=g.items.length;}else{rightGroups.push(g);rightItems+=g.items.length;} });
    const estimatedH = 14 + Math.max(leftGroups.reduce((s,g)=>s+9+g.items.length*9,0), rightGroups.reduce((s,g)=>s+9+g.items.length*9,0)) + 4;
    doc.setFillColor(...cardBg); doc.roundedRect(M-2,y-2,CW+4,estimatedH,3,3,"F");
    doc.setFillColor(...yellow); doc.rect(M-2,y-2,2.5,estimatedH,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(10); doc.setTextColor(...yellow);
    doc.text("DEDUCTION TIPS & TRICKS",M+4,y+5);
    doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(...textMuted);
    doc.text("Often-missed deductions — each one reduces your taxable income",M+5,y+11);
    const renderTipCol = (groups, cx, colW) => {
      let gy = y+16;
      groups.forEach(g=>{
        doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(...g.color);
        doc.text(safe(g.label), cx, gy); gy+=5;
        g.items.forEach(([title,hint])=>{
          doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(...textCol);
          doc.text(safe(title), cx+2, gy);
          doc.setFont("helvetica","normal"); doc.setFontSize(6.5); doc.setTextColor(...textDim);
          doc.text(doc.splitTextToSize(safe(hint), colW-4), cx+2, gy+3); gy+=9;
        });
        gy+=2;
      });
    };
    const halfW = (CW-4)/2;
    renderTipCol(leftGroups,  M+5,    halfW);
    renderTipCol(rightGroups, M+5+halfW+4, halfW);
    y += estimatedH + 5;

    // ── Personal Information ──
    const p = profile || {};
    drawCard("PERSONAL INFORMATION", [
      ["Name", `${p.firstName||""} ${p.lastName||""}`.trim()||"—"],
      ["AHV Number", p.ahvNumber||"—"],
      ["Canton / City", [p.canton, p.city].filter(Boolean).join(" / ")||"—"],
      ["Marital Status", p.maritalStatus||"—"],
      ["Religion", p.religion||"—"],
      ["Children", p.children||"0"],
    ], accent);

    // ── Income Summary ──
    drawCard("INCOME SUMMARY", [
      ["Gross Annual Income", fmtChf(grossAnnual), green],
      ["Gross Monthly", fmtChf(grossMonthly), green],
      ["Active Scenario", sc ? safe(sc.name) : "None", textMuted],
    ], green);

    // ── Deductions ──
    drawTwoCol("DEDUCTIONS", [
      ["AHV 5.3%",            fmtChf(ahv),           fmtChf(ahv)],
      ["BVG (Pension 2A)",    fmtChf(bvg),           fmtChf(bvg)],
      [`Pillar 3A (max 7'258)`, fmtChf(pillar3a),    fmtChf(pillar3a)],
      ["Versicherungsabzug",  fmtChf(versStaat),     fmtChf(versBund)],
      ["Berufsauslagen pauschal", fmtChf(berufsauslagen), fmtChf(berufsauslagen)],
    ], yellow);

    // ── Taxable Income ──
    drawTwoCol("TAXABLE INCOME (EST.)", [
      ["Taxable Income", fmtChf(taxableStaat), fmtChf(taxableBund), green],
    ], teal);

    // ── Wealth Snapshot ──
    const wealthRows = accounts ? accounts.filter(a=>!isPension(a)).map(a=>[safe(a.name), fmtChf(a.balance||0)]) : [];
    wealthRows.push(["TOTAL TAXABLE WEALTH", fmtChf(taxableWealth), green]);
    drawCard("WEALTH SNAPSHOT (excl. 2A/3A)", wealthRows, orange);

    // ── Tax Payment History ── (may need new page)
    if (y > 220) { doc.addPage(); doc.setFillColor(...dark); doc.rect(0,0,W,297,"F"); y=20; }
    const taxRows = [...taxes].sort((a,b)=>b.year-a.year).flatMap(t=>
      t.lines.map(l=>[`${t.year} – ${safe(l.type)}`, fmtChf(l.amount), l.paidAt||"—"])
    );
    if (taxRows.length) {
      const h = 14 + taxRows.length*7 + 4;
      doc.setFillColor(...cardBg); doc.roundedRect(M-2,y-2,CW+4,h,3,3,"F");
      doc.setFillColor(...red); doc.rect(M-2,y-2,2.5,h,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(10); doc.setTextColor(...red);
      doc.text("TAX PAYMENT HISTORY",M+4,y+5);
      doc.setFontSize(8); doc.setTextColor(...textDim);
      doc.text("Amount",W-M-30,y+5,{align:"right"}); doc.text("Paid At",W-M-2,y+5,{align:"right"});
      let iy=y+13;
      taxRows.forEach(([label,amt,paidAt])=>{
        doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(...textMuted);
        doc.text(safe(label),M+5,iy);
        doc.setTextColor(...textCol);
        doc.text(safe(amt),W-M-30,iy,{align:"right"});
        doc.setTextColor(...textDim);
        doc.text(safe(paidAt),W-M-2,iy,{align:"right"});
        iy+=7;
      });
      y += h + 5;
    }

    // ── Footer ──
    doc.setFontSize(7); doc.setTextColor(...textDim);
    doc.text("Estimated values for planning purposes only. Finance Hub Tax Report.",M,290);
    doc.text(today.toLocaleDateString("de-CH"),W-M,290,{align:"right"});

    const filename = `swiss_tax_report_${year}.pdf`;
    const dataUri = doc.output("datauristring");
    const w = window.open("","_blank");
    if(w){ w.document.write(`<!DOCTYPE html><html><head><title>${filename}</title><style>*{margin:0;padding:0}body{background:#222}iframe{width:100%;height:100vh;border:none}</style></head><body><iframe src="${dataUri}"></iframe></body></html>`); w.document.close(); }
  };

  const SubTable = ({items, setItems, title, accentColor}) => {
    const add = ()=>setItems(p=>[...p,{id:uid(),name:"New Subscription",amount:0,frequency:1,account:"",notes:""}]);
    const del = (id)=>setItems(p=>p.filter(x=>x.id!==id));
    const edit = (id,f,v)=>setItems(p=>p.map(x=>x.id===id?{...x,[f]:v}:x));
    const tot = items.reduce((s,x)=>s+toMonthly(x.amount,x.frequency),0);
    const subGetVal = (s,k) => k==='name'?s.name:k==='amount'?s.amount:k==='frequency'?s.frequency:k==='effective'?toMonthly(s.amount,s.frequency):k==='account'?s.account:k==='notes'?s.notes:'';
    const sorted = sortItems(items, subGetVal);
    return <Card title={title} headerRight={<span style={{fontSize:14,color:accentColor,fontWeight:600}}>CHF {mask(fmtD(tot))}{t('common.perMo')}</span>}>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:580}}><thead><tr><SortTH field="name">{t('col.name')}</SortTH><SortTH field="amount">{t('col.amount')}</SortTH><SortTH field="frequency">{t('col.frequency')}</SortTH><SortTH field="effective">{t('col.effectiveMo')}</SortTH><SortTH field="account">{t('col.payment')}</SortTH><SortTH field="notes">{t('col.notes')}</SortTH><TH w={30}></TH></tr></thead>
      <tbody>
        {sorted.map(s=><tr key={s.id} onMouseEnter={e=>e.currentTarget.style.background=C.cardHover} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <td style={{padding:"8px 12px",fontSize:14,borderBottom:`1px solid ${C.border}11`}}><InlineEdit value={s.name} onChange={v=>edit(s.id,"name",v)} inputWidth={160}/></td>
          <td style={{padding:"8px 12px",fontSize:14,borderBottom:`1px solid ${C.border}11`,fontVariantNumeric:"tabular-nums"}}>{hideBalances ? <span style={{color:C.text}}>••••</span> : <InlineNum value={s.amount} onChange={v=>edit(s.id,"amount",v??0)} width={70}/>}</td>
          <td style={{padding:"8px 12px",fontSize:14,borderBottom:`1px solid ${C.border}11`}}><select value={s.frequency||1} onChange={e=>edit(s.id,"frequency",Number(e.target.value))} style={{padding:"3px 6px",borderRadius:6,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:13,cursor:"pointer"}}>{FREQ_OPTIONS.map(o=><option key={o.value} value={o.value}>{t(`freq.${o.label}`)}</option>)}</select></td>
          <td style={{padding:"8px 12px",fontSize:14,borderBottom:`1px solid ${C.border}11`,fontVariantNumeric:"tabular-nums",color:accentColor,fontWeight:600}}>{mask(fmtD(toMonthly(s.amount,s.frequency)))}</td>
          <td style={{padding:"8px 12px",fontSize:14,borderBottom:`1px solid ${C.border}11`}}><InlineEdit value={s.account} onChange={v=>edit(s.id,"account",v)} placeholder={t("expenses.accountPlaceholder")} style={{color:C.textDim,fontSize:12}} inputWidth={110}/></td>
          <td style={{padding:"8px 12px",fontSize:13,color:C.textDim,borderBottom:`1px solid ${C.border}11`}}><InlineEdit value={s.notes||""} onChange={v=>edit(s.id,"notes",v)} placeholder={t("expenses.notesPlaceholder")} style={{color:C.textDim}} inputWidth={100}/></td>
          <td style={{padding:"8px 12px",borderBottom:`1px solid ${C.border}11`}}><DelBtn onClick={()=>del(s.id)}/></td>
        </tr>)}
        <tr style={{background:C.bg}}><td style={{padding:"10px 12px",fontWeight:700}} colSpan={3}>Total</td><td style={{padding:"10px 12px",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{mask(fmtD(tot))}</td><td colSpan={3}/></tr>
        <AddRow onClick={add} label={t("expenses.addSubscription")} colSpan={7}/>
      </tbody></table></div>
    </Card>;
  };

  // Insurance editing helpers
  const insEdit = (id,f,v)=>setInsurance(p=>p.map(x=>x.id===id?{...x,[f]:v}:x));
  const insAdd = ()=>setInsurance(p=>[...p,{id:uid(),name:"New Policy",insurer:"",amount:0,frequency:12,notes:""}]);
  const insDel = (id)=>setInsurance(p=>p.filter(x=>x.id!==id));

  // ── Reusable import/prompt button bar ──
  const ImportBar = ({section, color}) => {
    const [prompt,,] = EXP_PROMPTS[section];
    return <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
      <button onClick={()=>triggerExpImport(section)} disabled={expImporting===section}
        style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',borderRadius:6,border:`1px solid ${C.border}`,background:'transparent',cursor:expImporting===section?'not-allowed':'pointer',color:expImporting===section?C.textDim:C.textMuted,fontSize:12}}>
        {expImporting===section ? <><RefreshCw size={12} style={{animation:'spin 1s linear infinite'}}/>Parsing…</> : <><Upload size={12}/>Import</>}
      </button>
      <button onClick={()=>setExpPromptSection(section)}
        style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',borderRadius:6,border:`1px solid ${prompt?C.accentLight:C.border}`,background:'transparent',cursor:'pointer',color:prompt?C.accentLight:C.textDim,fontSize:12}}>
        <Sparkles size={12}/>Prompt{prompt?' ✓':''}
      </button>
    </div>;
  };

  return <div>
    <input type="file" ref={expImportRef} style={{display:'none'}} accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.xlsx,.xls" multiple onChange={handleExpImport}/>

    {/* Prompt editor modal */}
    {expPromptSection && (()=>{
      const [prompt, setPrompt, defaultPrompt] = EXP_PROMPTS[expPromptSection];
      const label = EXP_LABELS[expPromptSection];
      return <div onClick={()=>setExpPromptSection(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
        <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,width:'100%',maxWidth:1140,maxHeight:'84vh',overflowY:'auto',padding:28,boxShadow:'0 24px 80px rgba(0,0,0,0.6)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
            <h2 style={{margin:0,fontSize:18,fontWeight:700,color:C.text}}>{t("expenses.extractionPromptTitle", {section: label})}</h2>
            <button onClick={()=>setExpPromptSection(null)} style={{background:'transparent',border:'none',cursor:'pointer',color:C.textDim}}><X size={18}/></button>
          </div>
          <p style={{margin:'0 0 12px',fontSize:13,color:C.textDim}}>Customise the AI prompt used when importing {label.toLowerCase()} from files. Leave blank to use the built-in default.</p>
          <div style={{display:'flex',gap:8,marginBottom:10}}>
            <button onClick={()=>setPrompt(defaultPrompt)} style={{padding:'6px 12px',borderRadius:6,border:`1px solid ${C.border}`,background:'transparent',color:C.textMuted,fontSize:13,cursor:'pointer'}}>Load default</button>
            <button onClick={()=>setPrompt('')} style={{padding:'6px 12px',borderRadius:6,border:`1px solid ${C.border}`,background:'transparent',color:C.textMuted,fontSize:13,cursor:'pointer'}}>Reset to blank</button>
          </div>
          <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Leave blank to use the built-in default…" rows={24}
            style={{width:'100%',padding:'10px 12px',borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:13,outline:'none',resize:'vertical',boxSizing:'border-box',fontFamily:"'DM Mono',monospace",lineHeight:1.5}}/>
          {prompt && <div style={{marginTop:6,fontSize:12,color:C.green}}>✓ Custom prompt active — will be used instead of the default.</div>}
          <button onClick={()=>setExpPromptSection(null)} style={{width:'100%',padding:'11px',borderRadius:8,border:'none',background:C.accent,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',marginTop:12}}>Save & Close</button>
        </div>
      </div>;
    })()}

    {/* Import preview modal */}
    {expPreview && <div onClick={()=>setExpPreview(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,width:'100%',maxWidth:860,maxHeight:'84vh',overflowY:'auto',padding:28,boxShadow:'0 24px 80px rgba(0,0,0,0.6)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <div><h3 style={{margin:'0 0 2px',fontSize:17,fontWeight:700,color:C.text}}>Import Preview — {EXP_LABELS[expPreview.section]}</h3>
            <div style={{fontSize:12,color:C.textDim}}>Review extracted data before adding</div></div>
          <button onClick={()=>setExpPreview(null)} style={{background:'transparent',border:'none',cursor:'pointer',color:C.textDim}}><X size={18}/></button>
        </div>
        {expPreview.data ? <>
          {/* Insurance preview */}
          {expPreview.section==='insurance' && (expPreview.data.policies||[]).length>0 && <table style={{width:'100%',borderCollapse:'collapse',fontSize:13,marginBottom:16}}>
            <thead><tr>{['Policy','Insurer','Amount','Frequency','Notes'].map((h,i)=><th key={i} style={{padding:'5px 8px',textAlign:'left',fontSize:12,color:C.textDim,fontWeight:600,borderBottom:`1px solid ${C.border}`}}>{h}</th>)}</tr></thead>
            <tbody>{(expPreview.data.policies||[]).map((p,i)=><tr key={i} style={{borderBottom:`1px solid ${C.border}22`}}>
              <td style={{padding:'5px 8px',color:C.text}}>{p.name}</td>
              <td style={{padding:'5px 8px',color:C.textMuted}}>{p.insurer}</td>
              <td style={{padding:'5px 8px',color:C.green,fontWeight:600}}>CHF {(p.amount||0).toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
              <td style={{padding:'5px 8px'}}><select value={p.frequency||12} onChange={ev=>setExpPreview(prev=>({...prev,data:{...prev.data,policies:prev.data.policies.map((x,j)=>j===i?{...x,frequency:Number(ev.target.value)}:x)}}))} style={{padding:'3px 6px',borderRadius:6,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:12,cursor:'pointer'}}>{FREQ_OPTIONS.map(o=><option key={o.value} value={o.value}>{t(`freq.${o.label}`)}</option>)}</select></td>
              <td style={{padding:'5px 8px',color:C.textDim,fontSize:11}}>{p.notes||'—'}</td>
            </tr>)}</tbody>
          </table>}
          {/* Tax preview */}
          {expPreview.section==='taxes' && <><div style={{marginBottom:8,fontSize:14,color:C.textMuted}}>Tax year: <strong style={{color:C.text}}>{expPreview.data.year}</strong></div>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13,marginBottom:16}}>
              <thead><tr>{['Tax Type','Amount (CHF)','Pay date'].map((h,i)=><th key={i} style={{padding:'5px 8px',textAlign:i===1?'right':'left',fontSize:12,color:C.textDim,fontWeight:600,borderBottom:`1px solid ${C.border}`}}>{h}</th>)}</tr></thead>
              <tbody>{(expPreview.data.lines||[]).map((l,i)=><tr key={i} style={{borderBottom:`1px solid ${C.border}22`}}>
                <td style={{padding:'5px 8px',color:C.text}}>{l.type}</td>
                <td style={{padding:'5px 8px',textAlign:'right',color:l.amount>0?C.red:C.textDim,fontWeight:l.amount>0?600:400}}>CHF {(l.amount||0).toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                <td style={{padding:'5px 8px',color:C.textDim,fontSize:11}}>{l.paidAt||'—'}</td>
              </tr>)}</tbody>
            </table></>}
          {/* Recurring preview */}
          {expPreview.section==='recurring' && (expPreview.data.expenses||[]).length>0 && <table style={{width:'100%',borderCollapse:'collapse',fontSize:13,marginBottom:16}}>
            <thead><tr>{['Expense','Amount','Frequency','Notes'].map((h,i)=><th key={i} style={{padding:'5px 8px',textAlign:'left',fontSize:12,color:C.textDim,fontWeight:600,borderBottom:`1px solid ${C.border}`}}>{h}</th>)}</tr></thead>
            <tbody>{(expPreview.data.expenses||[]).map((e,i)=><tr key={i} style={{borderBottom:`1px solid ${C.border}22`}}>
              <td style={{padding:'5px 8px',color:C.text}}>{e.name}</td>
              <td style={{padding:'5px 8px',color:C.blue,fontWeight:600}}>CHF {(e.amount||0).toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
              <td style={{padding:'5px 8px'}}><select value={e.frequency||12} onChange={ev=>setExpPreview(prev=>({...prev,data:{...prev.data,expenses:prev.data.expenses.map((x,j)=>j===i?{...x,frequency:Number(ev.target.value)}:x)}}))} style={{padding:'3px 6px',borderRadius:6,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:12,cursor:'pointer'}}>{FREQ_OPTIONS.map(o=><option key={o.value} value={o.value}>{t(`freq.${o.label}`)}</option>)}</select></td>
              <td style={{padding:'5px 8px',color:C.textDim,fontSize:11}}>{e.notes||'—'}</td>
            </tr>)}</tbody>
          </table>}
          {/* Subscriptions preview */}
          {expPreview.section==='subscriptions' && (expPreview.data.subscriptions||[]).length>0 && <table style={{width:'100%',borderCollapse:'collapse',fontSize:13,marginBottom:16}}>
            <thead><tr>{['Name','Amount','Frequency','Account','Notes'].map((h,i)=><th key={i} style={{padding:'5px 8px',textAlign:'left',fontSize:12,color:C.textDim,fontWeight:600,borderBottom:`1px solid ${C.border}`}}>{h}</th>)}</tr></thead>
            <tbody>{(expPreview.data.subscriptions||[]).map((s,i)=><tr key={i} style={{borderBottom:`1px solid ${C.border}22`}}>
              <td style={{padding:'5px 8px',color:C.text}}>{s.name}</td>
              <td style={{padding:'5px 8px',color:C.accent,fontWeight:600}}>CHF {(s.amount||0).toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
              <td style={{padding:'5px 8px'}}><select value={s.frequency||1} onChange={ev=>setExpPreview(prev=>({...prev,data:{...prev.data,subscriptions:prev.data.subscriptions.map((x,j)=>j===i?{...x,frequency:Number(ev.target.value)}:x)}}))} style={{padding:'3px 6px',borderRadius:6,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:12,cursor:'pointer'}}>{FREQ_OPTIONS.map(o=><option key={o.value} value={o.value}>{t(`freq.${o.label}`)}</option>)}</select></td>
              <td style={{padding:'5px 8px',color:C.textDim,fontSize:11}}>{s.account||'—'}</td>
              <td style={{padding:'5px 8px',color:C.textDim,fontSize:11}}>{s.notes||'—'}</td>
            </tr>)}</tbody>
          </table>}
          <button onClick={confirmExpImport} style={{width:'100%',padding:'11px',borderRadius:8,border:'none',background:C.accent,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer'}}>Add to {EXP_LABELS[expPreview.section]}</button>
        </> : <>
          <div style={{marginBottom:10,fontSize:14,color:C.textMuted}}>Could not parse structured data. Raw AI response:</div>
          <pre style={{background:C.bg,padding:12,borderRadius:8,fontSize:12,color:C.text,overflowX:'auto',maxHeight:300,overflowY:'auto',whiteSpace:'pre-wrap'}}>{expPreview.rawText}</pre>
          <button onClick={()=>setExpPreview(null)} style={{marginTop:12,padding:'8px 16px',borderRadius:8,border:`1px solid ${C.border}`,background:'transparent',color:C.textMuted,fontSize:14,cursor:'pointer'}}>Close</button>
        </>}
      </div>
    </div>}

    <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:isMobile?10:16,marginBottom:20}}>
      <StatCard label={t('expenses.tabs.subscriptions')} value={`CHF ${mask(fmt(Math.round(pTotal)))}${t('common.mo')}`} icon={CreditCard} color={C.accent} compact={isMobile}/>
      <StatCard label={t('expenses.tabs.recurring')} value={`CHF ${mask(fmt(Math.round(yTotal)))}${t('common.mo')}`} sub={t('expenses.monthlyProvision')} icon={DollarSign} color={C.blue} compact={isMobile}/>
      <StatCard label={t('expenses.tabs.insurance')} value={`CHF ${mask(fmt(Math.round(insMonthly)))}${t('common.mo')}`} sub={hideBalances?undefined:`CHF ${fmt(Math.round(insTotal))}${t('common.yr')}`} icon={Shield} color={C.green} compact={isMobile}/>
      <StatCard label={`${t('expenses.tabs.taxes')} (${latestTax?.year||"—"})`} value={`CHF ${mask(fmt(Math.round(taxMonthly)))}${t('common.mo')}`} sub={hideBalances?undefined:`CHF ${fmt(Math.round(latestTaxTotal))}${t('common.yr')}`} icon={BarChart3} color={C.red} compact={isMobile}/>
    </div>
    <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
      <Tab active={tab==="total"} onClick={()=>setTab("total")}>{t("expenses.tabs.total")}</Tab>
      <Tab active={tab==="recurring"} onClick={()=>setTab("recurring")}>{t("expenses.tabs.recurring")}</Tab>
      <Tab active={tab==="subscriptions"} onClick={()=>setTab("subscriptions")}>{t("expenses.tabs.subscriptions")}</Tab>
      <Tab active={tab==="insurance"} onClick={()=>setTab("insurance")}>{t("expenses.tabs.insurance")}</Tab>
      <Tab active={tab==="taxes"} onClick={()=>setTab("taxes")}>{t("expenses.tabs.taxes")}</Tab>
    </div>

    {tab==="total" && (()=>{
      const subRows = (subsPInScenario ? subsP : []).map(s=>({label:s.name, monthly:subMonthly(s), source:"Subscriptions", color:C.accent}));
      const recRows = yearly.map(e=>({label:e.name, monthly:recMonthly(e), source:"Recurring", color:C.cyan}));
      const insRows = insurance.map(p=>({label:p.name, monthly:insMonthlyCalc(p), source:"Insurances", color:C.green}));
      const taxRows = latestTax ? [{label:"Tax Provision (est.)", monthly:taxMonthly, source:"Taxes", color:C.red}] : [];
      const allRows = [...subRows,...recRows,...insRows,...taxRows];
      const grandTotal = allRows.reduce((s,r)=>s+r.monthly,0);
      const groups = [
        {label:t("expenses.tabs.subscriptions"),total:pTotal,color:C.accent},
        {label:t("expenses.tabs.recurring"),total:yTotal,color:C.cyan},
        {label:t("expenses.tabs.insurance"),total:insMonthly,color:C.green},
        {label:t("expenses.taxProv"),total:taxMonthly,color:C.red},
      ];
      return <Card title={t("expenses.summary")} headerRight={<span style={{fontSize:17,fontWeight:700,color:C.accent}}>CHF {mask(fmtD(grandTotal))}{t('common.perMo')}</span>}>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:isMobile?8:12,marginBottom:20}}>
          {groups.map((g,i)=><div key={i} style={{padding:isMobile?"8px 10px":12,borderRadius:8,background:C.bg,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:isMobile?10:11,color:g.color,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4,lineHeight:1.3}}>{g.label}</div>
            <div style={{fontSize:isMobile?14:18,fontWeight:700,color:C.text}}>CHF {mask(fmt(Math.round(g.total)))}</div>
            <div style={{fontSize:isMobile?10:11,color:C.textDim}}>{grandTotal>0?pct(g.total/grandTotal):"0%"} {t('common.ofTotal')}</div>
          </div>)}
        </div>
        {(()=>{const totGetVal=(r,k)=>k==='label'?r.label:k==='source'?r.source:k==='monthly'?r.monthly:k==='yearly'?r.monthly*12:0;const sortedRows=sortItems(allRows,totGetVal);return <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:isMobile?380:undefined}}><thead><tr><SortTH field="label">{t('col.expense')}</SortTH><SortTH field="source">{t('col.category')}</SortTH><SortTH field="monthly">{t('col.monthly')}</SortTH>{!isMobile&&<SortTH field="yearly">{t('col.yearly')}</SortTH>}</tr></thead>
        <tbody>
          {sortedRows.map((r,i)=><tr key={i} onMouseEnter={e=>e.currentTarget.style.background=C.cardHover} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <td style={{padding:"8px 12px",fontSize:14,borderBottom:`1px solid ${C.border}11`}}>{r.label}</td>
            <td style={{padding:"8px 12px",borderBottom:`1px solid ${C.border}11`}}><Badge color={r.color}>{r.source}</Badge></td>
            <td style={{padding:"8px 12px",fontSize:14,fontVariantNumeric:"tabular-nums",borderBottom:`1px solid ${C.border}11`}}>{mask(fmtD(r.monthly))}</td>
            {!isMobile&&<td style={{padding:"8px 12px",fontSize:14,fontVariantNumeric:"tabular-nums",color:C.textMuted,borderBottom:`1px solid ${C.border}11`}}>{mask(fmtD(r.monthly*12))}</td>}
          </tr>)}
          <tr style={{background:C.bg}}><td style={{padding:"8px 12px",fontWeight:700}} colSpan={2}>Grand Total</td><td style={{padding:"8px 12px",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{mask(fmtD(grandTotal))}</td>{!isMobile&&<td style={{padding:"8px 12px",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{mask(fmtD(grandTotal*12))}</td>}</tr>
        </tbody></table></div>;})()}
      </Card>;
    })()}

    {tab==="subscriptions" && <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <ImportBar section="subscriptions" color={C.accent}/>
      {(() => {
        const allSubs = [...(subsPInScenario ? subsP : []).map(s=>({...s, effective:subMonthly(s), group:"Personal"}))].filter(s=>s.effective>0);
        const subTotal = allSubs.reduce((s,x)=>s+x.effective,0);
        if (allSubs.length === 0) return null;
        return <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16}}>
          <Card title={t("expenses.costBreakdown")}>
            <ResponsiveContainer width="100%" height={Math.max(180, allSubs.length*28)}><BarChart data={allSubs.map(s=>({name:s.name,value:s.effective}))} layout="vertical" margin={{left:130}}><XAxis type="number" tick={{fill:C.textDim,fontSize:11}} tickFormatter={fmt}/><YAxis type="category" dataKey="name" tick={{fill:C.textMuted,fontSize:12}} width={130}/><Tooltip formatter={v=>`CHF ${fmtD(v)}/mo`} contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13}} labelStyle={{color:C.textMuted}} itemStyle={{color:C.text}}/><Bar dataKey="value" radius={[0,6,6,0]}>{allSubs.map((_,i)=><Cell key={i} fill={pieColors()[i%pieColors().length]}/>)}</Bar></BarChart></ResponsiveContainer>
          </Card>
          <Card title={t("expenses.shareOfTotal")}>
            <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={allSubs.map(s=>({name:s.name,value:s.effective}))} cx="50%" cy="50%" outerRadius={80} innerRadius={45} dataKey="value" paddingAngle={2} stroke="none">{allSubs.map((_,i)=><Cell key={i} fill={pieColors()[i%pieColors().length]}/>)}</Pie><Tooltip formatter={v=>`CHF ${fmtD(v)}/mo`} contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13}} labelStyle={{color:C.textMuted}} itemStyle={{color:C.text}}/></PieChart></ResponsiveContainer>
            {allSubs.map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 0",borderBottom:i<allSubs.length-1?`1px solid ${C.border}22`:"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:3,background:pieColors()[i%pieColors().length],flexShrink:0}}/><span style={{fontSize:12,color:C.textMuted}}>{s.name}</span></div>
              <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,fontWeight:600,color:C.text,fontVariantNumeric:"tabular-nums"}}>CHF {mask(fmtD(s.effective))}</span><span style={{fontSize:10,color:C.textDim,width:36,textAlign:"right"}}>{subTotal>0?(s.effective/subTotal*100).toFixed(0):0}%</span></div>
            </div>)}
          </Card>
        </div>;
      })()}
      <SubTable items={subsP} setItems={setSubsP} title={t("expenses.personalSubscriptions")} accentColor={C.accent}/>
    </div>}

    {tab==="recurring" && <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <ImportBar section="recurring" color={C.blue}/>
      {yearly.filter(e=>recMonthly(e)>0).length > 0 && <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16}}>
        <Card title={t("expenses.costBreakdown")}>
          <ResponsiveContainer width="100%" height={Math.max(180, yearly.filter(e=>recMonthly(e)>0).length*28)}><BarChart data={yearly.filter(e=>recMonthly(e)>0).map(e=>({name:e.name,value:recMonthly(e)}))} layout="vertical" margin={{left:130}}><XAxis type="number" tick={{fill:C.textDim,fontSize:11}} tickFormatter={fmt}/><YAxis type="category" dataKey="name" tick={{fill:C.textMuted,fontSize:12}} width={130}/><Tooltip formatter={v=>`CHF ${fmtD(v)}/mo`} contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13}} labelStyle={{color:C.textMuted}} itemStyle={{color:C.text}}/><Bar dataKey="value" radius={[0,6,6,0]}>{yearly.filter(e=>recMonthly(e)>0).map((_,i)=><Cell key={i} fill={pieColors()[i%pieColors().length]}/>)}</Bar></BarChart></ResponsiveContainer>
        </Card>
        <Card title={t("expenses.shareOfTotal")}>
          <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={yearly.filter(e=>recMonthly(e)>0).map(e=>({name:e.name,value:recMonthly(e)}))} cx="50%" cy="50%" outerRadius={80} innerRadius={45} dataKey="value" paddingAngle={2} stroke="none">{yearly.filter(e=>recMonthly(e)>0).map((_,i)=><Cell key={i} fill={pieColors()[i%pieColors().length]}/>)}</Pie><Tooltip formatter={v=>`CHF ${fmtD(v)}/mo`} contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13}} labelStyle={{color:C.textMuted}} itemStyle={{color:C.text}}/></PieChart></ResponsiveContainer>
          {yearly.filter(e=>recMonthly(e)>0).map((e,i)=><div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 0",borderBottom:i<yearly.filter(x=>recMonthly(x)>0).length-1?`1px solid ${C.border}22`:"none"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:3,background:pieColors()[i%pieColors().length],flexShrink:0}}/><span style={{fontSize:12,color:C.textMuted}}>{e.name}</span></div>
            <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,fontWeight:600,color:C.text,fontVariantNumeric:"tabular-nums"}}>CHF {mask(fmtD(recMonthly(e)))}</span><span style={{fontSize:10,color:C.textDim,width:36,textAlign:"right"}}>{yTotal>0?(recMonthly(e)/yTotal*100).toFixed(0):0}%</span></div>
          </div>)}
        </Card>
      </div>}
      <Card title={t("expenses.recurringExpenses")} headerRight={<span style={{fontSize:14,color:C.blue,fontWeight:600}}>CHF {mask(fmtD(yTotal))}{t('common.perMo')}</span>}>
      {(()=>{const recGetVal=(e,k)=>k==='name'?e.name:k==='amount'?e.amount:k==='frequency'?e.frequency:k==='effective'?recMonthly(e):k==='notes'?e.notes:'';const sorted=sortItems(yearly,recGetVal);return <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:isMobile?480:undefined}}><thead><tr><SortTH field="name">{t('col.expense')}</SortTH><SortTH field="amount">{t('col.amount')}</SortTH><SortTH field="frequency">{t('col.frequency')}</SortTH><SortTH field="effective">{t('col.effectiveMo')}</SortTH><SortTH field="notes">{t('col.notes')}</SortTH><TH w={30}></TH></tr></thead>
      <tbody>
        {sorted.map(e=><tr key={e.id} onMouseEnter={ev=>ev.currentTarget.style.background=C.cardHover} onMouseLeave={ev=>ev.currentTarget.style.background="transparent"}>
          <td style={{padding:"8px 12px",fontSize:14,borderBottom:`1px solid ${C.border}11`}}><InlineEdit value={e.name} onChange={v=>setYearly(p=>p.map(x=>x.id===e.id?{...x,name:v}:x))} inputWidth={200}/></td>
          <td style={{padding:"8px 12px",fontSize:14,fontVariantNumeric:"tabular-nums",borderBottom:`1px solid ${C.border}11`}}>{hideBalances ? <span style={{color:C.text}}>••••</span> : <InlineNum value={e.amount} onChange={v=>setYearly(p=>p.map(x=>x.id===e.id?{...x,amount:v??0}:x))} width={70}/>}</td>
          <td style={{padding:"8px 12px",fontSize:14,borderBottom:`1px solid ${C.border}11`}}><select value={e.frequency||1} onChange={ev=>setYearly(p=>p.map(x=>x.id===e.id?{...x,frequency:Number(ev.target.value)}:x))} style={{padding:"3px 6px",borderRadius:6,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:13,cursor:"pointer"}}>{FREQ_OPTIONS.map(o=><option key={o.value} value={o.value}>{t(`freq.${o.label}`)}</option>)}</select></td>
          <td style={{padding:"8px 12px",fontSize:14,fontVariantNumeric:"tabular-nums",borderBottom:`1px solid ${C.border}11`,color:C.textMuted}}>{mask(fmtD(recMonthly(e)))}</td>
          <td style={{padding:"8px 12px",fontSize:13,color:C.textDim,borderBottom:`1px solid ${C.border}11`}}><InlineEdit value={e.notes||""} onChange={v=>setYearly(p=>p.map(x=>x.id===e.id?{...x,notes:v}:x))} placeholder={t("expenses.notesPlaceholder")} style={{color:C.textDim}} inputWidth={100}/></td>
          <td style={{padding:"8px 12px",borderBottom:`1px solid ${C.border}11`}}><DelBtn onClick={()=>setYearly(p=>p.filter(x=>x.id!==e.id))}/></td>
        </tr>)}
        <tr style={{background:C.bg}}><td style={{padding:"10px 12px",fontWeight:700}} colSpan={3}>Total</td><td style={{padding:"10px 12px",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{mask(fmtD(yTotal))}</td><td colSpan={2}/></tr>
        <AddRow onClick={()=>setYearly(p=>[...p,{id:uid(),name:"New Expense",amount:0,frequency:1,notes:""}])} label={t("expenses.addRecurring")} colSpan={6}/>
      </tbody></table></div>;})()}
    </Card>
    </div>}

    {tab==="taxes" && <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <ImportBar section="taxes" color={C.red}/>
      {/* Bar chart with totals per year */}
      <Card title={t("expenses.taxHistory")} headerRight={<button onClick={exportTaxReport} style={{padding:"6px 12px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.textMuted,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><Download size={13}/>{t("expenses.pdfReport")}</button>}>
        <ResponsiveContainer width="100%" height={250}><BarChart data={taxes.map(t=>({year:t.year,total:t.lines.reduce((s,l)=>s+l.amount,0)}))}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="year" tick={{fill:C.textDim,fontSize:12}}/><YAxis tick={{fill:C.textDim,fontSize:11}} tickFormatter={v=>`${Math.round(v/1000)}k`}/><Tooltip formatter={v=>`CHF ${fmt(v)}`} contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13}} labelStyle={{color:C.textMuted}} itemStyle={{color:C.text}}/><Bar dataKey="total" fill={C.red} radius={[6,6,0,0]} name={t("expenses.totalPaid")}/></BarChart></ResponsiveContainer>
      </Card>

      {/* Per-year cards with line items */}
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        {[...taxes].reverse().map(ty=>{
          const total = ty.lines.reduce((s,l)=>s+l.amount,0);
          const editTaxLine = (lineId,field,val)=>setTaxes(p=>p.map(tx=>tx.id===ty.id?{...tx,lines:tx.lines.map(l=>l.id===lineId?{...l,[field]:val}:l)}:tx));
          return <Card key={ty.id} title={<div style={{display:"flex",alignItems:"center",gap:12}}>
            <InlineEdit value={String(ty.year)} onChange={v=>{const n=parseInt(v);if(!isNaN(n))setTaxes(p=>p.map(tx=>tx.id===ty.id?{...tx,year:n}:tx));}} style={{fontSize:18,fontWeight:700}} inputWidth={60}/>
            <span style={{fontSize:14,color:C.red,fontWeight:600}}>{t("expenses.taxTotal")}: CHF {mask(fmtD(total))}</span>
          </div>} headerRight={<DelBtn onClick={()=>setTaxes(p=>p.filter(tx=>tx.id!==ty.id))}/>}>
            <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:isMobile?340:undefined}}><thead><tr><TH>{t("expenses.taxType")}</TH><TH>{t("expenses.taxAmount")}</TH><TH>{t("expenses.taxPaidAt")}</TH></tr></thead>
            <tbody>
              {ty.lines.map(line=>(
                <tr key={line.id} onMouseEnter={e=>e.currentTarget.style.background=C.cardHover} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{padding:"8px 12px",fontSize:14,borderBottom:`1px solid ${C.border}11`}}>
                    {line.type}
                    {line.type.includes("Provisional") && <Badge color={C.orange}>{t('expenses.taxProv')}</Badge>}
                    {line.type.includes("Final Settlement") && <Badge color={C.green}>{t('expenses.taxFinal')}</Badge>}
                  </td>
                  <td style={{padding:"8px 12px",fontSize:14,fontVariantNumeric:"tabular-nums",borderBottom:`1px solid ${C.border}11`}}>{hideBalances ? <span style={{color:C.text}}>••••</span> : <InlineNum value={line.amount} onChange={v=>editTaxLine(line.id,"amount",v??0)} width={80}/>}</td>
                  <td style={{padding:"8px 12px",fontSize:13,borderBottom:`1px solid ${C.border}11`}}><InlineEdit value={line.paidAt||""} onChange={v=>editTaxLine(line.id,"paidAt",v)} placeholder="dd.mm.yyyy" style={{color:C.textDim}} inputWidth={90}/></td>
                </tr>
              ))}
              <tr style={{background:C.bg}}><td style={{padding:"8px 12px",fontWeight:700}}>{t('common.total')}</td><td style={{padding:"8px 12px",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{mask(fmtD(total))}</td><td/></tr>
            </tbody></table></div>
          </Card>;
        })}
        <button onClick={()=>{const yr=taxes.length>0?Math.max(...taxes.map(tx=>tx.year))+1:2025;setTaxes(p=>[...p,makeTaxYear(yr,[0,0,0,0])]);}} style={{display:"flex",alignItems:"center",gap:6,padding:"12px 16px",border:`2px dashed ${C.border}`,borderRadius:10,background:"transparent",color:C.textDim,fontSize:14,cursor:"pointer",justifyContent:"center"}}><Plus size={16}/>{t('expenses.addTaxYear')}</button>
      </div>
    </div>}

    {tab==="insurance" && <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <ImportBar section="insurance" color={C.green}/>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16}}>
        <Card title={t("expenses.costBreakdown")}>
          <ResponsiveContainer width="100%" height={260}><BarChart data={insurance.map(p=>({name:p.name,monthly:insMonthlyCalc(p)}))} layout="vertical" margin={{left:130}}><XAxis type="number" tick={{fill:C.textDim,fontSize:11}} tickFormatter={fmt}/><YAxis type="category" dataKey="name" tick={{fill:C.textMuted,fontSize:12}} width={130}/><Tooltip formatter={v=>`CHF ${fmtD(v)}/mo`} contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13}} labelStyle={{color:C.textMuted}} itemStyle={{color:C.text}}/><Bar dataKey="monthly" radius={[0,6,6,0]}>{insurance.map((_,i)=><Cell key={i} fill={pieColors()[i%pieColors().length]}/>)}</Bar></BarChart></ResponsiveContainer>
        </Card>
        <Card title={t("expenses.shareOfTotal")}>
          <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={insurance.map(p=>({name:p.name,value:insMonthlyCalc(p)}))} cx="50%" cy="50%" outerRadius={80} innerRadius={45} dataKey="value" paddingAngle={2} stroke="none">{insurance.map((_,i)=><Cell key={i} fill={pieColors()[i%pieColors().length]}/>)}</Pie><Tooltip formatter={v=>`CHF ${fmtD(v)}/mo`} contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13}} labelStyle={{color:C.textMuted}} itemStyle={{color:C.text}}/></PieChart></ResponsiveContainer>
          {insurance.map((p,i)=>{const total=insurance.reduce((s,x)=>s+insMonthlyCalc(x),0); return <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 0",borderBottom:i<insurance.length-1?`1px solid ${C.border}22`:"none"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:3,background:pieColors()[i%pieColors().length],flexShrink:0}}/><span style={{fontSize:12,color:C.textMuted}}>{p.name}</span></div>
            <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,fontWeight:600,color:C.text,fontVariantNumeric:"tabular-nums"}}>CHF {mask(fmtD(insMonthlyCalc(p)))}</span><span style={{fontSize:10,color:C.textDim,width:36,textAlign:"right"}}>{total>0?(insMonthlyCalc(p)/total*100).toFixed(0):0}%</span></div>
          </div>})}
        </Card>
      </div>
      <Card title={t("expenses.allPolicies")}>
        {(()=>{const insGetVal=(p,k)=>k==='name'?p.name:k==='insurer'?p.insurer:k==='amount'?p.amount:k==='frequency'?p.frequency:k==='effective'?insMonthlyCalc(p):k==='notes'?p.notes:'';const sorted=sortItems(insurance,insGetVal);return <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:isMobile?560:undefined}}><thead><tr><SortTH field="name">{t('col.policy')}</SortTH><SortTH field="insurer">{t('col.insurer')}</SortTH><SortTH field="amount">{t('col.amount')}</SortTH><SortTH field="frequency">{t('col.frequency')}</SortTH><SortTH field="effective">{t('col.effectiveMo')}</SortTH><SortTH field="notes">{t('col.notes')}</SortTH><TH w={30}></TH></tr></thead>
        <tbody>
          {sorted.map((p,i)=><tr key={p.id} onMouseEnter={e=>e.currentTarget.style.background=C.cardHover} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <td style={{padding:"10px 12px",fontSize:14,borderBottom:`1px solid ${C.border}11`}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:4,background:pieColors()[i]}}/><InlineEdit value={p.name} onChange={v=>insEdit(p.id,"name",v)} inputWidth={150}/></div></td>
            <td style={{padding:"10px 12px",fontSize:14,borderBottom:`1px solid ${C.border}11`}}><InlineEdit value={p.insurer} onChange={v=>insEdit(p.id,"insurer",v)} inputWidth={110}/></td>
            <td style={{padding:"10px 12px",fontSize:14,fontWeight:600,fontVariantNumeric:"tabular-nums",borderBottom:`1px solid ${C.border}11`}}>{hideBalances ? <span style={{color:C.text}}>••••</span> : <InlineNum value={p.amount} onChange={v=>insEdit(p.id,"amount",v??0)} width={70}/>}</td>
            <td style={{padding:"10px 12px",fontSize:14,borderBottom:`1px solid ${C.border}11`}}><select value={p.frequency||12} onChange={e=>insEdit(p.id,"frequency",Number(e.target.value))} style={{padding:"3px 6px",borderRadius:6,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:13,cursor:"pointer"}}>{FREQ_OPTIONS.map(o=><option key={o.value} value={o.value}>{t(`freq.${o.label}`)}</option>)}</select></td>
            <td style={{padding:"10px 12px",fontSize:14,fontVariantNumeric:"tabular-nums",color:C.textMuted,borderBottom:`1px solid ${C.border}11`}}>{mask(fmtD(insMonthlyCalc(p)))}</td>
            <td style={{padding:"10px 12px",fontSize:13,color:C.textDim,borderBottom:`1px solid ${C.border}11`}}><InlineEdit value={p.notes||""} onChange={v=>insEdit(p.id,"notes",v)} placeholder={t("expenses.notesPlaceholder")} style={{color:C.textDim}} inputWidth={100}/></td>
            <td style={{padding:"10px 12px",borderBottom:`1px solid ${C.border}11`}}><DelBtn onClick={()=>insDel(p.id)}/></td>
          </tr>)}
          <tr style={{background:C.bg}}><td style={{padding:"10px 12px",fontWeight:700}} colSpan={4}>Total</td><td style={{padding:"10px 12px",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{mask(fmtD(insMonthly))}</td><td colSpan={2}/></tr>
          <AddRow onClick={insAdd} label={t("expenses.addInsurance")} colSpan={7}/>
        </tbody></table></div>;})()}
      </Card>
    </div>}
  </div>;
}

// ───────────────────────────────────────────────────────────────
// INSURANCE — editable
// ───────────────────────────────────────────────────────────────
function InsurancePage({ insurance, setInsurance }) {
  const totalY = insurance.reduce((s,p)=>s+p.yearly,0);
  const winW = useWindowWidth(); const isMobile = winW < 768;
  const edit = (id,f,v)=>setInsurance(p=>p.map(x=>x.id===id?{...x,[f]:v}:x));
  const add = ()=>setInsurance(p=>[...p,{id:uid(),name:"New Policy",insurer:"",yearly:0,billing:""}]);
  const del = (id)=>setInsurance(p=>p.filter(x=>x.id!==id));

  return <div>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16,marginBottom:20}}>
      <StatCard label="Total Yearly" value={`CHF ${fmtD(totalY)}`} icon={Shield} color={C.accent}/>
      <StatCard label="Monthly Provision" value={`CHF ${fmtD(totalY/12)}`} sub="Save this amount every month" icon={PiggyBank} color={C.green}/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16,marginBottom:20}}>
      <Card title="Cost Breakdown">
        <ResponsiveContainer width="100%" height={260}><BarChart data={insurance} layout="vertical" margin={{left:130}}><XAxis type="number" tick={{fill:C.textDim,fontSize:11}} tickFormatter={fmt}/><YAxis type="category" dataKey="name" tick={{fill:C.textMuted,fontSize:12}} width={130}/><Tooltip formatter={v=>`CHF ${fmtD(v)}`} contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13}} labelStyle={{color:C.textMuted}} itemStyle={{color:C.text}}/><Bar dataKey="yearly" radius={[0,6,6,0]}>{insurance.map((_,i)=><Cell key={i} fill={pieColors()[i%pieColors().length]}/>)}</Bar></BarChart></ResponsiveContainer>
      </Card>
      <Card title="Share of Total">
        <ResponsiveContainer width="100%" height={260}><PieChart><Pie data={insurance.map(p=>({name:p.name,value:p.yearly}))} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value" paddingAngle={2} stroke="none">{insurance.map((_,i)=><Cell key={i} fill={pieColors()[i%pieColors().length]}/>)}</Pie><Tooltip formatter={v=>`CHF ${fmtD(v)}`} contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13}} labelStyle={{color:C.textMuted}} itemStyle={{color:C.text}}/></PieChart></ResponsiveContainer>
      </Card>
    </div>
    <Card title="All Policies">
      <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><TH>{t('col.policy')}</TH><TH>{t('col.insurer')}</TH><TH>{t('col.yearlyCHF')}</TH><TH>{t('col.effectiveMo')}</TH><TH>{t('col.billingPeriod')}</TH><TH w={30}></TH></tr></thead>
      <tbody>
        {insurance.map((p,i)=><tr key={p.id} onMouseEnter={e=>e.currentTarget.style.background=C.cardHover} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <td style={{padding:"10px 12px",fontSize:14,borderBottom:`1px solid ${C.border}11`}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:4,background:pieColors()[i]}}/><InlineEdit value={p.name} onChange={v=>edit(p.id,"name",v)} inputWidth={180}/></div></td>
          <td style={{padding:"10px 12px",fontSize:14,borderBottom:`1px solid ${C.border}11`}}><InlineEdit value={p.insurer} onChange={v=>edit(p.id,"insurer",v)} inputWidth={120}/></td>
          <td style={{padding:"10px 12px",fontSize:14,fontWeight:600,fontVariantNumeric:"tabular-nums",borderBottom:`1px solid ${C.border}11`}}><InlineNum value={p.yearly} onChange={v=>edit(p.id,"yearly",v??0)} width={70}/></td>
          <td style={{padding:"10px 12px",fontSize:14,fontVariantNumeric:"tabular-nums",color:C.textMuted,borderBottom:`1px solid ${C.border}11`}}>{fmtD(p.yearly/12)}</td>
          <td style={{padding:"10px 12px",fontSize:13,color:C.textDim,borderBottom:`1px solid ${C.border}11`}}><InlineEdit value={p.billing} onChange={v=>edit(p.id,"billing",v)} placeholder="billing period..." style={{color:C.textDim}} inputWidth={160}/></td>
          <td style={{padding:"10px 12px",borderBottom:`1px solid ${C.border}11`}}><DelBtn onClick={()=>del(p.id)}/></td>
        </tr>)}
        <tr style={{background:C.bg}}><td style={{padding:"10px 12px",fontWeight:700}} colSpan={2}>Total</td><td style={{padding:"10px 12px",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{fmtD(totalY)}</td><td style={{padding:"10px 12px",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{fmtD(totalY/12)}</td><td colSpan={2}/></tr>
        <AddRow onClick={add} label="Add insurance policy" colSpan={6}/>
      </tbody></table>
    </Card>
  </div>;
}

// ───────────────────────────────────────────────────────────────
// STRATEGY PILLARS
// ───────────────────────────────────────────────────────────────
function PillarPage({ accounts, scenarios, subsP, subsPInScenario, yearly, taxes, insurance, hideBalances, profile, strategyOverrides, setStrategyOverrides, t }) {
  const mask = (v) => hideBalances ? "••••" : v;
  const winW = useWindowWidth(); const isMobile = winW < 768;
  const [yieldRate, setYieldRate] = useState(4);
  const [hoursPerWeek, setHoursPerWeek] = useState(40);
  const [purchase, setPurchase] = useState("");
  const [coastRetirementAge, setCoastRetirementAge] = useState(65);
  const [coastReturnRate, setCoastReturnRate] = useState(7);
  const [coastSpendDownAge, setCoastSpendDownAge] = useState(100);
  const [coastRetirementReturn, setCoastRetirementReturn] = useState(4);
  const [tab, setTab] = useState("pillars");

  // Persisted strategy overrides (null = use calculated)
  const { oEssential, oMonthlySav, oTotalRetirement, oSpendDown } = strategyOverrides;
  const setO = (key, val) => setStrategyOverrides(o => ({ ...o, [key]: val }));
  const setOEssential = v => setO('oEssential', v);
  const setOMonthlySav = v => setO('oMonthlySav', v);
  const setOTotalRetirement = v => setO('oTotalRetirement', v);
  const setOSpendDown = v => setO('oSpendDown', v);

  // Derive essential monthly costs (same logic as Dashboard)
  const sc = scenarios.find(s=>s.isActive);
  const inc = sc ? sc.incomes.reduce((s,x)=>s+x.amount,0) : 0;
  const getA = (item) => item.pct != null ? inc * item.pct / 100 : item.amount;
  const linkedSubsP = subsPInScenario ? subsP.reduce((s,x)=>s+subMonthly(x),0) : 0;
  const linkedRecurring = yearly.reduce((s,e)=>s+recMonthly(e),0);
  const linkedInsurance = insurance.reduce((s,p)=>s+insMonthlyCalc(p),0);
  const latestTax = taxes[taxes.length-1];
  const linkedTax = latestTax ? latestTax.lines.reduce((s,l)=>s+l.amount,0)/12 : 0;
  const linkedTotal = linkedSubsP + linkedRecurring + linkedInsurance + linkedTax;
  const essentialExp = sc ? sc.expenses.filter(e=>e.essential!==false).reduce((s,x)=>s+getA(x),0) : 0;
  const essentialSav = sc ? sc.savings.filter(e=>e.essential!==false).reduce((s,x)=>s+getA(x),0) : 0;
  const essentialTotal = essentialExp + linkedTotal + essentialSav;
  const cEssentialTotal = oEssential ?? essentialTotal;

  // Net worth
  const liquidTypes = ["Checking","Savings","Investment","Crypto"];
  const liquidTotal = accounts.filter(a=>liquidTypes.includes(a.type)).reduce((s,a)=>s+a.balance,0);
  const pensionTotal = accounts.filter(a=>a.type==="Pension 2A"||a.type==="Pension 3A").reduce((s,a)=>s+a.balance,0);
  const debtTotal = accounts.filter(a=>a.type==="Debt").reduce((s,a)=>s+a.balance,0);
  const totalWealth = accounts.filter(a=>a.type!=="Debt").reduce((s,a)=>s+a.balance,0) - debtTotal;

  // Freedom targets
  // Money System: capital needed so (yieldRate% × capital) / 12 = essentialTotal/mo
  // Note: capital gains are tax-free in CH (Art. 16 Abs. 3 DBG) for private investors
  // Wealth tax (Vermogenssteuer) ~0.2-0.3%/yr in ZH — subtract from yield
  const wealthTaxDrag = 0.25; // ~0.25% effective wealth tax in Kanton Zurich
  const effectiveYield = yieldRate - wealthTaxDrag;
  const moneySystemTarget = cEssentialTotal > 0 ? (cEssentialTotal * 12) / (effectiveYield / 100) : 0;
  const moneySystemProgress = moneySystemTarget > 0 ? Math.min(100, (liquidTotal / moneySystemTarget) * 100) : 0;
  const totalProgress = moneySystemTarget > 0 ? Math.min(100, (totalWealth / moneySystemTarget) * 100) : 0;
  // Years to target based on current monthly savings
  const monthlySavInv = sc ? [...sc.savings,...sc.investments].reduce((s,x)=>s+getA(x),0) : 0;
  // Liquid-only savings: exclude pension contributions (BVG, 2A, 3A) to avoid double-counting
  // Pension growth is projected separately in the Coasting FIRE calculation
  const isPensionItem = (x) => /bvg|pension|pensionskasse|2a|3a|pillar|saule|säule/i.test(x.label || "");
  const liquidMonthlySavInv = sc ? [...sc.savings,...sc.investments].filter(x => !isPensionItem(x)).reduce((s,x)=>s+getA(x),0) : 0;
  const yearsToTarget = monthlySavInv > 0 && moneySystemTarget > liquidTotal
    ? Math.ceil((moneySystemTarget - liquidTotal) / (monthlySavInv * 12))
    : null;

  // Business system: monthly gross revenue needed at 5x essential costs
  // Note: as sole proprietorship (Einzelunternehmen) in CH, AHV ~10% on net profit + income tax ~25-30%
  // So gross revenue needed is higher: divide by ~0.65 to get pre-tax equivalent
  const businessTarget = cEssentialTotal * 5;
  const businessTargetGross = businessTarget / 0.65; // approx. pre-tax for self-employed in CH

  // Coasting FIRE calculations — use overrides where set
  const cLiquidMonthlySavInv = oMonthlySav ?? liquidMonthlySavInv;
  const currentAge = profile && profile.birthDate ? Math.floor((new Date() - new Date(profile.birthDate)) / (365.25 * 24 * 60 * 60 * 1000)) : null;
  const retirementYears = Math.max(1, coastSpendDownAge - coastRetirementAge);
  const rRet = coastRetirementReturn / 100;

  // Step 1: portfolio needed at retirement so spend-down covers essential costs until coastSpendDownAge
  const annualNeed = cEssentialTotal * 12;
  const grossPortfolioNeeded = rRet > 0
    ? annualNeed * (1 - Math.pow(1 + rRet, -retirementYears)) / rRet
    : annualNeed * retirementYears;

  // Step 2: project pension accounts to retirement (they unlock at retirement as lump sum)
  // BVG (2A): conservative guaranteed rate (default 1.75%) + ongoing employer+employee contributions
  // 3A (Frankly etc.): conservative ETF growth (use account rate or default 4%)
  // Apply Kapitalbezugssteuer (lump sum withdrawal tax) ~6-8% in ZH depending on amount
  const rGrow = coastReturnRate / 100;
  const yearsToRetirement = currentAge != null ? Math.max(0, coastRetirementAge - currentAge) : 30;

  const pension2A = accounts.filter(a => a.type === "Pension 2A");
  const pension3A = accounts.filter(a => a.type === "Pension 3A");
  const bvgRate = 0.0175; // BVG minimum interest rate 2025
  const default3ARate = 0.04; // conservative for ETF-based 3a

  // Extract monthly pension contributions from scenario savings/investments
  const is3aItem = (x) => { const n = (x.label || "").toLowerCase(); return n.includes("3a") || n.includes("pillar 3") || n.includes("frankly") || n.includes("viac") || n.includes("finpension"); };
  const is2aItem = (x) => { const n = (x.label || "").toLowerCase(); return (n.includes("2a") || n.includes("bvg") || n.includes("pension") || n.includes("pensionskasse")) && !is3aItem(x); };
  const allSavInv = sc ? [...sc.savings, ...sc.investments] : [];
  const monthly3AContrib = allSavInv.filter(is3aItem).reduce((s, x) => s + getA(x), 0);
  const monthly2AContrib = allSavInv.filter(is2aItem).reduce((s, x) => s + getA(x), 0);
  const annual3AContrib = monthly3AContrib * 12;
  const annual2AContrib = monthly2AContrib * 12;

  // FV of annuity: annual_contrib * ((1+r)^n - 1) / r — contributions made while working
  const fvAnnuity = (annualContrib, r, n) => r > 0 ? annualContrib * (Math.pow(1 + r, n) - 1) / r : annualContrib * n;

  // Project pension: current balance compounded + future contributions (while working until retirement)
  const projected2A = pension2A.reduce((s, a) => {
    const r = a.rate ? a.rate / 100 : bvgRate;
    return s + a.balance * Math.pow(1 + r, yearsToRetirement);
  }, 0) + fvAnnuity(annual2AContrib, bvgRate, yearsToRetirement);
  const projected3A = pension3A.reduce((s, a) => {
    const r = a.rate ? a.rate / 100 : default3ARate;
    return s + a.balance * Math.pow(1 + r, yearsToRetirement);
  }, 0) + fvAnnuity(annual3AContrib, default3ARate, yearsToRetirement);
  const projectedPensionGross = projected2A + projected3A;
  // Kapitalbezugssteuer (lump sum withdrawal tax) — ZH ~6-8%, use 7% as conservative estimate
  const pensionWithdrawalTax = 0.07;
  const projectedPensionNet = projectedPensionGross * (1 - pensionWithdrawalTax);

  // Step 3: liquid portfolio needed at retirement = total needed - pension lump sum
  const portfolioNeededAtRetirement = Math.max(0, grossPortfolioNeeded - projectedPensionNet);

  // Step 4: "Coast FI Now" = liquid amount needed TODAY so compound growth alone covers the gap
  const coastFiNow = portfolioNeededAtRetirement / Math.pow(1 + rGrow, yearsToRetirement);
  const isCoastingNow = liquidTotal >= coastFiNow && coastFiNow > 0;
  const coastFiProgress = coastFiNow > 0 ? Math.min(100, (liquidTotal / coastFiNow) * 100) : 0;

  // Step 5: find when liquid portfolio (with liquid savings + compound growth) reaches the coasting threshold
  // Uses cLiquidMonthlySavInv (excludes pension contributions, supports manual override)
  const coastCalc = useMemo(() => {
    if (currentAge == null || grossPortfolioNeeded <= 0) {
      return { coastFiAge: null, coastingYears: yearsToRetirement, yearsToCoast: null };
    }
    if (isCoastingNow) {
      return { coastFiAge: currentAge, coastingYears: yearsToRetirement, yearsToCoast: 0 };
    }
    if (cLiquidMonthlySavInv <= 0) {
      return { coastFiAge: null, coastingYears: yearsToRetirement, yearsToCoast: null };
    }
    const annualSav = cLiquidMonthlySavInv * 12;
    let portfolio = liquidTotal;
    for (let y = 1; y <= yearsToRetirement; y++) {
      portfolio = portfolio * (1 + rGrow) + annualSav;
      const remainingYears = yearsToRetirement - y;
      const neededAtThisAge = portfolioNeededAtRetirement / Math.pow(1 + rGrow, remainingYears);
      if (portfolio >= neededAtThisAge) {
        return { coastFiAge: currentAge + y, coastingYears: remainingYears, yearsToCoast: y };
      }
    }
    return { coastFiAge: null, coastingYears: 0, yearsToCoast: null };
  }, [currentAge, liquidTotal, cLiquidMonthlySavInv, yearsToRetirement, rGrow, portfolioNeededAtRetirement, isCoastingNow]);

  const { coastFiAge, coastingYears, yearsToCoast } = coastCalc;

  // Projected total at retirement (liquid + pension)
  const liquidAtRetirement = isCoastingNow
    ? liquidTotal * Math.pow(1 + rGrow, yearsToRetirement)
    : portfolioNeededAtRetirement;
  const totalAtRetirement = liquidAtRetirement + projectedPensionNet;
  const coastProjectedValue = oTotalRetirement ?? totalAtRetirement;
  const coastingGrowthPct = coastFiNow > 0 ? ((liquidAtRetirement / coastFiNow) - 1) * 100 : 0;

  // Spend-down withdrawal from total portfolio at retirement (liquid + pension combined)
  const spendDownCalc = rRet > 0
    ? coastProjectedValue * rRet / (1 - Math.pow(1 + rRet, -retirementYears))
    : coastProjectedValue / retirementYears;
  const spendDownWithdrawal = oSpendDown ?? spendDownCalc;

  const safeWithdrawalAtRetirement = coastProjectedValue * 0.04;
  const savingsVsPerpetual = moneySystemTarget > 0 ? Math.round(((moneySystemTarget - coastFiNow) / moneySystemTarget) * 100) : 0;

  // Coasting FIRE projection chart data — full lifecycle
  const coastChartData = useMemo(() => {
    if (currentAge == null || portfolioNeededAtRetirement <= 0) return [];
    // Use coastFiAge if available, otherwise show projection starting from current age with coastFiNow
    const startAge = isCoastingNow ? currentAge : (coastFiAge != null ? coastFiAge : currentAge);
    if (coastRetirementAge <= startAge) return [];
    const data = [];
    const coastStartThreshold = coastFiAge != null ? portfolioNeededAtRetirement / Math.pow(1 + rGrow, coastRetirementAge - coastFiAge) : coastFiNow;
    const startValue = isCoastingNow ? liquidTotal : coastStartThreshold;
    const compoundYrs = coastRetirementAge - startAge;
    // Phase 1: coasting (compound growth, no contributions)
    for (let y = 0; y <= compoundYrs; y++) {
      data.push({
        age: startAge + y,
        value: Math.round(startValue * Math.pow(1 + coastReturnRate / 100, y)),
        phase: "Coasting",
      });
    }
    // Phase 2: spend-down (retirement withdrawals) — add pension lump sum at retirement
    const liquidPeak = startValue * Math.pow(1 + coastReturnRate / 100, compoundYrs);
    const peakValue = liquidPeak + projectedPensionNet;
    const annualW = rRet > 0 ? peakValue * rRet / (1 - Math.pow(1 + rRet, -retirementYears)) : peakValue / retirementYears;
    let bal = peakValue;
    for (let y = 1; y <= retirementYears && bal > 0; y++) {
      bal = bal * (1 + rRet) - annualW;
      if (bal < 0) bal = 0;
      data.push({
        age: coastRetirementAge + y,
        value: Math.round(bal),
        phase: "Spend-down",
      });
    }
    return data;
  }, [isCoastingNow, coastFiNow, coastFiAge, coastReturnRate, coastRetirementAge, currentAge, liquidTotal, rRet, retirementYears, projectedPensionNet]);

  // Indentured Time
  // CH: 52 weeks - 5 vacation weeks (OR Art. 329a) - 1.8 weeks public holidays (ZH: 9 days) = 45.2 -> 45 working weeks
  // annualIncome = inc (monthly) × 12
  const workingWeeks = 45;
  const annualHours = hoursPerWeek * workingWeeks;
  const hourlyRate = annualHours > 0 ? (inc * 12) / annualHours : 0; // net hourly rate
  const purchaseAmt = parseFloat(String(purchase).replace(/'/g,"").replace(/,/g,"")) || 0;
  const hoursNeeded = hourlyRate > 0 ? purchaseAmt / hourlyRate : 0;
  const daysNeeded = hoursNeeded / (hoursPerWeek / 5);
  const weeksNeeded = hoursNeeded / hoursPerWeek;

  const officialPillars = [
    { num:"1", name:t('pillars.p1.name'), items:[t('pillars.p1.item1'),t('pillars.p1.item2'),t('pillars.p1.item3')], color:C.blue, desc:t('pillars.p1.desc') },
    { num:"2", name:t('pillars.p2.name'), items:[t('pillars.p2.item1'),t('pillars.p2.item2'),t('pillars.p2.item3')], color:C.teal, desc:t('pillars.p2.desc') },
    { num:"3a", name:t('pillars.p3a.name'), items:[t('pillars.p3a.item1'),t('pillars.p3a.item2'),t('pillars.p3a.item3')], color:C.green, desc:t('pillars.p3a.desc') },
  ];
  const personalPillars = [
    { num:"4", name:t('pillars.p4.name'), items:[t('pillars.p4.item1'),t('pillars.p4.item2'),t('pillars.p4.item3')], color:C.yellow, desc:t('pillars.p4.desc') },
    { num:"5", name:t('pillars.p5.name'), items:[t('pillars.p5.item1'),t('pillars.p5.item2'),t('pillars.p5.item3')], color:C.orange, desc:t('pillars.p5.desc') },
  ];

  // Inline-editable number for manual overrides — shows calculated value when overridden
  const EditNum = ({calc, override, setOverride, color=C.accent, size=26, pre="CHF ", suf=""}) => {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState("");
    const display = override ?? calc;
    const isOver = override != null;
    const start = () => { setDraft(String(Math.round(display))); setEditing(true); };
    const save = () => {
      const n = parseFloat(String(draft).replace(/'/g,"").replace(/,/g,""));
      if (!isNaN(n) && n > 0) setOverride(n); else setOverride(null);
      setEditing(false);
    };
    if (editing) return <input type="text" autoFocus value={draft}
      onChange={e=>setDraft(e.target.value)} onBlur={save}
      onKeyDown={e=>{if(e.key==="Enter")save();if(e.key==="Escape")setEditing(false);}}
      style={{fontSize:size,fontWeight:400,fontFamily:"'Fraunces',serif",color,background:"transparent",border:"none",borderBottom:`2px solid ${C.accent}`,outline:"none",width:"100%",padding:0,boxSizing:"border-box"}}/>;
    return <span>
      <span style={{cursor:"pointer",borderBottom:`1px dashed ${isOver?C.yellow:color}44`}} onClick={start} title="Click to adjust">
        {pre}{mask(fmt(Math.round(display)))}{suf}
      </span>
      {isOver && <> <span style={{fontSize:Math.max(11,size*0.45),color:C.textDim}}>(calc: {pre}{mask(fmt(Math.round(calc)))}{suf})</span>
      <span onClick={e=>{e.stopPropagation();setOverride(null);}} style={{marginLeft:4,fontSize:11,color:C.yellow,cursor:"pointer",verticalAlign:"super"}} title={t('scenarios.resetToCalc')}>↺</span></>}
    </span>;
  };

  return <div>
    <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
      <Tab active={tab==="pillars"} onClick={()=>setTab("pillars")}>{t('strategy.tab.pillars')}</Tab>
      <Tab active={tab==="fire"} onClick={()=>setTab("fire")}>{t('strategy.tab.fire')}</Tab>
      <Tab active={tab==="coasting"} onClick={()=>setTab("coasting")}>{t('strategy.tab.coasting')}</Tab>
      <Tab active={tab==="indentured"} onClick={()=>setTab("indentured")}>{t('strategy.tab.indentured')}</Tab>
    </div>

    {tab==="pillars" && <>
    <h2 style={{fontSize:18,fontWeight:700,color:C.text,margin:"0 0 6px"}}>{t('pillars.title')}</h2>
    <p style={{fontSize:14,color:C.textMuted,marginBottom:20}}>{t('pillars.subtitle')}</p>

    {/* Official Swiss 3-pillar system */}
    <div style={{fontSize:12,color:C.accent,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>{t('pillars.officialSystem')}</div>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:12,marginBottom:20}}>
      {officialPillars.map(p=><Card key={p.num} style={{borderTop:`3px solid ${p.color}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <div style={{width:32,height:32,borderRadius:8,background:p.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14,color:p.color}}>{p.num}</div>
          <div style={{fontSize:14,fontWeight:600,color:C.text}}>{p.name}</div>
        </div>
        <p style={{fontSize:12,color:C.textMuted,lineHeight:1.6,marginBottom:12}}>{p.desc}</p>
        {p.items.map((item,i)=><div key={i} style={{fontSize:12,color:C.textDim,padding:"4px 0",borderBottom:i<p.items.length-1?`1px solid ${C.border}11`:"none"}}>{item}</div>)}
      </Card>)}
    </div>

    {/* Personal extension pillars */}
    <div style={{fontSize:12,color:C.yellow,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>{t('pillars.personalExtension')}</div>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,1fr)",gap:12,marginBottom:24}}>
      {personalPillars.map(p=><Card key={p.num} style={{borderTop:`3px solid ${p.color}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <div style={{width:32,height:32,borderRadius:8,background:p.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14,color:p.color}}>{p.num}</div>
          <div style={{fontSize:14,fontWeight:600,color:C.text}}>{p.name}</div>
        </div>
        <p style={{fontSize:12,color:C.textMuted,lineHeight:1.6,marginBottom:12}}>{p.desc}</p>
        {p.items.map((item,i)=><div key={i} style={{fontSize:12,color:C.textDim,padding:"4px 0",borderBottom:i<p.items.length-1?`1px solid ${C.border}11`:"none"}}>{item}</div>)}
      </Card>)}
    </div>

    </>}

    {tab==="fire" && <>
    {/* ── Freedom Targets ── */}
    <h2 style={{fontSize:18,fontWeight:700,color:C.text,margin:"0 0 4px"}}>{t('fire.title')}</h2>
    <p style={{fontSize:14,color:C.textMuted,marginBottom:12}}>{t('fire.subtitle', {amount: mask(fmt(Math.round(cEssentialTotal))), scenarioNote: ''})}{oEssential!=null&&<span style={{fontSize:12,color:C.textDim}}> {t('fire.scenarioCalc', {amount: mask(fmt(Math.round(essentialTotal)))})}</span>}</p>
    <div style={{padding:"12px 16px",borderRadius:8,background:C.accent+"0a",border:`1px solid ${C.accent}15`,fontSize:13,color:C.textDim,lineHeight:1.8,marginBottom:16}}>
      <strong style={{color:C.text}}>{t('fire.howItWorks')}</strong> {t('fire.howItWorksDesc')}
    </div>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:16,marginBottom:24}}>

      {/* Money System */}
      <Card style={{gridColumn:isMobile?"1":"1/3"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:12}}>
          <div>
            <div style={{fontSize:12,fontFamily:"'DM Mono',monospace",color:C.textMuted,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.08em"}}>{t('fire.moneySystemTarget')}</div>
            <div style={{fontSize:30,fontWeight:400,fontFamily:"'Fraunces',serif",color:C.accent}}>CHF {mask(fmt(Math.round(moneySystemTarget)))}</div>
            <div style={{fontSize:13,color:C.textDim,marginTop:2}}>{t('fire.moneySystemSub', {yield: effectiveYield.toFixed(1)})}</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10,textAlign:"right"}}>
            <div>
              <div style={{fontSize:12,color:C.textDim,marginBottom:2}}>{t('fire.essentialCostsMo')}</div>
              <div style={{display:"flex",alignItems:"center",gap:8,justifyContent:"flex-end"}}>
                <input type="number" value={oEssential??""} placeholder={fmt(Math.round(essentialTotal))} onChange={e=>{const v=parseFloat(e.target.value);setOEssential(v>0?v:null);setOTotalRetirement(null);setOSpendDown(null);}} style={{width:100,padding:"4px 8px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,fontSize:12,outline:"none",textAlign:"right",boxSizing:"border-box"}}/>
                {oEssential!=null&&<span onClick={()=>{setOEssential(null);setOTotalRetirement(null);setOSpendDown(null);}} style={{fontSize:11,color:C.yellow,cursor:"pointer"}} title="Reset">↺</span>}
              </div>
              {oEssential!=null&&<div style={{fontSize:10,color:C.textDim,marginTop:2}}>{t('fire.scenarioCalc', {amount: mask(fmt(Math.round(essentialTotal)))})}</div>}
            </div>
            <div>
              <div style={{fontSize:12,color:C.textDim,marginBottom:2}}>{t('fire.yieldAssumption')}</div>
              <div style={{display:"flex",alignItems:"center",gap:8,justifyContent:"flex-end"}}>
                <input type="range" min={2} max={8} step={0.5} value={yieldRate} onChange={e=>setYieldRate(Number(e.target.value))} style={{width:80,accentColor:C.accent}}/>
                <span style={{fontSize:14,fontWeight:600,color:C.accent}}>{yieldRate}%</span>
              </div>
              <div style={{fontSize:10,color:C.textDim,marginTop:2}}>{t('fire.wealthTaxNote', {drag: wealthTaxDrag, net: effectiveYield.toFixed(1)})}</div>
            </div>
          </div>
        </div>
        {/* Explanation box */}
        <div style={{padding:"10px 12px",borderRadius:8,background:C.bg,border:`1px solid ${C.border}33`,fontSize:12,color:C.textDim,lineHeight:1.8,marginBottom:12}}>
          <strong style={{color:C.textMuted}}>{t('fire.theMath')}</strong> {t('fire.theMathDesc', {essential: mask(fmt(Math.round(cEssentialTotal))), annual: mask(fmt(Math.round(cEssentialTotal*12))), yield: effectiveYield.toFixed(1), target: mask(fmt(Math.round(moneySystemTarget)))})}<br/>
          <strong style={{color:C.textMuted}}>{t('fire.yieldAssumption')} {yieldRate}%:</strong> {t('fire.yieldExpl')}<br/>
          <strong style={{color:C.textMuted}}>{t('fire.wealthTaxDrag')}</strong> {t('fire.wealthTaxDragDesc', {drag: wealthTaxDrag, gross: yieldRate, net: effectiveYield.toFixed(1)})}
        </div>
        <div style={{marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.textDim,marginBottom:4}}>
            <span>{t('fire.liquidAssets', {amount: mask(fmt(liquidTotal))})}</span>
            <span>{moneySystemProgress.toFixed(1)}%</span>
          </div>
          <div style={{height:8,borderRadius:4,background:C.border,overflow:"hidden",display:"flex"}}>
            <div style={{width:`${moneySystemProgress}%`,background:C.green,borderRadius:4,transition:"width .3s"}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.textDim,marginTop:4}}>
            <span>{t('fire.inclPensions', {pct: totalProgress.toFixed(1), total: mask(fmt(totalWealth))})}</span>
            {yearsToTarget && <span style={{color:C.yellow}}>{t('fire.yearsAtSavings', {years: yearsToTarget})}</span>}
          </div>
        </div>
        {/* Why liquid vs total */}
        <div style={{padding:"8px 12px",borderRadius:8,background:C.yellow+"0a",border:`1px solid ${C.yellow}15`,fontSize:12,color:C.textDim,lineHeight:1.7,marginBottom:8}}>
          <strong style={{color:C.yellow}}>{t('fire.whyTwoBars')}</strong> {t('fire.whyTwoBarsDesc', {pension: mask(fmt(pensionTotal))})}
        </div>
        <div style={{padding:"10px 12px",borderRadius:8,background:C.accent+"0d",border:`1px solid ${C.accent}22`,fontSize:12,color:C.textDim,lineHeight:1.7}}>
          <strong style={{color:C.accentLight}}>{t('fire.swissAdvantage')}</strong> {t('fire.swissAdvantageDesc')}
        </div>
      </Card>

      {/* Business System */}
      <Card>
        <div style={{fontSize:12,fontFamily:"'DM Mono',monospace",color:C.textMuted,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.08em"}}>{t('fire.businessTarget')}</div>
        <div style={{fontSize:26,fontWeight:400,fontFamily:"'Fraunces',serif",color:C.teal,marginBottom:2}}>CHF {mask(fmt(Math.round(businessTargetGross)))}/mo</div>
        <div style={{fontSize:12,color:C.textDim,marginBottom:12}}>{t('fire.businessGross')}</div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
          <div style={{padding:"8px 12px",borderRadius:6,background:C.teal+"0d",border:`1px solid ${C.teal}22`}}>
            <div style={{fontSize:12,color:C.textDim}}>{t('fire.businessCalc')}</div>
            <div style={{fontSize:14,fontWeight:600,color:C.teal}}>CHF {mask(fmt(Math.round(businessTarget)))}{t('fire.businessNet')}</div>
          </div>
          <div style={{padding:"8px 12px",borderRadius:6,background:C.orange+"0d",border:`1px solid ${C.orange}22`}}>
            <div style={{fontSize:12,color:C.textDim}}>{t('fire.businessTax')}</div>
            <div style={{fontSize:12,color:C.textDim,marginTop:2}}>{t('fire.businessTaxDetail')}</div>
            <div style={{fontSize:14,fontWeight:600,color:C.orange}}>CHF {mask(fmt(Math.round(businessTargetGross)))}{t('fire.businessGrossMo')}</div>
          </div>
        </div>
        <div style={{padding:"8px 12px",borderRadius:8,background:C.bg,border:`1px solid ${C.border}33`,fontSize:12,color:C.textDim,lineHeight:1.7}}>
          <strong style={{color:C.textMuted}}>{t('fire.whyFive')}</strong> {t('fire.whyFiveDesc')}
        </div>
      </Card>
    </div>

    </>}

    {tab==="coasting" && <>
    {/* ── Coasting FIRE Strategy ── */}
    <h2 style={{fontSize:18,fontWeight:700,color:C.text,margin:"0 0 4px"}}>{t('coasting.title')}</h2>
    <p style={{fontSize:14,color:C.textMuted,marginBottom:12}}>{t('coasting.subtitle')}</p>
    <div style={{padding:"12px 16px",borderRadius:8,background:C.accent+"0a",border:`1px solid ${C.accent}15`,fontSize:13,color:C.textDim,lineHeight:1.8,marginBottom:16}}>
      <strong style={{color:C.text}}>{t('coasting.howItWorks')}</strong> {t('coasting.howItWorksDesc', {returnRate: coastReturnRate, retireAge: coastRetirementAge})}<br/>
      <span style={{color:C.textDim}}>{t('coasting.ahvNote')}</span>
    </div>

    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16,marginBottom:16}}>
      {/* Card 1 — Status & Phase */}
      <Card style={{gridColumn:isMobile?"1":"1/3"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:12}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              <div style={{padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",background:isCoastingNow?C.green+"22":C.orange+"22",color:isCoastingNow?C.green:C.orange}}>
                {isCoastingNow ? t('coasting.statusCoasting') : t('coasting.statusAccumulating')}
              </div>
              {currentAge != null && <div style={{fontSize:12,color:C.textDim}}>{t('coasting.age', {age: currentAge})}</div>}
            </div>
            {isCoastingNow ? <>
              <div style={{fontSize:13,color:C.textDim,marginBottom:4}}>{t('coasting.aboveCoastFi')}</div>
              <div style={{fontSize:26,fontWeight:400,fontFamily:"'Fraunces',serif",color:C.green}}>CHF {mask(fmt(Math.round(liquidTotal)))}</div>
              <div style={{fontSize:12,color:C.textDim,marginTop:2}}>{t('coasting.abovePct', {pct: ((liquidTotal/coastFiNow-1)*100).toFixed(0), amount: mask(fmt(Math.round(coastFiNow)))})}</div>
              {currentAge != null && <div style={{fontSize:12,color:C.yellow,marginTop:4}}>{t('coasting.yearsToRetire', {years: yearsToRetirement, age: coastRetirementAge, amount: mask(fmt(Math.round(liquidTotal * Math.pow(1+rGrow, yearsToRetirement))))})}</div>}
            </> : <>
              <div style={{fontSize:12,fontFamily:"'DM Mono',monospace",color:C.textMuted,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.08em"}}>{t('coasting.coastFiNumber')}</div>
              <div style={{fontSize:26,fontWeight:400,fontFamily:"'Fraunces',serif",color:C.accent}}>CHF {mask(fmt(Math.round(coastFiNow)))}</div>
              <div style={{fontSize:12,color:C.textDim,marginTop:2}}>{t('coasting.coastFiExpl', {amount: mask(fmt(Math.round(portfolioNeededAtRetirement))), age: coastRetirementAge})}</div>
              <div style={{marginTop:10,marginBottom:4}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.textDim,marginBottom:4}}>
                  <span>{t('coasting.liquidLabel', {amount: mask(fmt(Math.round(liquidTotal)))})}</span>
                  <span>{coastFiProgress.toFixed(1)}%</span>
                </div>
                <div style={{height:8,borderRadius:4,background:C.border,overflow:"hidden",minHeight:8}}>
                  <div style={{width:`${coastFiProgress}%`,height:"100%",background:C.accent,borderRadius:4,transition:"width .3s"}}/>
                </div>
                {pensionTotal > 0 && <div style={{fontSize:11,color:C.textDim,marginTop:6}}>
                  {t('coasting.totalWealth', {total: mask(fmt(Math.round(liquidTotal + pensionTotal))), pension: mask(fmt(Math.round(pensionTotal)))})}
                </div>}
              </div>
              {yearsToCoast != null && coastFiAge != null ? <div style={{padding:"8px 12px",borderRadius:6,background:C.yellow+"0d",border:`1px solid ${C.yellow}22`,fontSize:12,color:C.textDim,lineHeight:1.6,marginTop:8}}>
                <strong style={{color:C.yellow}}>{t('coasting.savingsRate')} <EditNum calc={liquidMonthlySavInv} override={oMonthlySav} setOverride={setOMonthlySav} color={C.yellow} size={12} suf="/mo"/>:</strong> {t('coasting.reachCoastFi', {age: coastFiAge, years: yearsToCoast, coastYears: coastingYears, rate: coastReturnRate, amount: mask(fmt(Math.round(portfolioNeededAtRetirement)))})}{cLiquidMonthlySavInv < monthlySavInv && <><br/><span style={{fontSize:11,color:C.textDim}}>{t('coasting.pensionExcluded', {amount: mask(fmt(Math.round(monthlySavInv - liquidMonthlySavInv)))})}</span></>}
              </div> : cLiquidMonthlySavInv <= 0 ? <div style={{padding:"8px 12px",borderRadius:6,background:C.orange+"0d",border:`1px solid ${C.orange}22`,fontSize:12,color:C.textDim,lineHeight:1.6,marginTop:8}}>
                <strong style={{color:C.orange}}>{monthlySavInv > 0 ? t('coasting.onlyPension') : t('coasting.noSavings')}</strong> {monthlySavInv > 0 ? t('coasting.addLiquid') : t('coasting.addSavings')}
              </div> : <div style={{padding:"8px 12px",borderRadius:6,background:C.orange+"0d",border:`1px solid ${C.orange}22`,fontSize:12,color:C.textDim,lineHeight:1.6,marginTop:8}}>
                <strong style={{color:C.orange}}>{t('coasting.wontReach')}</strong>
              </div>}
            </>}
            {projectedPensionNet > 0 && <div style={{padding:"8px 12px",borderRadius:6,background:C.blue+"0a",border:`1px solid ${C.blue}15`,fontSize:12,color:C.textDim,lineHeight:1.8,marginTop:8}}>
              <strong style={{color:C.blue}}>{t('coasting.pensionIncluded')}</strong><br/>
              {projected2A > 0 && <>{t('coasting.pillar2a', {today: mask(fmt(Math.round(pensionTotal > 0 ? pension2A.reduce((s,a)=>s+a.balance,0) : 0))), projected: mask(fmt(Math.round(projected2A))), age: coastRetirementAge, rate: (pension2A[0]?.rate || 1.75), contrib: annual2AContrib > 0 ? t('coasting.contribSuffix', {amount: fmt(Math.round(annual2AContrib))}) : ""})}<br/></>}
              {projected3A > 0 && <>{t('coasting.pillar3a', {today: mask(fmt(Math.round(pension3A.reduce((s,a)=>s+a.balance,0)))), projected: mask(fmt(Math.round(projected3A))), age: coastRetirementAge, rate: (pension3A[0]?.rate || 4), contrib: annual3AContrib > 0 ? t('coasting.contribSuffix', {amount: fmt(Math.round(annual3AContrib))}) : ""})}<br/></>}
              {t('coasting.afterTax', {pct: (pensionWithdrawalTax*100).toFixed(0), net: mask(fmt(Math.round(projectedPensionNet)))})}
            </div>}
            {projectedPensionNet === 0 && <div style={{padding:"8px 12px",borderRadius:6,background:C.orange+"0a",border:`1px solid ${C.orange}15`,fontSize:12,color:C.textDim,lineHeight:1.6,marginTop:8}}>
              <strong style={{color:C.orange}}>{t('coasting.noPensions')}</strong> {t('coasting.addPensions')}
            </div>}
            <div style={{padding:"8px 12px",borderRadius:6,background:C.green+"0a",border:`1px solid ${C.green}15`,fontSize:12,color:C.textDim,lineHeight:1.6,marginTop:8}}>
              <strong style={{color:C.green}}>{t('coasting.lessThanPerpetual', {pct: savingsVsPerpetual, target: mask(fmt(Math.round(moneySystemTarget))), age: coastSpendDownAge, pensionNote: projectedPensionNet > 0 ? t('coasting.pensionsCover') : ""})}</strong>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.textDim,marginBottom:4}}>
                <span>{t('coasting.essentialCostsMo')}</span>
                <span style={{color:C.accent,fontWeight:600}}>CHF {fmt(Math.round(cEssentialTotal))}{oEssential!=null&&<span onClick={()=>{setOEssential(null);setOTotalRetirement(null);setOSpendDown(null);}} style={{marginLeft:4,color:C.yellow,cursor:"pointer"}} title="Reset">↺</span>}</span>
              </div>
              <input type="number" value={oEssential??""} placeholder={fmt(Math.round(essentialTotal))} onChange={e=>{const v=parseFloat(e.target.value);setOEssential(v>0?v:null);setOTotalRetirement(null);setOSpendDown(null);}} style={{width:isMobile?"100%":160,padding:"4px 8px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,fontSize:12,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.textDim,marginBottom:4}}>
                <span>{t('coasting.retirementAge')}</span>
                <span style={{color:C.accent,fontWeight:600}}>{coastRetirementAge}</span>
              </div>
              <input type="range" min={55} max={70} step={1} value={coastRetirementAge} onChange={e=>setCoastRetirementAge(Number(e.target.value))} style={{width:isMobile?"100%":160,accentColor:C.accent}}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.textDim,marginTop:2}}>
                <span>55</span><span>AHV 65</span><span>70</span>
              </div>
            </div>
            <div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.textDim,marginBottom:4}}>
                <span>{t('coasting.expectedReturn')}</span>
                <span style={{color:C.accent,fontWeight:600}}>{coastReturnRate}%</span>
              </div>
              <input type="range" min={4} max={10} step={0.5} value={coastReturnRate} onChange={e=>setCoastReturnRate(Number(e.target.value))} style={{width:isMobile?"100%":160,accentColor:C.accent}}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.textDim,marginTop:2}}>
                <span>4% {t('coasting.conservative')}</span><span>10%</span>
              </div>
            </div>
          </div>
        </div>
        {/* Projection Chart — full lifecycle */}
        {coastChartData.length > 1 && <div style={{marginTop:8}}>
          <div style={{fontSize:12,color:C.textMuted,marginBottom:8}}>{t('coasting.lifecycle', {age: coastSpendDownAge})}</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={coastChartData} margin={{top:5,right:20,bottom:5,left:20}}>
              <defs>
                <linearGradient id="coastGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.green} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={C.green} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="age" tick={{fontSize:11,fill:C.textDim}} tickLine={false} axisLine={false} label={{value:"Age",position:"insideBottom",offset:-2,fontSize:11,fill:C.textDim}}/>
              <YAxis tick={{fontSize:11,fill:C.textDim}} tickLine={false} axisLine={false} tickFormatter={v=>v>=1e6?`${(v/1e6).toFixed(1)}M`:`${Math.round(v/1000)}k`}/>
              <Tooltip contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,fontSize:12}} formatter={(v,n,p)=>[`CHF ${fmt(v)}`,p.payload.phase]} labelFormatter={l=>`Age ${l}`}/>
              <ReferenceLine x={coastRetirementAge} stroke={C.yellow} strokeDasharray="5 5" label={{value:t('coasting.retire', {age: coastRetirementAge}),position:"top",fontSize:10,fill:C.yellow}}/>
              <ReferenceLine y={coastFiNow} stroke={C.accent} strokeDasharray="5 5" label={{value:t('coasting.coastingFiHash'),position:"insideTopRight",fontSize:10,fill:C.accent}}/>
              <Area type="monotone" dataKey="value" stroke={C.green} fill="url(#coastGrad)" strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>}
      </Card>
    </div>

    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16,marginBottom:24}}>
      {/* Card 2 — Retirement Income Calculator */}
      <Card>
        <div style={{fontSize:12,fontFamily:"'DM Mono',monospace",color:C.textMuted,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.08em"}}>{t('coasting.retirementIncome')}</div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
          <div style={{padding:"8px 12px",borderRadius:6,background:C.green+"0d",border:`1px solid ${C.green}22`}}>
            <div style={{fontSize:12,color:C.textDim}}>{t('coasting.totalAtRetirement', {age: coastRetirementAge})}</div>
            <div style={{fontSize:20,fontWeight:600,color:C.green}}><EditNum calc={totalAtRetirement} override={oTotalRetirement} setOverride={v=>{setOTotalRetirement(v);setOSpendDown(null);}} color={C.green} size={20}/></div>
            <div style={{fontSize:11,color:C.textDim}}>
              {t('coasting.liquidAmount', {amount: mask(fmt(Math.round(liquidAtRetirement)))})}
              {projectedPensionNet > 0 && <> {t('coasting.pensionAmount', {amount: mask(fmt(Math.round(projectedPensionNet)))})}</>}
            </div>
          </div>
        </div>
        {/* Spend-down sliders */}
        <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:12}}>
          <div style={{flex:1,minWidth:140}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.textDim,marginBottom:4}}>
              <span>{t('coasting.spendDownAge')}</span>
              <span style={{color:C.accent,fontWeight:600}}>{coastSpendDownAge}</span>
            </div>
            <input type="range" min={80} max={110} step={1} value={coastSpendDownAge} onChange={e=>setCoastSpendDownAge(Number(e.target.value))} style={{width:"100%",accentColor:C.accent}}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.textDim,marginTop:2}}>
              <span>80</span><span>95 avg</span><span>110</span>
            </div>
          </div>
          <div style={{flex:1,minWidth:140}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.textDim,marginBottom:4}}>
              <span>{t('coasting.returnInRetirement')}</span>
              <span style={{color:C.accent,fontWeight:600}}>{coastRetirementReturn}%</span>
            </div>
            <input type="range" min={0} max={6} step={0.5} value={coastRetirementReturn} onChange={e=>setCoastRetirementReturn(Number(e.target.value))} style={{width:"100%",accentColor:C.accent}}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.textDim,marginTop:2}}>
              <span>0% ({t('coasting.mattress')})</span><span>6%</span>
            </div>
          </div>
        </div>
        {/* Spend-down result */}
        <div style={{padding:"10px 12px",borderRadius:6,background:C.accent+"0d",border:`1px solid ${C.accent}22`,marginBottom:8}}>
          <div style={{fontSize:12,color:C.textDim}}>{t('coasting.spendDownWithdrawal', {age: coastSpendDownAge})}</div>
          <div style={{fontSize:20,fontWeight:600,color:C.accent}}><EditNum calc={spendDownCalc} override={oSpendDown} setOverride={setOSpendDown} color={C.accent} size={20} suf="/yr"/></div>
          <div style={{fontSize:13,color:C.textDim}}>{t('coasting.spendDownMonthly', {amount: mask(fmt(Math.round(spendDownWithdrawal/12))), years: retirementYears})}</div>
        </div>
        {/* Comparison: perpetual vs spend-down */}
        <div style={{padding:"8px 12px",borderRadius:8,background:C.bg,border:`1px solid ${C.border}33`,fontSize:12,color:C.textDim,lineHeight:1.8}}>
          <strong style={{color:C.textMuted}}>{t('coasting.perpetualVsSpendDown')}</strong><br/>
          {t('coasting.fourPctRule', {annual: mask(fmt(Math.round(safeWithdrawalAtRetirement))), monthly: mask(fmt(Math.round(safeWithdrawalAtRetirement/12)))})}<br/>
          {t('coasting.spendToZero', {age: coastSpendDownAge, annual: mask(fmt(Math.round(spendDownWithdrawal))), monthly: mask(fmt(Math.round(spendDownWithdrawal/12)))})}<br/>
          <span style={{color:C.green}}>{t('coasting.moreIncome', {pct: safeWithdrawalAtRetirement>0?((spendDownWithdrawal/safeWithdrawalAtRetirement-1)*100).toFixed(0):0})}</span>
        </div>
        <div style={{padding:"8px 12px",borderRadius:8,background:C.yellow+"0a",border:`1px solid ${C.yellow}15`,fontSize:12,color:C.textDim,lineHeight:1.7,marginTop:8}}>
          <strong style={{color:C.yellow}}>{t('coasting.whySpendDown')}</strong> {t('coasting.whySpendDownDesc')}
        </div>
      </Card>

      {/* Card 3 — Phase Comparison Table */}
      <Card>
        <div style={{fontSize:12,fontFamily:"'DM Mono',monospace",color:C.textMuted,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.08em"}}>{t('coasting.phaseComparison')}</div>
        <table style={{width:"100%",fontSize:12,borderCollapse:"collapse"}}>
          <thead>
            <tr>
              <th style={{padding:"8px 10px",textAlign:"left",color:C.textDim,borderBottom:`1px solid ${C.border}33`}}/>
              <th style={{padding:"8px 10px",textAlign:"left",color:C.orange,fontWeight:600,borderBottom:`1px solid ${C.border}33`}}>{t('coasting.accumulation')}</th>
              <th style={{padding:"8px 10px",textAlign:"left",color:C.green,fontWeight:600,borderBottom:`1px solid ${C.border}33`}}>{t('coasting.coasting')}</th>
            </tr>
          </thead>
          <tbody>
            {[
              [t('coasting.duration'),yearsToCoast!=null?`~${yearsToCoast} years`:"—",`${coastingYears} years`],
              [t('coasting.savingsRateRow'),t('coasting.maxPossible'),t('coasting.zeroSpendAll')],
              [t('coasting.portfolio'),t('coasting.activeContrib'),t('coasting.untouched')],
              [t('coasting.lifestyle'),t('coasting.frugal'),t('coasting.fullSalary')],
              [t('coasting.careerPressure'),t('coasting.incomeCritical'),t('coasting.anyJob')],
              [t('coasting.stressLevel'),t('coasting.higher'),t('coasting.muchLower')],
            ].map(([label,acc,coast],i)=><tr key={i} style={{background:i%2===0?"transparent":C.bg}}>
              <td style={{padding:"6px 10px",color:C.textMuted,fontWeight:600}}>{label}</td>
              <td style={{padding:"6px 10px",color:C.textDim}}>{acc}</td>
              <td style={{padding:"6px 10px",color:C.textDim}}>{coast}</td>
            </tr>)}
          </tbody>
        </table>
        <div style={{padding:"8px 12px",borderRadius:8,background:C.yellow+"0a",border:`1px solid ${C.yellow}15`,fontSize:12,color:C.textDim,lineHeight:1.7,marginTop:12}}>
          <strong style={{color:C.yellow}}>{t('coasting.keyInsight')}</strong> {t('coasting.keyInsightDesc')}
        </div>
      </Card>
    </div>

    </>}

    {tab==="indentured" && <>
    {/* ── Indentured Time Calculator ── */}
    <h2 style={{fontSize:18,fontWeight:700,color:C.text,margin:"0 0 4px"}}>{t('indentured.title')}</h2>
    <p style={{fontSize:14,color:C.textMuted,marginBottom:12}}>{t('indentured.subtitle')}</p>
    <div style={{padding:"10px 14px",borderRadius:8,background:C.accent+"0a",border:`1px solid ${C.accent}15`,fontSize:12,color:C.textDim,lineHeight:1.7,marginBottom:16}}>
      <strong style={{color:C.text}}>{t('indentured.concept')}</strong> {t('indentured.conceptDesc')}
    </div>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16}}>
      <Card>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div>
            <div style={{fontSize:13,color:C.textMuted,marginBottom:6}}>{t('indentured.hourlyRate')}</div>
            <div style={{fontSize:30,fontWeight:400,fontFamily:"'Fraunces',serif",color:C.yellow}}>CHF {mask(fmtD(hourlyRate))}/h</div>
            <div style={{fontSize:12,color:C.textDim,marginTop:2}}>{sc ? t('indentured.hourlyCalc', {annual: mask(fmt(Math.round(inc*12))), hours: Math.round(annualHours), hpw: hoursPerWeek, weeks: workingWeeks}) : t('indentured.noScenario')}</div>
          </div>
          <div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:C.textMuted,marginBottom:6}}>
              <span>{t('indentured.workHoursWeek')}</span>
              <span style={{color:C.accent,fontWeight:600}}>{hoursPerWeek}h</span>
            </div>
            <input type="range" min={20} max={50} step={1} value={hoursPerWeek} onChange={e=>setHoursPerWeek(Number(e.target.value))} style={{width:"100%",accentColor:C.accent}}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.textDim,marginTop:2}}>
              <span>{t('indentured.partTime')}</span>
              <span>{t('indentured.standard40')}</span>
              <span>{t('indentured.max50')}</span>
            </div>
          </div>
          <div>
            <div style={{fontSize:13,color:C.textMuted,marginBottom:6}}>{t('indentured.purchaseAmount')}</div>
            <input
              type="text"
              value={purchase}
              onChange={e=>setPurchase(e.target.value)}
              placeholder={t('indentured.purchasePlaceholder')}
              style={{width:"100%",padding:"10px 12px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:17,outline:"none",boxSizing:"border-box"}}
            />
          </div>
        </div>
      </Card>
      <Card>
        {purchaseAmt > 0 && hourlyRate > 0 ? <>
          <div style={{fontSize:13,color:C.textMuted,marginBottom:16}}>{t('indentured.purchaseOf', {amount: fmt(purchaseAmt)})}</div>
          {[
            {label:t('indentured.workingHours'), value:`${Math.round(hoursNeeded).toLocaleString("de-CH")}h`, sub:t('indentured.netHours'), color:C.red},
            {label:t('indentured.workingDays'), value:`${daysNeeded.toFixed(1)} days`, sub:t('indentured.atHoursDay', {hours: hoursPerWeek/5}), color:C.orange},
            {label:t('indentured.workingWeeks'), value:`${weeksNeeded.toFixed(1)} weeks`, sub:t('indentured.atHoursWeek', {hours: hoursPerWeek}), color:C.yellow},
            {label:t('indentured.workingMonths'), value:`${(weeksNeeded/4.33).toFixed(1)} months`, sub:t('indentured.approxCalendar'), color:C.green},
          ].map((r,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:i<3?`1px solid ${C.border}22`:"none"}}>
            <div>
              <div style={{fontSize:14,color:C.textMuted}}>{r.label}</div>
              <div style={{fontSize:12,color:C.textDim}}>{r.sub}</div>
            </div>
            <div style={{fontSize:20,fontWeight:700,color:r.color}}>{r.value}</div>
          </div>)}
          <div style={{marginTop:12,padding:"10px 12px",borderRadius:8,background:C.bg,fontSize:12,color:C.textDim,lineHeight:1.7}}>
            {t('indentured.basedOn', {hours: Math.round(annualHours).toLocaleString("de-CH"), hpw: hoursPerWeek, weeks: workingWeeks})}
          </div>
        </> : <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",color:C.textDim,fontSize:13}}>
          {t('indentured.enterAmount')}
        </div>}
      </Card>
    </div>
    </>}
  </div>;
}

// ───────────────────────────────────────────────────────────────
// AI CHAT PANEL
// ───────────────────────────────────────────────────────────────
function ChatPanel({ accounts, scenarios, subsP, subsPInScenario, yearly, taxes, insurance, profile, open, setOpen, externalInput, setExternalInput, promptTemplate, onPinned, t }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [chatStatus, setChatStatus] = useState("");
  const [attachment, setAttachment] = useState(null); // { name, type, data (base64) }
  const [maximized, setMaximized] = useState(false);
  const [aiProvider, setAiProvider] = useState({ label: '…', description: 'Loading…' });
  const [btnPos, setBtnPos] = useState({ right: 24, bottom: 24 });
  const [saved, setSaved] = useState(false);
  const [pinPending, setPinPending] = useState(false);
  const [pendingConsent, setPendingConsent] = useState(null); // { question, sentAttachment }
  const [scanResult, setScanResult] = useState(null);          // server scan response for the current attachment
  const [scanning,   setScanning]   = useState(false);         // scan in-flight
  const [pendingAttachmentConfirm, setPendingAttachmentConfirm] = useState(null); // { question, sentAttachment, findings }
  const pendingPin = useRef(false);
  const messagesRef = useRef([]);
  const fileInputRef = useRef(null);
  const isDragging = useRef(false);

  const startDrag = (e) => {
    if (e.button !== 0) return;
    isDragging.current = false;
    const startX = e.clientX, startY = e.clientY;
    const startRight = btnPos.right, startBottom = btnPos.bottom;
    const onMove = (ev) => {
      isDragging.current = true;
      const right = Math.max(8, Math.min(window.innerWidth - 60, startRight - (ev.clientX - startX)));
      const bottom = Math.max(8, Math.min(window.innerHeight - 60, startBottom - (ev.clientY - startY)));
      setBtnPos({ right, bottom });
    };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  useEffect(() => {
    const stored = getStoredProviderConfig();
    if (stored?.provider && stored.provider !== 'auto') {
      // User has a custom provider — show its label without hitting /api/provider
      const labels = { anthropic: 'Claude (Anthropic)', openai: 'GPT-4o (OpenAI)', gemini: 'Gemini (Google)', ollama: stored.model || 'Ollama (local)' };
      setAiProvider({ provider: stored.provider, label: labels[stored.provider] || stored.provider, description: stored.provider === 'ollama' ? '100% local · no data leaves your machine' : 'Custom provider configured in AI Settings' });
    } else {
      fetch(`${API_URL}/provider`).then(r => r.json()).then(d => setAiProvider(d)).catch(() => {});
    }
  }, [open]); // re-check each time panel opens in case settings changed

  // Pre-seed input from external callers (e.g. Portfolio page quick-actions)
  useEffect(() => {
    if (externalInput) { setInput(externalInput); setExternalInput(""); }
  }, [externalInput]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      setAttachment({ name: file.name, type: file.type, data: base64, size: file.size });
      setScanResult(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Scan attachments in the background the moment the user picks a file, so
  // by the time they click Send we can tell them what PII is about to leave
  // their machine. Skipped for Ollama — data never leaves the box anyway.
  useEffect(() => {
    if (!attachment) { setScanResult(null); setScanning(false); return; }
    const sc = getStoredProviderConfig();
    const isLocal = aiProvider?.provider === 'ollama' || sc?.provider === 'ollama';
    if (isLocal) { setScanResult(null); setScanning(false); return; }
    const ctrl = new AbortController();
    setScanning(true); setScanResult(null);
    fetch(`${API_URL}/scan-attachment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attachment, profile: profile || null }),
      signal: ctrl.signal,
    })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(r => { setScanResult(r); setScanning(false); })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setScanResult({ supported: false, error: err.message });
          setScanning(false);
        }
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachment?.data, aiProvider?.provider]);
  useEffect(() => {
    if (!streaming && pendingPin.current) {
      pendingPin.current = false;
      setPinPending(false);
      doSavePin(messagesRef.current);
    }
  }, [streaming]);

  const buildContext = () => {
    const sc = scenarios.find(s => s.isActive);
    const totalWealth = accounts.reduce((s, a) => s + a.balance, 0);
    const liquidTypes = ["Checking","Savings","Investment","Crypto"];
    const liquidTotal = accounts.filter(a => liquidTypes.includes(a.type)).reduce((s,a)=>s+a.balance,0);
    const getA = (item) => item.pct != null ? (sc ? sc.incomes.reduce((s,x)=>s+x.amount,0) * item.pct / 100 : 0) : item.amount;
    const inc = sc ? sc.incomes.reduce((s,x)=>s+x.amount,0) : 0;
    const exp = sc ? sc.expenses.reduce((s,x)=>s+getA(x),0) : 0;
    const sav = sc ? sc.savings.reduce((s,x)=>s+getA(x),0) : 0;
    const inv = sc ? sc.investments.reduce((s,x)=>s+getA(x),0) : 0;
    const essentialCosts = sc ? sc.expenses.filter(e=>e.essential!==false).reduce((s,x)=>s+getA(x),0) + sc.savings.filter(e=>e.essential!==false).reduce((s,x)=>s+getA(x),0) : 0;
    // Linked provisions — external expenses linked into the scenario
    const latestTax = taxes[taxes.length - 1];
    const ov = sc?.linkedOverrides || {};
    const effL = (key, raw) => ov[key] != null ? ov[key] : raw;
    const rawLinkedSubsP = subsPInScenario ? subsP.reduce((s,x)=>s+subMonthly(x),0) : 0;
    const rawLinkedRecurring = yearly.reduce((s,e)=>s+recMonthly(e),0);
    const rawLinkedInsurance = insurance.reduce((s,p)=>s+insMonthlyCalc(p),0);
    const rawLinkedTax = latestTax ? latestTax.lines.reduce((s,l)=>s+l.amount,0)/12 : 0;
    const linkedSubsP = effL('subsP', rawLinkedSubsP);
    const linkedRecurring = effL('recurring', rawLinkedRecurring);
    const linkedInsurance = effL('insurance', rawLinkedInsurance);
    const linkedTax = effL('tax', rawLinkedTax);
    const linkedTotal = linkedSubsP + linkedRecurring + linkedInsurance + linkedTax;
    return {
      today: new Date().toISOString().slice(0, 10),
      totalWealth, liquidTotal,
      lockedTotal: totalWealth - liquidTotal,
      survivalMonths: essentialCosts > 0 ? Math.floor(liquidTotal / essentialCosts) : 0,
      activeScenario: sc ? {
        name: sc.name,
        incomes:     (sc.incomes||[]).map(x => ({ label: x.label, amount: Math.round(getA(x)||0) })),
        expenses:    (sc.expenses||[]).map(x => ({ label: x.label, amount: Math.round(getA(x)||0), essential: x.essential !== false })),
        savings:     (sc.savings||[]).map(x => ({ label: x.label, amount: Math.round(getA(x)||0) })),
        investments: (sc.investments||[]).map(x => ({ label: x.label, amount: Math.round(getA(x)||0) })),
        provisions: {
          subscriptions: Math.round(linkedSubsP),
          recurring: Math.round(linkedRecurring),
          insurance: Math.round(linkedInsurance),
          tax: Math.round(linkedTax),
          total: Math.round(linkedTotal),
          note: 'Linked external expenses — part of total monthly outflow',
        },
        totals: { income: Math.round(inc), expenses: Math.round(exp), provisions: Math.round(linkedTotal), savings: Math.round(sav), investments: Math.round(inv), unallocated: Math.round(inc - exp - linkedTotal - sav - inv) },
      } : null,
      accounts: accounts.map(a => ({
        name: a.name, type: a.type, balance: a.balance,
        ...(a.interestRate!=null && { interestRate: a.interestRate }),
        ...(a.positions?.length && { positions: a.positions.map(p=>({ ticker:p.ticker, shares:p.shares, avgBuyPrice:p.avgBuyPrice })) }),
        ...(a.instructions && { instructions: a.instructions }),
      })),
      subscriptions: subsP.map(x => ({ name: x.name, monthly: Math.round(subMonthly(x)) })),
      yearlyExpenses: yearly,
      insurance: insurance.map(i => ({ name: i.name, insurer: i.insurer || '', monthly: Math.round(insMonthlyCalc(i)) })),
      latestTax: taxes[taxes.length-1] || null,
      _profile: profile || null,
    };
  };

  const doSavePin = async (msgs) => {
    const lastAssistant = [...msgs].reverse().find(m => m.role === "assistant" && m.content && !m.content.startsWith("[!]"));
    if (!lastAssistant) return;
    const existing = await fetch(`${API_URL}/ai_analysis`).then(r => r.status === 404 ? [] : r.json()).catch(() => []);
    const list = Array.isArray(existing) ? existing : (existing?.text ? [existing] : []);
    await fetch(`${API_URL}/ai_analysis`, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([...list, { id: `note-${Date.now()}`, text: lastAssistant.content, savedAt: new Date().toISOString() }]) });
    setSaved(true); setTimeout(() => setSaved(false), 2500);
    onPinned && onPinned();
  };

  const pinLastResponse = () => {
    if (streaming) {
      pendingPin.current = true;
      setPinPending(true);
      return;
    }
    doSavePin(messages);
  };

  const doSendMessage = async (question, sentAttachment) => {
    const userMsg = { role: "user", content: question, attachmentName: sentAttachment?.name };
    const assistantMsg = { role: "assistant", content: "" };
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    // Build history (all messages except the new ones we just added)
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    const storedConfig = getStoredProviderConfig();

    try {
      const body = { message: question, context: buildContext(), history, attachment: sentAttachment, systemOverride: promptTemplate || undefined };
      if (storedConfig && storedConfig.provider && storedConfig.provider !== 'auto') body.providerConfig = storedConfig;
      const resp = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") break;
          try {
            const { text, error, status } = JSON.parse(payload);
            if (status) { setChatStatus(status); }
            if (error) {
              const msg = error.includes("credit balance is too low") || error.includes("insufficient_balance") ? "[!] Anthropic API credits exhausted — top up at console.anthropic.com → Plans & Billing."
                : error.includes("ANTHROPIC_API_KEY not configured") ? "[!] API key not set. Add ANTHROPIC_API_KEY to .env and restart."
                : error.includes("overloaded") || error.includes("529") ? "[!] Anthropic API overloaded. Try again in a moment."
                : error.includes("rate_limit") || error.includes("429") ? "[!] Rate limit hit. Wait a moment and try again."
                : "[!] " + error.replace(/^AI service error:\s*/,"").slice(0, 200);
              setMessages(prev => { const u=[...prev]; u[u.length-1]={...u[u.length-1],content:msg}; return u; }); setChatStatus(""); break;
            }
            if (text) { setChatStatus(""); setMessages(prev => { const u=[...prev]; u[u.length-1]={...u[u.length-1],content:u[u.length-1].content+text}; return u; }); }
          } catch {}
        }
      }
    } catch (err) {
      setMessages(prev => { const u=[...prev]; u[u.length-1]={...u[u.length-1],content:"[!] Cannot reach the API server. Make sure Docker is running (`make docker-up`)."}; return u; });
    }
    setStreaming(false); setChatStatus("");
  };

  const sendMessage = async () => {
    if ((!input.trim() && !attachment) || streaming) return;
    const question = input.trim() || (attachment ? `Please analyse this file: ${attachment.name}` : "");
    const sentAttachment = attachment;
    const scanForThisAtt = sentAttachment ? scanResult : null;
    setInput(""); setAttachment(null); setScanResult(null);

    // If the attached file was scanned and contained PII, pause and make the
    // user explicitly acknowledge what's about to leave their server.
    if (sentAttachment && scanForThisAtt?.supported && scanForThisAtt.totalFindings > 0) {
      setPendingAttachmentConfirm({ question, sentAttachment, scan: scanForThisAtt });
      return;
    }

    // Check consent for cloud providers (one-time per session per provider)
    const storedConfig = getStoredProviderConfig();
    const provId = (storedConfig?.provider && storedConfig.provider !== 'auto') ? storedConfig.provider : aiProvider?.provider;
    if (provId && provId !== 'ollama') {
      const consentKey = `ai_consent_${provId}`;
      if (!sessionStorage.getItem(consentKey)) {
        setPendingConsent({ question, sentAttachment });
        return;
      }
    }
    doSendMessage(question, sentAttachment);
  };

  const handleAttachmentConfirmAccept = () => {
    const { question, sentAttachment } = pendingAttachmentConfirm;
    setPendingAttachmentConfirm(null);
    // Still run consent check after the attachment confirmation
    const storedConfig = getStoredProviderConfig();
    const provId = (storedConfig?.provider && storedConfig.provider !== 'auto') ? storedConfig.provider : aiProvider?.provider;
    if (provId && provId !== 'ollama') {
      const consentKey = `ai_consent_${provId}`;
      if (!sessionStorage.getItem(consentKey)) {
        setPendingConsent({ question, sentAttachment });
        return;
      }
    }
    doSendMessage(question, sentAttachment);
  };

  const handleAttachmentConfirmCancel = () => {
    // Restore the attachment and the typed message so the user can edit/cancel
    setInput(pendingAttachmentConfirm?.question || '');
    setAttachment(pendingAttachmentConfirm?.sentAttachment || null);
    setScanResult(pendingAttachmentConfirm?.scan || null);
    setPendingAttachmentConfirm(null);
  };

  const handleConsentAccept = () => {
    const storedConfig = getStoredProviderConfig();
    const provId = (storedConfig?.provider && storedConfig.provider !== 'auto') ? storedConfig.provider : aiProvider?.provider;
    if (provId) sessionStorage.setItem(`ai_consent_${provId}`, 'true');
    const { question, sentAttachment } = pendingConsent;
    setPendingConsent(null);
    doSendMessage(question, sentAttachment);
  };

  const handleConsentDecline = () => {
    setInput(pendingConsent?.question || '');
    setPendingConsent(null);
  };

  const panelW = typeof window !== 'undefined' && window.innerWidth < 768 ? window.innerWidth - 24 : 420;
  const providerIsLocal = aiProvider?.provider === 'ollama' || (() => { const sc = getStoredProviderConfig(); return sc?.provider === 'ollama'; })();

  return <>
    {/* Floating button */}
    <button onMouseDown={startDrag} onClick={()=>{ if(!isDragging.current) setOpen(o=>!o); }} title={t('chat.title')} style={{position:"fixed",bottom:btnPos.bottom,right:btnPos.right,width:52,height:52,borderRadius:26,background:C.accent,border:"none",cursor:"grab",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 20px rgba(37,99,235,0.5)",zIndex:1000,userSelect:"none"}}>
      <Sparkles size={22} color="#fff"/>
    </button>

    {/* Panel */}
    {open && maximized && <div onClick={()=>setMaximized(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:1001,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}/>}
    {open && <div style={maximized?{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"min(92vw,1140px)",height:"84vh",background:C.card,border:`1px solid ${C.border}`,borderRadius:16,display:"flex",flexDirection:"column",zIndex:1002,boxShadow:"0 24px 80px rgba(0,0,0,0.6)",overflow:"hidden"}:{position:"fixed",bottom:btnPos.bottom+64,right:btnPos.right,width:panelW,height:typeof window !== 'undefined' && window.innerWidth < 768 ? 'calc(100vh - 120px)' : 520,background:C.card,border:`1px solid ${C.border}`,borderRadius:16,display:"flex",flexDirection:"column",zIndex:1000,boxShadow:"0 8px 40px rgba(0,0,0,0.5)",overflow:"hidden"}}>
      {/* Attachment-findings confirm modal — shown BEFORE the provider consent modal
          when the pre-send scan turned up sensitive data in the attached file. */}
      {pendingAttachmentConfirm && <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.75)',zIndex:11,display:'flex',alignItems:'center',justifyContent:'center',padding:20,borderRadius:16}}>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:22,maxWidth:420,width:'100%',boxShadow:'0 8px 40px rgba(0,0,0,0.5)',maxHeight:'90%',overflowY:'auto'}}>
          <div style={{fontSize:16,marginBottom:6,display:'flex',alignItems:'center',gap:8,fontWeight:600,color:C.text}}><Info size={18} color={C.accent}/>{t('chat.piiTitle')}</div>
          <div style={{fontSize:12,color:C.textDim,marginBottom:14,display:'flex',alignItems:'center',gap:4}}><Paperclip size={11}/> {pendingAttachmentConfirm.sentAttachment.name}</div>
          <div style={{fontSize:13,color:C.textMuted,lineHeight:1.6,marginBottom:12}}>
            {t('chat.piiDesc', {provider: aiProvider?.label || 'the cloud provider'})}
          </div>
          <div style={{fontSize:12,color:C.text,lineHeight:1.8,marginBottom:14,padding:'10px 14px',background:C.bg,borderRadius:9,border:`1px solid ${C.border}`,fontFamily:"'DM Mono',monospace"}}>
            {(() => {
              const f = pendingAttachmentConfirm.scan.findings || {};
              const rows = [];
              if (f.ahv?.length)       rows.push([`${f.ahv.length} AHV number${f.ahv.length>1?'s':''}`,       f.ahv]);
              if (f.iban?.length)      rows.push([`${f.iban.length} IBAN${f.iban.length>1?'s':''}`,            f.iban]);
              if (f.email?.length)     rows.push([`${f.email.length} email${f.email.length>1?'s':''}`,         f.email]);
              if (f.phone?.length)     rows.push([`${f.phone.length} phone number${f.phone.length>1?'s':''}`,  f.phone]);
              if (f.card?.length)      rows.push([`${f.card.length} card-like number${f.card.length>1?'s':''}`,f.card]);
              if (f.names?.length)     rows.push([`${f.names.length} name match${f.names.length>1?'es':''}`,   f.names]);
              if (f.addresses?.length) rows.push([`${f.addresses.length} address part${f.addresses.length>1?'s':''}`, f.addresses]);
              return rows.map(([label, values], i) => <div key={i}>
                <div style={{color:C.textMuted,fontWeight:600}}>• {label}</div>
                <div style={{color:C.textDim,fontSize:11,paddingLeft:12,whiteSpace:'pre-wrap',wordBreak:'break-all'}}>{values.slice(0,5).join(', ')}{values.length>5?`  (+${values.length-5} more)`:''}</div>
              </div>);
            })()}
          </div>
          <div style={{fontSize:12,color:C.textDim,lineHeight:1.6,marginBottom:16}}>
            This is usually fine for personal use. If you'd prefer not to share this data, you can cancel and redact the file, or switch to <strong>Ollama</strong> (fully local) in AI Settings.
          </div>
          <div style={{display:'flex',gap:10}}>
            <button onClick={handleAttachmentConfirmCancel} style={{flex:1,padding:'10px 0',borderRadius:8,border:`1px solid ${C.border}`,background:'transparent',color:C.textMuted,fontSize:14,cursor:'pointer'}}>{t('common.cancel')}</button>
            <button onClick={handleAttachmentConfirmAccept} style={{flex:1,padding:'10px 0',borderRadius:8,border:'none',background:C.accent,color:'#fff',fontWeight:700,fontSize:14,cursor:'pointer'}}>{t('chat.piiContinue')}</button>
          </div>
        </div>
      </div>}

      {/* Consent modal */}
      {pendingConsent && <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.75)',zIndex:10,display:'flex',alignItems:'center',justifyContent:'center',padding:20,borderRadius:16}}>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:24,maxWidth:380,width:'100%',boxShadow:'0 8px 40px rgba(0,0,0,0.5)'}}>
          <div style={{fontSize:20,marginBottom:12,display:'flex',alignItems:'center',gap:8}}><Cloud size={20}/> {t('chat.privacyTitle')}</div>
          <div style={{fontSize:13,color:C.text,lineHeight:1.7,marginBottom:12}}>
            {t('chat.privacyDesc', {provider: aiProvider?.label || 'a cloud AI provider'})}
          </div>
          <div style={{fontSize:12,color:C.green,lineHeight:1.6,marginBottom:10,padding:'10px 14px',background:C.green+'15',borderRadius:9,border:`1px solid ${C.green}33`}}>
            {t('chat.privacyMasked')}
          </div>
          <div style={{fontSize:12,color:C.orange,lineHeight:1.6,marginBottom:10,padding:'10px 14px',background:C.orange+'15',borderRadius:9,border:`1px solid ${C.orange}33`}}>
            <AlertTriangle size={12} style={{marginRight:4,flexShrink:0}}/> {t('chat.privacyFiles')}
          </div>
          <div style={{fontSize:11,color:C.textDim,lineHeight:1.6,marginBottom:18}}>
            {t('chat.privacyUnmasked')}
          </div>
          <div style={{display:'flex',gap:10}}>
            <button onClick={handleConsentAccept} style={{flex:1,padding:'10px 0',borderRadius:8,border:'none',background:C.accent,color:'#fff',fontWeight:700,fontSize:14,cursor:'pointer'}}>{t('chat.privacyAccept')}</button>
            <button onClick={handleConsentDecline} style={{padding:'10px 16px',borderRadius:8,border:`1px solid ${C.border}`,background:'transparent',color:C.textMuted,fontSize:14,cursor:'pointer'}}>{t('common.cancel')}</button>
          </div>
        </div>
      </div>}

      {/* Header */}
      <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",background:C.bg}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <Sparkles size={16} color={C.accentLight}/>
          <span style={{fontSize:14,fontWeight:600,color:C.text}}>{t('chat.title')}</span>
          {providerIsLocal
            ? <span style={{fontSize:10,padding:'1px 7px',borderRadius:9,background:C.green+'22',color:C.green,fontWeight:700,display:'inline-flex',alignItems:'center'}}><Lock size={10} style={{marginRight:2}}/> {t('chat.local')}</span>
            : aiProvider?.provider && <>
                <span style={{fontSize:10,padding:'1px 7px',borderRadius:9,background:C.orange+'22',color:C.orange,fontWeight:700,display:'inline-flex',alignItems:'center'}}><Cloud size={10} style={{marginRight:2}}/> {aiProvider.label}</span>
                <span title={t('chat.piiTooltip')} style={{fontSize:10,padding:'1px 7px',borderRadius:9,background:C.green+'22',color:C.green,fontWeight:700,cursor:'help',display:'inline-flex',alignItems:'center',whiteSpace:'nowrap'}}><ShieldCheck size={10} style={{marginRight:3}}/>{t('chat.piiMasked')}</span>
              </>
          }
        </div>
        <div style={{display:"flex",gap:6,alignItems:'center'}}>
          {messages.length>0 && <button onClick={()=>setMessages([])} title={t('chat.clear')} style={{padding:"4px 8px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.textDim,fontSize:12,cursor:"pointer"}}>{t('chat.clear')}</button>}
          {messages.some(m=>m.role==="assistant"&&m.content) && <button onClick={pinLastResponse} title={t('chat.pin')} style={{padding:"4px 8px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:saved?C.green:pinPending?C.yellow:C.textDim,fontSize:12,cursor:"pointer"}}>{saved?t('chat.pinned'):pinPending?<><RefreshCw size={11} style={{animation:'spin 1s linear infinite',marginRight:2}}/> {t('chat.pinning')}</>:<><Pin size={11} style={{marginRight:2}}/> {t('chat.pin')}</>}</button>}
          <button onClick={()=>setMaximized(m=>!m)} title={maximized?t('chat.restore'):t('chat.maximize')} style={{background:"transparent",border:"none",cursor:"pointer",color:C.textDim,padding:4,display:'flex'}}>{maximized?<Minimize2 size={15}/>:<Maximize2 size={15}/>}</button>
          <button onClick={()=>setOpen(false)} style={{background:"transparent",border:"none",cursor:"pointer",color:C.textDim,padding:4,display:'flex'}}><X size={16}/></button>
        </div>
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:12}}>
        {messages.length===0 && <div style={{color:C.textDim,fontSize:14,textAlign:"center",marginTop:40,lineHeight:1.7}}>
          {t('chat.empty')}<br/>
          <span style={{fontSize:13,opacity:0.7}}>{t('chat.emptyHint')}</span>
        </div>}
        {messages.map((m,i) => <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
          <div style={{maxWidth:"85%"}}>
            {m.attachmentName && <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4,justifyContent:"flex-end"}}>
              <Paperclip size={11} color={C.accentLight}/><span style={{fontSize:12,color:C.accentLight}}>{m.attachmentName}</span>
            </div>}
            <div style={{padding:"10px 14px",borderRadius:m.role==="user"?"12px 12px 2px 12px":"12px 12px 12px 2px",background:m.role==="user"?C.accent:C.bg,fontSize:14,color:C.text,lineHeight:1.6,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>
              {m.content ? <>{m.content}</> : (m.role==="assistant" && streaming && i===messages.length-1 ? <AiThinking status={chatStatus}/> : "")}
            </div>
            {m.role==="assistant" && streaming && i===messages.length-1 && m.content && (
              <div style={{marginTop:4}}><AiThinking status={chatStatus||'Generating...'}/></div>
            )}
          </div>
        </div>)}
        <div ref={messagesEndRef}/>
      </div>

      {/* Input */}
      <div style={{borderTop:`1px solid ${C.border}`,background:C.bg}}>
        {attachment && <div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px 0",fontSize:12}}>
          <Paperclip size={12} color={C.accent}/>
          <span style={{color:C.accentLight,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{attachment.name}</span>
          <span style={{color:C.textDim,fontSize:11}}>({(attachment.size/1024).toFixed(0)}KB)</span>
          <button onClick={()=>setAttachment(null)} style={{background:"transparent",border:"none",cursor:"pointer",color:C.textDim,padding:0}}><X size={13}/></button>
        </div>}
        {attachment && !providerIsLocal && (() => {
          if (scanning) {
            return <div style={{margin:"6px 14px 0",padding:"6px 10px",fontSize:11,lineHeight:1.5,color:C.textDim,background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,display:"flex",gap:6,alignItems:"center"}}>
              <div style={{display:'flex',gap:2,alignItems:'center'}}>{[0,1,2].map(i=><div key={i} style={{width:4,height:4,borderRadius:'50%',background:C.textDim,animation:`aipulse 1.2s ease-in-out ${i*0.2}s infinite`}}/>)}</div>
              <span>{t('chat.scanning')}</span>
            </div>;
          }
          // Tag describing how the file was read, shown in tooltips so the
          // user can tell embedded-text PDFs from OCR'd scanned ones.
          const methodNote = scanResult?.method === 'pdf-ocr'
            ? ` · OCR'd ${scanResult.pageCount} page${scanResult.pageCount > 1 ? 's' : ''}${scanResult.pageLimitHit ? ' (page limit reached — content beyond not scanned)' : ''}`
            : scanResult?.method === 'tesseract' ? ' · OCR'
            : scanResult?.method === 'pdf-parse' ? ' · embedded text'
            : '';
          if (scanResult?.supported && scanResult.totalFindings > 0) {
            const f = scanResult.findings || {};
            const items = [];
            if (f.ahv?.length)      items.push(`${f.ahv.length} AHV`);
            if (f.iban?.length)     items.push(`${f.iban.length} IBAN`);
            if (f.email?.length)    items.push(`${f.email.length} email`);
            if (f.phone?.length)    items.push(`${f.phone.length} phone`);
            if (f.card?.length)     items.push(`${f.card.length} card-like`);
            if (f.names?.length)    items.push(`${f.names.length} name${f.names.length>1?'s':''}`);
            if (f.addresses?.length)items.push(`${f.addresses.length} address-part${f.addresses.length>1?'s':''}`);
            return <div title={`Scan method${methodNote}`} style={{margin:"6px 14px 0",padding:"7px 10px",fontSize:11,lineHeight:1.5,color:C.orange,background:C.orange+'15',border:`1px solid ${C.orange}33`,borderRadius:7,display:"flex",gap:6,alignItems:"flex-start"}}>
              <AlertTriangle size={12} style={{flexShrink:0,marginTop:1}}/>
              <span>{t('chat.scanWarning', {items: items.join(' · '), provider: aiProvider?.label || 'the cloud provider'})}{scanResult.pageLimitHit && <> <em>Page limit reached — content beyond page {scanResult.pageCount} was not scanned and may contain more.</em></>}</span>
            </div>;
          }
          if (scanResult?.supported && scanResult.totalFindings === 0) {
            return <div title={`Scan method${methodNote}`} style={{margin:"6px 14px 0",padding:"6px 10px",fontSize:11,lineHeight:1.5,color:C.green,background:C.green+'15',border:`1px solid ${C.green}33`,borderRadius:7,display:"flex",gap:6,alignItems:"center"}}>
              <ShieldCheck size={12} style={{flexShrink:0}}/>
              <span>{t('chat.scanClean')}</span>
            </div>;
          }
          if (scanResult?.supported && scanResult.extractionEmpty) {
            return <div style={{margin:"6px 14px 0",padding:"6px 10px",fontSize:11,lineHeight:1.5,color:C.orange,background:C.orange+'15',border:`1px solid ${C.orange}33`,borderRadius:7,display:"flex",gap:6,alignItems:"flex-start"}}>
              <AlertTriangle size={12} style={{flexShrink:0,marginTop:1}}/>
              <span>{t('chat.scanUnreadable', {provider: aiProvider?.label || 'the cloud provider'})}</span>
            </div>;
          }
          // Extraction error or unsupported type — still warn generically.
          return <div style={{margin:"6px 14px 0",padding:"6px 10px",fontSize:11,lineHeight:1.5,color:C.orange,background:C.orange+'15',border:`1px solid ${C.orange}33`,borderRadius:7,display:"flex",gap:6,alignItems:"flex-start"}}>
            <AlertTriangle size={12} style={{flexShrink:0,marginTop:1}}/>
            <span>{t('chat.scanError', {error: scanResult?.error || scanResult?.reason || 'unsupported format', provider: aiProvider?.label || 'the cloud provider'})}</span>
          </div>;
        })()}
        <div style={{padding:"12px 14px",display:"flex",gap:8,alignItems:"center"}}>
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,.pdf,.txt,.csv,.md,.json" style={{display:"none"}}/>
          <button onClick={()=>fileInputRef.current?.click()} disabled={streaming} title={t('chat.attachFile')} style={{padding:"8px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:attachment?C.accent:C.textDim,cursor:"pointer",display:"flex",flexShrink:0}}>
            <Paperclip size={15}/>
          </button>
          <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}} placeholder={t('chat.placeholder')} disabled={streaming} style={{flex:1,padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.card,color:C.text,fontSize:14,outline:"none"}}/>
          <button onClick={sendMessage} disabled={streaming||(!input.trim()&&!attachment)} style={{padding:"9px 14px",borderRadius:8,border:"none",background:streaming||(!input.trim()&&!attachment)?C.border:C.accent,color:streaming||(!input.trim()&&!attachment)?C.textDim:"#fff",cursor:streaming||(!input.trim()&&!attachment)?"not-allowed":"pointer",fontSize:14,fontWeight:600,flexShrink:0}}>
            {streaming?<div style={{display:'flex',gap:2,alignItems:'center',padding:'0 4px'}}>{[0,1,2].map(i=><div key={i} style={{width:4,height:4,borderRadius:'50%',background:'#fff',animation:`aipulse 1.2s ease-in-out ${i*0.2}s infinite`}}/>)}</div>:t('chat.send')}
          </button>
        </div>
      </div>
    </div>}
  </>;
}

// ───────────────────────────────────────────────────────────────
// ───────────────────────────────────────────────────────────────
// PORTFOLIO PAGE
// ───────────────────────────────────────────────────────────────
function PortfolioPage({ accounts, setAccounts, hideBalances, setChatOpen, setChatInput, t }) {
  const INVEST_TYPES = ['Investment', 'Crypto'];
  const mask = v => hideBalances ? '••••' : v;
  const winW = useWindowWidth(); const isMobile = winW < 768;

  // ── Market data ──
  const allTickers = useMemo(() =>
    [...new Set(accounts.flatMap(a => (a.positions||[]).map(p=>p.ticker).filter(Boolean)))],
    [accounts]
  );
  const allTickersStr = allTickers.join(',');
  const [quotes, setQuotes] = useState({});
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState(null);

  const [fxRates, setFxRates] = useState({});
  const refresh = useCallback(async () => {
    if (!allTickers.length) return;
    setQuotesLoading(true);
    try {
      const r = await fetch(`${API_URL}/market/quotes?symbols=${allTickersStr}`);
      const d = await r.json();
      const all = d.quotes || {};
      const needFx = [...new Set(Object.values(all).filter(Boolean).map(q=>q.currency).filter(c=>c&&c!=='CHF'))];
      if(needFx.length){
        const fxStr = needFx.map(c=>c+'CHF=X').join(',');
        const fr = await fetch(`${API_URL}/market/quotes?symbols=${fxStr}`);
        const fd = await fr.json();
        Object.assign(all, fd.quotes||{});
      }
      const fx = {CHF:1};
      for(const c of needFx){const key=c+'CHF=X';if(all[key]?.currentPrice)fx[c]=all[key].currentPrice;}
      setFxRates(fx);
      setQuotes(all);
      setLastFetched(new Date());
    } catch {}
    setQuotesLoading(false);
  }, [allTickersStr]);
  const toCHF = (amount, currency) => {
    if(!currency || currency==='CHF') return amount;
    const rate = fxRates[currency];
    return rate ? amount * rate : amount;
  };

  useEffect(() => { refresh(); }, [allTickersStr]);

  // ── Accordion ──
  const [expanded, setExpanded] = useState(() => new Set());
  const toggleExpand = id => setExpanded(p => { const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; });

  // ── Position CRUD ──
  const addPosition = accountId => setAccounts(prev => prev.map(a =>
    a.id!==accountId ? a : { ...a, positions:[...(a.positions||[]),{id:uid(),ticker:'',name:'',shares:0,avgBuyPrice:0}] }
  ));
  const updatePos = (accountId, posId, field, value) => setAccounts(prev => prev.map(a =>
    a.id!==accountId ? a : { ...a, positions:(a.positions||[]).map(p=>p.id===posId?{...p,[field]:value}:p) }
  ));
  const deletePos = (accountId, posId) => setAccounts(prev => prev.map(a =>
    a.id!==accountId ? a : { ...a, positions:(a.positions||[]).filter(p=>p.id!==posId) }
  ));

  // ── Ticker search ──
  const [searchQ, setSearchQ] = useState({});
  const [searchRes, setSearchRes] = useState({});
  const searchTimers = useRef({});

  const handleSearch = (accountId, q) => {
    setSearchQ(p=>({...p,[accountId]:q}));
    clearTimeout(searchTimers.current[accountId]);
    if (!q||q.length<2) { setSearchRes(p=>({...p,[accountId]:[]})); return; }
    searchTimers.current[accountId] = setTimeout(async () => {
      try {
        const r = await fetch(`${API_URL}/market/search?q=${encodeURIComponent(q)}`);
        const d = await r.json();
        setSearchRes(p=>({...p,[accountId]:d.results||[]}));
      } catch {}
    }, 400);
  };

  const selectTicker = (accountId, result) => {
    setAccounts(prev => prev.map(a =>
      a.id!==accountId ? a : {
        ...a,
        positions:[...(a.positions||[]),{id:uid(),ticker:result.symbol,name:result.name||result.symbol,shares:0,avgBuyPrice:0}]
      }
    ));
    setSearchQ(p=>({...p,[accountId]:''}));
    setSearchRes(p=>({...p,[accountId]:[]}));
    setTimeout(()=>refresh(),100);
  };

  // ── Stats ──
  const rateAccts = accounts.filter(a=>RATE_TYPES.includes(a.type)&&a.balance>0);
  const investAccts = accounts.filter(a=>INVEST_TYPES.includes(a.type));
  const totalPortfolio = accounts.filter(a=>a.type!=="Debt").reduce((s,a)=>s+a.balance,0);
  const totalInvested = investAccts.reduce((s,a)=>s+(a.positions||[]).reduce((ps,p)=>{const q=quotes[p.ticker];const cur=q?.currency||'CHF';return ps+toCHF((p.shares||0)*(p.avgBuyPrice||0),cur);},0),0);
  const totalCurrentVal = investAccts.reduce((s,a)=>s+(a.positions||[]).reduce((ps,p)=>{
    const q=quotes[p.ticker];const cur=q?.currency||'CHF'; return ps+toCHF((p.shares||0)*(q?q.currentPrice:(p.avgBuyPrice||0)),cur);
  },0),0);
  const overallPnLPct = totalInvested>0 ? (totalCurrentVal-totalInvested)/totalInvested*100 : null;
  const rateTotal = rateAccts.reduce((s,a)=>s+a.balance,0);
  const computedYield = rateTotal>0
    ? rateAccts.filter(a=>a.interestRate!=null).reduce((s,a)=>s+a.interestRate*a.balance,0)/rateTotal
    : null;
  const pieData = accounts.filter(a=>a.balance>0 && a.type!=="Debt").map(a=>({name:a.name,value:a.balance}));

  const freshness = lastFetched ? (Date.now()-lastFetched.getTime()) : null;
  const stale = freshness!=null && freshness>15*60*1000;

  return <div>
    {/* Summary stats */}
    <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(auto-fit,minmax(200px,1fr))',gap:16,marginBottom:24}}>
      <StatCard label={t('portfolio.totalPortfolio')} value={`CHF ${mask(fmt(Math.round(totalPortfolio)))}`} icon={Wallet} color={C.accent}/>
      <StatCard label={t('portfolio.totalInvested')} value={`CHF ${mask(fmt(Math.round(totalInvested)))}`} sub={t('portfolio.investedSub')} icon={TrendingUp} color={C.blue}/>
      <StatCard label={t('portfolio.currentValue')} value={`CHF ${mask(fmt(Math.round(totalCurrentVal)))}`} sub={lastFetched?t('portfolio.pricesAt',{time:lastFetched.toLocaleTimeString('de-CH',{hour:'2-digit',minute:'2-digit'})}):t('portfolio.noLivePrices')} icon={BarChart3} color={C.teal}/>
      <StatCard
        label={t('portfolio.overallPnL')}
        value={overallPnLPct!=null?`${overallPnLPct>=0?'+':''}${overallPnLPct.toFixed(2)}%`:'—'}
        sub={totalInvested>0?`CHF ${mask(fmt(Math.round(totalCurrentVal-totalInvested)))}`:t('portfolio.noPositions')}
        icon={ArrowUpRight}
        color={overallPnLPct==null?C.textDim:overallPnLPct>=0?C.green:C.red}
      />
    </div>

    {/* All Accounts */}
    <Card title={t('portfolio.accountsPositions')} style={{marginBottom:24}}
      headerRight={
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {stale && <span style={{fontSize:12,color:C.yellow,display:'flex',alignItems:'center',gap:3}}><AlertTriangle size={12}/> {t('portfolio.pricesStale')}</span>}
          {lastFetched && !stale && <span style={{fontSize:12,color:C.textDim}}>{t('portfolio.pricesAt',{time:lastFetched.toLocaleTimeString('de-CH',{hour:'2-digit',minute:'2-digit'})})}</span>}
          {allTickers.length>0 && <button onClick={refresh} disabled={quotesLoading} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 10px',borderRadius:6,border:`1px solid ${C.border}`,background:'transparent',color:quotesLoading?C.textDim:C.accentLight,fontSize:13,cursor:quotesLoading?'not-allowed':'pointer'}}>
            <RefreshCw size={12}/>{quotesLoading?t('common.loading'):t('portfolio.refresh')}
          </button>}
        </div>
      }>
      {accounts.filter(a=>a.type!=="Debt").length===0 && <div style={{textAlign:'center',padding:'32px 0',color:C.textDim,fontSize:13}}>{t('portfolio.noAccounts')}</div>}
      {accounts.filter(a=>a.type!=="Debt").map(account=>{
        const canExpand = INVEST_TYPES.includes(account.type) || (account.positions||[]).length>0;
        const isExpanded = expanded.has(account.id);
        const positions = account.positions||[];
        const acctInvested = positions.reduce((s,p)=>{const q=quotes[p.ticker];const cur=q?.currency||'CHF';return s+toCHF((p.shares||0)*(p.avgBuyPrice||0),cur);},0);
        const acctCurrentVal = positions.reduce((s,p)=>{const q=quotes[p.ticker];const cur=q?.currency||'CHF';return s+toCHF((p.shares||0)*(q?q.currentPrice:(p.avgBuyPrice||0)),cur);},0);
        const acctPnL = acctInvested>0?acctCurrentVal-acctInvested:null;
        const acctPnLPct = acctInvested>0?(acctPnL/acctInvested*100):null;
        const annualReturn = RATE_TYPES.includes(account.type)&&account.interestRate!=null ? account.balance*account.interestRate/100 : null;
        const ago = timeAgo(account.lastImported);

        return <div key={account.id} style={{marginBottom:8,border:`1px solid ${C.border}`,borderRadius:10,overflow:'hidden'}}>
          <div onClick={canExpand?()=>toggleExpand(account.id):undefined} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',cursor:canExpand?'pointer':'default',background:C.bg,userSelect:'none'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              {canExpand
                ? <ChevronDown size={16} color={C.textDim} style={{transform:isExpanded?'rotate(180deg)':'none',transition:'transform .2s',flexShrink:0}}/>
                : <div style={{width:16,flexShrink:0}}/>}
              <div style={{width:8,height:8,borderRadius:4,background:account.color||C.textDim,flexShrink:0}}/>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:C.text}}>{account.name}</div>
                <div style={{fontSize:12,color:C.textMuted}}>{account.institution||account.type}</div>
              </div>
              {ago && <span style={{fontSize:10,color:C.textDim,marginLeft:4}}>{t('portfolio.updated')} {ago}</span>}
            </div>
            <div style={{display:'flex',gap:16,alignItems:'center',flexWrap:'wrap',justifyContent:'flex-end'}}>
              {annualReturn!=null && <div style={{textAlign:'right'}}><div style={{fontSize:10,color:C.textDim}}>{t('accounts.column.rate')}</div><div style={{fontSize:13,color:C.green}}>{account.interestRate}% · CHF {mask(fmt(Math.round(annualReturn)))}/yr</div></div>}
              <div style={{textAlign:'right'}}><div style={{fontSize:10,color:C.textDim}}>{t('common.balance')}</div><div style={{fontSize:14,fontWeight:600,color:account.type==="Debt"?C.red:C.text}}>{account.type==="Debt"&&account.balance>0?"−":""}{mask(fmt(account.balance))}</div></div>
              {acctInvested>0&&<>
                <div style={{textAlign:'right'}}><div style={{fontSize:10,color:C.textDim}}>{t('portfolio.invested')}</div><div style={{fontSize:14,color:C.textMuted}}>{mask(fmt(Math.round(acctInvested)))}</div></div>
                <div style={{textAlign:'right'}}><div style={{fontSize:10,color:C.textDim}}>{t('portfolio.current')}</div><div style={{fontSize:14,fontWeight:600,color:C.teal}}>{mask(fmt(Math.round(acctCurrentVal)))}</div></div>
                {acctPnLPct!=null&&<div style={{textAlign:'right'}}><div style={{fontSize:10,color:C.textDim}}>{t('portfolio.pnl')}</div><div style={{fontSize:14,fontWeight:600,color:acctPnLPct>=0?C.green:C.red}}>{acctPnLPct>=0?'+':''}{acctPnLPct.toFixed(1)}%</div></div>}
              </>}
            </div>
          </div>

          {canExpand&&isExpanded&&<div style={{padding:'0 16px 16px'}}>
            {positions.length>0 ? (
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',marginTop:8,minWidth:580}}>
                  <thead><tr>
                    {[t('accounts.ticker'),t('common.name'),t('portfolio.shares'),t('portfolio.avgBuy'),t('portfolio.price'),t('portfolio.deltaPct'),t('accounts.value'),t('portfolio.pnl'),''].map((h,i)=><TH key={i}>{h}</TH>)}
                  </tr></thead>
                  <tbody>
                    {positions.map(p=>{
                      const q=quotes[p.ticker];
                      const cur=q?.currency||'CHF';
                      const rawValue=(p.shares||0)*(q?q.currentPrice:(p.avgBuyPrice||0));
                      const value=toCHF(rawValue,cur);
                      const rawCost=(p.shares||0)*(p.avgBuyPrice||0);
                      const cost=toCHF(rawCost,cur);
                      const pnl=q&&cost>0?value-cost:null;
                      const pnlPct=(p.avgBuyPrice||0)>0&&q?(q.currentPrice-p.avgBuyPrice)/p.avgBuyPrice*100:null;
                      return <tr key={p.id} onMouseEnter={e=>e.currentTarget.style.background=C.cardHover} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <td style={{padding:'7px 8px',fontSize:13,fontWeight:600,borderBottom:`1px solid ${C.border}11`}}>
                          <div style={{display:'flex',alignItems:'center',gap:4}}>
                            <InlineEdit value={p.ticker||'—'} onChange={v=>updatePos(account.id,p.id,'ticker',v.toUpperCase())} inputWidth={55} style={{color:C.accentLight}}/>
                            {p.ticker && <a href={(() => { const t = p.ticker; const gf = 'https://www.google.com/finance/quote/'; const exMap = {NMS:'NASDAQ',NGM:'NASDAQ',NCM:'NASDAQ',NYQ:'NYSE',NYS:'NYSE',BTS:'BATS',PCX:'NYSEARCA',ASE:'NYSEAMEX',EBS:'SWX',VTX:'SWX',LSE:'LON',GER:'ETR',PAR:'EPA',AMS:'AMS',MIL:'BIT',HKG:'HKG',TYO:'TYO'}; const q = quotes[t]; if (t.includes('-') && !t.includes('.')) { const cgMap = {'BTC':'bitcoin','ETH':'ethereum','SOL':'solana','BNB':'binancecoin','XRP':'ripple','ADA':'cardano','DOGE':'dogecoin','DOT':'polkadot','AVAX':'avalanche-2','MATIC':'matic-network','LINK':'chainlink','UNI':'uniswap','ATOM':'cosmos','LTC':'litecoin','NEAR':'near','APT':'aptos','ARB':'arbitrum','OP':'optimism','FIL':'filecoin','ICP':'internet-computer','HBAR':'hedera-hashgraph','SUI':'sui'}; const base = t.split('-')[0]; if (cgMap[base]) return `https://www.coingecko.com/en/coins/${cgMap[base]}`; return gf+t; } const yfEx = q?.exchangeName; const gfEx = yfEx && exMap[yfEx]; if (gfEx) { const base = t.includes('.') ? t.split('.')[0] : t; return gf+base+':'+gfEx; } return `https://www.google.com/finance/quote/${encodeURIComponent(t)}`; })()} target="_blank" rel="noopener noreferrer" title={`View ${p.ticker} price chart`} onClick={e=>e.stopPropagation()} style={{color:C.textDim,display:'flex',alignItems:'center',flexShrink:0}}><ExternalLink size={11}/></a>}
                          </div>
                        </td>
                        <td style={{padding:'7px 8px',fontSize:13,borderBottom:`1px solid ${C.border}11`}}><InlineEdit value={p.name||'—'} onChange={v=>updatePos(account.id,p.id,'name',v)} inputWidth={100} style={{color:C.textMuted}}/></td>
                        <td style={{padding:'7px 8px',textAlign:'right',borderBottom:`1px solid ${C.border}11`}}><InlineNum value={p.shares} onChange={v=>updatePos(account.id,p.id,'shares',v||0)} width={60}/></td>
                        <td style={{padding:'7px 8px',textAlign:'right',borderBottom:`1px solid ${C.border}11`}}><InlineNum value={p.avgBuyPrice} onChange={v=>updatePos(account.id,p.id,'avgBuyPrice',v||0)} width={65}/></td>
                        <td style={{padding:'7px 8px',textAlign:'right',fontSize:13,color:C.text,fontVariantNumeric:'tabular-nums',borderBottom:`1px solid ${C.border}11`}}>{q?<>{fmt(q.currentPrice)}{cur!=='CHF'&&<span style={{fontSize:10,color:C.textDim,marginLeft:2}}>{cur}</span>}</>:<span style={{color:C.textDim}}>—</span>}</td>
                        <td style={{padding:'7px 8px',textAlign:'right',fontSize:13,borderBottom:`1px solid ${C.border}11`}}>{q?<span style={{color:q.changePercent>=0?C.green:C.red}}>{q.changePercent>=0?'+':''}{q.changePercent?.toFixed(1)}%</span>:<span style={{color:C.textDim}}>—</span>}</td>
                        <td style={{padding:'7px 8px',textAlign:'right',fontSize:13,fontWeight:600,color:C.text,fontVariantNumeric:'tabular-nums',borderBottom:`1px solid ${C.border}11`}}>{mask(fmt(Math.round(value)))}</td>
                        <td style={{padding:'7px 8px',textAlign:'right',fontSize:13,borderBottom:`1px solid ${C.border}11`}}>
                          {pnl!=null?<div><div style={{color:pnl>=0?C.green:C.red,fontWeight:600}}>{pnl>=0?'+':''}{mask(fmt(Math.round(pnl)))}</div>{pnlPct!=null&&<div style={{fontSize:10,color:pnlPct>=0?C.green:C.red}}>{pnlPct>=0?'+':''}{pnlPct.toFixed(1)}%</div>}</div>:<span style={{color:C.textDim}}>—</span>}
                        </td>
                        <td style={{padding:'7px 8px',borderBottom:`1px solid ${C.border}11`}}><DelBtn onClick={()=>deletePos(account.id,p.id)}/></td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{fontSize:14,color:C.textDim,textAlign:'center',padding:'16px 0'}}>{t('portfolio.noPositionsAdd')}</div>
            )}
            {/* Add position / ticker search */}
            <div style={{marginTop:12,display:'flex',gap:8,alignItems:'center'}}>
              <div style={{flex:1,position:'relative'}}>
                <input value={searchQ[account.id]||''} onChange={e=>handleSearch(account.id,e.target.value)}
                  placeholder={t('portfolio.searchTicker')}
                  style={{width:'100%',padding:'7px 12px',borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:13,outline:'none',boxSizing:'border-box'}}/>
                {(searchRes[account.id]||[]).length>0&&(
                  <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,background:C.card,border:`1px solid ${C.border}`,borderRadius:8,zIndex:50,maxHeight:200,overflowY:'auto',boxShadow:'0 4px 20px rgba(0,0,0,0.4)'}}>
                    {(searchRes[account.id]||[]).map(r=>(
                      <div key={r.symbol} onClick={()=>selectTicker(account.id,r)}
                        style={{padding:'8px 12px',cursor:'pointer',borderBottom:`1px solid ${C.border}22`}}
                        onMouseEnter={e=>e.currentTarget.style.background=C.cardHover}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <span style={{fontSize:13,fontWeight:600,color:C.accentLight}}>{r.symbol}</span>
                        <span style={{fontSize:13,color:C.textMuted,marginLeft:8}}>{r.name}</span>
                        <span style={{fontSize:10,color:C.textDim,marginLeft:8}}>{r.exchange}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={()=>addPosition(account.id)} style={{padding:'7px 12px',borderRadius:8,border:`1px dashed ${C.border}`,background:'transparent',color:C.textDim,fontSize:13,cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',gap:4}}>
                <Plus size={13}/>{t('portfolio.manual')}
              </button>
            </div>
            <div style={{fontSize:10,color:C.textDim,marginTop:4}}>
              {t('portfolio.swissStocks')}
            </div>
          </div>}
        </div>;
      })}
    </Card>

    {/* Allocation chart */}
    {pieData.length>0&&<Card title={t('portfolio.allocation')} style={{marginBottom:24}}>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value" paddingAngle={2} stroke="none">
            {pieData.map((_,i)=><Cell key={i} fill={pieColors()[i%pieColors().length]}/>)}
          </Pie>
          <Tooltip formatter={v=>`CHF ${fmt(v)}`} contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13}}/>
        </PieChart>
      </ResponsiveContainer>
      <div style={{display:'flex',flexWrap:'wrap',gap:12,marginTop:8}}>
        {pieData.map((d,i)=>{
          const total=pieData.reduce((s,x)=>s+x.value,0);
          return <div key={i} style={{display:'flex',alignItems:'center',gap:6,fontSize:12}}>
            <div style={{width:10,height:10,borderRadius:2,background:pieColors()[i%pieColors().length],flexShrink:0}}/>
            <span style={{color:C.textMuted}}>{d.name}</span>
            <span style={{color:C.textDim}}>({total>0?(d.value/total*100).toFixed(1):0}%)</span>
          </div>;
        })}
      </div>
    </Card>}

    {/* AI quick actions */}
    <Card title={t('portfolio.aiAnalysis')}>
      <p style={{margin:'0 0 14px',fontSize:13,color:C.textDim}}>{t('portfolio.aiAnalysisDesc')}</p>
      <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
        <button onClick={()=>{setChatInput('Analyse my portfolio — give me a breakdown of my asset allocation, performance of positions, and top 3 concrete actions to improve my investment strategy as a Swiss investor.');setChatOpen(true);}} style={{padding:'10px 16px',borderRadius:8,border:`1px solid ${C.accent}44`,background:C.accent+'18',color:C.accentLight,fontSize:14,cursor:'pointer'}}>
          {t('portfolio.analysePortfolio')}
        </button>
        <button onClick={()=>{setChatInput('Suggest a rebalancing strategy for my portfolio. I am a Swiss investor. Consider my savings rate, current asset allocation, and any underweight or overweight categories based on my age and goals.');setChatOpen(true);}} style={{padding:'10px 16px',borderRadius:8,border:`1px solid ${C.teal}44`,background:C.teal+'18',color:C.teal,fontSize:14,cursor:'pointer'}}>
          {t('portfolio.suggestRebalancing')}
        </button>
        <button onClick={()=>{setChatInput('What are the Swiss tax implications of my current investments? Explain capital gains tax, dividend tax, and wealth tax rules relevant to my portfolio.');setChatOpen(true);}} style={{padding:'10px 16px',borderRadius:8,border:`1px solid ${C.yellow}44`,background:C.yellow+'18',color:C.yellow,fontSize:14,cursor:'pointer'}}>
          {t('portfolio.taxImplications')}
        </button>
      </div>
    </Card>
  </div>;
}

// APP SHELL
// ───────────────────────────────────────────────────────────────
// ─── Provider Config (localStorage) ───────────────────────────────────────────
function getStoredProviderConfig() {
  try { return JSON.parse(localStorage.getItem('finance_hub_provider_config') || 'null'); } catch { return null; }
}

// Scan attachments for PII before sending to a cloud AI provider.
// Returns true if safe to proceed, false if user cancelled.
async function scanAndConfirmImport(attachments, profile) {
  const sc = getStoredProviderConfig();
  const isLocal = sc?.provider === 'ollama';
  if (isLocal || !attachments.length) return true;
  try {
    const r = await fetch(`${API_URL}/scan-attachment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attachment: attachments[0], profile: profile || null }),
    });
    if (!r.ok) return true;
    const scan = await r.json();
    if (!scan.supported || scan.totalFindings === 0) return true;
    const f = scan.findings || {};
    const items = [];
    if (f.ahv?.length)       items.push(`${f.ahv.length} AHV number${f.ahv.length>1?'s':''}`);
    if (f.iban?.length)      items.push(`${f.iban.length} IBAN${f.iban.length>1?'s':''}`);
    if (f.email?.length)     items.push(`${f.email.length} email${f.email.length>1?'s':''}`);
    if (f.phone?.length)     items.push(`${f.phone.length} phone number${f.phone.length>1?'s':''}`);
    if (f.card?.length)      items.push(`${f.card.length} card-like number${f.card.length>1?'s':''}`);
    if (f.names?.length)     items.push(`${f.names.length} name match${f.names.length>1?'es':''}`);
    if (f.addresses?.length) items.push(`${f.addresses.length} address part${f.addresses.length>1?'s':''}`);
    const providerLabel = sc?.label || sc?.provider || 'cloud AI';
    const fileName = attachments[0].name;
    return showImportScanModal({ items, providerLabel, fileName });
  } catch { return true; }
}

function showImportScanModal({ items, providerLabel, fileName }) {
  return new Promise(resolve => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const cleanup = (result) => { document.body.removeChild(root); resolve(result); };
    const overlay = Object.assign(document.createElement('div'), { style: 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px' });
    const card = Object.assign(document.createElement('div'), { style: `background:${C.card};border:1px solid ${C.border};border-radius:14px;padding:24px;max-width:420px;width:100%;box-shadow:0 8px 40px rgba(0,0,0,0.4);font-family:'Instrument Sans','Segoe UI',system-ui,sans-serif` });
    card.innerHTML = `
      <div style="font-size:16px;font-weight:600;color:${C.text};margin-bottom:6px;display:flex;align-items:center;gap:8px">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${C.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        Heads up — personal data detected
      </div>
      <div style="font-size:12px;color:${C.textDim};margin-bottom:14px">${fileName}</div>
      <div style="font-size:13px;color:${C.textMuted};line-height:1.6;margin-bottom:12px">
        This file contains personal information that will be sent to <strong style="color:${C.accent}">${providerLabel}</strong> for extraction. File contents cannot be automatically masked.
      </div>
      <div style="font-size:12px;color:${C.text};line-height:1.8;margin-bottom:14px;padding:10px 14px;background:${C.bg};border-radius:9px;border:1px solid ${C.border};font-family:'DM Mono',monospace">
        ${items.map(i => `<div style="color:${C.textMuted};font-weight:600">• ${i}</div>`).join('')}
      </div>
      <div style="font-size:12px;color:${C.textDim};line-height:1.6;margin-bottom:16px">
        This is usually fine for personal use. To keep data fully local, switch to <strong>Ollama</strong> in AI Settings.
      </div>
      <div style="display:flex;gap:10px">
        <button id="scan-cancel" style="flex:1;padding:10px 0;border-radius:8px;border:1px solid ${C.border};background:transparent;color:${C.textMuted};font-size:14px;cursor:pointer;font-family:inherit">Cancel</button>
        <button id="scan-continue" style="flex:1;padding:10px 0;border-radius:8px;border:none;background:${C.accent};color:#fff;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit">Continue</button>
      </div>
    `;
    overlay.appendChild(card);
    root.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) cleanup(false); });
    card.querySelector('#scan-cancel').onclick = () => cleanup(false);
    card.querySelector('#scan-continue').onclick = () => cleanup(true);
  });
}

// ───────────────────────────────────────────────────────────────────────────────
// AI SETTINGS PAGE
// ───────────────────────────────────────────────────────────────────────────────
function AISettingsPage({ t }) {
  const PROVIDERS = [
    { id: 'auto',      label: t('aiSettings.autoServer'),  desc: t('aiSettings.autoServerDesc'),       cloud: false },
    { id: 'anthropic', label: t('aiSettings.anthropic'),    desc: t('aiSettings.anthropicDesc'),  cloud: true  },
    { id: 'openai',    label: t('aiSettings.openai'),       desc: t('aiSettings.openaiDesc'),                        cloud: true  },
    { id: 'gemini',    label: t('aiSettings.gemini'),       desc: t('aiSettings.geminiDesc'),                  cloud: true  },
    { id: 'ollama',    label: t('aiSettings.ollama'),       desc: t('aiSettings.ollamaDesc'),     cloud: false },
  ];

  // Curated model lists per cloud provider (latest first)
  const CLOUD_MODELS = {
    anthropic: [
      { id: 'claude-opus-4-6',          label: 'Claude Opus 4.6',    note: 'most capable' },
      { id: 'claude-sonnet-4-6',        label: 'Claude Sonnet 4.6',  note: 'balanced' },
      { id: 'claude-haiku-4-5-20251001',label: 'Claude Haiku 4.5',   note: 'fast & cheap' },
    ],
    openai: [
      { id: 'gpt-4o',       label: 'GPT-4o',      note: 'flagship' },
      { id: 'gpt-4o-mini',  label: 'GPT-4o mini', note: 'fast & cheap' },
      { id: 'o1-preview',   label: 'o1-preview',  note: 'reasoning' },
      { id: 'o1-mini',      label: 'o1-mini',     note: 'reasoning · faster' },
    ],
    gemini: [
      { id: 'gemini-2.0-flash',     label: 'Gemini 2.0 Flash', note: 'fast' },
      { id: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (exp)', note: 'experimental' },
      { id: 'gemini-1.5-pro',       label: 'Gemini 1.5 Pro',   note: 'large context' },
      { id: 'gemini-1.5-flash',     label: 'Gemini 1.5 Flash', note: 'fast' },
    ],
  };

  const [serverProvider, setServerProvider] = useState(null);
  const [ollamaModels, setOllamaModels] = useState(null); // null = loading, [] = none found
  const [storedConfig] = useState(() => getStoredProviderConfig());
  const [editConfig, setEditConfig] = useState(() => {
    const s = getStoredProviderConfig();
    return { provider: s?.provider || 'auto', apiKey: s?.apiKey || '', model: s?.model || '', baseUrl: s?.baseUrl || '' };
  });
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting]       = useState(false);
  const [saved, setSaved]           = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/provider`).then(r => r.json()).then(setServerProvider).catch(() => {});
    fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(2000) })
      .then(r => r.ok ? r.json() : null)
      .then(d => setOllamaModels(d ? (d.models || []).map(m => m.name) : []))
      .catch(() => setOllamaModels([]));
  }, []);

  const effectiveProvId = editConfig.provider === 'auto' ? (serverProvider?.provider || 'auto') : editConfig.provider;
  const selectedProv = PROVIDERS.find(p => p.id === effectiveProvId) || PROVIDERS[0];

  const handleSave = () => {
    if (!editConfig.provider || editConfig.provider === 'auto') {
      localStorage.removeItem('finance_hub_provider_config');
    } else {
      const cfg = { provider: editConfig.provider };
      if (editConfig.apiKey.trim()) cfg.apiKey = editConfig.apiKey.trim();
      if (editConfig.model.trim())  cfg.model  = editConfig.model.trim();
      if (editConfig.baseUrl.trim()) cfg.baseUrl = editConfig.baseUrl.trim();
      localStorage.setItem('finance_hub_provider_config', JSON.stringify(cfg));
    }
    setSaved(true); setTimeout(() => setSaved(false), 2000);
    setTestResult(null);
  };

  const handleTest = async () => {
    if (!editConfig.provider) return;
    // In auto mode, test the server's currently-configured .env provider with no overrides
    const isAuto = editConfig.provider === 'auto';
    const providerToTest = isAuto ? serverProvider?.provider : editConfig.provider;
    if (!providerToTest) {
      setTestResult({ ok: false, error: 'No server provider detected — set ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, or OLLAMA_MODEL in your .env file.' });
      return;
    }
    setTesting(true); setTestResult(null);
    try {
      const body = { provider: providerToTest };
      if (!isAuto) {
        if (editConfig.apiKey.trim())  body.apiKey  = editConfig.apiKey.trim();
        if (editConfig.model.trim())   body.model   = editConfig.model.trim();
        if (editConfig.baseUrl.trim()) body.baseUrl = editConfig.baseUrl.trim();
      }
      const r = await fetch(`${API_URL}/provider/test`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (isAuto && d.ok) d.msg = `using server .env (${providerToTest})`;
      setTestResult(d);
    } catch (err) {
      setTestResult({ ok: false, error: err.message });
    }
    setTesting(false);
  };

  const inp = (val, onChange, placeholder, type='text') => (
    <input type={type} value={val} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{width:'100%',padding:'9px 12px',borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:14,outline:'none',boxSizing:'border-box',fontFamily:'inherit'}}/>
  );

  const activeLocal = storedConfig && storedConfig.provider !== 'auto';

  return (
    <div style={{maxWidth:720}}>
      {/* Status banner */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:'16px 20px',marginBottom:20,display:'flex',alignItems:'center',gap:12}}>
        <Bot size={20} color={C.accentLight}/>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:600,color:C.text}}>
            {t('aiSettings.currentlyActive')} <span style={{color:C.accent}}>
              {activeLocal ? (PROVIDERS.find(p => p.id === storedConfig.provider)?.label || storedConfig.provider) : (serverProvider?.label || '…')}
            </span>
            {activeLocal && <span style={{fontSize:11,color:C.blue,marginLeft:8,padding:'1px 7px',borderRadius:10,background:C.blue+'22'}}>{t('aiSettings.custom')}</span>}
            {!activeLocal && serverProvider && <span style={{fontSize:11,color:C.textDim,marginLeft:8,padding:'1px 7px',borderRadius:10,background:C.border}}>{t('aiSettings.env')}</span>}
          </div>
          {serverProvider?.description && !activeLocal && <div style={{fontSize:12,color:C.textDim,marginTop:2}}>{serverProvider.description}</div>}
          {activeLocal && <div style={{fontSize:12,color:C.textDim,marginTop:2}}>{t('aiSettings.customOverride')}</div>}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          {ollamaModels === null && <span style={{fontSize:12,color:C.textDim}}>{t('aiSettings.checkingOllama')}</span>}
          {ollamaModels !== null && ollamaModels.length > 0 && <span style={{fontSize:12,color:C.green,display:'flex',alignItems:'center',gap:4}}><div style={{width:7,height:7,borderRadius:'50%',background:C.green}}/> {t('aiSettings.ollamaDetected', {count: ollamaModels.length, s: ollamaModels.length>1?'s':''})}</span>}
          {ollamaModels !== null && ollamaModels.length === 0 && <span style={{fontSize:12,color:C.textMuted,display:'flex',alignItems:'center',gap:4}}><WifiOff size={12}/> {t('aiSettings.ollamaNotDetected')}</span>}
        </div>
      </div>

      <Card title={t('aiSettings.title')}>
        {/* Provider selector */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:12,color:C.textDim,fontWeight:600,textTransform:'uppercase',letterSpacing:0.5,marginBottom:10}}>{t('aiSettings.provider')}</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {PROVIDERS.map(p => (
              <label key={p.id} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'10px 14px',borderRadius:9,border:`1px solid ${editConfig.provider===p.id?C.accent:C.border}`,background:editConfig.provider===p.id?C.accent+'0d':C.bg,cursor:'pointer',transition:'border-color .15s'}}>
                <input type="radio" name="provider" value={p.id} checked={editConfig.provider===p.id} onChange={()=>setEditConfig(c=>({...c,provider:p.id,model:'',apiKey:'',baseUrl:''}))} style={{marginTop:2,accentColor:C.accent,flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.text,display:'flex',alignItems:'center',gap:8}}>
                    {p.label}
                    {p.cloud && <span style={{fontSize:10,padding:'1px 6px',borderRadius:8,background:C.orange+'22',color:C.orange,fontWeight:700,display:'inline-flex',alignItems:'center'}}><Cloud size={10} style={{marginRight:2}}/> {t('aiSettings.cloud')}</span>}
                    {!p.cloud && p.id!=='auto' && <span style={{fontSize:10,padding:'1px 6px',borderRadius:8,background:C.green+'22',color:C.green,fontWeight:700,display:'inline-flex',alignItems:'center'}}><Lock size={10} style={{marginRight:2}}/> {t('aiSettings.localBadge')}</span>}
                    {p.id==='ollama' && ollamaModels !== null && ollamaModels.length > 0 && <span style={{fontSize:10,padding:'1px 6px',borderRadius:8,background:C.green+'22',color:C.green}}>{t('aiSettings.running')}</span>}
                    {p.id==='ollama' && ollamaModels !== null && ollamaModels.length === 0 && <span style={{fontSize:10,padding:'1px 6px',borderRadius:8,background:C.red+'22',color:C.red}}>{t('aiSettings.notDetected')}</span>}
                  </div>
                  <div style={{fontSize:12,color:C.textDim,marginTop:2}}>{p.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Fields — only shown when not Auto */}
        {editConfig.provider !== 'auto' && (
          <div style={{display:'flex',flexDirection:'column',gap:14,borderTop:`1px solid ${C.border}`,paddingTop:18,marginBottom:4}}>
            {editConfig.provider !== 'ollama' && (
              <div>
                <label style={{fontSize:12,color:C.accent,fontWeight:600,textTransform:'uppercase',letterSpacing:0.5,display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
                  <Key size={12}/> {t('aiSettings.apiKey')}
                </label>
                {inp(editConfig.apiKey, v => setEditConfig(c=>({...c,apiKey:v})), t('aiSettings.apiKeyPlaceholder'), 'password')}
                <div style={{fontSize:11,color:C.textDim,marginTop:4}}>{t('aiSettings.apiKeyNote')}</div>
              </div>
            )}
            <div>
              <label style={{fontSize:12,color:C.accent,fontWeight:600,textTransform:'uppercase',letterSpacing:0.5,display:'block',marginBottom:6}}>{t('aiSettings.modelOptional')}</label>
              {inp(editConfig.model, v => setEditConfig(c=>({...c,model:v})),
                editConfig.provider==='anthropic'?'claude-opus-4-6 (default)':editConfig.provider==='openai'?'gpt-4o (default)':editConfig.provider==='gemini'?'gemini-2.0-flash (default)':'llama3.2 (default)')}
              {CLOUD_MODELS[editConfig.provider] && (
                <div style={{marginTop:8,display:'flex',flexWrap:'wrap',gap:6}}>
                  {CLOUD_MODELS[editConfig.provider].map(m => (
                    <button key={m.id} type="button" onClick={()=>setEditConfig(c=>({...c,model:m.id}))} title={m.id}
                      style={{padding:'4px 10px',borderRadius:6,border:`1px solid ${editConfig.model===m.id?C.accent:C.border}`,background:editConfig.model===m.id?C.accent+'22':'transparent',color:editConfig.model===m.id?C.accentLight:C.textMuted,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
                      <span style={{fontWeight:600}}>{m.label}</span>
                      <span style={{fontSize:10,color:C.textDim}}>{m.note}</span>
                    </button>
                  ))}
                  {editConfig.model && !CLOUD_MODELS[editConfig.provider].some(m=>m.id===editConfig.model) && (
                    <button type="button" onClick={()=>setEditConfig(c=>({...c,model:''}))}
                      style={{padding:'4px 10px',borderRadius:6,border:`1px dashed ${C.border}`,background:'transparent',color:C.textDim,fontSize:12,cursor:'pointer'}}>
                      custom: {editConfig.model} ✕
                    </button>
                  )}
                </div>
              )}
            </div>
            {(editConfig.provider==='ollama'||editConfig.provider==='openai') && (
              <div>
                <label style={{fontSize:12,color:C.accent,fontWeight:600,textTransform:'uppercase',letterSpacing:0.5,display:'block',marginBottom:6}}>
                  {editConfig.provider==='ollama'?t('aiSettings.ollamaBaseUrl'):t('aiSettings.customBaseUrl')}
                </label>
                {inp(editConfig.baseUrl, v => setEditConfig(c=>({...c,baseUrl:v})),
                  editConfig.provider==='ollama'?'http://localhost:11434 (default: host.docker.internal)':'Leave blank for default OpenAI endpoint')}
                {editConfig.provider==='ollama' && <div style={{fontSize:11,color:C.textDim,marginTop:4}}>{t('aiSettings.ollamaUrlNote')}</div>}
              </div>
            )}
          </div>
        )}

        {/* Ollama model list */}
        {editConfig.provider==='ollama' && ollamaModels && ollamaModels.length > 0 && (
          <div style={{marginTop:10,padding:'10px 14px',background:C.green+'0d',borderRadius:9,border:`1px solid ${C.green+'44'}`}}>
            <div style={{fontSize:12,fontWeight:600,color:C.green,marginBottom:6}}>{t('aiSettings.ollamaModels')}</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {ollamaModels.map(m => (
                <button key={m} onClick={()=>setEditConfig(c=>({...c,model:m}))} style={{padding:'3px 10px',borderRadius:6,border:`1px solid ${editConfig.model===m?C.green:C.border}`,background:editConfig.model===m?C.green+'22':'transparent',color:editConfig.model===m?C.green:C.textMuted,fontSize:12,cursor:'pointer'}}>
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}
        {editConfig.provider==='ollama' && ollamaModels !== null && ollamaModels.length === 0 && (
          <div style={{marginTop:10,padding:'10px 14px',background:C.orange+'0d',borderRadius:9,border:`1px solid ${C.orange}44`,fontSize:12,color:C.orange}}>
            Ollama not detected at the default URL. Make sure Ollama is running: <code style={{background:C.bg,padding:'1px 5px',borderRadius:4}}>ollama serve</code>. For Docker setups, use <code style={{background:C.bg,padding:'1px 5px',borderRadius:4}}>host.docker.internal:11434</code>.
          </div>
        )}

        {/* Actions */}
        <div style={{display:'flex',gap:10,marginTop:20,alignItems:'center'}}>
          <button onClick={handleSave} style={{padding:'9px 22px',borderRadius:8,border:'none',background:C.accent,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer'}}>
            {saved ? t('aiSettings.saved') : t('common.save')}
          </button>
          <button onClick={handleTest} disabled={testing || (editConfig.provider==='auto' && !serverProvider?.provider)} title={editConfig.provider==='auto'?`Test the server's .env provider${serverProvider?.provider?` (${serverProvider.provider})`:''}`:undefined} style={{padding:'9px 18px',borderRadius:8,border:`1px solid ${C.border}`,background:'transparent',color:C.text,fontSize:14,cursor:(testing||(editConfig.provider==='auto'&&!serverProvider?.provider))?'not-allowed':'pointer',opacity:(testing||(editConfig.provider==='auto'&&!serverProvider?.provider))?0.6:1}}>
            {testing ? t('aiSettings.testing') : (editConfig.provider==='auto' ? t('aiSettings.testEnv') + (serverProvider?.provider ? ` (${serverProvider.provider})` : '') : t('aiSettings.testConnection'))}
          </button>
          {storedConfig && (
            <button onClick={()=>{ localStorage.removeItem('finance_hub_provider_config'); setEditConfig({provider:'auto',apiKey:'',model:'',baseUrl:''}); setSaved(false); setTestResult({ok:true,msg:'Cleared — reverted to server config.'}); }} style={{padding:'9px 16px',borderRadius:8,border:`1px solid ${C.red+'55'}`,background:'transparent',color:C.red,fontSize:14,cursor:'pointer'}}>
              {t('aiSettings.clearOverride')}
            </button>
          )}
        </div>

        {testResult && (
          <div style={{marginTop:14,padding:'10px 14px',borderRadius:9,background:testResult.ok?C.green+'0d':C.red+'0d',border:`1px solid ${testResult.ok?C.green+'44':C.red+'44'}`,fontSize:13,color:testResult.ok?C.green:C.red}}>
            {testResult.ok ? `${t('aiSettings.connectionSuccess')}${testResult.model?` — model: ${testResult.model}`:''}${testResult.msg?' — '+testResult.msg:''}` : `✗ ${testResult.error || t('aiSettings.testFailed')}`}
          </div>
        )}
      </Card>

      {/* Privacy note */}
      <div style={{marginTop:16,padding:'14px 18px',borderRadius:10,background:C.card,border:`1px solid ${C.border}`,fontSize:13,color:C.textMuted,lineHeight:1.7}}>
        <strong style={{color:C.text}}>{t('aiSettings.privacyNote')}</strong> {t('aiSettings.privacyNoteDesc')}
      </div>
    </div>
  );
}

// ── Transactions Page ──
function TransactionsPage({ transactions, setTransactions, hideBalances, t }) {
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const [importPct, setImportPct] = useState(0);
  const [importPreview, setImportPreview] = useState(null);
  const [importName, setImportName] = useState('');
  const [importError, setImportError] = useState(null);
  const [filter, setFilter] = useState({ search: '', categories: [], dateFrom: '', dateTo: '' });
  const [sort, setSort] = useState({ col: 'date', asc: false });
  const [editingRules, setEditingRules] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const fileRef = useRef(null);

  const DEFAULT_CATEGORIES = ['Groceries','Dining & Restaurants','Transport','Entertainment','Shopping','Health & Fitness','Subscriptions & Fees','Housing','Transfers','Income','Other'];
  const allCategories = [...DEFAULT_CATEGORIES, ...(transactions.customCategories || [])];

  const allTxns = (transactions.imports || []).flatMap(imp => imp.transactions.map(t => ({ ...t, importName: imp.name, currency: t.currency || imp.currency || 'CHF' })));

  // FX rates for currency conversion to CHF
  const [fxRates, setFxRates] = useState({ CHF: 1 });
  const [fxLoaded, setFxLoaded] = useState(false);
  useEffect(() => {
    const currencies = [...new Set(allTxns.map(t => t.currency).filter(c => c && c !== 'CHF'))];
    if (!currencies.length) { setFxLoaded(true); return; }
    (async () => {
      const fx = { CHF: 1 };
      // Try direct pairs first (e.g. EURCHF=X)
      const symbols = currencies.map(c => c + 'CHF=X').join(',');
      try {
        const d = await fetch(`${API_URL}/market/quotes?symbols=${symbols}`).then(r => r.json());
        for (const c of currencies) {
          const key = c + 'CHF=X';
          const price = d.quotes?.[key]?.currentPrice;
          if (price && price > 0) fx[c] = price;
        }
      } catch {}
      // For currencies with no direct rate (e.g. IDR), try inverse (CHFIDR=X) and invert
      const missing = currencies.filter(c => !fx[c]);
      if (missing.length) {
        const invSymbols = missing.map(c => 'CHF' + c + '=X').join(',');
        try {
          const d2 = await fetch(`${API_URL}/market/quotes?symbols=${invSymbols}`).then(r => r.json());
          for (const c of missing) {
            const key = 'CHF' + c + '=X';
            const price = d2.quotes?.[key]?.currentPrice;
            if (price && price > 0) fx[c] = 1 / price;
          }
        } catch {}
      }
      setFxRates(fx);
      setFxLoaded(true);
    })();
  }, [allTxns.length]);
  const toCHF = (amount, currency) => {
    if (!currency || currency === 'CHF') return amount;
    const rate = fxRates[currency];
    if (rate && rate > 0) return Math.round(amount * rate * 100) / 100;
    // No rate available — don't include unconvertible amounts in totals
    return 0;
  };

  const filtered = useMemo(() => {
    let list = allTxns;
    if (filter.search) { const s = filter.search.toLowerCase(); list = list.filter(t => t.description.toLowerCase().includes(s) || (t.merchant||'').toLowerCase().includes(s) || (t.category||'').toLowerCase().includes(s)); }
    if (filter.categories.length) list = list.filter(t => filter.categories.includes(t.category || 'Other'));
    if (filter.dateFrom) list = list.filter(t => t.date >= filter.dateFrom);
    if (filter.dateTo) list = list.filter(t => t.date <= filter.dateTo);
    list.sort((a, b) => {
      let va = a[sort.col], vb = b[sort.col];
      if (sort.col === 'amount') { va = Number(va); vb = Number(vb); }
      if (va < vb) return sort.asc ? -1 : 1;
      if (va > vb) return sort.asc ? 1 : -1;
      return 0;
    });
    return list;
  }, [allTxns, filter, sort]);

  const totalIncome = filtered.filter(t => t.amount > 0).reduce((s, t) => s + toCHF(t.amount, t.currency), 0);
  const totalExpenses = filtered.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(toCHF(t.amount, t.currency)), 0);
  const net = totalIncome - totalExpenses;
  const categoryTotals = {};
  filtered.filter(t => t.amount < 0).forEach(t => { categoryTotals[t.category || 'Other'] = (categoryTotals[t.category || 'Other'] || 0) + Math.abs(toCHF(t.amount, t.currency)); });
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  const hasMultipleCurrencies = new Set(allTxns.map(t => t.currency).filter(Boolean)).size > 1;
  const hasNonCHF = allTxns.some(t => t.currency && t.currency !== 'CHF');

  const pieData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 })).sort((a, b) => b.value - a.value);
  const PIE_COLORS = [C.accent, C.green, C.blue, C.teal, C.orange, C.red, '#8884d8', '#82ca9d', '#ffc658', '#ff7c43', '#665191'];

  const monthlyData = useMemo(() => {
    const months = {};
    filtered.filter(t => t.amount < 0).forEach(t => {
      const m = t.date.slice(0, 7);
      if (!months[m]) months[m] = {};
      const cat = t.category || 'Other';
      months[m][cat] = Math.round(((months[m][cat] || 0) + Math.abs(toCHF(t.amount, t.currency))) * 100) / 100;
    });
    return Object.entries(months).sort((a, b) => a[0].localeCompare(b[0])).map(([month, cats]) => ({ month, ...cats }));
  }, [filtered]);
  const allChartCategories = [...new Set(filtered.filter(t => t.amount < 0).map(t => t.category || 'Other'))];

  const fmt = (v) => hideBalances ? '•••' : v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleCategoryChange = (txnId, newCategory) => {
    setTransactions(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      let desc = '';
      for (const imp of next.imports) {
        const t = imp.transactions.find(t => t.id === txnId);
        if (t) { desc = t.description; t.category = newCategory; break; }
      }
      if (desc && !next.categoryRules.find(r => r.match === desc && r.category === newCategory)) {
        next.categoryRules = next.categoryRules.filter(r => r.match !== desc);
        next.categoryRules.push({ match: desc, category: newCategory });
      }
      return next;
    });
  };

  const DEFAULT_TXN_PROMPT = `You are a financial data extractor. Parse the attached bank statement and extract every transaction.

Respond with ONLY a raw JSON object — no explanation, no markdown, no code fences, no extra text before or after. Just the JSON.

Required JSON shape:
{"transactions":[{"date":"YYYY-MM-DD","description":"Full transaction description","merchant":"Clean Merchant Name","amount":-12.50,"fee":0,"currency":"CHF","category":"Category","type":"Card Payment"}]}

Rules:
- date: use the completed/settled date in YYYY-MM-DD format
- description: full transaction description as shown in the statement
- merchant: clean, human-readable merchant or payee name (e.g. "Migros", "Coop", "Netflix", "SBB"). For transfers, use the counterparty name. Omit transaction codes, reference numbers, and locations — just the brand/company name.
- amount: negative for expenses, positive for income. Keep original sign from the data.
- fee: any fee charged, 0 if none
- currency: the ORIGINAL currency of each transaction as shown in the statement (e.g. CHF, EUR, USD, IDR). Each row may have a different currency — extract it per row, do NOT assume all rows share one currency.
- category: assign one of these categories: ${allCategories.join(', ')}
- type: original transaction type from the statement (e.g. Card Payment, Transfer, Charge)
- Auto-detect the file format and column mapping
- Apply these user-defined category rules first (exact description match): ${JSON.stringify(transactions.categoryRules || [])}
- IMPORTANT: Return ONLY the JSON object. No text before or after.`;

  const streamChat = async (message, attachments) => {
    const resp = await fetch(`${API_URL}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, context: {}, history: [], attachments }) });
    if (!resp.ok) throw new Error('API returned ' + resp.status);
    const reader = resp.body.getReader(); const dec = new TextDecoder(); let buf = '', fullText = '', done = false;
    while (!done) { const chunk = await reader.read(); done = chunk.done; if (chunk.value) buf += dec.decode(chunk.value, { stream: true }); const lines = buf.split('\n'); buf = lines.pop(); for (const line of lines) { if (!line.startsWith('data: ')) continue; const p = line.slice(6); if (p === '[DONE]') { done = true; break; } try { const d = JSON.parse(p); if (d.text) fullText += d.text; else if (d.error) fullText = 'API Error: ' + d.error; } catch {} } }
    const cleaned = fullText.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI did not return valid JSON. Response: ' + cleaned.slice(0, 200));
    return JSON.parse(jsonMatch[0]);
  };

  const BATCH_SIZE = 100;

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    setImportProgress('Reading file…');

    try {
      const ext = file.name.split('.').pop().toLowerCase();
      let csvText = '';

      if (['xlsx', 'xls'].includes(ext)) {
        const XLSX = (await import('xlsx')).default;
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        csvText = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
      } else if (ext === 'pdf') {
        // PDFs can't be split into rows — send as single batch
        const bytes = new Uint8Array(await file.arrayBuffer());
        let bin = ''; bytes.forEach(b => bin += String.fromCharCode(b));
        setImportProgress('Processing PDF…');
        const prompt = transactions.prompt || DEFAULT_TXN_PROMPT;
        const parsed = await streamChat(prompt, [{ name: file.name, type: 'application/pdf', data: btoa(bin), size: file.size }]);
        parsed.transactions = (parsed.transactions || []).map(t => ({ ...t, id: t.id || uid() }));
        setImportPreview(parsed);
        setImportName(file.name.replace(/\.[^.]+$/, ''));
        return;
      } else {
        csvText = await file.text();
      }

      // Split CSV into header + row batches
      const lines = csvText.split('\n');
      const header = lines[0];
      const dataRows = lines.slice(1).filter(l => l.trim());
      const totalRows = dataRows.length;

      if (totalRows <= BATCH_SIZE) {
        // Small file — single request
        setImportProgress(`Processing ${totalRows} transactions…`);
        setImportPct(-1); // indeterminate
        const bytes = new TextEncoder().encode(csvText);
        let bin = ''; bytes.forEach(b => bin += String.fromCharCode(b));
        const prompt = transactions.prompt || DEFAULT_TXN_PROMPT;
        const parsed = await streamChat(prompt, [{ name: file.name, type: 'text/csv', data: btoa(bin), size: csvText.length }]);
        parsed.transactions = (parsed.transactions || []).map(t => ({ ...t, id: t.id || uid() }));
        setImportPreview(parsed);
        setImportName(file.name.replace(/\.[^.]+$/, ''));
      } else {
        // Large file — split into batches and process in parallel
        const batches = [];
        for (let i = 0; i < totalRows; i += BATCH_SIZE) {
          const chunk = dataRows.slice(i, i + BATCH_SIZE);
          batches.push(header + '\n' + chunk.join('\n'));
        }

        const prompt = transactions.prompt || DEFAULT_TXN_PROMPT;
        const CONCURRENCY = 3;
        const results = new Array(batches.length);
        let completedBatches = 0;
        setImportPct(0);

        // Process batches with concurrency limit
        for (let start = 0; start < batches.length; start += CONCURRENCY) {
          const chunk = batches.slice(start, start + CONCURRENCY);
          const chunkResults = await Promise.all(chunk.map(async (batchCsv, ci) => {
            const idx = start + ci;
            try {
              const bytes = new TextEncoder().encode(batchCsv);
              let bin = ''; bytes.forEach(b => bin += String.fromCharCode(b));
              const result = await streamChat(prompt, [{ name: `${file.name}_batch${idx + 1}.csv`, type: 'text/csv', data: btoa(bin), size: batchCsv.length }]);
              return result;
            } catch (err) {
              console.warn(`Batch ${idx + 1} failed, skipping:`, err.message);
              return { transactions: [] };
            } finally {
              completedBatches++;
              const pct = Math.round((completedBatches / batches.length) * 100);
              setImportPct(pct);
              setImportProgress(`${completedBatches}/${batches.length} batches · ${Math.min(completedBatches * BATCH_SIZE, totalRows)}/${totalRows} transactions`);
            }
          }));
          chunkResults.forEach((r, ci) => { results[start + ci] = r; });
        }

        // Merge all batch results
        const allTxns = results.flatMap(r => (r.transactions || []));
        const failedBatches = results.filter(r => (r.transactions || []).length === 0).length;
        const currency = results.find(r => r.currency)?.currency || 'CHF';
        if (allTxns.length === 0) throw new Error('All batches failed — no transactions could be extracted');
        const merged = { currency, transactions: allTxns.map(t => ({ ...t, id: t.id || uid() })), failedBatches };
        setImportPreview(merged);
        setImportName(file.name.replace(/\.[^.]+$/, ''));
      }
    } catch (err) {
      setImportError(err.message);
    } finally {
      setImporting(false);
      setImportProgress('');
      setImportPct(0);
    }
  };

  const confirmImport = (mode) => {
    if (!importPreview) return;
    const newTxns = importPreview.transactions;
    const newDates = newTxns.map(t => t.date).sort();
    const dateFrom = newDates[0], dateTo = newDates[newDates.length - 1];

    setTransactions(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      let merged = [];
      for (const imp of next.imports) {
        if (mode === 'replace') {
          imp.transactions = imp.transactions.filter(t => t.date < dateFrom || t.date > dateTo);
        } else {
          const newKeys = new Set(newTxns.map(t => `${t.date}|${t.description}|${t.amount}`));
          imp.transactions = imp.transactions.filter(t => !newKeys.has(`${t.date}|${t.description}|${t.amount}`));
        }
        if (imp.transactions.length > 0) merged.push(imp);
      }
      merged.push({
        id: uid(),
        name: importName || 'Imported Statement',
        importedAt: new Date().toISOString(),
        currency: importPreview.currency || 'CHF',
        transactions: newTxns,
      });
      next.imports = merged;
      return next;
    });
    setImportPreview(null);
    setImportName('');
  };

  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const deleteTxn = (txnId) => {
    setTransactions(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      for (const imp of next.imports) {
        imp.transactions = imp.transactions.filter(t => t.id !== txnId);
      }
      next.imports = next.imports.filter(imp => imp.transactions.length > 0);
      return next;
    });
  };

  const deleteAllTxns = () => {
    setTransactions(prev => ({ ...prev, imports: [] }));
    setConfirmDeleteAll(false);
  };

  const deleteRule = (idx) => {
    setTransactions(prev => {
      const next = { ...prev, categoryRules: prev.categoryRules.filter((_, i) => i !== idx) };
      return next;
    });
  };

  const [newCat, setNewCat] = useState('');
  const addCategory = () => {
    const cat = newCat.trim();
    if (!cat || allCategories.includes(cat)) return;
    setTransactions(prev => ({ ...prev, customCategories: [...(prev.customCategories || []), cat] }));
    setNewCat('');
  };

  const SortTH = ({ col, children, style }) => (
    <th onClick={() => setSort(s => ({ col, asc: s.col === col ? !s.asc : true }))} style={{ cursor: 'pointer', userSelect: 'none', padding: '8px 10px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: C.textDim, borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap', ...style }}>
      {children} {sort.col === col ? (sort.asc ? '▲' : '▼') : ''}
    </th>
  );

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}>
    {/* Header */}
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>{t("transactions.title")}</h2>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={() => setPromptOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', color: transactions.prompt ? C.accentLight : C.textMuted, fontSize: 12 }}><Sparkles size={12}/>{t("transactions.importPrompt")}{transactions.prompt ? ' ✓' : ''}</button>
        <button onClick={() => setEditingRules(!editingRules)} title="Category rules" style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.textMuted, borderRadius: 8, padding: '6px 8px', cursor: 'pointer' }}><ClipboardList size={15}/></button>
        {allTxns.length > 0 && (confirmDeleteAll
          ? <span style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 12 }}>
              <span style={{ color: C.textMuted }}>{t('transactions.deleteAll')}</span>
              <button onClick={deleteAllTxns} style={{ background: C.red, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Yes</button>
              <button onClick={() => setConfirmDeleteAll(false)} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.textMuted, borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>No</button>
            </span>
          : <button onClick={() => setConfirmDeleteAll(true)} title="Delete all transactions" style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.red, borderRadius: 8, padding: '6px 8px', cursor: 'pointer', opacity: 0.7 }}><Trash2 size={15}/></button>
        )}
        <button onClick={() => fileRef.current?.click()} disabled={importing} style={{ background: C.accent, color: '#000', border: 'none', borderRadius: 8, padding: '7px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: importing ? 0.6 : 1 }}>
          <Upload size={14}/> {importing ? t('transactions.importing') : t('transactions.importStatement')}
        </button>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.pdf" onChange={handleImport} style={{ display: 'none' }} />
      </div>
    </div>

    {/* Import progress bar */}
    {importing && importProgress && <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{importProgress}</span>
        {importPct > 0 && <span style={{ fontSize: 12, color: C.textMuted, fontVariantNumeric: 'tabular-nums' }}>{importPct}%</span>}
      </div>
      <div style={{ width: '100%', height: 6, background: C.border, borderRadius: 3, overflow: 'hidden' }}>
        {importPct < 0
          ? <div style={{ width: '30%', height: '100%', background: C.accent, borderRadius: 3, animation: 'indeterminate 1.5s ease-in-out infinite' }} />
          : <div style={{ width: `${importPct}%`, height: '100%', background: C.accent, borderRadius: 3, transition: 'width 0.5s ease' }} />
        }
      </div>
    </div>}

    {/* Prompt edit modal */}
    {promptOpen && <div onClick={() => setPromptOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div onClick={e => e.stopPropagation()} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,width:'100%',maxWidth:1140,maxHeight:'84vh',overflowY:'auto',padding:28,boxShadow:'0 24px 80px rgba(0,0,0,0.6)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
          <h2 style={{margin:0,fontSize:18,fontWeight:700,color:C.text}}>{t("transactions.importPromptTitle")}</h2>
          <button onClick={() => setPromptOpen(false)} style={{background:'transparent',border:'none',cursor:'pointer',color:C.textDim}}><X size={18}/></button>
        </div>
        <p style={{margin:'0 0 12px',fontSize:13,color:C.textDim}}>
          {t("transactions.importPromptDesc")}
          {t("transactions.categoryRulesAppended")}
        </p>
        <div style={{display:'flex',gap:8,marginBottom:10}}>
          <button onClick={() => setTransactions(prev => ({ ...prev, prompt: DEFAULT_TXN_PROMPT }))}
            style={{padding:'6px 12px',borderRadius:6,border:`1px solid ${C.border}`,background:'transparent',color:C.textMuted,fontSize:13,cursor:'pointer'}}>
            Load default
          </button>
          <button onClick={() => setTransactions(prev => ({ ...prev, prompt: '' }))}
            style={{padding:'6px 12px',borderRadius:6,border:`1px solid ${C.border}`,background:'transparent',color:C.textMuted,fontSize:13,cursor:'pointer'}}>
            Reset to blank
          </button>
        </div>
        <textarea
          value={transactions.prompt || DEFAULT_TXN_PROMPT}
          onChange={e => setTransactions(prev => ({ ...prev, prompt: e.target.value }))}
          placeholder="Leave blank to use the built-in default transaction import prompt…"
          rows={28}
          style={{width:'100%',padding:'10px 12px',borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,
            fontSize:13,outline:'none',resize:'vertical',boxSizing:'border-box',fontFamily:"'DM Mono',monospace",lineHeight:1.5}}
        />
        {transactions.prompt && <div style={{marginTop:6,fontSize:12,color:C.green}}>{t("transactions.customPromptActive")}</div>}
        <button onClick={() => setPromptOpen(false)} style={{width:'100%',padding:'11px',borderRadius:8,border:'none',background:C.accent,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',marginTop:12}}>
          Save & Close
        </button>
      </div>
    </div>}

    {/* Import error modal */}
    {importError && <div onClick={() => setImportError(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div onClick={e => e.stopPropagation()} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,width:'100%',maxWidth:480,padding:28,boxShadow:'0 24px 80px rgba(0,0,0,0.6)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
          <AlertTriangle size={20} style={{color:C.red,flexShrink:0}}/>
          <h2 style={{margin:0,fontSize:18,fontWeight:700,color:C.text}}>{t("transactions.importFailed")}</h2>
        </div>
        <p style={{margin:'0 0 16px',fontSize:13,color:C.textMuted,lineHeight:1.5}}>{importError}</p>
        <button onClick={() => setImportError(null)} style={{width:'100%',padding:'11px',borderRadius:8,border:'none',background:C.accent,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer'}}>
          OK
        </button>
      </div>
    </div>}

    {/* Category rules modal */}
    {editingRules && <div onClick={() => setEditingRules(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, width: '100%', maxWidth: 600, padding: 24, maxHeight: '80vh', overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>{t('transactions.categoryRulesTitle')}</h3>
        <p style={{ color: C.textMuted, fontSize: 12, margin: '0 0 12px' }}>{t('transactions.categoryRulesDesc')}</p>
        {(transactions.categoryRules || []).length === 0 && <p style={{ color: C.textDim, fontSize: 13 }}>{t('transactions.noRules')}</p>}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
          {(transactions.categoryRules || []).map((r, i) => <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
            <td style={{ padding: '6px 8px', fontSize: 13 }}>{r.match}</td>
            <td style={{ padding: '6px 8px', fontSize: 13, color: C.textMuted }}>{r.category}</td>
            <td style={{ padding: '6px 4px', textAlign: 'right' }}><button onClick={() => deleteRule(i)} style={{ background: 'transparent', border: 'none', color: C.red, cursor: 'pointer', padding: 2 }}><Trash2 size={13}/></button></td>
          </tr>)}
        </tbody></table>
        <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>{t('transactions.customCategories')}</h4>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {(transactions.customCategories || []).map((c, i) => <span key={i} style={{ background: C.input, border: `1px solid ${C.border}`, borderRadius: 6, padding: '3px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>{c} <button onClick={() => setTransactions(prev => ({ ...prev, customCategories: prev.customCategories.filter((_, j) => j !== i) }))} style={{ background: 'transparent', border: 'none', color: C.red, cursor: 'pointer', padding: 0 }}><X size={11}/></button></span>)}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCategory()} placeholder={t('transactions.newCategory')} style={{ flex: 1, background: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 8px', fontSize: 12 }} />
          <button onClick={addCategory} style={{ background: C.accent, color: '#000', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Add</button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <button onClick={() => setEditingRules(false)} style={{ background: C.accent, color: '#000', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Done</button>
        </div>
      </div>
    </div>}

    {/* Import preview modal */}
    {importPreview && <div onClick={() => setImportPreview(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, width: '100%', maxWidth: 900, padding: 24, maxHeight: '85vh', overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>{t('transactions.importPreview')}</h3>
        <p style={{ color: C.textMuted, fontSize: 12, margin: '0 0 14px' }}>{importPreview.transactions.length} transactions · {importPreview.currency || 'CHF'}{importPreview.failedBatches > 0 ? <span style={{ color: C.orange, marginLeft: 8 }}>({importPreview.failedBatches} batch{importPreview.failedBatches > 1 ? 'es' : ''} failed — some transactions may be missing)</span> : ''}</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
          <label style={{ fontSize: 12, color: C.textMuted }}>Name:</label>
          <input value={importName} onChange={e => setImportName(e.target.value)} style={{ flex: 1, background: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 8px', fontSize: 13 }} />
        </div>
        <div style={{ overflowX: 'auto', maxHeight: '50vh' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ position: 'sticky', top: 0, background: C.card }}><tr>
              <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.textDim }}>{t('col.date')}</th>
              <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.textDim }}>{t('transactions.merchant')}</th>
              <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.textDim }}>{t('transactions.description')}</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.textDim }}>{t('col.amount')}</th>
              <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.textDim }}>{t('transactions.category')}</th>
              <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.textDim }}>{t('col.type')}</th>
            </tr></thead>
            <tbody>{importPreview.transactions.map((tx, i) => <tr key={i} style={{ borderBottom: `1px solid ${C.border}22` }}>
              <td style={{ padding: '5px 8px', whiteSpace: 'nowrap' }}>{tx.date}</td>
              <td style={{ padding: '5px 8px', fontWeight: 500 }}>{tx.merchant || ''}</td>
              <td style={{ padding: '5px 8px', fontSize: 12, color: C.textMuted }}>{tx.description}</td>
              <td style={{ padding: '5px 8px', textAlign: 'right', color: tx.amount < 0 ? C.red : C.green, fontWeight: 500 }}>{tx.amount < 0 ? '' : '+'}{tx.amount.toFixed(2)}</td>
              <td style={{ padding: '5px 8px' }}>
                <select value={t.category || 'Other'} onChange={e => {
                  setImportPreview(prev => {
                    const next = { ...prev, transactions: [...prev.transactions] };
                    next.transactions[i] = { ...next.transactions[i], category: e.target.value };
                    return next;
                  });
                }} style={{ background: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: 4, padding: '2px 4px', fontSize: 12 }}>
                  {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </td>
              <td style={{ padding: '5px 8px', color: C.textMuted, fontSize: 12 }}>{tx.type}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button onClick={() => setImportPreview(null)} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.textMuted, borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button onClick={() => confirmImport('merge')} style={{ background: C.green, color: '#000', border: 'none', borderRadius: 8, padding: '7px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>{t('transactions.mergeDuplicates')}</button>
          <button onClick={() => confirmImport('replace')} style={{ background: C.accent, color: '#000', border: 'none', borderRadius: 8, padding: '7px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>{t('transactions.replaceDateRange')}</button>
        </div>
      </div>
    </div>}

    {/* Filter bar */}
    {allTxns.length > 0 && <Card>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { label: '3D', days: 3 },
          { label: '1W', days: 7 },
          { label: '2W', days: 14 },
          { label: '1M', days: 30 },
          { label: '3M', days: 90 },
          { label: '6M', days: 180 },
          { label: t('transactions.ytd'), days: 'ytd' },
          { label: '1Y', days: 365 },
          { label: t('transactions.all'), days: 0 },
        ].map(s => {
          const today = new Date();
          let from = '';
          if (s.days === 'ytd') { from = `${today.getFullYear()}-01-01`; }
          else if (s.days > 0) { const d = new Date(today); d.setDate(d.getDate() - s.days); from = d.toISOString().slice(0, 10); }
          const isActive = s.days === 0 ? (!filter.dateFrom && !filter.dateTo) : (filter.dateFrom === from && !filter.dateTo);
          return <button key={s.label} onClick={() => setFilter(f => s.days === 0 ? { ...f, dateFrom: '', dateTo: '' } : { ...f, dateFrom: from, dateTo: '' })} style={{ padding: '3px 8px', borderRadius: 5, border: `1px solid ${isActive ? C.accent : C.border}`, background: isActive ? C.accent + '22' : 'transparent', color: isActive ? C.accent : C.textMuted, fontSize: 11, fontWeight: 600, cursor: 'pointer', letterSpacing: 0.3 }}>{s.label}</button>;
        })}
        <div style={{ width: 1, height: 20, background: C.border }} />
        <input type="date" value={filter.dateFrom} onChange={e => setFilter(f => ({ ...f, dateFrom: e.target.value }))} style={{ background: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 8px', fontSize: 12 }} />
        <span style={{ color: C.textDim, fontSize: 12 }}>{t('transactions.dateTo')}</span>
        <input type="date" value={filter.dateTo} onChange={e => setFilter(f => ({ ...f, dateTo: e.target.value }))} style={{ background: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 8px', fontSize: 12 }} />
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button onClick={() => setFilter(f => ({ ...f, _catOpen: !f._catOpen }))} style={{ background: C.input, color: filter.categories.length ? C.text : C.textMuted, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 8px', fontSize: 12, cursor: 'pointer', minWidth: 130, textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
            {filter.categories.length ? (filter.categories.length === 1 ? t('transactions.oneCategory') : t('transactions.nCategories', {n: filter.categories.length})) : t('transactions.allCategories')}
            <ChevronDown size={12} />
          </button>
          {filter._catOpen && <>
            <div onClick={() => setFilter(f => ({ ...f, _catOpen: false }))} style={{ position: 'fixed', inset: 0, zIndex: 149 }} />
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 6, zIndex: 150, minWidth: 200, maxHeight: 280, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
              {allCategories.map(c => {
                const sel = filter.categories.includes(c);
                return <button key={c} onClick={() => setFilter(f => ({ ...f, categories: sel ? f.categories.filter(x => x !== c) : [...f.categories, c] }))} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '5px 8px', border: 'none', background: sel ? C.accent + '22' : 'transparent', color: sel ? C.accent : C.text, borderRadius: 4, cursor: 'pointer', fontSize: 12, textAlign: 'left' }}>
                  <span style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${sel ? C.accent : C.border}`, background: sel ? C.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#000', fontWeight: 700, flexShrink: 0 }}>{sel ? '✓' : ''}</span>
                  {c}
                </button>;
              })}
              <div style={{ display: 'flex', gap: 4, marginTop: 4, borderTop: `1px solid ${C.border}`, paddingTop: 4 }}>
                <button onClick={() => setFilter(f => ({ ...f, categories: [...allCategories] }))} style={{ flex: 1, padding: '5px 8px', border: 'none', background: 'transparent', color: C.textMuted, borderRadius: 4, cursor: 'pointer', fontSize: 11, textAlign: 'center' }}>{t('transactions.selectAll')}</button>
                {filter.categories.length > 0 && <button onClick={() => setFilter(f => ({ ...f, categories: [] }))} style={{ flex: 1, padding: '5px 8px', border: 'none', background: 'transparent', color: C.textMuted, borderRadius: 4, cursor: 'pointer', fontSize: 11, textAlign: 'center' }}>{t('transactions.clearAll')}</button>}
              </div>
            </div>
          </>}
        </div>
        <input placeholder={t('transactions.search')} value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} style={{ flex: 1, minWidth: 120, background: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 8px', fontSize: 12 }} />
        {(filter.search || filter.categories.length || filter.dateFrom || filter.dateTo) && <button onClick={() => setFilter({ search: '', categories: [], dateFrom: '', dateTo: '' })} style={{ background: 'transparent', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 11 }}>{ t('common.clear') }</button>}
      </div>
    </Card>}

    {/* Summary cards */}
    {allTxns.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
      {[
        { label: t('common.income'), value: totalIncome, color: C.green },
        { label: t('common.expenses'), value: totalExpenses, color: C.red },
        { label: t('transactions.net'), value: net, color: net >= 0 ? C.green : C.red },
        { label: t('transactions.topCategory'), value: topCategory ? topCategory[1] : 0, color: C.accent, sub: topCategory ? topCategory[0] : '-' },
      ].map((s, i) => <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}{hasNonCHF ? ' (CHF)' : ''}</div>
        <div style={{ fontSize: 20, fontWeight: 600, color: s.color }}>{fmt(s.value)}</div>
        {s.sub && <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{s.sub}</div>}
      </div>)}
    </div>}

    {/* Charts */}
    {allTxns.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: pieData.length > 0 ? '1fr 1.5fr' : '1fr', gap: 14 }}>
      {pieData.length > 0 && <Card title={t('transactions.spendingByCategory')}>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
              {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={v => fmt(v)} contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </Card>}
      {monthlyData.length > 1 && <Card title={t('transactions.monthlyTrend')}>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.textMuted }} />
            <YAxis tick={{ fontSize: 11, fill: C.textMuted }} />
            <Tooltip formatter={v => fmt(v)} contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {allChartCategories.map((cat, i) => <Bar key={cat} dataKey={cat} stackId="a" fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </BarChart>
        </ResponsiveContainer>
      </Card>}
    </div>}

    {/* Transaction table */}
    {allTxns.length > 0 ? <Card>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <SortTH col="date">{t('col.date')}</SortTH>
            <SortTH col="merchant">{t('transactions.merchant')}</SortTH>
            <SortTH col="description">{t('transactions.description')}</SortTH>
            <SortTH col="amount" style={{ textAlign: 'right' }}>{t('col.amount')}</SortTH>
            <SortTH col="category">{t('transactions.category')}</SortTH>
            <SortTH col="type">{t('col.type')}</SortTH>
            <th style={{ padding: '8px 10px', width: 32, borderBottom: `1px solid ${C.border}` }}></th>
          </tr></thead>
          <tbody>{filtered.map(tx => <tr key={tx.id} style={{ borderBottom: `1px solid ${C.border}22` }}>
            <td style={{ padding: '7px 10px', whiteSpace: 'nowrap', fontSize: 13 }}>{tx.date}</td>
            <td style={{ padding: '7px 10px', fontSize: 13, fontWeight: 500 }}>{tx.merchant || ''}</td>
            <td style={{ padding: '7px 10px', fontSize: 12, color: C.textMuted, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</td>
            <td style={{ padding: '7px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              <div style={{ fontWeight: 500, fontSize: 13, color: tx.amount < 0 ? C.red : C.green }}>{hideBalances ? '•••' : `${tx.amount < 0 ? '' : '+'}${tx.amount.toFixed(2)}`} {tx.currency}</div>
              {tx.currency && tx.currency !== 'CHF' && fxRates[tx.currency] && !hideBalances && <div style={{ fontSize: 11, color: C.textDim }}>{toCHF(tx.amount, tx.currency) < 0 ? '' : '+'}{toCHF(tx.amount, tx.currency).toFixed(2)} CHF</div>}
            </td>
            <td style={{ padding: '7px 10px' }}>
              <select value={tx.category || 'Other'} onChange={e => handleCategoryChange(tx.id, e.target.value)} style={{ background: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: 4, padding: '2px 6px', fontSize: 12, cursor: 'pointer' }}>
                {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </td>
            <td style={{ padding: '7px 10px', color: C.textMuted, fontSize: 12 }}>{tx.type}</td>
            <td style={{ padding: '7px 4px', textAlign: 'right' }}><button onClick={() => deleteTxn(tx.id)} style={{ background: 'transparent', border: 'none', color: C.red, cursor: 'pointer', padding: 2, opacity: 0.5 }}><Trash2 size={13}/></button></td>
          </tr>)}</tbody>
        </table>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: C.textDim }}>{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</div>
    </Card> : <Card>
      <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textMuted }}>
        <Receipt size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>{t('transactions.noTransactions')}</div>
        <div style={{ fontSize: 13 }}>{t('transactions.noTransactionsSub')}</div>
      </div>
    </Card>}
  </div>;
}

const NAV = [
  { id:"dashboard", tKey:"nav.dashboard", icon:LayoutDashboard },
  { id:"accounts", tKey:"nav.accounts", icon:Landmark },
  { id:"portfolio", tKey:"nav.portfolio", icon:TrendingUp },
  { id:"scenarios", tKey:"nav.scenarios", icon:Target },
  { id:"tracker", tKey:"nav.tracker", icon:Activity },
  { id:"expenses", tKey:"nav.expenses", icon:CreditCard },
  { id:"transactions", tKey:"nav.transactions", icon:Receipt },
  { id:"pillars", tKey:"nav.strategy", icon:PiggyBank },
];

export default function FinanceApp() {
  const [page, setPage] = useState("dashboard");
  const winW = useWindowWidth();
  const isMobile = winW < 768;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const loaded = useRef(false);
  const [accounts, setAccounts] = useState(INIT_ACCOUNTS);
  const [scenarios, setScenarios] = useState(INIT_SCENARIOS);
  const [tracker, setTracker] = useState({ 2026: [] });
  const [subsP, setSubsP] = useState(INIT_SUBS_PERSONAL);
  const [subsPInScenario, setSubsPInScenario] = useState(true);
  const [yearly, setYearly] = useState(INIT_YEARLY);
  const [taxes, setTaxes] = useState(INIT_TAXES);
  const [insurance, setInsurance] = useState(INIT_INSURANCE);
  const [transactions, setTransactions] = useState({ imports: [], categoryRules: [], customCategories: [], prompt: '' });
  const [profile, setProfile] = useState({ firstName:'', lastName:'', gender:'', birthDate:'', address:'', postalCode:'', city:'', canton:'', phone:'', maritalStatus:'', religion:'', children:'', ahvNumber:'', company:'', jobTitle:'', businessName:'', businessType:'', businessProjects:'', notes:'' });
  const [profileOpen, setProfileOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [profileTab, setProfileTab] = useState('profile');
  const [promptTemplate, setPromptTemplate] = useState('');
  const [extractionPrompt, setExtractionPrompt] = useState('');
  const [payrollExtractionPrompt, setPayrollExtractionPrompt] = useState('');
  const [insPrompt, setInsPrompt] = useState('');
  const [taxPrompt, setTaxPrompt] = useState('');
  const [recPrompt, setRecPrompt] = useState('');
  const [subPrompt, setSubPrompt] = useState('');
  const [hideBalances, setHideBalances] = useState(false);
  const [onboarding, setOnboarding] = useState({ dismissed: false, welcomeAck: false, aiAdviserAck: false, dataCleared: false, backupDone: false, transactionsAck: false, aiSettingsAck: false, lastMonthlyUpdate: null, lastTrackerSync: null });
  const [darkMode, setDarkMode] = useState(false);
  const [lang, setLang] = useState('en');
  const t = useCallback((key, params) => { let s = translations[lang]?.[key] ?? translations.en?.[key] ?? key; if (params) Object.entries(params).forEach(([k,v]) => { s = s.replaceAll(`{${k}}`, v); }); return s; }, [lang]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [notesVersion, setNotesVersion] = useState(0);
  const [ollamaDetected, setOllamaDetected] = useState(false);
  const [serverProviderLabel, setServerProviderLabel] = useState('');
  const [strategyOverrides, setStrategyOverrides] = useState({ oEssential:null, oMonthlySav:null, oTotalRetirement:null, oSpendDown:null });
  const [ollamaBannerDismissed, setOllamaBannerDismissed] = useState(() => sessionStorage.getItem('ollama_banner_dismissed') === 'true');
  const importJsonRef = useRef(null);
  C = darkMode ? DARK : LIGHT;

  // Load all data from API on mount
  useEffect(() => {
    const keys = ['accounts','scenarios','tracker','subscriptions_personal','yearly','taxes','insurance','settings','profile','transactions','strategy_overrides'];
    Promise.all(keys.map(k => fetch(`${API_URL}/${k}`).then(r => r.status === 404 ? null : r.json())))
      .then(([acc, sc, tr, subP, yr, tx, ins, settings, prof, txns, strat]) => {
        if (acc) setAccounts(acc);
        if (sc) { const seen = new Set(); sc.forEach(s => { if (seen.has(s.id)) s.id = uid(); seen.add(s.id); }); setScenarios(sc); }
        if (tr) setTracker(tr);
        if (subP) setSubsP(subP.map(s => {
          if (s.amount == null) return {...s, amount: (s.monthly||0) + (s.yearly||0)/12, frequency: 1};
          return s.frequency ? s : {...s, frequency: 1};
        }));
        if (yr) setYearly(yr.map(e => {
          if (e.amount == null) return {...e, amount: e.yearly||e.monthly*12||0, frequency: 12};
          return e.frequency ? e : {...e, frequency: 12};
        }));
        if (tx) setTaxes(tx);
        if (ins) setInsurance(ins.map(p => {
          if (p.amount == null) return {...p, amount: p.yearly||0, frequency: 12};
          return p.frequency ? p : {...p, frequency: 12};
        }));
        if (settings) {
          if (settings.subsPInScenario != null) setSubsPInScenario(settings.subsPInScenario);
          if (settings.promptTemplate != null) setPromptTemplate(settings.promptTemplate);
          if (settings.extractionPrompt != null) setExtractionPrompt(settings.extractionPrompt);
          if (settings.payrollExtractionPrompt != null) setPayrollExtractionPrompt(settings.payrollExtractionPrompt);
          if (settings.insPrompt != null) setInsPrompt(settings.insPrompt);
          if (settings.taxPrompt != null) setTaxPrompt(settings.taxPrompt);
          if (settings.recPrompt != null) setRecPrompt(settings.recPrompt);
          if (settings.subPrompt != null) setSubPrompt(settings.subPrompt);
          if (settings.onboarding) setOnboarding(o => ({ ...o, ...settings.onboarding }));
          if (settings.lang) setLang(settings.lang);
        }
        // profile key is loaded separately
        if (prof) setProfile(prof);
        if (txns) setTransactions(txns);
        if (strat) setStrategyOverrides(o => ({ ...o, ...strat }));
        loaded.current = true; // only enable auto-save after successful load
      })
      .catch(err => {
        console.error('Failed to load from API — auto-save disabled to protect data:', err);
      })
      .finally(() => { setLoading(false); });
  }, []);

  // Ollama auto-detection + server provider fetch (for banner)
  useEffect(() => {
    fetch(`${API_URL}/provider`).then(r => r.json()).then(d => setServerProviderLabel(d?.provider || '')).catch(() => {});
    fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(2000) })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setOllamaDetected(true); })
      .catch(() => {});
  }, []);

  // Auto-save on change (skips initial load)
  const save = useCallback((key, value) => {
    if (!loaded.current) return;
    fetch(`${API_URL}/${key}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) }).catch(console.error);
  }, []);

  useEffect(() => { save('accounts', accounts); }, [accounts, save]);
  useEffect(() => { save('scenarios', scenarios); }, [scenarios, save]);
  useEffect(() => { save('tracker', tracker); }, [tracker, save]);
  useEffect(() => { save('subscriptions_personal', subsP); }, [subsP, save]);
  useEffect(() => { save('yearly', yearly); }, [yearly, save]);
  useEffect(() => { save('taxes', taxes); }, [taxes, save]);
  useEffect(() => { save('insurance', insurance); }, [insurance, save]);
  useEffect(() => { save('profile', profile); }, [profile, save]);
  useEffect(() => { save('transactions', transactions); }, [transactions, save]);
  useEffect(() => { save('settings', { subsPInScenario, promptTemplate, extractionPrompt, payrollExtractionPrompt, insPrompt, taxPrompt, recPrompt, subPrompt, onboarding, lang }); }, [subsPInScenario, promptTemplate, extractionPrompt, payrollExtractionPrompt, insPrompt, taxPrompt, recPrompt, subPrompt, onboarding, lang, save]);
  useEffect(() => { save('strategy_overrides', strategyOverrides); }, [strategyOverrides, save]);

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: darkMode ? "#141310" : "#f5f3ee", color: darkMode ? "#9a9688" : "#7a7a72", fontSize: 16, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" }}>Loading…</div>;

  return <div style={{display:"flex",height:"100vh",background:C.bg,fontFamily:"'Instrument Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",color:C.text,position:"relative",overflow:"hidden"}}>
    {/* Mobile overlay backdrop */}
    {isMobile && sidebarOpen && <div onClick={()=>setSidebarOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:49}}/>}
    <div style={{width:sidebarOpen?200:52,background:C.card,borderRight:`1px solid ${C.border}`,padding:sidebarOpen?"16px 10px 14px":"16px 6px 14px",display:"flex",flexDirection:"column",transition:"width .2s ease",overflow:"hidden",flexShrink:0,
      ...(isMobile ? {position:"fixed",top:0,left:0,height:"100%",zIndex:50,width:200,transform:sidebarOpen?"translateX(0)":"translateX(-100%)",transition:"transform .25s ease"} : {})}}>

      {/* Logo + collapse */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18,padding:sidebarOpen?"0 4px":"0"}}>
        {sidebarOpen && <div>
          <div style={{fontSize:16,fontWeight:400,fontFamily:"'Fraunces',serif",letterSpacing:"0.04em",color:C.text,lineHeight:1.2}}>Finance<span style={{fontStyle:"italic",color:C.accent}}>Hub</span></div>
          <div style={{fontSize:8,color:C.textDim,marginTop:1,fontFamily:"'DM Mono',monospace",letterSpacing:"0.08em",textTransform:"uppercase"}}>{t('sidebar.tagline')}</div>
        </div>}
        {!isMobile && <button onClick={()=>setSidebarOpen(o=>!o)} style={{background:"transparent",border:"none",cursor:"pointer",color:C.textDim,padding:3,borderRadius:5,display:"flex",alignItems:"center",flexShrink:0}} title={sidebarOpen?t('sidebar.collapse'):t('sidebar.expand')}>
          {sidebarOpen ? <ChevronLeft size={15}/> : <ChevronRight size={15}/>}
        </button>}
      </div>

      {/* Navigation */}
      <nav style={{display:"flex",flexDirection:"column",gap:1}}>
        {NAV.map(n=>{
          const a=page===n.id;
          return <button key={n.id} onClick={()=>{setPage(n.id);if(isMobile)setSidebarOpen(false);}} title={sidebarOpen?undefined:t(n.tKey)}
            style={{display:"flex",alignItems:"center",gap:8,padding:sidebarOpen?"7px 10px":"8px 0",justifyContent:sidebarOpen?"flex-start":"center",borderRadius:7,border:"none",cursor:"pointer",fontSize:13,fontWeight:a?600:400,color:a?C.text:C.textMuted,background:a?C.accent+"18":"transparent",textAlign:"left",whiteSpace:"nowrap",transition:"background .12s,color .12s",position:"relative"}}>
            <n.icon size={15} color={a?C.accentLight:C.textDim}/>
            {sidebarOpen && <span style={{flex:1}}>{t(n.tKey)}</span>}
            {sidebarOpen && a && <div style={{width:4,height:4,borderRadius:2,background:C.accent,flexShrink:0}}/>}
          </button>;
        })}
      </nav>

      {/* Bottom section */}
      <div style={{marginTop:"auto",paddingTop:10,borderTop:`1px solid ${C.border}`,display:"flex",flexDirection:"column",gap:1}}>

        {/* Profile */}
        <button onClick={()=>setProfileOpen(true)} title={sidebarOpen?undefined:`${profile.firstName||'Profile'} ${profile.lastName}`}
          style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"6px 10px",borderRadius:7,border:"none",background:"transparent",cursor:"pointer",textAlign:"left",justifyContent:sidebarOpen?"flex-start":"center",color:C.textMuted,marginBottom:2}}>
          <User size={14} color={C.accentLight}/>
          {sidebarOpen && <span style={{fontSize:11,color:C.textDim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{profile.firstName?`${profile.firstName} ${profile.lastName}`.trim():t('sidebar.profile')}</span>}
        </button>

        {/* AI Prompt */}
        <button onClick={()=>setPromptOpen(true)} title={sidebarOpen?undefined:t('sidebar.aiPrompt')}
          style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"6px 10px",borderRadius:7,border:"none",background:"transparent",cursor:"pointer",textAlign:"left",justifyContent:sidebarOpen?"flex-start":"center",color:C.textMuted,marginBottom:2}}>
          <Sparkles size={14} color={C.accentLight}/>
          {sidebarOpen && <span style={{fontSize:11,color:C.textDim}}>{t('sidebar.aiPrompt')}</span>}
        </button>

        {/* AI Settings */}
        <button onClick={()=>{setPage('ai-settings');if(isMobile)setSidebarOpen(false);}} title={sidebarOpen?undefined:t('sidebar.aiSettings')}
          style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"6px 10px",borderRadius:7,border:"none",background:page==='ai-settings'?C.accent+"18":"transparent",cursor:"pointer",textAlign:"left",justifyContent:sidebarOpen?"flex-start":"center",color:page==='ai-settings'?C.accentLight:C.textMuted,marginBottom:4}}>
          <Settings size={14} color={page==='ai-settings'?C.accentLight:undefined}/>
          {sidebarOpen && <span style={{fontSize:11,color:page==='ai-settings'?C.accentLight:C.textDim}}>{t('sidebar.aiSettings')}</span>}
        </button>

        {/* Dark Mode toggle row */}
        {sidebarOpen ? (
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 10px",borderRadius:7}}>
            <div style={{display:"flex",alignItems:"center",gap:7,color:C.textMuted}}>
              {darkMode ? <Sun size={13}/> : <Moon size={13}/>}
              <span style={{fontSize:11}}>{darkMode?t('sidebar.lightMode'):t('sidebar.darkMode')}</span>
            </div>
            <Toggle on={darkMode} onToggle={()=>setDarkMode(d=>!d)}/>
          </div>
        ) : (
          <button onClick={()=>setDarkMode(d=>!d)} title={darkMode?t('sidebar.lightMode'):t('sidebar.darkMode')} style={{display:"flex",alignItems:"center",justifyContent:"center",width:"100%",padding:"8px 0",borderRadius:7,border:"none",background:"transparent",color:C.textMuted,cursor:"pointer"}}>
            {darkMode ? <Sun size={15}/> : <Moon size={15}/>}
          </button>
        )}

        {/* Hide Balances toggle row */}
        {sidebarOpen ? (
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 10px",borderRadius:7}}>
            <div style={{display:"flex",alignItems:"center",gap:7,color:C.textMuted}}>
              {hideBalances ? <EyeOff size={13}/> : <Eye size={13}/>}
              <span style={{fontSize:11}}>{t('sidebar.hideBalances')}</span>
            </div>
            <Toggle on={hideBalances} onToggle={()=>setHideBalances(h=>!h)}/>
          </div>
        ) : (
          <button onClick={()=>setHideBalances(h=>!h)} title={hideBalances?t('sidebar.showBalances'):t('sidebar.hideBalances')} style={{display:"flex",alignItems:"center",justifyContent:"center",width:"100%",padding:"8px 0",borderRadius:7,border:"none",background:"transparent",color:hideBalances?C.accentLight:C.textMuted,cursor:"pointer"}}>
            {hideBalances ? <EyeOff size={15}/> : <Eye size={15}/>}
          </button>
        )}

        {/* Language toggle */}
        {sidebarOpen ? (
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 10px",borderRadius:7}}>
            <div style={{display:"flex",alignItems:"center",gap:7,color:C.textMuted}}>
              <span style={{fontSize:13,fontWeight:600}}>🌐</span>
              <span style={{fontSize:11}}>{t('sidebar.language')}</span>
            </div>
            <button onClick={()=>setLang(l=>l==='en'?'de':'en')} style={{padding:"2px 8px",borderRadius:5,border:`1px solid ${C.border}`,background:C.accent+"18",color:C.accent,fontSize:11,fontWeight:700,cursor:"pointer",letterSpacing:"0.04em"}}>{lang.toUpperCase()}</button>
          </div>
        ) : (
          <button onClick={()=>setLang(l=>l==='en'?'de':'en')} title={lang==='en'?'Deutsch':'English'} style={{display:"flex",alignItems:"center",justifyContent:"center",width:"100%",padding:"8px 0",borderRadius:7,border:"none",background:"transparent",color:C.accent,cursor:"pointer",fontSize:11,fontWeight:700}}>{lang.toUpperCase()}</button>
        )}

        {/* Getting Started */}
        <button onClick={()=>{setOnboarding(o=>({...o,dismissed:false}));setPage('dashboard');}} title={sidebarOpen?undefined:t('sidebar.gettingStarted')}
          style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"6px 10px",borderRadius:7,border:"none",background:!onboarding.dismissed?C.accent+"18":"transparent",cursor:"pointer",textAlign:"left",justifyContent:sidebarOpen?"flex-start":"center",color:!onboarding.dismissed?C.accentLight:C.textMuted,marginTop:2}}>
          <BookOpen size={13}/>{sidebarOpen && <span style={{fontSize:11}}>{t('sidebar.gettingStarted')}</span>}
        </button>

        {/* Export / Import */}
        {sidebarOpen && <div style={{display:"flex",gap:4,marginTop:6}}>
          <button onClick={async()=>{
            const keys=['accounts','scenarios','tracker','subscriptions_personal','yearly','taxes','insurance','settings','profile','ai_analysis','transactions'];
            const out={};
            for(const k of keys){ const r=await fetch(`${API_URL}/${k}`); out[k]=r.status===404?null:await r.json(); }
            const ts=new Date().toISOString().slice(0,16).replace('T','_').replace(':','');
            const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:'application/json'})); a.download=`finance_hub_${ts}.json`; a.style.display='none'; document.body.appendChild(a); a.click(); URL.revokeObjectURL(a.href); document.body.removeChild(a);
          }} style={{flex:1,padding:"4px 0",borderRadius:5,border:`1px solid ${C.border}`,background:"transparent",color:C.textDim,fontSize:10,cursor:"pointer",letterSpacing:"0.02em"}}>{t('sidebar.export')}</button>
          <button onClick={()=>importJsonRef.current?.click()} style={{flex:1,padding:"4px 0",borderRadius:5,border:`1px solid ${C.border}`,background:"transparent",color:C.textDim,fontSize:10,cursor:"pointer",letterSpacing:"0.02em"}}>{t('sidebar.import')}</button>
          <input ref={importJsonRef} type="file" accept=".json" style={{display:"none"}} onChange={async e=>{
            const file=e.target.files[0]; if(!file) return;
            e.target.value='';
            try {
              const data=JSON.parse(await file.text());
              for(const [k,v] of Object.entries(data)){ if(v!=null) await fetch(`${API_URL}/${k}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(v)}); }
              alert('Import complete — refreshing...'); window.location.reload();
            } catch(err){ alert('Import failed: '+err.message); }
          }}/>
        </div>}

      </div>
    </div>
    <div style={{flex:1,overflow:"auto",padding:isMobile?"16px 12px":28,marginLeft:isMobile?0:undefined}}>
      <div style={{maxWidth:1200}}>
        {/* Mobile header bar */}
        {isMobile && <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
          <button onClick={()=>setSidebarOpen(o=>!o)} style={{padding:"8px",borderRadius:8,border:`1px solid ${C.border}`,background:C.card,color:C.text,cursor:"pointer",display:"flex",alignItems:"center"}}>
            <Menu size={18}/>
          </button>
          <h1 style={{fontSize:20,fontWeight:700,margin:0}}>{t(NAV.find(n=>n.id===page)?.tKey||'')}</h1>
        </div>}
        {!isMobile && <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
          <h1 style={{fontSize:26,fontWeight:400,fontFamily:"'Fraunces',serif",margin:0}}>{t(NAV.find(n=>n.id===page)?.tKey||'')}</h1>
        </div>}

        {/* Ollama detection banner */}
        {ollamaDetected && serverProviderLabel !== 'ollama' && !ollamaBannerDismissed && (() => {
          const storedConf = getStoredProviderConfig();
          const usingOllama = storedConf?.provider === 'ollama';
          if (usingOllama) return null;
          return <div style={{marginBottom:18,padding:'12px 18px',borderRadius:10,background:C.green+'11',border:`1px solid ${C.green+'44'}`,display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:C.green,flexShrink:0,boxShadow:`0 0 6px ${C.green}`}}/>
            <div style={{flex:1,fontSize:13,color:C.text}}>
              <strong>{t('ollama.detected')}</strong> {t('ollama.benefit')}
              <button onClick={()=>setPage('ai-settings')} style={{marginLeft:10,padding:'2px 10px',borderRadius:6,border:`1px solid ${C.green}`,background:'transparent',color:C.green,fontSize:12,cursor:'pointer',fontWeight:600}}>{t('ollama.configure')}</button>
            </div>
            <button onClick={()=>{ setOllamaBannerDismissed(true); sessionStorage.setItem('ollama_banner_dismissed','true'); }} style={{background:'transparent',border:'none',color:C.textDim,cursor:'pointer',padding:4,flexShrink:0}}><X size={14}/></button>
          </div>;
        })()}

        {page==="dashboard" && <>
          <OnboardingChecklist accounts={accounts} scenarios={scenarios} subsP={subsP} yearly={yearly} profile={profile} onboarding={onboarding} setOnboarding={setOnboarding} setPage={setPage} setProfileOpen={setProfileOpen} setPromptOpen={setPromptOpen} t={t} onClearAll={(skipConfirm)=>{ if(skipConfirm !== 'skip' && !window.confirm(t('onboarding.clearConfirm'))) return; setAccounts([]); setScenarios([]); setSubsP([]); setYearly([]); setTaxes([]); setInsurance([]); setTracker({2026:[]}); setProfile({firstName:'',lastName:'',gender:'',birthDate:'',address:'',postalCode:'',city:'',canton:'',phone:'',maritalStatus:'',religion:'',children:'',ahvNumber:'',company:'',jobTitle:'',businessName:'',businessType:'',businessProjects:'',notes:''}); setOnboarding(o=>({...o,dataCleared:true})); }}/>
          <Dashboard accounts={accounts} scenarios={scenarios} subsP={subsP} subsPInScenario={subsPInScenario} yearly={yearly} taxes={taxes} insurance={insurance} profile={profile} hideBalances={hideBalances} setChatOpen={setChatOpen} setChatInput={setChatInput} notesVersion={notesVersion} t={t}/>
        </>}
        {page==="accounts" && <AccountsPage accounts={accounts} setAccounts={setAccounts} hideBalances={hideBalances} onAccountsUpdated={() => setOnboarding(o => ({...o, lastMonthlyUpdate: new Date().toISOString()}))} extractionPrompt={extractionPrompt} setExtractionPrompt={setExtractionPrompt} t={t}/>}
        {page==="portfolio" && <PortfolioPage accounts={accounts} setAccounts={setAccounts} hideBalances={hideBalances} setChatOpen={setChatOpen} setChatInput={setChatInput} t={t}/>}
        {page==="scenarios" && <ScenariosPage scenarios={scenarios} setScenarios={setScenarios} subsP={subsP} subsPInScenario={subsPInScenario} yearly={yearly} taxes={taxes} insurance={insurance} hideBalances={hideBalances} darkMode={darkMode} payrollExtractionPrompt={payrollExtractionPrompt} setPayrollExtractionPrompt={setPayrollExtractionPrompt} t={t}/>}
        {page==="tracker" && <TrackerPage tracker={tracker} setTracker={setTracker} accounts={accounts} hideBalances={hideBalances} onTrackerSynced={() => setOnboarding(o => ({...o, lastTrackerSync: new Date().toISOString()}))} t={t}/>}
        {page==="expenses" && <ExpensesPage subsP={subsP} setSubsP={setSubsP} subsPInScenario={subsPInScenario} setSubsPInScenario={setSubsPInScenario} yearly={yearly} setYearly={setYearly} taxes={taxes} setTaxes={setTaxes} insurance={insurance} setInsurance={setInsurance} hideBalances={hideBalances} profile={profile} accounts={accounts} scenarios={scenarios} darkMode={darkMode} insPrompt={insPrompt} setInsPrompt={setInsPrompt} taxPrompt={taxPrompt} setTaxPrompt={setTaxPrompt} recPrompt={recPrompt} setRecPrompt={setRecPrompt} subPrompt={subPrompt} setSubPrompt={setSubPrompt} t={t}/>}
        {page==="transactions" && <TransactionsPage transactions={transactions} setTransactions={setTransactions} hideBalances={hideBalances} t={t}/>}
        {page==="pillars" && <PillarPage accounts={accounts} scenarios={scenarios} subsP={subsP} subsPInScenario={subsPInScenario} yearly={yearly} taxes={taxes} insurance={insurance} hideBalances={hideBalances} profile={profile} strategyOverrides={strategyOverrides} setStrategyOverrides={setStrategyOverrides} t={t}/>}
        {page==="ai-settings" && <AISettingsPage t={t}/>}
      </div>
    </div>
    <ChatPanel accounts={accounts} scenarios={scenarios} subsP={subsP} subsPInScenario={subsPInScenario} yearly={yearly} taxes={taxes} insurance={insurance} profile={profile} open={chatOpen} setOpen={setChatOpen} externalInput={chatInput} setExternalInput={setChatInput} promptTemplate={promptTemplate} onPinned={() => setNotesVersion(v => v + 1)} t={t}/>
    {profileOpen && <div onClick={()=>setProfileOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,width:"100%",maxWidth:1140,maxHeight:"84vh",overflowY:"auto",padding:28,boxShadow:"0 24px 80px rgba(0,0,0,0.6)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
          <h2 style={{margin:0,fontSize:18,fontWeight:700,color:C.text}}>{t('profile.title')}</h2>
          <button onClick={()=>setProfileOpen(false)} style={{background:"transparent",border:"none",cursor:"pointer",color:C.textDim}}><X size={18}/></button>
        </div>
        <p style={{margin:"0 0 20px",fontSize:13,color:C.textDim}}>{t('profile.desc')}</p>

        {/* ── Personal Info ── */}
        <div style={{fontSize:12,color:C.textDim,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,marginBottom:12}}>{t('profile.personalInfo')}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          {[{label:t('profile.firstName'),key:"firstName"},{label:t('profile.lastName'),key:"lastName"},{label:t('profile.gender'),key:"gender"},{label:t('profile.dateOfBirth'),key:"birthDate"}].map(({label,key})=>(
            <div key={key} style={{marginBottom:14}}>
              <label style={{fontSize:12,color:C.accent,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:4}}>{label}</label>
              <input value={profile[key]||''} onChange={e=>setProfile(p=>({...p,[key]:e.target.value}))}
                style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:14,outline:"none",boxSizing:"border-box"}}/>
            </div>
          ))}
        </div>

        {/* ── Residence & Contact ── */}
        <div style={{fontSize:12,color:C.textDim,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,marginBottom:12,marginTop:4,paddingTop:12,borderTop:`1px solid ${C.border}`}}>{t('profile.residenceContact')}</div>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:12,color:C.accent,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:4}}>{t('profile.streetAddress')}</label>
          <input value={profile.address||''} onChange={e=>setProfile(p=>({...p,address:e.target.value}))}
            style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:14,outline:"none",boxSizing:"border-box"}}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"120px 1fr 1fr 1fr",gap:"0 12px"}}>
          {[{label:t('profile.postalCode'),key:"postalCode"},{label:t('profile.city'),key:"city"},{label:t('profile.canton'),key:"canton"},{label:t('profile.phone'),key:"phone"}].map(({label,key})=>{
            if (key==="canton") return (
              <div key={key} style={{marginBottom:14}}>
                <label style={{fontSize:12,color:C.accent,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:4}}>{label}</label>
                <select value={profile[key]||''} onChange={e=>setProfile(p=>({...p,[key]:e.target.value}))}
                  style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:profile[key]?C.text:C.textDim,fontSize:14,outline:"none",boxSizing:"border-box",cursor:"pointer"}}>
                  <option value="">— select —</option>
                  {["AG","AI","AR","BE","BL","BS","FR","GE","GL","GR","JU","LU","NE","NW","OW","SG","SH","SO","SZ","TG","TI","UR","VD","VS","ZG","ZH"].map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            );
            return (
              <div key={key} style={{marginBottom:14}}>
                <label style={{fontSize:12,color:C.accent,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:4}}>{label}</label>
                <input value={profile[key]||''} onChange={e=>setProfile(p=>({...p,[key]:e.target.value}))}
                  style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:14,outline:"none",boxSizing:"border-box"}}/>
              </div>
            );
          })}
        </div>

        {/* ── Tax Information ── */}
        <div style={{fontSize:12,color:C.textDim,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,marginBottom:12,marginTop:4,paddingTop:12,borderTop:`1px solid ${C.border}`}}>{t('profile.taxInfo')}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"0 16px"}}>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:12,color:C.accent,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:4}}>{t('profile.maritalStatus')}</label>
            <select value={profile.maritalStatus||''} onChange={e=>setProfile(p=>({...p,maritalStatus:e.target.value}))}
              style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:profile.maritalStatus?C.text:C.textDim,fontSize:14,outline:"none",boxSizing:"border-box",cursor:"pointer"}}>
              <option value="">— select —</option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Registered Partnership">Registered Partnership</option>
              <option value="Divorced">Divorced</option>
              <option value="Widowed">Widowed</option>
            </select>
          </div>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:12,color:C.accent,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:4}}>{t('profile.religion')}</label>
            <select value={profile.religion||''} onChange={e=>setProfile(p=>({...p,religion:e.target.value}))}
              style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:profile.religion?C.text:C.textDim,fontSize:14,outline:"none",boxSizing:"border-box",cursor:"pointer"}}>
              <option value="">— select —</option>
              <option value="None">None (no church tax)</option>
              <option value="Protestant">Protestant (Evangelisch-Reformiert)</option>
              <option value="Catholic">Catholic (Römisch-Katholisch)</option>
              <option value="Christian Catholic">Christian Catholic (Christkatholisch)</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:12,color:C.accent,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:4}}>{t('profile.children')}</label>
            <input type="number" min="0" value={profile.children||''} onChange={e=>setProfile(p=>({...p,children:e.target.value}))} placeholder="0"
              style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:14,outline:"none",boxSizing:"border-box"}}/>
          </div>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:12,color:C.accent,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:4}}>{t('profile.ahvNumber')}</label>
            <input value={profile.ahvNumber||''} onChange={e=>setProfile(p=>({...p,ahvNumber:e.target.value}))} placeholder="756.XXXX.XXXX.XX"
              style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:14,outline:"none",boxSizing:"border-box"}}/>
          </div>
        </div>

        {/* ── Employment ── */}
        <div style={{fontSize:12,color:C.textDim,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,marginBottom:12,marginTop:4,paddingTop:12,borderTop:`1px solid ${C.border}`}}>{t('profile.employment')}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          {[{label:t('profile.company'),key:"company"},{label:t('profile.jobTitle'),key:"jobTitle"}].map(({label,key})=>(
            <div key={key} style={{marginBottom:14}}>
              <label style={{fontSize:12,color:C.accent,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:4}}>{label}</label>
              <input value={profile[key]||''} onChange={e=>setProfile(p=>({...p,[key]:e.target.value}))}
                style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:14,outline:"none",boxSizing:"border-box"}}/>
            </div>
          ))}
        </div>

        {/* ── Side Business ── */}
        <div style={{fontSize:12,color:C.textDim,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,marginBottom:12,marginTop:4,paddingTop:12,borderTop:`1px solid ${C.border}`}}>{t('profile.sideBusiness')}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0 16px"}}>
          {[{label:t('profile.businessName'),key:"businessName"},{label:t('profile.businessType'),key:"businessType"},{label:t('profile.businessProjects'),key:"businessProjects"}].map(({label,key})=>(
            <div key={key} style={{marginBottom:14}}>
              <label style={{fontSize:12,color:C.accent,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:4}}>{label}</label>
              <input value={profile[key]||''} onChange={e=>setProfile(p=>({...p,[key]:e.target.value}))}
                style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:14,outline:"none",boxSizing:"border-box"}}/>
            </div>
          ))}
        </div>

        <div style={{marginBottom:14,paddingTop:12,borderTop:`1px solid ${C.border}`}}>
          <label style={{fontSize:12,color:C.accent,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:4}}>{t('profile.notesForAi')}</label>
          <textarea value={profile.notes||''} onChange={e=>setProfile(p=>({...p,notes:e.target.value}))} rows={3}
            placeholder="e.g. planning to buy property, partner earns CHF X, business revenue target..."
            style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:14,outline:"none",resize:"vertical",boxSizing:"border-box",fontFamily:"inherit"}}/>
        </div>
        <button onClick={()=>setProfileOpen(false)} style={{width:"100%",padding:"11px",borderRadius:8,border:"none",background:C.accent,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",marginTop:8}}>{t('common.saveClose')}</button>
      </div>
    </div>}
    {promptOpen && <div onClick={()=>setPromptOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,width:"100%",maxWidth:1140,maxHeight:"84vh",overflowY:"auto",padding:28,boxShadow:"0 24px 80px rgba(0,0,0,0.6)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <h2 style={{margin:0,fontSize:18,fontWeight:700,color:C.text}}>{t('aiPrompt.title')}</h2>
          <button onClick={()=>setPromptOpen(false)} style={{background:"transparent",border:"none",cursor:"pointer",color:C.textDim}}><X size={18}/></button>
        </div>
        <p style={{margin:'0 0 12px',fontSize:13,color:C.textDim}}>
          {t('aiPrompt.desc')} {t('aiPrompt.desc2')}
        </p>
        <div style={{display:'flex',gap:8,marginBottom:10}}>
          <button onClick={async()=>{
            const r = await fetch(`${API_URL}/prompt`);
            const d = await r.json();
            setPromptTemplate(d.content);
          }} style={{padding:'6px 12px',borderRadius:6,border:`1px solid ${C.border}`,background:'transparent',color:C.textMuted,fontSize:13,cursor:'pointer'}}>
            Load default
          </button>
          <button onClick={()=>setPromptTemplate('')}
            style={{padding:'6px 12px',borderRadius:6,border:`1px solid ${C.border}`,background:'transparent',color:C.textMuted,fontSize:13,cursor:'pointer'}}>
            Reset to blank
          </button>
        </div>
        <textarea
          value={promptTemplate}
          onChange={e=>setPromptTemplate(e.target.value)}
          placeholder={t('aiPrompt.placeholder')}
          rows={28}
          style={{width:'100%',padding:'10px 12px',borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,
            fontSize:13,outline:'none',resize:'vertical',boxSizing:'border-box',fontFamily:"'DM Mono',monospace",lineHeight:1.5}}
        />
        {promptTemplate && <div style={{marginTop:6,fontSize:12,color:C.green}}>{t('aiPrompt.customActive')}</div>}
        <button onClick={()=>setPromptOpen(false)} style={{width:'100%',padding:'11px',borderRadius:8,border:'none',background:C.accent,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',marginTop:12}}>
          {t('common.saveClose')}
        </button>
      </div>
    </div>}
  </div>;
}
