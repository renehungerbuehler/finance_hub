import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, ResponsiveContainer, AreaChart, Area, ComposedChart } from "recharts";
import { LayoutDashboard, Target, TrendingUp, Activity, CreditCard, Shield, Plus, Pencil, Trash2, Check, X, DollarSign, Wallet, PiggyBank, BarChart3, GripVertical, Power, Sparkles, AlertTriangle, ArrowUpRight, Info, Lightbulb, ShieldCheck, Landmark, Paperclip, Upload, Download, Sun, Moon, ChevronLeft, ChevronRight, User, Building2, Eye, EyeOff, RefreshCw, ChevronDown, MessageSquarePlus, ExternalLink, Maximize2, Minimize2, BookOpen, Settings, Key, Bot, WifiOff, Lock, Cloud, Pin, ClipboardList, Menu, Receipt } from "lucide-react";
import { jsPDF } from "jspdf";

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
  { id: 'scenario', label: 'Create a budget scenario', desc: 'Build a scenario manually or use Import Payroll on the Scenarios page — upload a payroll PDF and AI generates your income, net salary, and all deductions (AHV, BVG, etc.) including percentage-based items.', type: 'one-time', icon: Target, action: 'scenarios', badge: 'import' },
  { id: 'backup', label: 'Create a backup', desc: 'Download a full JSON backup of your data and store it somewhere safe (cloud drive, external disk). Restore it any time via the Import button in the sidebar.', type: 'one-time', icon: Download, action: 'backup' },
  { id: 'monthlyBalances', label: 'Update account balances', desc: 'Import or edit your account balances this month.', type: 'recurring', icon: RefreshCw, action: 'accounts' },
  { id: 'monthlyTracker', label: 'Sync Tracker', desc: 'Sync your tracker with current account balances.', type: 'recurring', icon: Activity, action: 'tracker' },
];

function generateInsights({ accounts, scenarios, insurance, inc, exp, sav, inv, liquidTotal, lockedTotal, totalWealth, debtTotal = 0 }) {
  const insights = [];
  const sc = scenarios.find(s => s.isActive);

  // 1. Pillar 3a max contribution check
  const franklyContrib = sc ? (sc.savings.find(l => l.label.toLowerCase().includes("3a")) || sc.investments.find(l => l.label.toLowerCase().includes("3a"))) : null;
  const monthlyTo3a = franklyContrib ? (franklyContrib.pct != null ? +(inc * franklyContrib.pct / 100) : franklyContrib.amount) : 0;
  const yearly3a = monthlyTo3a * 12;
  const max3a = 7258;
  if (yearly3a < max3a) {
    const gap = max3a - yearly3a;
    insights.push({ priority: "high", category: "tax", icon: "tax", title: "Pillar 3a not maxed",
      detail: `You're contributing CHF ${Math.round(yearly3a)}/year to 3a but the 2025/2026 maximum is CHF ${fmt(max3a)}. The gap of CHF ${fmt(Math.round(gap))} is a missed tax deduction — at Kanton Zurich marginal rates (~33%), that's ~CHF ${fmt(Math.round(gap * 0.33))} in tax savings per year.`,
      action: `Increase monthly 3a contribution from CHF ${fmt(Math.round(monthlyTo3a))} to CHF ${fmt(Math.ceil(max3a / 12))}`,
      impact: `~CHF ${fmt(Math.round(gap * 0.33))}/year tax savings`,
    });
  } else {
    insights.push({ priority: "low", category: "tax", icon: "check", title: "Pillar 3a is maxed",
      detail: `Your yearly 3a contribution of CHF ${fmt(Math.round(yearly3a))} meets or exceeds the 2025/2026 limit of CHF ${fmt(max3a)}. Well done — this is the easiest tax optimization in Switzerland.`,
      action: "Consider opening multiple 3a accounts for staggered withdrawals to reduce tax on payout", impact: "Future tax savings on withdrawal",
    });
  }

  // 2. Emergency fund check
  const emergencyAcct = accounts.find(a => a.name.toLowerCase().includes("emergency"));
  const emergencyBal = emergencyAcct ? emergencyAcct.balance : 0;
  const monthlyExpenses = exp > 0 ? exp : 5000;
  const targetEmergency = monthlyExpenses * 6;
  if (emergencyBal < targetEmergency && emergencyBal < 20000) {
    insights.push({ priority: emergencyBal < monthlyExpenses * 3 ? "high" : "medium", category: "savings", icon: "alert", title: "Emergency fund below 3-6 month target",
      detail: `Your emergency fund is CHF ${fmt(emergencyBal)} but your monthly expenses are ~CHF ${fmt(Math.round(monthlyExpenses))}. A 6-month buffer would be CHF ${fmt(Math.round(targetEmergency))}. In Switzerland, consider the 3-month notice period (Kuendigungsfrist) — but also account for health insurance deductible (Franchise, up to CHF 2'500) and co-pay (Selbstbehalt).`,
      action: `Prioritise building to CHF ${fmt(Math.round(targetEmergency))} before increasing investments`, impact: "Financial security against job loss or health costs",
    });
  }

  // 3. BVG buy-in opportunity
  const bvgAccount = accounts.find(a => a.name.toLowerCase().includes("swisslife") || a.name.toLowerCase().includes("2a"));
  if (bvgAccount && inc > 0) {
    insights.push({ priority: "medium", category: "pension", icon: "pension", title: "Check BVG voluntary buy-in (Einkauf)",
      detail: `Your 2a balance is CHF ${fmt(bvgAccount.balance)}. Voluntary BVG buy-ins are fully tax-deductible in the year of payment — often the most powerful tax deduction available in Switzerland. Check your pension statement (Vorsorgeausweis) from SwissLife for the maximum buy-in potential (Einkaufspotenzial).`,
      action: "Request pension statement (Vorsorgeausweis) from SwissLife and check buy-in potential", impact: "Potentially CHF 5'000-20'000+ deductible from taxable income",
    });
  }

  // 4. Savings rate analysis
  const savingsRate = inc > 0 ? ((sav + inv) / inc) : 0;
  if (savingsRate > 0) {
    const rateLabel = savingsRate >= 0.3 ? "excellent" : savingsRate >= 0.2 ? "good" : savingsRate >= 0.1 ? "moderate" : "low";
    insights.push({ priority: savingsRate < 0.15 ? "high" : "low", category: "savings", icon: "trend",
      title: `Savings rate: ${(savingsRate * 100).toFixed(1)}% (${rateLabel})`,
      detail: `You're saving + investing CHF ${fmt(Math.round(sav + inv))} of CHF ${fmt(Math.round(inc))} monthly income. ${savingsRate >= 0.2 ? "This is above the Swiss average of ~15-20%. Your wealth-building trajectory is strong." : "The Swiss average savings rate is ~15-20%. Consider reviewing your expense allocations to increase this."}`,
      action: savingsRate >= 0.25 ? "Maintain current rate and focus on optimising investment allocation" : "Review expenses to find CHF 200-500/month to redirect to investments",
      impact: `CHF ${fmt(Math.round((sav + inv) * 12))}/year to wealth building`,
    });
  }

  // 5. Insurance cost check
  const krankenkasse = insurance.find(i => i.name.toLowerCase().includes("health insurance") || i.name.toLowerCase().includes("krankenkasse"));
  if (krankenkasse) {
    insights.push({ priority: "low", category: "insurance", icon: "check", title: "Health insurance optimised (max Franchise CHF 2'500)",
      detail: `Your health insurance (Krankenkasse) costs CHF ${fmtD(insMonthlyCalc(krankenkasse)*12)}/year with the maximum deductible (Franchise) of CHF 2'500 — the optimal choice if annual health costs stay below ~CHF 3'800. Your max out-of-pocket: CHF 2'500 (Franchise) + CHF 700 (Selbstbehalt 10% cap) = CHF 3'200/year.`,
      action: "Compare premiums annually on priminfo.admin.ch or comparis.ch before October 31 deadline", impact: "Ensure you're on the cheapest plan for the same coverage",
    });
  }

  // 6. Crypto allocation
  const cryptoAcct = accounts.find(a => a.type === "Crypto");
  const investAccts = accounts.filter(a => ["Investment", "Crypto"].includes(a.type));
  const totalInvested = investAccts.reduce((s, a) => s + a.balance, 0);
  if (cryptoAcct && totalInvested > 0) {
    const cryptoPct = (cryptoAcct.balance / totalInvested) * 100;
    if (cryptoPct < 2) {
      insights.push({ priority: "low", category: "investment", icon: "info", title: "Crypto allocation is minimal",
        detail: `Crypto is ${cryptoPct.toFixed(1)}% of your investment portfolio (CHF ${fmt(cryptoAcct.balance)} of CHF ${fmt(totalInvested)}). In Switzerland, crypto capital gains are tax-free for private investors — one of the most favorable crypto tax regimes globally.`,
        action: "Consider if your crypto allocation aligns with your risk tolerance", impact: "Tax-free upside potential",
      });
    }
  }

  // 7. Wealth tax planning
  if (totalWealth > 50000) {
    insights.push({ priority: "low", category: "tax", icon: "info", title: "Wealth tax planning (Vermogenssteuer)",
      detail: `Your net worth of CHF ${fmt(totalWealth)} is subject to Kanton Zurich wealth tax (Vermogenssteuer). The rate is progressive (~0.05-0.3%). Timing matters: the tax snapshot is taken on December 31st. Strategies include: making large purchases or BVG buy-ins before year-end.`,
      action: "Consider timing of large BVG buy-ins or asset purchases near year-end", impact: "Optimise Dec 31 snapshot for lower wealth tax",
    });
  }

  // 8. Debt load & loan interest deduction
  if (debtTotal > 0) {
    const grossAssets = totalWealth + debtTotal;
    const debtRatio = grossAssets > 0 ? debtTotal / grossAssets : 1;
    const priority = debtRatio > 0.5 ? "high" : debtRatio > 0.25 ? "medium" : "low";
    insights.push({ priority, category: "debt", icon: "alert",
      title: `Total debt: CHF ${fmt(debtTotal)} (${(debtRatio * 100).toFixed(0)}% of gross assets)`,
      detail: `${debtRatio > 0.5 ? "Your debt exceeds 50% of gross assets — prioritise debt reduction to strengthen your net worth." : "Your debt-to-asset ratio is manageable."} In Switzerland, all mortgage and loan interest is fully tax-deductible (Ziffer 250 on the tax return). Attach a Schuldenverzeichnis (debt schedule) with every creditor, outstanding balance, and interest paid during the year.`,
      action: debtRatio > 0.4 ? "Review debt repayment plan vs. investment return trade-off" : "Claim all loan/mortgage interest as a deduction (Ziffer 250)",
      impact: "Full interest deduction reduces taxable income — commonly missed",
    });
  }

  // 9. Withholding tax reclaim (Verrechnungssteuer / DA-1)
  if (totalInvested > 5000) {
    insights.push({ priority: "medium", category: "tax", icon: "tax",
      title: "Reclaim 35% withholding tax on dividends (DA-1)",
      detail: `You have CHF ${fmt(totalInvested)} in investment accounts. Swiss companies withhold 35% (Verrechnungssteuer) from dividends before paying them. As a Swiss resident you can reclaim 100% via form DA-1 (also partial reclaim on foreign dividends via double-taxation treaties). File the Wertschriftenverzeichnis (securities list) with your tax return — this triggers the refund automatically in ZHprivateTax.`,
      action: "Declare all securities in Wertschriftenverzeichnis and attach DA-1 to your tax return",
      impact: "Up to 35% of Swiss dividend income returned as a tax refund",
    });
  }

  return insights;
}

// ───────────────────────────────────────────────────────────────
// ACCOUNTS PAGE
// ───────────────────────────────────────────────────────────────
const DEFAULT_EXTRACTION_PROMPT = `You are a financial data extractor. Examine the attached file(s) carefully and extract the data.\n\nRespond with ONLY a raw JSON object — no explanation, no markdown, no code fences, no extra text before or after. Just the JSON.\n\nRequired JSON shape:\n{"accountBalance":null,"interestRate":null,"positions":[{"ticker":"","name":"","shares":0,"avgBuyPrice":0,"value":null}]}\n\nRules:\n- accountBalance: total account/portfolio value as a number, or null if not visible\n- interestRate: annual interest/savings rate as a percentage number (e.g. 1.5 for 1.5%), or null\n- positions: array of holdings. Use [] if none found.\n- ticker: Yahoo Finance symbol if available. Swiss ETFs use .SW suffix (e.g. IWDC.SW, CSSMI.SW, CHSPI.SW, EQQQ.SW, ZSIL.SW, ZGLD.SW, VUSD.SW, VWRL.SW). US stocks: AAPL, MSFT, NVDA, GOOGL, TSLA. Crypto: BTC-USD, ETH-USD. For proprietary tokens (e.g. Swissqoin/SWQ) or funds without a public ticker (e.g. Swiss 3a pillar funds like frankly, VIAC, finpension), leave ticker empty "".\n- name: full fund/product name as shown (e.g. "Developed World (iShares MSCI World CHF Hedged)")\n- shares: exact number of units/shares held as shown — preserve ALL decimal places (e.g. 63.6787, not 63.68). Use 0 only if not shown at all.\n- avgBuyPrice: average purchase price per unit (cost basis). If cost basis is not directly shown but you can see the gain% and current value, CALCULATE it: avgBuyPrice = currentValue / shares / (1 + gainPercent/100). If neither cost basis nor gain data is available, use 0.\n- value: total position value/market value as a number if shown (e.g. CHF 5457.26 → 5457.26), or null. This is especially important when shares/avgBuyPrice are not available.\n- IMPORTANT: Extract data from ALL images/pages. If multiple screenshots show different positions, combine them all into one positions array.`;

function AccountsPage({ accounts, setAccounts, hideBalances, onAccountsUpdated, extractionPrompt, setExtractionPrompt }) {
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
            <h3 style={{margin:'0 0 2px',fontSize:17,fontWeight:700,color:C.text}}>Import Preview — {accounts.find(a=>a.id===importPreview.accountId)?.name}</h3>
            <div style={{fontSize:12,color:C.textDim}}>Supported: PNG, JPG, PDF, CSV, XLSX · Select multiple files for multi-page statements</div>
          </div>
          <button onClick={()=>setImportPreview(null)} style={{background:'transparent',border:'none',cursor:'pointer',color:C.textDim}}><X size={18}/></button>
        </div>
        {importPreview.data ? <>
          {importPreview.data.accountBalance!=null && <div style={{marginBottom:10,fontSize:14,color:C.textMuted}}>Detected balance: <strong style={{color:C.text}}>CHF {fmt(importPreview.data.accountBalance)}</strong></div>}
          {importPreview.data.interestRate!=null && <div style={{marginBottom:10,fontSize:14,color:C.textMuted}}>Interest rate: <strong style={{color:C.green}}>{importPreview.data.interestRate}%</strong></div>}
          {(importPreview.data.positions||[]).length>0 && <>
            <div style={{fontSize:14,color:C.textMuted,marginBottom:8}}>Positions to import:</div>
            <table style={{width:'100%',borderCollapse:'collapse',marginBottom:16,fontSize:12}}>
              <thead><tr>
                {['','Ticker','Name','Shares','Avg Buy','Value'].map((h,i)=><th key={i} style={{padding:'6px 8px',textAlign:i>=3?'right':'left',fontSize:12,color:C.textDim,fontWeight:600,borderBottom:`1px solid ${C.border}`}}>{h}</th>)}
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
              Some positions have no ticker (proprietary funds). Add account notes via the <MessageSquarePlus size={11} style={{verticalAlign:'middle',margin:'0 2px'}}/> icon to help future imports — e.g. <em>"ETF-based 3a fund, no public ticker, use position value as balance"</em>.
              <button onClick={()=>{const acct=accounts.find(a=>a.id===importPreview.accountId);if(acct){const names=(importPreview.data.positions||[]).filter(p=>!p.ticker&&p.name).map(p=>p.name).join(', ');editAcct(acct.id,'instructions',(acct.instructions?acct.instructions+'\n':'')+'Proprietary funds (no market ticker): '+names+'. Use position value as balance.');setNotesOpen(prev=>{const n=new Set(prev);n.add(acct.id);return n;})}}} style={{display:'inline-block',marginLeft:8,padding:'3px 10px',borderRadius:6,border:`1px solid ${C.yellow}55`,background:C.yellow+'22',color:C.text,fontSize:12,fontWeight:600,cursor:'pointer'}}>Auto-add notes</button>
            </div>
          )}
          <div style={{display:'flex',gap:8,justifyContent:'space-between',alignItems:'center'}}>
            <div style={{display:'flex',gap:4,alignItems:'center',fontSize:12}}>
              <button onClick={()=>setImportMode('replace')} style={{padding:'5px 12px',borderRadius:6,border:`1px solid ${importMode==='replace'?C.accent:C.border}`,background:importMode==='replace'?C.accent+'22':'transparent',color:importMode==='replace'?C.accentLight:C.textDim,fontSize:13,fontWeight:importMode==='replace'?600:400,cursor:'pointer'}}>Replace all</button>
              <button onClick={()=>setImportMode('merge')} style={{padding:'5px 12px',borderRadius:6,border:`1px solid ${importMode==='merge'?C.accent:C.border}`,background:importMode==='merge'?C.accent+'22':'transparent',color:importMode==='merge'?C.accentLight:C.textDim,fontSize:13,fontWeight:importMode==='merge'?600:400,cursor:'pointer'}}>Merge</button>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setImportPreview(null)} style={{padding:'8px 16px',borderRadius:8,border:`1px solid ${C.border}`,background:'transparent',color:C.textMuted,fontSize:14,cursor:'pointer'}}>Cancel</button>
              <button onClick={confirmAcctImport} style={{padding:'8px 16px',borderRadius:8,border:'none',background:C.accent,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer'}}>Confirm Import</button>
            </div>
          </div>
        </> : <>
          <div style={{marginBottom:10,fontSize:14,color:C.textMuted}}>Could not parse structured data. Raw AI response:</div>
          <pre style={{background:C.bg,padding:12,borderRadius:8,fontSize:12,color:C.text,overflowX:'auto',maxHeight:300,overflowY:'auto',whiteSpace:'pre-wrap'}}>{importPreview.rawText}</pre>
          <button onClick={()=>setImportPreview(null)} style={{marginTop:12,padding:'8px 16px',borderRadius:8,border:`1px solid ${C.border}`,background:'transparent',color:C.textMuted,fontSize:14,cursor:'pointer'}}>Close</button>
        </>}
      </div>
    </div>}
    <input type="file" ref={acctImportRef} style={{display:'none'}} accept=".csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.webp,.gif" multiple onChange={handleAcctImport}/>

    {extractionPromptOpen && <div onClick={()=>setExtractionPromptOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,width:'100%',maxWidth:1140,maxHeight:'84vh',overflowY:'auto',padding:28,boxShadow:'0 24px 80px rgba(0,0,0,0.6)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
          <h2 style={{margin:0,fontSize:18,fontWeight:700,color:C.text}}>File Extraction Prompt</h2>
          <button onClick={()=>setExtractionPromptOpen(false)} style={{background:'transparent',border:'none',cursor:'pointer',color:C.textDim}}><X size={18}/></button>
        </div>
        <p style={{margin:'0 0 12px',fontSize:13,color:C.textDim}}>
          Customise the AI prompt used when importing files into accounts. Leave blank to use the built-in default.
          Account type and per-account instructions are always appended automatically.
        </p>
        <div style={{display:'flex',gap:8,marginBottom:10}}>
          <button onClick={()=>setExtractionPrompt(DEFAULT_EXTRACTION_PROMPT)}
            style={{padding:'6px 12px',borderRadius:6,border:`1px solid ${C.border}`,background:'transparent',color:C.textMuted,fontSize:13,cursor:'pointer'}}>
            Load default
          </button>
          <button onClick={()=>setExtractionPrompt('')}
            style={{padding:'6px 12px',borderRadius:6,border:`1px solid ${C.border}`,background:'transparent',color:C.textMuted,fontSize:13,cursor:'pointer'}}>
            Reset to blank
          </button>
        </div>
        <textarea
          value={extractionPrompt}
          onChange={e=>setExtractionPrompt(e.target.value)}
          placeholder="Leave blank to use the built-in default extraction prompt…"
          rows={28}
          style={{width:'100%',padding:'10px 12px',borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,
            fontSize:13,outline:'none',resize:'vertical',boxSizing:'border-box',fontFamily:"'DM Mono',monospace",lineHeight:1.5}}
        />
        {extractionPrompt && <div style={{marginTop:6,fontSize:12,color:C.green}}>✓ Custom extraction prompt active — will be used instead of the default.</div>}
        <button onClick={()=>setExtractionPromptOpen(false)} style={{width:'100%',padding:'11px',borderRadius:8,border:'none',background:C.accent,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',marginTop:12}}>
          Save & Close
        </button>
      </div>
    </div>}

    <Card title="Account Balances" headerRight={
      <button onClick={()=>setExtractionPromptOpen(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 10px',borderRadius:6,border:`1px solid ${C.border}`,background:'transparent',cursor:'pointer',color:extractionPrompt?C.accentLight:C.textMuted,fontSize:12}}>
        <Sparkles size={12}/>Extraction Prompt{extractionPrompt?' ✓':''}
      </button>
    }>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:isMobile?560:undefined}}><thead><tr>
        <SortTH col="name">Account</SortTH>
        {!isMobile && <SortTH col="institution">Institution</SortTH>}
        <SortTH col="type">Type</SortTH>
        <SortTH col="balance">Balance</SortTH>
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
              {ACCT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
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
                title="Edit login URL and AI notes"
                style={{background:'transparent',border:'none',cursor:'pointer',padding:3,display:'flex',alignItems:'center',
                  color:(a.instructions||a.loginUrl) ? C.accentLight : C.textDim}}>
                <MessageSquarePlus size={13}/>
              </button>
              <button onClick={()=>triggerAcctImport(a.id)} disabled={importingAcctId===a.id}
                title="Supported: PNG, JPG, PDF, CSV, XLSX"
                style={{display:'flex',alignItems:'center',gap:4,padding:'4px 8px',borderRadius:6,border:`1px solid ${C.border}`,background:'transparent',cursor:importingAcctId===a.id?'not-allowed':'pointer',color:importingAcctId===a.id?C.textDim:C.textMuted,fontSize:12,whiteSpace:'nowrap'}}>
                {importingAcctId===a.id
                  ? <><RefreshCw size={12} style={{animation:'spin 1s linear infinite'}}/>Parsing…</>
                  : <><Upload size={12}/>Import</>}
              </button>
              <DelBtn onClick={()=>delAcct(a.id)}/>
            </div>
          </td>
        </tr>
        {notesOpen.has(a.id) && <tr key={`${a.id}-notes`}>
          <td colSpan={isMobile?4:5} style={{padding:'0 12px 12px',borderBottom:`1px solid ${C.border}11`}}>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:10}}>
              <div>
                <div style={{fontSize:10,fontWeight:600,color:C.textDim,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:4}}>Login URL</div>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <input
                    value={a.loginUrl||''}
                    onChange={e=>editAcct(a.id,'loginUrl',e.target.value)}
                    placeholder="https://…"
                    style={{flex:1,padding:'6px 10px',borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,
                      fontSize:13,outline:'none',boxSizing:'border-box',fontFamily:'inherit',minWidth:0}}
                  />
                  {a.loginUrl && <a href={a.loginUrl} target="_blank" rel="noopener noreferrer"
                    style={{display:'flex',alignItems:'center',gap:3,padding:'6px 10px',borderRadius:8,border:`1px solid ${C.accentLight}44`,
                      background:C.accentLight+'15',color:C.accentLight,fontSize:12,fontWeight:600,textDecoration:'none',whiteSpace:'nowrap',flexShrink:0}}>
                    <ExternalLink size={11}/>Open
                  </a>}
                </div>
              </div>
              <div>
                <div style={{fontSize:10,fontWeight:600,color:C.textDim,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:4}}>AI Notes</div>
                <textarea
                  value={a.instructions||''}
                  onChange={e=>editAcct(a.id,'instructions',e.target.value)}
                  placeholder="e.g. 'ESPP: 15% discount applied' or 'ETF-based 3a, no public ticker'"
                  rows={2}
                  style={{width:'100%',padding:'6px 10px',borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,
                    fontSize:13,outline:'none',resize:'vertical',boxSizing:'border-box',fontFamily:'inherit'}}
                />
                <div style={{fontSize:10,color:C.textDim,marginTop:2}}>Included in every AI conversation and file import for this account.</div>
              </div>
            </div>
          </td>
        </tr>}
        </React.Fragment>;
      })}
      <tr style={{background:C.bg}}><td style={{padding:"10px 12px",fontWeight:700}} colSpan={isMobile?2:3}>Total</td><td style={{padding:"10px 12px",textAlign:"right",fontWeight:700,fontSize:17,color:C.accent}}>{mask(fmt(totalWealth))}</td><td/></tr>
      <AddRow onClick={addAcct} label="Add account" colSpan={isMobile?4:5}/>
      </tbody></table></div>
    </Card>
  </div>;
}

// ───────────────────────────────────────────────────────────────
// ONBOARDING CHECKLIST
// ───────────────────────────────────────────────────────────────
function OnboardingChecklist({ accounts, scenarios, subsP, yearly, profile, onboarding, setOnboarding, setPage, setProfileOpen, setPromptOpen, onClearAll }) {
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
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Getting Started</h3>
      </div>
      <button onClick={() => setOnboarding(o => ({ ...o, dismissed: true }))}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.textDim, fontSize: 12 }}>Dismiss</button>
    </div>

    {/* Progress bar */}
    {!allOneTimeDone && <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.textMuted, marginBottom: 6 }}>
        <span>Setup progress</span>
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
              <span style={{ fontSize: 14, fontWeight: 600, color: done ? C.textDim : C.text }}>{step.label}</span>
              {!done && step.badge === 'import' && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: C.blue + '22', color: C.blue, fontWeight: 600, letterSpacing: 0.3 }}>AI Import</span>}
              {!done && step.badge === 'prompt' && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: C.accentLight + '22', color: C.accentLight, fontWeight: 600, letterSpacing: 0.3 }}>Prompt</span>}
            </div>
            <div style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>{step.desc}</div>
          </div>
          {!done && step.id === 'clearData' ? (
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => { onClearAll && onClearAll('skip'); setOnboarding(o => ({ ...o, dataCleared: true })); }}
                style={{ padding: '5px 14px', borderRadius: 6, border: `1px solid ${C.accent}44`, background: C.accent + '18', color: C.accentLight, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Clear</button>
              <button onClick={() => setOnboarding(o => ({ ...o, dataCleared: true }))}
                style={{ padding: '5px 14px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.textDim, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Skip</button>
            </div>
          ) : !done && (
            <button onClick={() => handleAction(step)}
              style={{ padding: '5px 14px', borderRadius: 6, border: `1px solid ${C.accent}44`, background: C.accent + '18', color: C.accentLight, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {step.action === 'ack' ? 'Got it' : step.action === 'prompt' ? 'Review' : step.action === 'backup' ? 'Download' : 'Go'}
            </button>
          )}
        </div>;
      })}
    </div>}

    {/* Monthly tasks */}
    {(allOneTimeDone || recurringSteps.some(s => !isComplete(s))) && <div>
      {!allOneTimeDone && <div style={{ borderTop: `1px solid ${C.border}`, marginBottom: 12 }} />}
      <div style={{ fontSize: 13, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Monthly Tasks</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {recurringSteps.map(step => {
          const done = isComplete(step);
          const Icon = step.icon;
          return <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, background: done ? 'transparent' : C.bg, opacity: done ? 0.5 : 1 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: done ? C.green + '22' : C.orange + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {done ? <Check size={14} color={C.green} /> : <Icon size={14} color={C.orange} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: done ? C.textDim : C.text }}>{step.label}</div>
              <div style={{ fontSize: 12, color: C.textDim, marginTop: 1 }}>{step.desc}</div>
            </div>
            {!done && <button onClick={() => handleAction(step)}
              style={{ padding: '5px 14px', borderRadius: 6, border: `1px solid ${C.orange}44`, background: C.orange + '18', color: C.orange, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              Go
            </button>}
          </div>;
        })}
      </div>
    </div>}
  </div>;
}

// DASHBOARD
// ───────────────────────────────────────────────────────────────
function Dashboard({ accounts, scenarios, subsP, subsPInScenario, yearly, taxes, insurance, profile, hideBalances, setChatOpen, setChatInput, notesVersion }) {
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
    accounts, scenarios, insurance, inc, exp, sav, inv, liquidTotal, lockedTotal, totalWealth, debtTotal,
  }), [accounts, scenarios, insurance, inc, exp, sav, inv, liquidTotal, lockedTotal, totalWealth, debtTotal]);

  return <div>
    {/* Net Worth headline with liquid/locked bar */}
    <Card style={{marginBottom:24,padding:"24px 28px"}}>
      <div style={{display:"flex",alignItems:isMobile?"flex-start":"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:isMobile?12:0}}>
        <div>
          <div style={{fontSize:14,color:C.textMuted,marginBottom:4}}>Net Worth{debtTotal>0&&<span style={{fontSize:11,color:C.textDim,marginLeft:6}}>(assets − debt)</span>}</div>
          <div style={{fontSize:isMobile?24:32,fontWeight:700,color:totalWealth>=0?C.text:C.red}}>CHF {mask(fmt(totalWealth))}</div>
        </div>
        <div style={{display:"flex",gap:isMobile?16:24,alignItems:"flex-end",flexWrap:"wrap"}}>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:12,color:C.textDim,marginBottom:2}}>Liquid</div>
            <div style={{fontSize:20,fontWeight:700,color:C.green}}>CHF {mask(fmt(liquidTotal))}</div>
            <div style={{fontSize:12,color:C.textDim}}>{liquidPct}% of total</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:12,color:C.textDim,marginBottom:2}}>Locked (Pension + Deposit)</div>
            <div style={{fontSize:20,fontWeight:700,color:C.blue}}>CHF {mask(fmt(lockedTotal))}</div>
            <div style={{fontSize:12,color:C.textDim}}>{lockedPct}% of total</div>
          </div>
          {loanTotal > 0 && <div style={{textAlign:"right"}}>
            <div style={{fontSize:12,color:C.textDim,marginBottom:2}}>Lent Out</div>
            <div style={{fontSize:20,fontWeight:700,color:C.orange}}>CHF {mask(fmt(loanTotal))}</div>
            <div style={{fontSize:12,color:C.textDim}}>{totalAssets>0?((loanTotal/totalAssets)*100).toFixed(0):0}% of assets</div>
          </div>}
          {debtTotal > 0 && <div style={{textAlign:"right"}}>
            <div style={{fontSize:12,color:C.textDim,marginBottom:2}}>Debt</div>
            <div style={{fontSize:20,fontWeight:700,color:C.red}}>−CHF {mask(fmt(debtTotal))}</div>
            <div style={{fontSize:12,color:C.textDim}}>{totalAssets>0?((debtTotal/totalAssets)*100).toFixed(0):0}% of assets</div>
          </div>}
        </div>
      </div>
      {/* Stacked bar showing composition */}
      <div style={{display:"flex",height:8,borderRadius:4,overflow:"hidden",background:C.border}}>
        {liquidTotal > 0 && <div style={{width:`${liquidPct}%`,background:C.green,transition:"width .3s"}} title={`Liquid: CHF ${fmt(liquidTotal)}`}/>}
        {lockedTotal > 0 && <div style={{width:`${lockedPct}%`,background:C.blue,transition:"width .3s"}} title={`Locked: CHF ${fmt(lockedTotal)}`}/>}
        {loanTotal > 0 && <div style={{width:`${totalAssets>0?((loanTotal/totalAssets)*100).toFixed(0):0}%`,background:C.orange,transition:"width .3s"}} title={`Lent Out: CHF ${fmt(loanTotal)}`}/>}
        {debtTotal > 0 && <div style={{width:`${debtPct}%`,background:C.red,transition:"width .3s"}} title={`Debt: CHF ${fmt(debtTotal)}`}/>}
      </div>
      <div style={{display:"flex",gap:16,marginTop:8}}>
        <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.textDim}}><div style={{width:8,height:8,borderRadius:2,background:C.green}}/>Liquid</div>
        <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.textDim}}><div style={{width:8,height:8,borderRadius:2,background:C.blue}}/>Locked</div>
        {loanTotal > 0 && <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.textDim}}><div style={{width:8,height:8,borderRadius:2,background:C.orange}}/>Lent Out</div>}
        {debtTotal > 0 && <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.textDim}}><div style={{width:8,height:8,borderRadius:2,background:C.red}}/>Debt</div>}
      </div>
    </Card>

    {/* Row 1: Income & Scenario overview */}
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16, marginBottom:16 }}>
      <StatCard label="Total Monthly Income" value={`CHF ${mask(fmt(Math.round(inc)))}`} sub={sc?`from ${sc.name}`:"no active scenario"} icon={DollarSign} color={C.green}/>
      <StatCard label="Savings Rate" value={inc>0?`${Math.round((sav+inv)/inc*100)}%`:"—"} sub={inc>0?`CHF ${mask(fmt(Math.round(sav+inv)))}/mo saved`:"no active scenario"} icon={PiggyBank} color={C.teal}/>
      <StatCard label="Active Scenario" value={sc?sc.name:"None"} sub={sc?`${sc.incomes.length} income${sc.incomes.length!==1?'s':''} · ${sc.expenses.length} expense${sc.expenses.length!==1?'s':''}`:"set a scenario active"} icon={Activity} color={C.accent}/>
    </div>

    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16, marginBottom:24 }}>
      <StatCard label="Monthly Savings + Invest" value={`CHF ${mask(fmt(Math.round(sav+inv)))}`} sub={sc?`from ${sc.name}`:"no active scenario"} icon={TrendingUp} color={C.teal}/>
      <StatCard label="Monthly Fixed Costs" value={`CHF ${mask(fmt(Math.round(essentialTotal)))}`} sub={sc?`Essential expenses + savings (excl. investments)`:"no active scenario"} icon={CreditCard} color={C.red}/>
      {sc ? (() => {
        const allocated = rem === 0;
        const over = rem < 0;
        const subText = allocated ? "Zero-Budget achieved" : over ? "Exceeds income" : `${inc>0?((inc-rem)/inc*100).toFixed(1):0}% allocated`;
        return <StatCard label="Unallocated" value={`CHF ${mask(fmt(Math.abs(rem)))}${over?" over":""}`} sub={subText} icon={Target} color={C.yellow}/>;
      })() : <StatCard label="Unallocated" value="—" sub="no active scenario" icon={Target} color={C.yellow}/>}
      <StatCard label="Survival Runway" value={sc?`${survivalMonths} months`:"—"} sub={sc?`Liquid CHF ${mask(fmt(liquidTotal))} ÷ CHF ${mask(fmt(Math.round(essentialTotal)))}/mo`:"no active scenario"} icon={Shield} color={survivalMonths>=6?C.green:survivalMonths>=3?C.yellow:C.red} iconColor={C.cyan}/>
      <StatCard label="Tax + Insurance" value={`CHF ${mask(fmt(Math.round(linkedTax+linkedInsurance)))}/mo`} sub={`CHF ${mask(fmt(Math.round((linkedTax+linkedInsurance)*12)))}/yr`} icon={ShieldCheck} color={C.red}/>
    </div>

    <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(auto-fit,minmax(300px,1fr))", gap:16, marginBottom:24 }}>
      <Card title="Portfolio Breakdown">
        <ResponsiveContainer width="100%" height={isMobile?200:280}><PieChart><Pie data={pieData} cx="50%" cy="50%" outerRadius={100} innerRadius={55} dataKey="value" paddingAngle={2} stroke="none">{pieData.map((_,i)=><Cell key={i} fill={pieColors()[i%pieColors().length]}/>)}</Pie><Tooltip formatter={v=>`CHF ${fmt(v)}`} contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13}} labelStyle={{color:C.textMuted}} itemStyle={{color:C.text}}/></PieChart></ResponsiveContainer>
        {pieData.map((d,i)=>{const total=pieData.reduce((s,x)=>s+x.value,0); return <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"5px 0",borderBottom:i<pieData.length-1?`1px solid ${C.border}22`:"none"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:10,height:10,borderRadius:3,background:pieColors()[i%pieColors().length],flexShrink:0}}/><span style={{fontSize:13,color:C.textMuted}}>{d.name}</span></div>
          <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:13,fontWeight:600,color:C.text,fontVariantNumeric:"tabular-nums"}}>CHF {mask(fmt(d.value))}</span><span style={{fontSize:12,color:C.textDim,width:40,textAlign:"right"}}>{total>0?(d.value/total*100).toFixed(1):0}%</span></div>
        </div>})}
      </Card>
      <Card title="Monthly Cashflow" subtitle={sc?`Active: ${sc.name}`:"No active scenario"}>
        {sc && <>
          <ResponsiveContainer width="100%" height={200}><BarChart data={[{name:"Income",value:inc,fill:C.green},{name:"Expenses",value:exp,fill:C.red},{name:"Savings",value:sav,fill:C.blue},{name:"Investments",value:inv,fill:C.teal}]} layout="vertical" margin={{left:80}}><XAxis type="number" tick={{fill:C.textDim,fontSize:11}} tickFormatter={v=>hideBalances?"•••":fmt(v)}/><YAxis type="category" dataKey="name" tick={{fill:C.textMuted,fontSize:12}} width={80}/><Tooltip formatter={v=>`CHF ${fmt(v)}`} contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13}} labelStyle={{color:C.textMuted}} itemStyle={{color:C.text}}/><Bar dataKey="value" radius={[0,6,6,0]}>{[C.green,C.red,C.blue,C.teal].map((c,i)=><Cell key={i} fill={c}/>)}</Bar></BarChart></ResponsiveContainer>
          <div style={{marginTop:12,padding:"12px 16px",background:C.bg,borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13}}><span style={{color:C.textMuted}}>Unallocated</span><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{color:rem===0?C.green:rem<0?C.red:C.yellow,fontWeight:600}}>CHF {mask(fmt(rem))}</span>{rem===0&&<Check size={12} color={C.green}/>}</div></div>
        </>}
      </Card>
    </div>

    {/* Smart Recommendations */}
    <Card headerRight={<Badge color={C.cyan}>Rule-based</Badge>}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <div style={{width:36,height:36,borderRadius:10,background:C.cyan+"1a",display:"flex",alignItems:"center",justifyContent:"center"}}><Sparkles size={20} color={C.cyan}/></div>
        <div>
          <h3 style={{margin:0,fontSize:17,fontWeight:700,color:C.text}}>Smart Recommendations</h3>
          <p style={{margin:0,fontSize:13,color:C.textDim}}>Swiss-specific financial insights based on your portfolio</p>
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
                <div style={{display:"flex",gap:4,marginTop:2}}><Badge color={prioColor}>{ins.priority}</Badge><Badge color={C.textDim}>{CATEGORY_LABELS[ins.category] || ins.category}</Badge></div>
              </div>
            </div>
            <p style={{fontSize:13,color:C.textMuted,lineHeight:1.6,margin:"0 0 10px"}}>{ins.detail}</p>
            {ins.impact && <div style={{fontSize:12,color:C.green,fontWeight:600,marginBottom:6}}>Impact: {ins.impact}</div>}
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
          <h3 style={{margin:0,fontSize:17,fontWeight:700,color:C.text}}>AI Finance Advisor</h3>
          <p style={{margin:0,fontSize:13,color:C.textDim}}>Click a question to open the advisor, or type your own</p>
        </div>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
        {[
          { q: "Give me a complete financial health check", color: C.accent },
          { q: "Am I on track for early retirement (FIRE)?", color: C.teal },
          { q: "How can I optimise my Swiss taxes?", color: C.yellow },
          { q: "What are my top 3 financial risks right now?", color: C.red },
          { q: "How long is my survival runway if I lose income?", color: C.orange },
          { q: "How should I allocate my next savings?", color: C.green },
        ].map(({ q, color }) => (
          <button key={q} onClick={() => { setChatInput && setChatInput(q); setChatOpen && setChatOpen(true); }}
            style={{padding:"10px 16px",borderRadius:8,border:`1px solid ${color}44`,background:color+'18',color,fontSize:14,cursor:"pointer",textAlign:"left",lineHeight:1.4}}>
            {q}
          </button>
        ))}
      </div>
    </Card>
    <PinnedNotes version={notesVersion}/>
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

function PinnedNotes({ version = 0 }) {
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
        <Pin size={14}/> Pinned Analyses — click to expand
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

function ScenariosPage({ scenarios, setScenarios, subsP, subsPInScenario, yearly, taxes, insurance, hideBalances, darkMode, payrollExtractionPrompt, setPayrollExtractionPrompt }) {
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
      <div style={{fontSize:18,fontWeight:600,color:C.text}}>No scenarios yet</div>
      <div style={{fontSize:14}}>Create your first financial scenario to get started.</div>
      <button onClick={()=>{ const n={id:uid(),name:"New Scenario",tags:[],isActive:true,incomes:[],expenses:[],savings:[],investments:[],linkedOverrides:{}}; setScenarios([n]); setSelId(n.id); }} style={{padding:"10px 20px",borderRadius:8,background:C.accent,color:"#fff",border:"none",cursor:"pointer",fontSize:14,fontWeight:600}}>+ Add Scenario</button>
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
  const freqLabel = f => f===1?'/mo':f===4?'/qt':f===12?'/yr':`/${f}`;
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
  const flow=[{name:"Expenses",value:Math.max(0,totalExp),pct:totalExp/inc,color:C.red},{name:"Savings",value:Math.max(0,sav),pct:sav/inc,color:C.blue},{name:"Investments",value:Math.max(0,inv),pct:inv/inc,color:C.teal},{name:"Unallocated",value:Math.max(0,rem),pct:rem/inc,color:C.yellow}];

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
  const addScenario = () => { const n = { id:uid(), name:"New Scenario", tags:[], isActive:false, incomes:[], expenses:[], savings:[], investments:[], linkedOverrides:{} }; setScenarios(p=>[...p,n]); setSelId(n.id); };
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
    drawSection("INCOME", green, "+", inc, incomeItems, "+");
    drawSection("EXPENSES", red, "-", exp, expenseItems, "-");
    drawSection("PROVISIONS", red, "-", linkedTotal, linkedItems, "-");
    drawSection("SAVINGS", blue, ">", sav, savingsItems, ">");
    drawSection("INVESTMENTS", teal, ">", inv, investItems, ">");

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
    doc.text("= UNALLOCATED", M + 4, summaryY);
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
            <td style={{padding:"7px 12px",fontSize:13,color:C.textDim,borderBottom:`1px solid ${C.border}11`}}><InlineEdit value={item.notes||""} onChange={v=>editLine(section,item.id,"notes",v)} placeholder="notes..." style={{color:C.textDim}} inputWidth={100}/></td>
            <td style={{padding:"7px 12px",fontSize:14,textAlign:"right",fontVariantNumeric:"tabular-nums",borderBottom:`1px solid ${C.border}11`}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:5}}>
                {isPct && <InlineNum value={item.pct} onChange={v=>editLine(section,item.id,"pct",v??0)} width={50} style={{fontSize:12,color:C.accent,fontWeight:600}}/>}
                {isPct && <span style={{fontSize:12,color:C.accent,marginRight:2}}>%</span>}
                {isPct
                  ? <span style={{color:C.textMuted,fontSize:12}}>{mask(fmtD(computed))}</span>
                  : hideBalances ? <span style={{color:C.text,fontSize:13}}>••••</span> : <InlineNum value={item.amount} onChange={v=>editLine(section,item.id,"amount",v??0)}/>
                }
                <button onClick={()=>togglePct(section,item.id)} title={isPct?"Switch to fixed CHF amount":"Switch to % of income"} style={{padding:"2px 8px",borderRadius:9999,border:`1px solid ${isPct?C.accent:C.border}`,background:isPct?C.accent+"18":"transparent",color:isPct?C.accent:C.textDim,fontSize:9,cursor:"pointer",whiteSpace:"nowrap",fontWeight:600}}>{isPct?"% of inc":"CHF"}</button>
                {(section==="expenses"||section==="savings") && <button onClick={()=>{const next=(item.essential!==false)?false:true; editLine(section,item.id,"essential",next);}} title={item.essential!==false?"Essential — click to mark as non-essential":"Non-essential — click to mark as essential"} style={{padding:"2px 8px",borderRadius:9999,border:`1px solid ${item.essential!==false?C.green:C.textDim}`,background:(item.essential!==false?C.green:C.textDim)+"18",color:item.essential!==false?C.green:C.textDim,fontSize:9,cursor:"pointer",fontWeight:600}}>{item.essential!==false?"Essential":"Optional"}</button>}
                {(section==="savings"||section==="investments") && <button onClick={()=>{const next=(item.liq||"liquid")==="liquid"?"locked":"liquid"; editLine(section,item.id,"liq",next);}} title={item.liq==="locked"?"Locked — click to mark as liquid":"Liquid — click to mark as locked"} style={{padding:"2px 8px",borderRadius:9999,border:`1px solid ${item.liq==="locked"?C.orange:C.teal}`,background:(item.liq==="locked"?C.orange:C.teal)+"18",color:item.liq==="locked"?C.orange:C.teal,fontSize:9,cursor:"pointer",fontWeight:600}}>{(item.liq||"liquid")==="locked"?"Locked":"Liquid"}</button>}
              </div>
            </td>
          </tr>
          );
        })}
        <AddRow onClick={()=>addLine(section)} label={`Add ${title.toLowerCase()} item`} colSpan={3}/>
      </tbody></table>
    </div>
  );

  return <div>
    <input type="file" ref={payrollImportRef} style={{display:'none'}} accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.xlsx,.xls" multiple onChange={handlePayrollImport}/>

    {/* Payroll extraction prompt modal */}
    {payrollPromptOpen && <div onClick={()=>setPayrollPromptOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,width:'100%',maxWidth:1140,maxHeight:'84vh',overflowY:'auto',padding:28,boxShadow:'0 24px 80px rgba(0,0,0,0.6)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
          <h2 style={{margin:0,fontSize:18,fontWeight:700,color:C.text}}>Payroll Extraction Prompt</h2>
          <button onClick={()=>setPayrollPromptOpen(false)} style={{background:'transparent',border:'none',cursor:'pointer',color:C.textDim}}><X size={18}/></button>
        </div>
        <p style={{margin:'0 0 12px',fontSize:13,color:C.textDim}}>
          Customise the AI prompt used when importing payroll files into scenarios. Leave blank to use the built-in default.
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
          placeholder="Leave blank to use the built-in default payroll extraction prompt…"
          rows={28}
          style={{width:'100%',padding:'10px 12px',borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,
            fontSize:13,outline:'none',resize:'vertical',boxSizing:'border-box',fontFamily:"'DM Mono',monospace",lineHeight:1.5}}
        />
        {payrollExtractionPrompt && <div style={{marginTop:6,fontSize:12,color:C.green}}>✓ Custom extraction prompt active — will be used instead of the default.</div>}
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
            <h3 style={{margin:'0 0 2px',fontSize:17,fontWeight:700,color:C.text}}>Payroll Import Preview</h3>
            <div style={{fontSize:12,color:C.textDim}}>Review extracted data before applying to a scenario</div>
          </div>
          <button onClick={()=>setPayrollPreview(null)} style={{background:'transparent',border:'none',cursor:'pointer',color:C.textDim}}><X size={18}/></button>
        </div>
        {payrollPreview.data ? <>
          <div style={{marginBottom:16}}>
            <label style={{fontSize:12,color:C.textDim,fontWeight:600,textTransform:'uppercase',letterSpacing:0.5}}>Scenario name</label>
            <input value={payrollPreview.data.scenarioName||''} onChange={e=>setPayrollPreview(p=>({...p,data:{...p.data,scenarioName:e.target.value}}))}
              style={{display:'block',width:'100%',marginTop:4,padding:'7px 10px',borderRadius:6,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:14,outline:'none',boxSizing:'border-box'}}/>
          </div>
          {[['incomes','Incomes',C.green],['expenses','Expenses',C.red],['savings','Savings',C.blue]].map(([key,label,color])=>{
            const items = payrollPreview.data[key]||[];
            if(!items.length) return null;
            return <div key={key} style={{marginBottom:14}}>
              <div style={{fontSize:13,fontWeight:600,color,marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>{label}</div>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead><tr>
                  {['Label','Rate / Amount','Notes'].map((h,i)=><th key={i} style={{padding:'5px 8px',textAlign:i===1?'right':'left',fontSize:12,color:C.textDim,fontWeight:600,borderBottom:`1px solid ${C.border}`}}>{h}</th>)}
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
            {[['new','Create new scenario'],['append','Append to current']].map(([m,lbl])=>(
              <button key={m} onClick={()=>setPayrollImportMode(m)}
                style={{flex:1,padding:'8px',borderRadius:8,border:`1px solid ${payrollImportMode===m?C.accent:C.border}`,background:payrollImportMode===m?C.accent+'18':'transparent',color:payrollImportMode===m?C.accentLight:C.textMuted,fontSize:13,cursor:'pointer',fontWeight:payrollImportMode===m?600:400}}>
                {lbl}
              </button>
            ))}
          </div>
          <button onClick={confirmPayrollImport} style={{width:'100%',padding:'11px',borderRadius:8,border:'none',background:C.accent,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer'}}>
            {payrollImportMode==='new'?'Create Scenario':'Add to Current Scenario'}
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
            {!s.isActive && si>1 && <button onClick={e=>{e.stopPropagation();move(-1);}} title="Move left" style={{background:"transparent",border:"none",cursor:"pointer",color:C.textDim,padding:"1px 2px",fontSize:10}}>◀</button>}
            {!s.isActive && si<arr.length-1 && <button onClick={e=>{e.stopPropagation();move(1);}} title="Move right" style={{background:"transparent",border:"none",cursor:"pointer",color:C.textDim,padding:"1px 2px",fontSize:10}}>▶</button>}
          </div>
          {selId===s.id && !s.isActive && <ScenarioDelBtn onDelete={()=>deleteScenario(s.id)}/>}
        </div>
        );
      })}
      <button onClick={addScenario} style={{padding:"10px 16px",borderRadius:10,border:`2px dashed ${C.border}`,background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",gap:6,color:C.textDim,fontSize:13}}><Plus size={16}/>New Scenario</button>
      <button onClick={()=>payrollImportRef.current?.click()} disabled={payrollImporting}
        title="Import payroll PDF/image to populate a scenario"
        style={{padding:"10px 16px",borderRadius:10,border:`1px solid ${C.border}`,background:"transparent",cursor:payrollImporting?'not-allowed':'pointer',display:"flex",alignItems:"center",gap:6,color:payrollImporting?C.textDim:C.textMuted,fontSize:13}}>
        {payrollImporting ? <><RefreshCw size={14} style={{animation:'spin 1s linear infinite'}}/>Parsing…</> : <><Upload size={14}/>Import Payroll</>}
      </button>
      <button onClick={()=>setPayrollPromptOpen(true)}
        style={{padding:"10px 16px",borderRadius:10,border:`1px solid ${payrollExtractionPrompt?C.accent:C.border}`,background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",gap:6,color:payrollExtractionPrompt?C.accentLight:C.textDim,fontSize:13}}>
        <Sparkles size={14}/>Extraction Prompt{payrollExtractionPrompt?' ✓':''}
      </button>
    </div>
    {sc && <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"2fr 1fr",gap:16}}>
      <Card headerRight={<div style={{display:"flex",gap:6}}>
        <button onClick={()=>toggleActive(sc.id)} style={{padding:"6px 12px",borderRadius:6,border:`1px solid ${sc.isActive?C.green:C.border}`,background:sc.isActive?C.greenBg:"transparent",color:sc.isActive?C.green:C.textMuted,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><Power size={14}/>{sc.isActive?"Active":"Set Active"}</button>
        <button onClick={duplicateScenario} style={{padding:"6px 12px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.textMuted,fontSize:13,cursor:"pointer"}}>Duplicate</button>
        <button onClick={exportPDF} style={{padding:"6px 12px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.textMuted,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><Download size={13}/>PDF</button>
      </div>}>
        <div style={{marginBottom:16}}>
          <InlineEdit value={sc.name} onChange={v=>update(sc.id,s=>{s.name=v;return s;})} style={{fontSize:18,fontWeight:700,color:C.text}}/>
          <div style={{display:"flex",gap:4,marginTop:8,alignItems:"center"}}>
            {sc.tags.map(t=><Badge key={t} color={C.textDim} onRemove={()=>removeTag(t)}>{t}</Badge>)}
            {addingTag ? <span style={{display:"inline-flex",alignItems:"center",gap:4}}><input autoFocus value={newTag} onChange={e=>setNewTag(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")confirmTag();if(e.key==="Escape")cancelTag();}} placeholder="tag name" style={{padding:"2px 6px",borderRadius:6,border:`1px solid ${C.accent}`,background:C.bg,color:C.text,fontSize:12,width:80,outline:"none"}}/><button onClick={confirmTag} style={{padding:"2px 6px",borderRadius:6,border:"none",background:C.accent,color:"#fff",fontSize:12,cursor:"pointer"}}>Add</button><button onClick={cancelTag} style={{padding:"2px 6px",borderRadius:6,border:"none",background:"transparent",color:C.textDim,fontSize:12,cursor:"pointer"}}>×</button></span> : <button onClick={addTag} style={{padding:"2px 8px",borderRadius:9999,border:`1px dashed ${C.border}`,background:"transparent",color:C.textDim,fontSize:12,cursor:"pointer"}}>+ tag</button>}
          </div>
        </div>
        <Section title="Incomes" section="incomes" color={C.green}/>
        <Section title="Expenses" section="expenses" color={C.red}/>

        {/* Provisions — monthly allocations by category */}
        <div style={{marginBottom:20,padding:16,borderRadius:10,background:C.red+"0a",border:`1px solid ${C.red}30`}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
            <div style={{width:4,height:20,borderRadius:2,background:C.red}}/>
            <h4 style={{margin:0,fontSize:14,fontWeight:600,color:C.red}}>Linked Expenses & Provisions</h4>
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
                    <span style={{fontSize:12,color:C.textDim}}>Need:</span>
                    <span style={{fontSize:13,color:C.textDim,fontVariantNumeric:"tabular-nums"}}>{mask(fmtD(cat.calc))}</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <span style={{fontSize:12,color:C.textDim}}>Actual:</span>
                    {hideBalances ? <span style={{color:C.text,fontWeight:600,fontSize:13}}>••••</span> : <InlineNum value={cat.amount} onChange={v=>setOverride(cat.key,v??null)} style={{color:isOverridden?C.red:C.text,fontWeight:600,fontVariantNumeric:"tabular-nums"}} width={70}/>}
                  </div>
                  {isOverridden && delta !== 0 && <span style={{fontSize:10,padding:"1px 6px",borderRadius:4,background:deltaColor+"18",color:deltaColor,fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{delta>0?"+":""}{fmtD(delta)}</span>}
                  {isOverridden && <button onClick={()=>setOverride(cat.key,null)} title="Reset to calculated" style={{fontSize:10,padding:"1px 5px",borderRadius:4,border:`1px solid ${C.border}`,background:"transparent",color:C.textDim,cursor:"pointer"}}>reset</button>}
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
                      <span style={{fontSize:10,fontWeight:700,color:C.red,textTransform:'uppercase',letterSpacing:.5}}>Provisions</span>
                      <span style={{fontSize:10,fontWeight:700,color:C.red,fontVariantNumeric:'tabular-nums'}}>{fmtD(potTotal)}/mo</span>
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
                      <span style={{fontSize:10,fontWeight:700,color:C.textDim,textTransform:'uppercase',letterSpacing:.5}}>Linked Expenses</span>
                      <span style={{fontSize:10,fontWeight:600,color:C.textDim,fontVariantNumeric:'tabular-nums'}}>{fmtD(monthlyTotal)}/mo</span>
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
              <span style={{fontSize:14,fontWeight:700,color:C.red}}>Total Provisions</span>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:12,color:C.textDim}}>Need: <span style={{fontVariantNumeric:"tabular-nums"}}>{mask(fmtD(linkedCalcTotal))}</span></span>
                <span style={{fontSize:14,fontWeight:700,fontVariantNumeric:"tabular-nums",color:C.red}}>Actual: CHF {mask(fmtD(linkedTotal))}</span>
              </div>
            </div>
          </div>
        </div>

        <Section title="Savings" section="savings" color={C.blue}/>
        <Section title="Investments" section="investments" color={C.teal}/>
      </Card>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <Card title="Cashflow Split">
          <ResponsiveContainer width="100%" height={180}><PieChart><Pie data={flow} cx="50%" cy="50%" outerRadius={70} innerRadius={40} dataKey="value" paddingAngle={2} stroke="none">{flow.map((d,i)=><Cell key={i} fill={d.color}/>)}</Pie><Tooltip formatter={v=>`CHF ${fmt(v)}`} contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13}} labelStyle={{color:C.textMuted}} itemStyle={{color:C.text}}/></PieChart></ResponsiveContainer>
          {flow.map((d,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:i<flow.length-1?`1px solid ${C.border}11`:"none"}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:10,height:10,borderRadius:3,background:d.color}}/><span style={{fontSize:14,color:C.textMuted}}>{d.name}</span></div><div><span style={{fontSize:14,fontWeight:600,color:C.text}}>{mask(fmtD(d.value))}</span><span style={{fontSize:12,color:C.textDim,marginLeft:6}}>{inc>0?pct(d.pct):""}</span></div></div>)}
        </Card>
        <Card title="Liquid / Locked" subtitle="Savings & investments accessibility">
          <div style={{display:"flex",gap:12,marginBottom:12}}>
            <div style={{flex:1,padding:"10px 12px",borderRadius:8,background:C.teal+"12",border:`1px solid ${C.teal}30`}}>
              <div style={{fontSize:12,color:C.teal,marginBottom:4}}>Liquid</div>
              <div style={{fontSize:17,fontWeight:700,color:C.teal}}>CHF {mask(fmt(Math.round(liqTotal)))}</div>
            </div>
            <div style={{flex:1,padding:"10px 12px",borderRadius:8,background:C.orange+"12",border:`1px solid ${C.orange}30`}}>
              <div style={{fontSize:12,color:C.orange,marginBottom:4}}>Locked</div>
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
          return <Card title="Essential vs Optional" subtitle="Expenses + savings (excl. investments)">
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
        <Card title="Distribution Plan" subtitle="Full monthly money flow">
          {[
            {title:"Income", items:sc.incomes, color:C.green, sign:"+"},
            {title:"Expenses", items:sc.expenses, color:C.red, sign:"−"},
            {title:"Provisions", items:linkedCategoriesWithOverride.map(c=>({label:c.label,amount:c.amount})), color:C.red, sign:"−"},
            {title:"Savings", items:sc.savings, color:C.blue, sign:"→"},
            {title:"Investments", items:sc.investments, color:C.teal, sign:"→"},
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
            <span style={{fontSize:13,fontWeight:700,color:rem<0?C.red:C.yellow}}>= Unallocated</span>
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
function TrackerPage({ tracker, setTracker, accounts: portfolioAccounts, hideBalances, onTrackerSynced }) {
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
    if (!window.confirm(`Delete tracker data for ${yr}? This cannot be undone.`)) return;
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
        <button onClick={addYear} style={{padding:"6px 8px",borderRadius:8,border:"none",background:"transparent",color:C.textDim,cursor:"pointer",display:"flex",alignItems:"center",opacity:0.5}} title="Add year"><Plus size={14}/></button>
      </div>
      {startYear !== endYear && <span style={{fontSize:12,color:C.textDim,letterSpacing:0.5}}>{startYear}–{endYear}</span>}
      <div style={{display:"flex",gap:4,background:C.bg,borderRadius:10,padding:4}}>
        {[["grid","Grid"],["chart","Chart"],["compound","Compound Interest"]].map(([k,l])=>
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
          ↓ Sync from Accounts
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

    {view==="chart" && <Card title={startYear === endYear ? `${startYear}: Forecast vs Actual` : `${startYear}\u2013${endYear}: Forecast vs Actual`}>
      <ResponsiveContainer width="100%" height={isMobile?220:350}><ComposedChart data={multiTotals}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="label" tick={{fill:C.textDim,fontSize:11}} interval={rangeYears.length > 1 ? 2 : 0}/><YAxis tick={{fill:C.textDim,fontSize:11}} tickFormatter={v=>`${Math.round(v/1000)}k`}/><Tooltip formatter={v=>`CHF ${fmt(v)}`} contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13}} labelStyle={{color:C.textMuted}} itemStyle={{color:C.text}}/><Legend/><Area type="monotone" dataKey="forecast" fill={C.accent+"22"} stroke={C.accent} strokeWidth={2} name="Forecast"/><Line type="monotone" dataKey="result" stroke={C.green} strokeWidth={2.5} dot={{fill:C.green,r:4}} name="Result" connectNulls={false}/></ComposedChart></ResponsiveContainer>
    </Card>}

    {view==="compound" && <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"320px 1fr",gap:16}}>
      <Card title="Parameters"><div style={{display:"flex",flexDirection:"column",gap:20}}>
        <div><label style={{fontSize:13,color:C.textMuted}}>Starting Balance</label><div style={{fontSize:26,fontWeight:400,fontFamily:"'Fraunces',serif",color:C.accent}}>CHF {mask(fmt(currentTotal))}</div></div>
        <div><label style={{fontSize:13,color:C.textMuted,display:"flex",justifyContent:"space-between"}}><span>Annual Growth Rate</span><span style={{color:C.accent,fontWeight:600}}>{growthRate}%</span></label><input type="range" min={0} max={15} step={0.5} value={growthRate} onChange={e=>setGrowthRate(Number(e.target.value))} style={{width:"100%",accentColor:C.accent}}/></div>
        <div><label style={{fontSize:13,color:C.textMuted,display:"flex",justifyContent:"space-between"}}><span>Monthly Contribution</span><span style={{color:C.accent,fontWeight:600}}>CHF {fmt(monthlyAdd)}</span></label><input type="range" min={0} max={8000} step={100} value={monthlyAdd} onChange={e=>setMonthlyAdd(Number(e.target.value))} style={{width:"100%",accentColor:C.accent}}/></div>
        <div><label style={{fontSize:13,color:C.textMuted,display:"flex",justifyContent:"space-between"}}><span>Time Horizon</span><span style={{color:C.accent,fontWeight:600}}>{years} years</span></label><input type="range" min={1} max={40} step={1} value={years} onChange={e=>setYears(Number(e.target.value))} style={{width:"100%",accentColor:C.accent}}/></div>
        <div style={{padding:16,background:C.bg,borderRadius:10}}><div style={{fontSize:13,color:C.textMuted}}>Projected in {years} years</div><div style={{fontSize:30,fontWeight:400,fontFamily:"'Fraunces',serif",color:C.green}}>CHF {mask(fmt(proj[proj.length-1].balance))}</div><div style={{fontSize:13,color:C.textDim,marginTop:4}}>Contributed: CHF {mask(fmt(proj[proj.length-1].contributed))}</div><div style={{fontSize:13,color:C.accentLight}}>Growth: CHF {mask(fmt(proj[proj.length-1].balance-proj[proj.length-1].contributed))}</div></div>
      </div></Card>
      <Card title="Compound Growth Projection">
        <ResponsiveContainer width="100%" height={isMobile?250:400}><AreaChart data={proj}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="year" tick={{fill:C.textDim,fontSize:11}}/><YAxis tick={{fill:C.textDim,fontSize:11}} tickFormatter={v=>v>=1e6?`${(v/1e6).toFixed(1)}M`:`${Math.round(v/1000)}k`}/><Tooltip formatter={v=>`CHF ${fmt(v)}`} contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13}} labelStyle={{color:C.textMuted}} itemStyle={{color:C.text}}/><Legend/><Area type="monotone" dataKey="contributed" fill={C.blue+"33"} stroke={C.blue} strokeWidth={1.5} name="Contributed"/><Area type="monotone" dataKey="balance" fill={C.green+"33"} stroke={C.green} strokeWidth={2} name="With Growth"/></AreaChart></ResponsiveContainer>
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

function ExpensesPage({ subsP, setSubsP, subsPInScenario, setSubsPInScenario, yearly, setYearly, taxes, setTaxes, insurance, setInsurance, hideBalances, profile, accounts, scenarios, darkMode, insPrompt, setInsPrompt, taxPrompt, setTaxPrompt, recPrompt, setRecPrompt, subPrompt, setSubPrompt }) {
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
    return <Card title={title} headerRight={<span style={{fontSize:14,color:accentColor,fontWeight:600}}>CHF {mask(fmtD(tot))}/mo</span>}>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:580}}><thead><tr><SortTH field="name">Name</SortTH><SortTH field="amount">Amount</SortTH><SortTH field="frequency">Frequency</SortTH><SortTH field="effective">Effective/mo</SortTH><SortTH field="account">Payment</SortTH><SortTH field="notes">Notes</SortTH><TH w={30}></TH></tr></thead>
      <tbody>
        {sorted.map(s=><tr key={s.id} onMouseEnter={e=>e.currentTarget.style.background=C.cardHover} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <td style={{padding:"8px 12px",fontSize:14,borderBottom:`1px solid ${C.border}11`}}><InlineEdit value={s.name} onChange={v=>edit(s.id,"name",v)} inputWidth={160}/></td>
          <td style={{padding:"8px 12px",fontSize:14,borderBottom:`1px solid ${C.border}11`,fontVariantNumeric:"tabular-nums"}}>{hideBalances ? <span style={{color:C.text}}>••••</span> : <InlineNum value={s.amount} onChange={v=>edit(s.id,"amount",v??0)} width={70}/>}</td>
          <td style={{padding:"8px 12px",fontSize:14,borderBottom:`1px solid ${C.border}11`}}><select value={s.frequency||1} onChange={e=>edit(s.id,"frequency",Number(e.target.value))} style={{padding:"3px 6px",borderRadius:6,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:13,cursor:"pointer"}}>{FREQ_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></td>
          <td style={{padding:"8px 12px",fontSize:14,borderBottom:`1px solid ${C.border}11`,fontVariantNumeric:"tabular-nums",color:accentColor,fontWeight:600}}>{mask(fmtD(toMonthly(s.amount,s.frequency)))}</td>
          <td style={{padding:"8px 12px",fontSize:14,borderBottom:`1px solid ${C.border}11`}}><InlineEdit value={s.account} onChange={v=>edit(s.id,"account",v)} placeholder="account..." style={{color:C.textDim,fontSize:12}} inputWidth={110}/></td>
          <td style={{padding:"8px 12px",fontSize:13,color:C.textDim,borderBottom:`1px solid ${C.border}11`}}><InlineEdit value={s.notes||""} onChange={v=>edit(s.id,"notes",v)} placeholder="notes..." style={{color:C.textDim}} inputWidth={100}/></td>
          <td style={{padding:"8px 12px",borderBottom:`1px solid ${C.border}11`}}><DelBtn onClick={()=>del(s.id)}/></td>
        </tr>)}
        <tr style={{background:C.bg}}><td style={{padding:"10px 12px",fontWeight:700}} colSpan={3}>Total</td><td style={{padding:"10px 12px",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{mask(fmtD(tot))}</td><td colSpan={3}/></tr>
        <AddRow onClick={add} label="Add subscription" colSpan={7}/>
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
            <h2 style={{margin:0,fontSize:18,fontWeight:700,color:C.text}}>{label} — Extraction Prompt</h2>
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
              <td style={{padding:'5px 8px'}}><select value={p.frequency||12} onChange={ev=>setExpPreview(prev=>({...prev,data:{...prev.data,policies:prev.data.policies.map((x,j)=>j===i?{...x,frequency:Number(ev.target.value)}:x)}}))} style={{padding:'3px 6px',borderRadius:6,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:12,cursor:'pointer'}}>{FREQ_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></td>
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
              <td style={{padding:'5px 8px'}}><select value={e.frequency||12} onChange={ev=>setExpPreview(prev=>({...prev,data:{...prev.data,expenses:prev.data.expenses.map((x,j)=>j===i?{...x,frequency:Number(ev.target.value)}:x)}}))} style={{padding:'3px 6px',borderRadius:6,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:12,cursor:'pointer'}}>{FREQ_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></td>
              <td style={{padding:'5px 8px',color:C.textDim,fontSize:11}}>{e.notes||'—'}</td>
            </tr>)}</tbody>
          </table>}
          {/* Subscriptions preview */}
          {expPreview.section==='subscriptions' && (expPreview.data.subscriptions||[]).length>0 && <table style={{width:'100%',borderCollapse:'collapse',fontSize:13,marginBottom:16}}>
            <thead><tr>{['Name','Amount','Frequency','Account','Notes'].map((h,i)=><th key={i} style={{padding:'5px 8px',textAlign:'left',fontSize:12,color:C.textDim,fontWeight:600,borderBottom:`1px solid ${C.border}`}}>{h}</th>)}</tr></thead>
            <tbody>{(expPreview.data.subscriptions||[]).map((s,i)=><tr key={i} style={{borderBottom:`1px solid ${C.border}22`}}>
              <td style={{padding:'5px 8px',color:C.text}}>{s.name}</td>
              <td style={{padding:'5px 8px',color:C.accent,fontWeight:600}}>CHF {(s.amount||0).toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
              <td style={{padding:'5px 8px'}}><select value={s.frequency||1} onChange={ev=>setExpPreview(prev=>({...prev,data:{...prev.data,subscriptions:prev.data.subscriptions.map((x,j)=>j===i?{...x,frequency:Number(ev.target.value)}:x)}}))} style={{padding:'3px 6px',borderRadius:6,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:12,cursor:'pointer'}}>{FREQ_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></td>
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
      <StatCard label="Subscriptions" value={`CHF ${mask(fmt(Math.round(pTotal)))}/mo`} icon={CreditCard} color={C.accent} compact={isMobile}/>
      <StatCard label="Recurring" value={`CHF ${mask(fmt(Math.round(yTotal)))}/mo`} sub="saved monthly" icon={DollarSign} color={C.blue} compact={isMobile}/>
      <StatCard label="Insurances" value={`CHF ${mask(fmt(Math.round(insMonthly)))}/mo`} sub={hideBalances?undefined:`CHF ${fmt(Math.round(insTotal))}/yr`} icon={Shield} color={C.green} compact={isMobile}/>
      <StatCard label={`Taxes (${latestTax?.year||"—"})`} value={`CHF ${mask(fmt(Math.round(taxMonthly)))}/mo`} sub={hideBalances?undefined:`CHF ${fmt(Math.round(latestTaxTotal))}/yr`} icon={BarChart3} color={C.red} compact={isMobile}/>
    </div>
    <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
      <Tab active={tab==="total"} onClick={()=>setTab("total")}>Total Monthly</Tab>
      <Tab active={tab==="recurring"} onClick={()=>setTab("recurring")}>Recurring</Tab>
      <Tab active={tab==="subscriptions"} onClick={()=>setTab("subscriptions")}>Subscriptions</Tab>
      <Tab active={tab==="insurance"} onClick={()=>setTab("insurance")}>Insurances</Tab>
      <Tab active={tab==="taxes"} onClick={()=>setTab("taxes")}>Taxes</Tab>
    </div>

    {tab==="total" && (()=>{
      const subRows = (subsPInScenario ? subsP : []).map(s=>({label:s.name, monthly:subMonthly(s), source:"Subscriptions", color:C.accent}));
      const recRows = yearly.map(e=>({label:e.name, monthly:recMonthly(e), source:"Recurring", color:C.cyan}));
      const insRows = insurance.map(p=>({label:p.name, monthly:insMonthlyCalc(p), source:"Insurances", color:C.green}));
      const taxRows = latestTax ? [{label:"Tax Provision (est.)", monthly:taxMonthly, source:"Taxes", color:C.red}] : [];
      const allRows = [...subRows,...recRows,...insRows,...taxRows];
      const grandTotal = allRows.reduce((s,r)=>s+r.monthly,0);
      const groups = [
        {label:"Subscriptions",total:pTotal,color:C.accent},
        {label:"Recurring",total:yTotal,color:C.cyan},
        {label:"Insurances",total:insMonthly,color:C.green},
        {label:"Tax Provision",total:taxMonthly,color:C.red},
      ];
      return <Card title="Monthly Expense Summary" headerRight={<span style={{fontSize:17,fontWeight:700,color:C.accent}}>CHF {mask(fmtD(grandTotal))}/mo</span>}>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:isMobile?8:12,marginBottom:20}}>
          {groups.map((g,i)=><div key={i} style={{padding:isMobile?"8px 10px":12,borderRadius:8,background:C.bg,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:isMobile?10:11,color:g.color,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4,lineHeight:1.3}}>{g.label}</div>
            <div style={{fontSize:isMobile?14:18,fontWeight:700,color:C.text}}>CHF {mask(fmt(Math.round(g.total)))}</div>
            <div style={{fontSize:isMobile?10:11,color:C.textDim}}>{grandTotal>0?pct(g.total/grandTotal):"0%"} of total</div>
          </div>)}
        </div>
        {(()=>{const totGetVal=(r,k)=>k==='label'?r.label:k==='source'?r.source:k==='monthly'?r.monthly:k==='yearly'?r.monthly*12:0;const sortedRows=sortItems(allRows,totGetVal);return <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:isMobile?380:undefined}}><thead><tr><SortTH field="label">Expense</SortTH><SortTH field="source">Category</SortTH><SortTH field="monthly">Monthly</SortTH>{!isMobile&&<SortTH field="yearly">Yearly</SortTH>}</tr></thead>
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
          <Card title="Cost Breakdown (effective/mo)">
            <ResponsiveContainer width="100%" height={Math.max(180, allSubs.length*28)}><BarChart data={allSubs.map(s=>({name:s.name,value:s.effective}))} layout="vertical" margin={{left:130}}><XAxis type="number" tick={{fill:C.textDim,fontSize:11}} tickFormatter={fmt}/><YAxis type="category" dataKey="name" tick={{fill:C.textMuted,fontSize:12}} width={130}/><Tooltip formatter={v=>`CHF ${fmtD(v)}/mo`} contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13}} labelStyle={{color:C.textMuted}} itemStyle={{color:C.text}}/><Bar dataKey="value" radius={[0,6,6,0]}>{allSubs.map((_,i)=><Cell key={i} fill={pieColors()[i%pieColors().length]}/>)}</Bar></BarChart></ResponsiveContainer>
          </Card>
          <Card title="Share of Total">
            <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={allSubs.map(s=>({name:s.name,value:s.effective}))} cx="50%" cy="50%" outerRadius={80} innerRadius={45} dataKey="value" paddingAngle={2} stroke="none">{allSubs.map((_,i)=><Cell key={i} fill={pieColors()[i%pieColors().length]}/>)}</Pie><Tooltip formatter={v=>`CHF ${fmtD(v)}/mo`} contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13}} labelStyle={{color:C.textMuted}} itemStyle={{color:C.text}}/></PieChart></ResponsiveContainer>
            {allSubs.map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 0",borderBottom:i<allSubs.length-1?`1px solid ${C.border}22`:"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:3,background:pieColors()[i%pieColors().length],flexShrink:0}}/><span style={{fontSize:12,color:C.textMuted}}>{s.name}</span></div>
              <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,fontWeight:600,color:C.text,fontVariantNumeric:"tabular-nums"}}>CHF {mask(fmtD(s.effective))}</span><span style={{fontSize:10,color:C.textDim,width:36,textAlign:"right"}}>{subTotal>0?(s.effective/subTotal*100).toFixed(0):0}%</span></div>
            </div>)}
          </Card>
        </div>;
      })()}
      <SubTable items={subsP} setItems={setSubsP} title="Personal Subscriptions" accentColor={C.accent}/>
    </div>}

    {tab==="recurring" && <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <ImportBar section="recurring" color={C.blue}/>
      {yearly.filter(e=>recMonthly(e)>0).length > 0 && <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16}}>
        <Card title="Cost Breakdown (effective/mo)">
          <ResponsiveContainer width="100%" height={Math.max(180, yearly.filter(e=>recMonthly(e)>0).length*28)}><BarChart data={yearly.filter(e=>recMonthly(e)>0).map(e=>({name:e.name,value:recMonthly(e)}))} layout="vertical" margin={{left:130}}><XAxis type="number" tick={{fill:C.textDim,fontSize:11}} tickFormatter={fmt}/><YAxis type="category" dataKey="name" tick={{fill:C.textMuted,fontSize:12}} width={130}/><Tooltip formatter={v=>`CHF ${fmtD(v)}/mo`} contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13}} labelStyle={{color:C.textMuted}} itemStyle={{color:C.text}}/><Bar dataKey="value" radius={[0,6,6,0]}>{yearly.filter(e=>recMonthly(e)>0).map((_,i)=><Cell key={i} fill={pieColors()[i%pieColors().length]}/>)}</Bar></BarChart></ResponsiveContainer>
        </Card>
        <Card title="Share of Total">
          <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={yearly.filter(e=>recMonthly(e)>0).map(e=>({name:e.name,value:recMonthly(e)}))} cx="50%" cy="50%" outerRadius={80} innerRadius={45} dataKey="value" paddingAngle={2} stroke="none">{yearly.filter(e=>recMonthly(e)>0).map((_,i)=><Cell key={i} fill={pieColors()[i%pieColors().length]}/>)}</Pie><Tooltip formatter={v=>`CHF ${fmtD(v)}/mo`} contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13}} labelStyle={{color:C.textMuted}} itemStyle={{color:C.text}}/></PieChart></ResponsiveContainer>
          {yearly.filter(e=>recMonthly(e)>0).map((e,i)=><div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 0",borderBottom:i<yearly.filter(x=>recMonthly(x)>0).length-1?`1px solid ${C.border}22`:"none"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:3,background:pieColors()[i%pieColors().length],flexShrink:0}}/><span style={{fontSize:12,color:C.textMuted}}>{e.name}</span></div>
            <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,fontWeight:600,color:C.text,fontVariantNumeric:"tabular-nums"}}>CHF {mask(fmtD(recMonthly(e)))}</span><span style={{fontSize:10,color:C.textDim,width:36,textAlign:"right"}}>{yTotal>0?(recMonthly(e)/yTotal*100).toFixed(0):0}%</span></div>
          </div>)}
        </Card>
      </div>}
      <Card title="Recurring Expenses" headerRight={<span style={{fontSize:14,color:C.blue,fontWeight:600}}>CHF {mask(fmtD(yTotal))}/mo</span>}>
      {(()=>{const recGetVal=(e,k)=>k==='name'?e.name:k==='amount'?e.amount:k==='frequency'?e.frequency:k==='effective'?recMonthly(e):k==='notes'?e.notes:'';const sorted=sortItems(yearly,recGetVal);return <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:isMobile?480:undefined}}><thead><tr><SortTH field="name">Expense</SortTH><SortTH field="amount">Amount</SortTH><SortTH field="frequency">Frequency</SortTH><SortTH field="effective">Effective/mo</SortTH><SortTH field="notes">Notes</SortTH><TH w={30}></TH></tr></thead>
      <tbody>
        {sorted.map(e=><tr key={e.id} onMouseEnter={ev=>ev.currentTarget.style.background=C.cardHover} onMouseLeave={ev=>ev.currentTarget.style.background="transparent"}>
          <td style={{padding:"8px 12px",fontSize:14,borderBottom:`1px solid ${C.border}11`}}><InlineEdit value={e.name} onChange={v=>setYearly(p=>p.map(x=>x.id===e.id?{...x,name:v}:x))} inputWidth={200}/></td>
          <td style={{padding:"8px 12px",fontSize:14,fontVariantNumeric:"tabular-nums",borderBottom:`1px solid ${C.border}11`}}>{hideBalances ? <span style={{color:C.text}}>••••</span> : <InlineNum value={e.amount} onChange={v=>setYearly(p=>p.map(x=>x.id===e.id?{...x,amount:v??0}:x))} width={70}/>}</td>
          <td style={{padding:"8px 12px",fontSize:14,borderBottom:`1px solid ${C.border}11`}}><select value={e.frequency||1} onChange={ev=>setYearly(p=>p.map(x=>x.id===e.id?{...x,frequency:Number(ev.target.value)}:x))} style={{padding:"3px 6px",borderRadius:6,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:13,cursor:"pointer"}}>{FREQ_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></td>
          <td style={{padding:"8px 12px",fontSize:14,fontVariantNumeric:"tabular-nums",borderBottom:`1px solid ${C.border}11`,color:C.textMuted}}>{mask(fmtD(recMonthly(e)))}</td>
          <td style={{padding:"8px 12px",fontSize:13,color:C.textDim,borderBottom:`1px solid ${C.border}11`}}><InlineEdit value={e.notes||""} onChange={v=>setYearly(p=>p.map(x=>x.id===e.id?{...x,notes:v}:x))} placeholder="notes..." style={{color:C.textDim}} inputWidth={100}/></td>
          <td style={{padding:"8px 12px",borderBottom:`1px solid ${C.border}11`}}><DelBtn onClick={()=>setYearly(p=>p.filter(x=>x.id!==e.id))}/></td>
        </tr>)}
        <tr style={{background:C.bg}}><td style={{padding:"10px 12px",fontWeight:700}} colSpan={3}>Total</td><td style={{padding:"10px 12px",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{mask(fmtD(yTotal))}</td><td colSpan={2}/></tr>
        <AddRow onClick={()=>setYearly(p=>[...p,{id:uid(),name:"New Expense",amount:0,frequency:1,notes:""}])} label="Add recurring expense" colSpan={6}/>
      </tbody></table></div>;})()}
    </Card>
    </div>}

    {tab==="taxes" && <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <ImportBar section="taxes" color={C.red}/>
      {/* Bar chart with totals per year */}
      <Card title="Tax History" headerRight={<button onClick={exportTaxReport} style={{padding:"6px 12px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.textMuted,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><Download size={13}/>PDF Report</button>}>
        <ResponsiveContainer width="100%" height={250}><BarChart data={taxes.map(t=>({year:t.year,total:t.lines.reduce((s,l)=>s+l.amount,0)}))}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="year" tick={{fill:C.textDim,fontSize:12}}/><YAxis tick={{fill:C.textDim,fontSize:11}} tickFormatter={v=>`${Math.round(v/1000)}k`}/><Tooltip formatter={v=>`CHF ${fmt(v)}`} contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13}} labelStyle={{color:C.textMuted}} itemStyle={{color:C.text}}/><Bar dataKey="total" fill={C.red} radius={[6,6,0,0]} name="Total Paid"/></BarChart></ResponsiveContainer>
      </Card>

      {/* Per-year cards with line items */}
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        {[...taxes].reverse().map(t=>{
          const total = t.lines.reduce((s,l)=>s+l.amount,0);
          const editTaxLine = (lineId,field,val)=>setTaxes(p=>p.map(tx=>tx.id===t.id?{...tx,lines:tx.lines.map(l=>l.id===lineId?{...l,[field]:val}:l)}:tx));
          return <Card key={t.id} title={<div style={{display:"flex",alignItems:"center",gap:12}}>
            <InlineEdit value={String(t.year)} onChange={v=>{const n=parseInt(v);if(!isNaN(n))setTaxes(p=>p.map(tx=>tx.id===t.id?{...tx,year:n}:tx));}} style={{fontSize:18,fontWeight:700}} inputWidth={60}/>
            <span style={{fontSize:14,color:C.red,fontWeight:600}}>Total: CHF {mask(fmtD(total))}</span>
          </div>} headerRight={<DelBtn onClick={()=>setTaxes(p=>p.filter(tx=>tx.id!==t.id))}/>}>
            <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:isMobile?340:undefined}}><thead><tr><TH>Type</TH><TH>Amount (CHF)</TH><TH>Paid at</TH></tr></thead>
            <tbody>
              {t.lines.map(line=>(
                <tr key={line.id} onMouseEnter={e=>e.currentTarget.style.background=C.cardHover} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{padding:"8px 12px",fontSize:14,borderBottom:`1px solid ${C.border}11`}}>
                    {line.type}
                    {line.type.includes("Provisional") && <Badge color={C.orange}>Prov.</Badge>}
                    {line.type.includes("Final Settlement") && <Badge color={C.green}>Final</Badge>}
                  </td>
                  <td style={{padding:"8px 12px",fontSize:14,fontVariantNumeric:"tabular-nums",borderBottom:`1px solid ${C.border}11`}}>{hideBalances ? <span style={{color:C.text}}>••••</span> : <InlineNum value={line.amount} onChange={v=>editTaxLine(line.id,"amount",v??0)} width={80}/>}</td>
                  <td style={{padding:"8px 12px",fontSize:13,borderBottom:`1px solid ${C.border}11`}}><InlineEdit value={line.paidAt||""} onChange={v=>editTaxLine(line.id,"paidAt",v)} placeholder="dd.mm.yyyy" style={{color:C.textDim}} inputWidth={90}/></td>
                </tr>
              ))}
              <tr style={{background:C.bg}}><td style={{padding:"8px 12px",fontWeight:700}}>Total</td><td style={{padding:"8px 12px",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{mask(fmtD(total))}</td><td/></tr>
            </tbody></table></div>
          </Card>;
        })}
        <button onClick={()=>{const yr=taxes.length>0?Math.max(...taxes.map(t=>t.year))+1:2025;setTaxes(p=>[...p,makeTaxYear(yr,[0,0,0,0])]);}} style={{display:"flex",alignItems:"center",gap:6,padding:"12px 16px",border:`2px dashed ${C.border}`,borderRadius:10,background:"transparent",color:C.textDim,fontSize:14,cursor:"pointer",justifyContent:"center"}}><Plus size={16}/>Add tax year</button>
      </div>
    </div>}

    {tab==="insurance" && <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <ImportBar section="insurance" color={C.green}/>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16}}>
        <Card title="Cost Breakdown (effective/mo)">
          <ResponsiveContainer width="100%" height={260}><BarChart data={insurance.map(p=>({name:p.name,monthly:insMonthlyCalc(p)}))} layout="vertical" margin={{left:130}}><XAxis type="number" tick={{fill:C.textDim,fontSize:11}} tickFormatter={fmt}/><YAxis type="category" dataKey="name" tick={{fill:C.textMuted,fontSize:12}} width={130}/><Tooltip formatter={v=>`CHF ${fmtD(v)}/mo`} contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13}} labelStyle={{color:C.textMuted}} itemStyle={{color:C.text}}/><Bar dataKey="monthly" radius={[0,6,6,0]}>{insurance.map((_,i)=><Cell key={i} fill={pieColors()[i%pieColors().length]}/>)}</Bar></BarChart></ResponsiveContainer>
        </Card>
        <Card title="Share of Total">
          <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={insurance.map(p=>({name:p.name,value:insMonthlyCalc(p)}))} cx="50%" cy="50%" outerRadius={80} innerRadius={45} dataKey="value" paddingAngle={2} stroke="none">{insurance.map((_,i)=><Cell key={i} fill={pieColors()[i%pieColors().length]}/>)}</Pie><Tooltip formatter={v=>`CHF ${fmtD(v)}/mo`} contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13}} labelStyle={{color:C.textMuted}} itemStyle={{color:C.text}}/></PieChart></ResponsiveContainer>
          {insurance.map((p,i)=>{const total=insurance.reduce((s,x)=>s+insMonthlyCalc(x),0); return <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 0",borderBottom:i<insurance.length-1?`1px solid ${C.border}22`:"none"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:3,background:pieColors()[i%pieColors().length],flexShrink:0}}/><span style={{fontSize:12,color:C.textMuted}}>{p.name}</span></div>
            <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,fontWeight:600,color:C.text,fontVariantNumeric:"tabular-nums"}}>CHF {mask(fmtD(insMonthlyCalc(p)))}</span><span style={{fontSize:10,color:C.textDim,width:36,textAlign:"right"}}>{total>0?(insMonthlyCalc(p)/total*100).toFixed(0):0}%</span></div>
          </div>})}
        </Card>
      </div>
      <Card title="All Policies">
        {(()=>{const insGetVal=(p,k)=>k==='name'?p.name:k==='insurer'?p.insurer:k==='amount'?p.amount:k==='frequency'?p.frequency:k==='effective'?insMonthlyCalc(p):k==='notes'?p.notes:'';const sorted=sortItems(insurance,insGetVal);return <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:isMobile?560:undefined}}><thead><tr><SortTH field="name">Policy</SortTH><SortTH field="insurer">Insurer</SortTH><SortTH field="amount">Amount</SortTH><SortTH field="frequency">Frequency</SortTH><SortTH field="effective">Effective/mo</SortTH><SortTH field="notes">Notes</SortTH><TH w={30}></TH></tr></thead>
        <tbody>
          {sorted.map((p,i)=><tr key={p.id} onMouseEnter={e=>e.currentTarget.style.background=C.cardHover} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <td style={{padding:"10px 12px",fontSize:14,borderBottom:`1px solid ${C.border}11`}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:4,background:pieColors()[i]}}/><InlineEdit value={p.name} onChange={v=>insEdit(p.id,"name",v)} inputWidth={150}/></div></td>
            <td style={{padding:"10px 12px",fontSize:14,borderBottom:`1px solid ${C.border}11`}}><InlineEdit value={p.insurer} onChange={v=>insEdit(p.id,"insurer",v)} inputWidth={110}/></td>
            <td style={{padding:"10px 12px",fontSize:14,fontWeight:600,fontVariantNumeric:"tabular-nums",borderBottom:`1px solid ${C.border}11`}}>{hideBalances ? <span style={{color:C.text}}>••••</span> : <InlineNum value={p.amount} onChange={v=>insEdit(p.id,"amount",v??0)} width={70}/>}</td>
            <td style={{padding:"10px 12px",fontSize:14,borderBottom:`1px solid ${C.border}11`}}><select value={p.frequency||12} onChange={e=>insEdit(p.id,"frequency",Number(e.target.value))} style={{padding:"3px 6px",borderRadius:6,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:13,cursor:"pointer"}}>{FREQ_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></td>
            <td style={{padding:"10px 12px",fontSize:14,fontVariantNumeric:"tabular-nums",color:C.textMuted,borderBottom:`1px solid ${C.border}11`}}>{mask(fmtD(insMonthlyCalc(p)))}</td>
            <td style={{padding:"10px 12px",fontSize:13,color:C.textDim,borderBottom:`1px solid ${C.border}11`}}><InlineEdit value={p.notes||""} onChange={v=>insEdit(p.id,"notes",v)} placeholder="notes..." style={{color:C.textDim}} inputWidth={100}/></td>
            <td style={{padding:"10px 12px",borderBottom:`1px solid ${C.border}11`}}><DelBtn onClick={()=>insDel(p.id)}/></td>
          </tr>)}
          <tr style={{background:C.bg}}><td style={{padding:"10px 12px",fontWeight:700}} colSpan={4}>Total</td><td style={{padding:"10px 12px",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{mask(fmtD(insMonthly))}</td><td colSpan={2}/></tr>
          <AddRow onClick={insAdd} label="Add insurance policy" colSpan={7}/>
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
      <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><TH>Policy</TH><TH>Insurer</TH><TH>Yearly (CHF)</TH><TH>Effective/mo</TH><TH>Billing Period</TH><TH w={30}></TH></tr></thead>
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
function PillarPage({ accounts, scenarios, subsP, subsPInScenario, yearly, taxes, insurance, hideBalances }) {
  const mask = (v) => hideBalances ? "••••" : v;
  const winW = useWindowWidth(); const isMobile = winW < 768;
  const [yieldRate, setYieldRate] = useState(4);
  const [hoursPerWeek, setHoursPerWeek] = useState(40);
  const [purchase, setPurchase] = useState("");

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
  const moneySystemTarget = essentialTotal > 0 ? (essentialTotal * 12) / (effectiveYield / 100) : 0;
  const moneySystemProgress = moneySystemTarget > 0 ? Math.min(100, (liquidTotal / moneySystemTarget) * 100) : 0;
  const totalProgress = moneySystemTarget > 0 ? Math.min(100, (totalWealth / moneySystemTarget) * 100) : 0;
  // Years to target based on current monthly savings
  const monthlySavInv = sc ? [...sc.savings,...sc.investments].reduce((s,x)=>s+getA(x),0) : 0;
  const yearsToTarget = monthlySavInv > 0 && moneySystemTarget > liquidTotal
    ? Math.ceil((moneySystemTarget - liquidTotal) / (monthlySavInv * 12))
    : null;

  // Business system: monthly gross revenue needed at 5x essential costs
  // Note: as sole proprietorship (Einzelunternehmen) in CH, AHV ~10% on net profit + income tax ~25-30%
  // So gross revenue needed is higher: divide by ~0.65 to get pre-tax equivalent
  const businessTarget = essentialTotal * 5;
  const businessTargetGross = businessTarget / 0.65; // approx. pre-tax for self-employed in CH

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
    { num:"1", name:"AHV / IV / EL", items:["AHV Old-Age Pension (Altersrente)","IV Disability Insurance (Invalidenversicherung)","EL Supplementary Benefits (Erganzungsleistungen)"], color:C.blue, desc:"Mandatory state pension. Employee + employer each pay 5.3% of gross salary. Max AHV pension CHF 2'520/mo (2025) + 13th pension." },
    { num:"2", name:"BVG / UVG / KTG", items:["BVG Occupational Pension (Pensionskasse)","UVG Accident Insurance","KTG Sickness Indemnity"], color:C.teal, desc:"Occupational pension via employer. Mandatory above CHF 22'680/yr salary. Voluntary buy-in (Einkauf) possible for tax reduction." },
    { num:"3a", name:"Pillar 3a", items:["3a Pension (ETF-based or bank account)","Max CHF 7'258/yr (2025)","100% tax deductible"], color:C.green, desc:"Voluntary private pension. Contributions are fully deductible from taxable income. Taxed at reduced rate on withdrawal (~5-8% depending on canton and amount)." },
  ];
  const personalPillars = [
    { num:"4", name:"Savings", items:["Investment Savings Account","Emergency Fund (target: 3-6 mo)","Escrow / Deposit Account"], color:C.yellow, desc:"Liquid savings for short-term goals and emergencies. Emergency fund target: 3-6x monthly essential costs." },
    { num:"5", name:"Investments", items:["ETFs (e.g. global equity index funds)","Crypto (capital gains tax-free)","Real Estate"], color:C.orange, desc:"Long-term wealth building. Capital gains are tax-free in CH for private investors (Art. 16 Abs. 3 DBG). Dividends taxed as income." },
  ];

  return <div>
    <h2 style={{fontSize:18,fontWeight:700,color:C.text,margin:"0 0 6px"}}>Personal 5-Pillar Finance Strategy</h2>
    <p style={{fontSize:14,color:C.textMuted,marginBottom:20}}>The official Swiss 3-pillar system extended with two personal pillars for savings and investments</p>

    {/* Official Swiss 3-pillar system */}
    <div style={{fontSize:12,color:C.accent,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Official Swiss 3-Pillar System (Drei-Saulen-System)</div>
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
    <div style={{fontSize:12,color:C.yellow,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Personal Extension Pillars (Wealth Building)</div>
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

    {/* ── Freedom Targets ── */}
    <h2 style={{fontSize:18,fontWeight:700,color:C.text,margin:"0 0 4px"}}>Financial Freedom Targets</h2>
    <p style={{fontSize:14,color:C.textMuted,marginBottom:12}}>Based on your essential monthly costs of <strong style={{color:C.text}}>CHF {mask(fmt(Math.round(essentialTotal)))}/mo</strong> from the active scenario</p>
    <div style={{padding:"12px 16px",borderRadius:8,background:C.accent+"0a",border:`1px solid ${C.accent}15`,fontSize:13,color:C.textDim,lineHeight:1.8,marginBottom:16}}>
      <strong style={{color:C.text}}>How this works:</strong> Financial freedom means your invested capital generates enough passive income to cover all essential living costs — indefinitely, without touching the principal.
      The calculation: <strong style={{color:C.accent}}>Essential costs × 12 months ÷ net yield %</strong> = capital needed.
      This is based on the <strong style={{color:C.text}}>4% rule</strong> (Trinity Study), adjusted for Swiss wealth tax. Two paths: <strong style={{color:C.accent}}>Money System</strong> (invest capital, live off returns) or <strong style={{color:C.teal}}>Business System</strong> (build revenue that replaces salary).
    </div>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:16,marginBottom:24}}>

      {/* Money System */}
      <Card style={{gridColumn:isMobile?"1":"1/3"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:12}}>
          <div>
            <div style={{fontSize:12,fontFamily:"'DM Mono',monospace",color:C.textMuted,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.08em"}}>Money System Target</div>
            <div style={{fontSize:30,fontWeight:400,fontFamily:"'Fraunces',serif",color:C.accent}}>CHF {mask(fmt(Math.round(moneySystemTarget)))}</div>
            <div style={{fontSize:13,color:C.textDim,marginTop:2}}>Capital needed so {effectiveYield.toFixed(1)}% net yield/yr covers all essential costs</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:12,color:C.textDim,marginBottom:2}}>Yield assumption</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <input type="range" min={2} max={8} step={0.5} value={yieldRate} onChange={e=>setYieldRate(Number(e.target.value))} style={{width:80,accentColor:C.accent}}/>
              <span style={{fontSize:14,fontWeight:600,color:C.accent}}>{yieldRate}%</span>
            </div>
            <div style={{fontSize:10,color:C.textDim,marginTop:2}}>-{wealthTaxDrag}% wealth tax (Vermogenssteuer) ZH = {effectiveYield.toFixed(1)}% net</div>
          </div>
        </div>
        {/* Explanation box */}
        <div style={{padding:"10px 12px",borderRadius:8,background:C.bg,border:`1px solid ${C.border}33`,fontSize:12,color:C.textDim,lineHeight:1.8,marginBottom:12}}>
          <strong style={{color:C.textMuted}}>The math:</strong> CHF {mask(fmt(Math.round(essentialTotal)))} × 12 months = CHF {mask(fmt(Math.round(essentialTotal*12)))}/yr ÷ {effectiveYield.toFixed(1)}% net yield = <strong style={{color:C.accent}}>CHF {mask(fmt(Math.round(moneySystemTarget)))}</strong><br/>
          <strong style={{color:C.textMuted}}>Yield {yieldRate}%:</strong> Historical average return of a global stock/bond portfolio (e.g. 60/40 or 80/20 ETF). Adjust the slider to be more conservative or aggressive.<br/>
          <strong style={{color:C.textMuted}}>Wealth tax drag:</strong> Kanton Zurich charges ~{wealthTaxDrag}% per year on net assets (Vermogenssteuer), reducing your effective yield from {yieldRate}% to {effectiveYield.toFixed(1)}%.
        </div>
        <div style={{marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.textDim,marginBottom:4}}>
            <span>Liquid assets: CHF {mask(fmt(liquidTotal))}</span>
            <span>{moneySystemProgress.toFixed(1)}%</span>
          </div>
          <div style={{height:8,borderRadius:4,background:C.border,overflow:"hidden",display:"flex"}}>
            <div style={{width:`${moneySystemProgress}%`,background:C.green,borderRadius:4,transition:"width .3s"}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.textDim,marginTop:4}}>
            <span>incl. pensions: {totalProgress.toFixed(1)}% (CHF {mask(fmt(totalWealth))} total)</span>
            {yearsToTarget && <span style={{color:C.yellow}}>~{yearsToTarget} yrs at current savings rate</span>}
          </div>
        </div>
        {/* Why liquid vs total */}
        <div style={{padding:"8px 12px",borderRadius:8,background:C.yellow+"0a",border:`1px solid ${C.yellow}15`,fontSize:12,color:C.textDim,lineHeight:1.7,marginBottom:8}}>
          <strong style={{color:C.yellow}}>Why two progress bars?</strong> The main bar shows <strong>liquid assets</strong> only — money you can actually use today. Pensions (Pillar 2 + 3a = CHF {mask(fmt(pensionTotal))}) are locked until age 58-65 and cannot fund early financial freedom.
        </div>
        <div style={{padding:"10px 12px",borderRadius:8,background:C.accent+"0d",border:`1px solid ${C.accent}22`,fontSize:12,color:C.textDim,lineHeight:1.7}}>
          <strong style={{color:C.accentLight}}>Swiss advantage:</strong> Capital gains are <strong style={{color:C.green}}>tax-free</strong> for private investors (Art. 16 Abs. 3 DBG). This means your portfolio growth is not taxed — only dividends and interest count as income. Favor accumulating ETFs over distributing ones to minimize tax drag.
        </div>
      </Card>

      {/* Business System */}
      <Card>
        <div style={{fontSize:12,fontFamily:"'DM Mono',monospace",color:C.textMuted,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.08em"}}>Business System Target</div>
        <div style={{fontSize:26,fontWeight:400,fontFamily:"'Fraunces',serif",color:C.teal,marginBottom:2}}>CHF {mask(fmt(Math.round(businessTargetGross)))}/mo</div>
        <div style={{fontSize:12,color:C.textDim,marginBottom:12}}>Gross revenue needed (self-employed, pre-tax)</div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
          <div style={{padding:"8px 12px",borderRadius:6,background:C.teal+"0d",border:`1px solid ${C.teal}22`}}>
            <div style={{fontSize:12,color:C.textDim}}>Essential costs × 5</div>
            <div style={{fontSize:14,fontWeight:600,color:C.teal}}>CHF {mask(fmt(Math.round(businessTarget)))}/mo net</div>
          </div>
          <div style={{padding:"8px 12px",borderRadius:6,background:C.orange+"0d",border:`1px solid ${C.orange}22`}}>
            <div style={{fontSize:12,color:C.textDim}}>/ 0.65 for CH self-employed taxes</div>
            <div style={{fontSize:12,color:C.textDim,marginTop:2}}>(~10% AHV + ~25% income tax)</div>
            <div style={{fontSize:14,fontWeight:600,color:C.orange}}>CHF {mask(fmt(Math.round(businessTargetGross)))}/mo gross</div>
          </div>
        </div>
        <div style={{padding:"8px 12px",borderRadius:8,background:C.bg,border:`1px solid ${C.border}33`,fontSize:12,color:C.textDim,lineHeight:1.7}}>
          <strong style={{color:C.textMuted}}>Why × 5?</strong> A business generating 5× your essential costs gives you a comfortable buffer for taxes, reinvestment, savings, and lifestyle. The /0.65 adjusts for Swiss self-employed deductions: ~10% AHV/IV/EO on net profit + ~25% income tax (Zurich marginal rate).
        </div>
      </Card>
    </div>

    {/* ── Indentured Time Calculator ── */}
    <h2 style={{fontSize:18,fontWeight:700,color:C.text,margin:"0 0 4px"}}>Indentured Time Calculator</h2>
    <p style={{fontSize:14,color:C.textMuted,marginBottom:12}}>How many hours of your life does a purchase actually cost?</p>
    <div style={{padding:"10px 14px",borderRadius:8,background:C.accent+"0a",border:`1px solid ${C.accent}15`,fontSize:12,color:C.textDim,lineHeight:1.7,marginBottom:16}}>
      <strong style={{color:C.text}}>The concept:</strong> Every purchase is paid for with your time. Your <strong style={{color:C.yellow}}>net hourly rate</strong> = annual net salary ÷ actual working hours (after vacation and public holidays). Enter any amount below to see how many hours, days, or weeks of work it really costs you.
    </div>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16}}>
      <Card>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div>
            <div style={{fontSize:13,color:C.textMuted,marginBottom:6}}>Your net hourly rate</div>
            <div style={{fontSize:30,fontWeight:400,fontFamily:"'Fraunces',serif",color:C.yellow}}>CHF {mask(fmtD(hourlyRate))}/h</div>
            <div style={{fontSize:12,color:C.textDim,marginTop:2}}>{sc?`CHF ${mask(fmt(Math.round(inc*12)))}/yr net ÷ ${Math.round(annualHours)}h/yr (${hoursPerWeek}h × ${workingWeeks} weeks)`:"No active scenario"}</div>
          </div>
          <div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:C.textMuted,marginBottom:6}}>
              <span>Work hours / week</span>
              <span style={{color:C.accent,fontWeight:600}}>{hoursPerWeek}h</span>
            </div>
            <input type="range" min={20} max={50} step={1} value={hoursPerWeek} onChange={e=>setHoursPerWeek(Number(e.target.value))} style={{width:"100%",accentColor:C.accent}}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.textDim,marginTop:2}}>
              <span>Part-time</span>
              <span>40h standard (ArG Art. 9)</span>
              <span>50h max</span>
            </div>
          </div>
          <div>
            <div style={{fontSize:13,color:C.textMuted,marginBottom:6}}>Purchase amount (CHF)</div>
            <input
              type="text"
              value={purchase}
              onChange={e=>setPurchase(e.target.value)}
              placeholder="e.g. 50000"
              style={{width:"100%",padding:"10px 12px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:17,outline:"none",boxSizing:"border-box"}}
            />
          </div>
        </div>
      </Card>
      <Card>
        {purchaseAmt > 0 && hourlyRate > 0 ? <>
          <div style={{fontSize:13,color:C.textMuted,marginBottom:16}}>A purchase of <strong style={{color:C.text}}>CHF {fmt(purchaseAmt)}</strong> costs you:</div>
          {[
            {label:"Working hours", value:`${Math.round(hoursNeeded).toLocaleString("de-CH")}h`, sub:"net hours at your current salary", color:C.red},
            {label:"Working days", value:`${daysNeeded.toFixed(1)} days`, sub:`at ${hoursPerWeek/5}h/day`, color:C.orange},
            {label:"Working weeks", value:`${weeksNeeded.toFixed(1)} weeks`, sub:`at ${hoursPerWeek}h/week`, color:C.yellow},
            {label:"Working months", value:`${(weeksNeeded/4.33).toFixed(1)} months`, sub:"approx. calendar months", color:C.green},
          ].map((r,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:i<3?`1px solid ${C.border}22`:"none"}}>
            <div>
              <div style={{fontSize:14,color:C.textMuted}}>{r.label}</div>
              <div style={{fontSize:12,color:C.textDim}}>{r.sub}</div>
            </div>
            <div style={{fontSize:20,fontWeight:700,color:r.color}}>{r.value}</div>
          </div>)}
          <div style={{marginTop:12,padding:"10px 12px",borderRadius:8,background:C.bg,fontSize:12,color:C.textDim,lineHeight:1.7}}>
            Based on {Math.round(annualHours).toLocaleString("de-CH")}h/yr = {hoursPerWeek}h/week × {workingWeeks} working weeks (52 − 5 vacation − ~2 public holidays). Net income used — no gross-to-net conversion needed as your scenario already tracks net salary.
          </div>
        </> : <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",color:C.textDim,fontSize:13}}>
          Enter a purchase amount to see how many hours of work it costs.
        </div>}
      </Card>
    </div>
  </div>;
}

// ───────────────────────────────────────────────────────────────
// AI CHAT PANEL
// ───────────────────────────────────────────────────────────────
function ChatPanel({ accounts, scenarios, subsP, subsPInScenario, yearly, taxes, insurance, profile, open, setOpen, externalInput, setExternalInput, promptTemplate, onPinned }) {
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
    <button onMouseDown={startDrag} onClick={()=>{ if(!isDragging.current) setOpen(o=>!o); }} title="AI Finance Advisor" style={{position:"fixed",bottom:btnPos.bottom,right:btnPos.right,width:52,height:52,borderRadius:26,background:C.accent,border:"none",cursor:"grab",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 20px rgba(37,99,235,0.5)",zIndex:1000,userSelect:"none"}}>
      <Sparkles size={22} color="#fff"/>
    </button>

    {/* Panel */}
    {open && maximized && <div onClick={()=>setMaximized(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:1001,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}/>}
    {open && <div style={maximized?{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"min(92vw,1140px)",height:"84vh",background:C.card,border:`1px solid ${C.border}`,borderRadius:16,display:"flex",flexDirection:"column",zIndex:1002,boxShadow:"0 24px 80px rgba(0,0,0,0.6)",overflow:"hidden"}:{position:"fixed",bottom:btnPos.bottom+64,right:btnPos.right,width:panelW,height:typeof window !== 'undefined' && window.innerWidth < 768 ? 'calc(100vh - 120px)' : 520,background:C.card,border:`1px solid ${C.border}`,borderRadius:16,display:"flex",flexDirection:"column",zIndex:1000,boxShadow:"0 8px 40px rgba(0,0,0,0.5)",overflow:"hidden"}}>
      {/* Attachment-findings confirm modal — shown BEFORE the provider consent modal
          when the pre-send scan turned up sensitive data in the attached file. */}
      {pendingAttachmentConfirm && <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.75)',zIndex:11,display:'flex',alignItems:'center',justifyContent:'center',padding:20,borderRadius:16}}>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:22,maxWidth:420,width:'100%',boxShadow:'0 8px 40px rgba(0,0,0,0.5)',maxHeight:'90%',overflowY:'auto'}}>
          <div style={{fontSize:16,marginBottom:6,display:'flex',alignItems:'center',gap:8,fontWeight:600,color:C.text}}><Info size={18} color={C.accent}/>Heads up — personal data detected</div>
          <div style={{fontSize:12,color:C.textDim,marginBottom:14,display:'flex',alignItems:'center',gap:4}}><Paperclip size={11}/> {pendingAttachmentConfirm.sentAttachment.name}</div>
          <div style={{fontSize:13,color:C.textMuted,lineHeight:1.6,marginBottom:12}}>
            This file appears to contain personal information that will be sent to <strong style={{color:C.accent}}>{aiProvider?.label || 'the cloud provider'}</strong>. Unlike text, file contents cannot be automatically masked.
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
            <button onClick={handleAttachmentConfirmCancel} style={{flex:1,padding:'10px 0',borderRadius:8,border:`1px solid ${C.border}`,background:'transparent',color:C.textMuted,fontSize:14,cursor:'pointer'}}>Cancel</button>
            <button onClick={handleAttachmentConfirmAccept} style={{flex:1,padding:'10px 0',borderRadius:8,border:'none',background:C.accent,color:'#fff',fontWeight:700,fontSize:14,cursor:'pointer'}}>Continue</button>
          </div>
        </div>
      </div>}

      {/* Consent modal */}
      {pendingConsent && <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.75)',zIndex:10,display:'flex',alignItems:'center',justifyContent:'center',padding:20,borderRadius:16}}>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:24,maxWidth:380,width:'100%',boxShadow:'0 8px 40px rgba(0,0,0,0.5)'}}>
          <div style={{fontSize:20,marginBottom:12,display:'flex',alignItems:'center',gap:8}}><Cloud size={20}/> Cloud AI Privacy Notice</div>
          <div style={{fontSize:13,color:C.text,lineHeight:1.7,marginBottom:12}}>
            You are using <strong style={{color:C.accent}}>{aiProvider?.label || 'a cloud AI provider'}</strong>. Your financial context — balances, income, expenses, and scenarios — is sent with each message.
          </div>
          <div style={{fontSize:12,color:C.green,lineHeight:1.6,marginBottom:10,padding:'10px 14px',background:C.green+'15',borderRadius:9,border:`1px solid ${C.green}33`}}>
            <strong>PII masked automatically.</strong> Names, AHV, IBAN, email, phone, and addresses are replaced with placeholders (PERSON_1, AHV_1…) before leaving this server. The provider never sees your identity. Real values are restored in the response shown to you.
          </div>
          <div style={{fontSize:12,color:C.orange,lineHeight:1.6,marginBottom:10,padding:'10px 14px',background:C.orange+'15',borderRadius:9,border:`1px solid ${C.orange}33`}}>
            <AlertTriangle size={12} style={{marginRight:4,flexShrink:0}}/> <strong>File attachments are not fully masked.</strong> PDFs and images go to the provider as-is — anything written inside them (names, numbers, signatures) will be visible. Text files (CSV/JSON/TXT) get the regex pass but random names inside may slip through. Strip sensitive data before uploading if that matters to you.
          </div>
          <div style={{fontSize:11,color:C.textDim,lineHeight:1.6,marginBottom:18}}>
            Canton, marital status, age, and children are <em>not</em> masked — they shape tax advice and aren't identifying alone. To keep 100% of data local, switch to <strong>Ollama</strong> in AI Settings.
          </div>
          <div style={{display:'flex',gap:10}}>
            <button onClick={handleConsentAccept} style={{flex:1,padding:'10px 0',borderRadius:8,border:'none',background:C.accent,color:'#fff',fontWeight:700,fontSize:14,cursor:'pointer'}}>I understand — continue</button>
            <button onClick={handleConsentDecline} style={{padding:'10px 16px',borderRadius:8,border:`1px solid ${C.border}`,background:'transparent',color:C.textMuted,fontSize:14,cursor:'pointer'}}>Cancel</button>
          </div>
        </div>
      </div>}

      {/* Header */}
      <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",background:C.bg}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <Sparkles size={16} color={C.accentLight}/>
          <span style={{fontSize:14,fontWeight:600,color:C.text}}>AI Finance Advisor</span>
          {providerIsLocal
            ? <span style={{fontSize:10,padding:'1px 7px',borderRadius:9,background:C.green+'22',color:C.green,fontWeight:700,display:'inline-flex',alignItems:'center'}}><Lock size={10} style={{marginRight:2}}/> Local</span>
            : aiProvider?.provider && <>
                <span style={{fontSize:10,padding:'1px 7px',borderRadius:9,background:C.orange+'22',color:C.orange,fontWeight:700,display:'inline-flex',alignItems:'center'}}><Cloud size={10} style={{marginRight:2}}/> {aiProvider.label}</span>
                <span title="Names, AHV, IBAN, email, phone and addresses are replaced with placeholders before leaving this server. The cloud provider never sees your real identity." style={{fontSize:10,padding:'1px 7px',borderRadius:9,background:C.green+'22',color:C.green,fontWeight:700,cursor:'help',display:'inline-flex',alignItems:'center',whiteSpace:'nowrap'}}><ShieldCheck size={10} style={{marginRight:3}}/>PII masked</span>
              </>
          }
        </div>
        <div style={{display:"flex",gap:6,alignItems:'center'}}>
          {messages.length>0 && <button onClick={()=>setMessages([])} title="Clear chat" style={{padding:"4px 8px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.textDim,fontSize:12,cursor:"pointer"}}>Clear</button>}
          {messages.some(m=>m.role==="assistant"&&m.content) && <button onClick={pinLastResponse} title="Pin last AI response to notes" style={{padding:"4px 8px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:saved?C.green:pinPending?C.yellow:C.textDim,fontSize:12,cursor:"pointer"}}>{saved?"✓ Pinned":pinPending?<><RefreshCw size={11} style={{animation:'spin 1s linear infinite',marginRight:2}}/> Pinning…</>:<><Pin size={11} style={{marginRight:2}}/> Pin</>}</button>}
          <button onClick={()=>setMaximized(m=>!m)} title={maximized?"Restore":"Maximize"} style={{background:"transparent",border:"none",cursor:"pointer",color:C.textDim,padding:4,display:'flex'}}>{maximized?<Minimize2 size={15}/>:<Maximize2 size={15}/>}</button>
          <button onClick={()=>setOpen(false)} style={{background:"transparent",border:"none",cursor:"pointer",color:C.textDim,padding:4,display:'flex'}}><X size={16}/></button>
        </div>
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:12}}>
        {messages.length===0 && <div style={{color:C.textDim,fontSize:14,textAlign:"center",marginTop:40,lineHeight:1.7}}>
          Ask anything about your finances.<br/>
          <span style={{fontSize:13,opacity:0.7}}>e.g. "How long is my survival runway?" or "Am I maxing my 3a?"</span>
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
              <span>Scanning file for sensitive data…</span>
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
              <span>Sensitive data detected: <strong>{items.join(' · ')}</strong>. This file goes to <strong>{aiProvider?.label || 'the cloud provider'}</strong> as-is — masking cannot rewrite binary contents. You'll see a confirmation before sending.{scanResult.pageLimitHit && <> <em>Page limit reached — content beyond page {scanResult.pageCount} was not scanned and may contain more.</em></>}</span>
            </div>;
          }
          if (scanResult?.supported && scanResult.totalFindings === 0) {
            return <div title={`Scan method${methodNote}`} style={{margin:"6px 14px 0",padding:"6px 10px",fontSize:11,lineHeight:1.5,color:C.green,background:C.green+'15',border:`1px solid ${C.green}33`,borderRadius:7,display:"flex",gap:6,alignItems:"center"}}>
              <ShieldCheck size={12} style={{flexShrink:0}}/>
              <span>Scanned{scanResult.method === 'pdf-ocr' ? ` (OCR'd ${scanResult.pageCount} page${scanResult.pageCount > 1 ? 's' : ''})` : ''} — no obvious PII patterns (AHV, IBAN, email, phone, address) found in this file.</span>
            </div>;
          }
          if (scanResult?.supported && scanResult.extractionEmpty) {
            return <div style={{margin:"6px 14px 0",padding:"6px 10px",fontSize:11,lineHeight:1.5,color:C.orange,background:C.orange+'15',border:`1px solid ${C.orange}33`,borderRadius:7,display:"flex",gap:6,alignItems:"flex-start"}}>
              <AlertTriangle size={12} style={{flexShrink:0,marginTop:1}}/>
              <span>Could not read this file's contents (likely a scanned PDF with no text layer). <strong>We cannot verify what's inside</strong> — it will still be sent to {aiProvider?.label || 'the cloud provider'} as-is.</span>
            </div>;
          }
          // Extraction error or unsupported type — still warn generically.
          return <div style={{margin:"6px 14px 0",padding:"6px 10px",fontSize:11,lineHeight:1.5,color:C.orange,background:C.orange+'15',border:`1px solid ${C.orange}33`,borderRadius:7,display:"flex",gap:6,alignItems:"flex-start"}}>
            <AlertTriangle size={12} style={{flexShrink:0,marginTop:1}}/>
            <span>File contents could not be pre-scanned ({scanResult?.error || scanResult?.reason || 'unsupported format'}). It will be sent to {aiProvider?.label || 'the cloud provider'} as-is.</span>
          </div>;
        })()}
        <div style={{padding:"12px 14px",display:"flex",gap:8,alignItems:"center"}}>
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,.pdf,.txt,.csv,.md,.json" style={{display:"none"}}/>
          <button onClick={()=>fileInputRef.current?.click()} disabled={streaming} title="Attach file" style={{padding:"8px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:attachment?C.accent:C.textDim,cursor:"pointer",display:"flex",flexShrink:0}}>
            <Paperclip size={15}/>
          </button>
          <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}} placeholder="Ask about your finances…" disabled={streaming} style={{flex:1,padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.card,color:C.text,fontSize:14,outline:"none"}}/>
          <button onClick={sendMessage} disabled={streaming||(!input.trim()&&!attachment)} style={{padding:"9px 14px",borderRadius:8,border:"none",background:streaming||(!input.trim()&&!attachment)?C.border:C.accent,color:streaming||(!input.trim()&&!attachment)?C.textDim:"#fff",cursor:streaming||(!input.trim()&&!attachment)?"not-allowed":"pointer",fontSize:14,fontWeight:600,flexShrink:0}}>
            {streaming?<div style={{display:'flex',gap:2,alignItems:'center',padding:'0 4px'}}>{[0,1,2].map(i=><div key={i} style={{width:4,height:4,borderRadius:'50%',background:'#fff',animation:`aipulse 1.2s ease-in-out ${i*0.2}s infinite`}}/>)}</div>:"Send"}
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
function PortfolioPage({ accounts, setAccounts, hideBalances, setChatOpen, setChatInput }) {
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
      <StatCard label="Total Portfolio" value={`CHF ${mask(fmt(Math.round(totalPortfolio)))}`} icon={Wallet} color={C.accent}/>
      <StatCard label="Total Invested" value={`CHF ${mask(fmt(Math.round(totalInvested)))}`} sub="cost basis in positions" icon={TrendingUp} color={C.blue}/>
      <StatCard label="Current Value" value={`CHF ${mask(fmt(Math.round(totalCurrentVal)))}`} sub={lastFetched?`prices at ${lastFetched.toLocaleTimeString('de-CH',{hour:'2-digit',minute:'2-digit'})}`:'no live prices'} icon={BarChart3} color={C.teal}/>
      <StatCard
        label="Overall P&L"
        value={overallPnLPct!=null?`${overallPnLPct>=0?'+':''}${overallPnLPct.toFixed(2)}%`:'—'}
        sub={totalInvested>0?`CHF ${mask(fmt(Math.round(totalCurrentVal-totalInvested)))}`:'no positions'}
        icon={ArrowUpRight}
        color={overallPnLPct==null?C.textDim:overallPnLPct>=0?C.green:C.red}
      />
    </div>

    {/* All Accounts */}
    <Card title="Accounts & Positions" style={{marginBottom:24}}
      headerRight={
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {stale && <span style={{fontSize:12,color:C.yellow,display:'flex',alignItems:'center',gap:3}}><AlertTriangle size={12}/> Prices may be stale</span>}
          {lastFetched && !stale && <span style={{fontSize:12,color:C.textDim}}>prices at {lastFetched.toLocaleTimeString('de-CH',{hour:'2-digit',minute:'2-digit'})}</span>}
          {allTickers.length>0 && <button onClick={refresh} disabled={quotesLoading} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 10px',borderRadius:6,border:`1px solid ${C.border}`,background:'transparent',color:quotesLoading?C.textDim:C.accentLight,fontSize:13,cursor:quotesLoading?'not-allowed':'pointer'}}>
            <RefreshCw size={12}/>{quotesLoading?'Loading…':'Refresh'}
          </button>}
        </div>
      }>
      {accounts.filter(a=>a.type!=="Debt").length===0 && <div style={{textAlign:'center',padding:'32px 0',color:C.textDim,fontSize:13}}>No accounts — add some on the Accounts page.</div>}
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
              {ago && <span style={{fontSize:10,color:C.textDim,marginLeft:4}}>Updated {ago}</span>}
            </div>
            <div style={{display:'flex',gap:16,alignItems:'center',flexWrap:'wrap',justifyContent:'flex-end'}}>
              {annualReturn!=null && <div style={{textAlign:'right'}}><div style={{fontSize:10,color:C.textDim}}>Rate / Yield</div><div style={{fontSize:13,color:C.green}}>{account.interestRate}% · CHF {mask(fmt(Math.round(annualReturn)))}/yr</div></div>}
              <div style={{textAlign:'right'}}><div style={{fontSize:10,color:C.textDim}}>Balance</div><div style={{fontSize:14,fontWeight:600,color:account.type==="Debt"?C.red:C.text}}>{account.type==="Debt"&&account.balance>0?"−":""}{mask(fmt(account.balance))}</div></div>
              {acctInvested>0&&<>
                <div style={{textAlign:'right'}}><div style={{fontSize:10,color:C.textDim}}>Invested</div><div style={{fontSize:14,color:C.textMuted}}>{mask(fmt(Math.round(acctInvested)))}</div></div>
                <div style={{textAlign:'right'}}><div style={{fontSize:10,color:C.textDim}}>Current</div><div style={{fontSize:14,fontWeight:600,color:C.teal}}>{mask(fmt(Math.round(acctCurrentVal)))}</div></div>
                {acctPnLPct!=null&&<div style={{textAlign:'right'}}><div style={{fontSize:10,color:C.textDim}}>P&L</div><div style={{fontSize:14,fontWeight:600,color:acctPnLPct>=0?C.green:C.red}}>{acctPnLPct>=0?'+':''}{acctPnLPct.toFixed(1)}%</div></div>}
              </>}
            </div>
          </div>

          {canExpand&&isExpanded&&<div style={{padding:'0 16px 16px'}}>
            {positions.length>0 ? (
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',marginTop:8,minWidth:580}}>
                  <thead><tr>
                    {['Ticker','Name','Shares','Avg Buy','Price','Δ%','Value','P&L',''].map((h,i)=><TH key={i}>{h}</TH>)}
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
              <div style={{fontSize:14,color:C.textDim,textAlign:'center',padding:'16px 0'}}>No positions — add one below</div>
            )}
            {/* Add position / ticker search */}
            <div style={{marginTop:12,display:'flex',gap:8,alignItems:'center'}}>
              <div style={{flex:1,position:'relative'}}>
                <input value={searchQ[account.id]||''} onChange={e=>handleSearch(account.id,e.target.value)}
                  placeholder="Search ticker (e.g. VT, NOVN.SW, BTC-USD)…"
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
                <Plus size={13}/>Manual
              </button>
            </div>
            <div style={{fontSize:10,color:C.textDim,marginTop:4}}>
              Swiss stocks: use <code style={{background:C.bg,padding:'1px 3px',borderRadius:2,fontSize:10}}>.SW</code> suffix (e.g. <code style={{background:C.bg,padding:'1px 3px',borderRadius:2,fontSize:10}}>NOVN.SW</code>). Crypto: <code style={{background:C.bg,padding:'1px 3px',borderRadius:2,fontSize:10}}>BTC-USD</code>
            </div>
          </div>}
        </div>;
      })}
    </Card>

    {/* Allocation chart */}
    {pieData.length>0&&<Card title="Allocation" style={{marginBottom:24}}>
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
    <Card title="AI Portfolio Analysis">
      <p style={{margin:'0 0 14px',fontSize:13,color:C.textDim}}>Open the AI advisor with pre-loaded portfolio context.</p>
      <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
        <button onClick={()=>{setChatInput('Analyse my portfolio — give me a breakdown of my asset allocation, performance of positions, and top 3 concrete actions to improve my investment strategy as a Swiss investor.');setChatOpen(true);}} style={{padding:'10px 16px',borderRadius:8,border:`1px solid ${C.accent}44`,background:C.accent+'18',color:C.accentLight,fontSize:14,cursor:'pointer'}}>
          Analyse my portfolio
        </button>
        <button onClick={()=>{setChatInput('Suggest a rebalancing strategy for my portfolio. I am a Swiss investor. Consider my savings rate, current asset allocation, and any underweight or overweight categories based on my age and goals.');setChatOpen(true);}} style={{padding:'10px 16px',borderRadius:8,border:`1px solid ${C.teal}44`,background:C.teal+'18',color:C.teal,fontSize:14,cursor:'pointer'}}>
          Suggest rebalancing
        </button>
        <button onClick={()=>{setChatInput('What are the Swiss tax implications of my current investments? Explain capital gains tax, dividend tax, and wealth tax rules relevant to my portfolio.');setChatOpen(true);}} style={{padding:'10px 16px',borderRadius:8,border:`1px solid ${C.yellow}44`,background:C.yellow+'18',color:C.yellow,fontSize:14,cursor:'pointer'}}>
          Tax implications (CH)
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
function AISettingsPage() {
  const PROVIDERS = [
    { id: 'auto',      label: 'Auto (server)',        desc: 'Use whichever provider the server has configured via .env',       cloud: false },
    { id: 'anthropic', label: 'Anthropic (Claude)',   desc: 'claude-opus-4-6 · web-search capable · data sent to Anthropic',  cloud: true  },
    { id: 'openai',    label: 'OpenAI (GPT-4o)',      desc: 'gpt-4o · powerful · data sent to OpenAI',                        cloud: true  },
    { id: 'gemini',    label: 'Google Gemini',        desc: 'gemini-2.0-flash · fast · data sent to Google',                  cloud: true  },
    { id: 'ollama',    label: 'Ollama (local)',        desc: '100% local · no data leaves your machine · requires Ollama',     cloud: false },
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
            Currently active: <span style={{color:C.accent}}>
              {activeLocal ? (PROVIDERS.find(p => p.id === storedConfig.provider)?.label || storedConfig.provider) : (serverProvider?.label || '…')}
            </span>
            {activeLocal && <span style={{fontSize:11,color:C.blue,marginLeft:8,padding:'1px 7px',borderRadius:10,background:C.blue+'22'}}>custom (localStorage)</span>}
            {!activeLocal && serverProvider && <span style={{fontSize:11,color:C.textDim,marginLeft:8,padding:'1px 7px',borderRadius:10,background:C.border}}>.env</span>}
          </div>
          {serverProvider?.description && !activeLocal && <div style={{fontSize:12,color:C.textDim,marginTop:2}}>{serverProvider.description}</div>}
          {activeLocal && <div style={{fontSize:12,color:C.textDim,marginTop:2}}>Your custom override — set below. Clear to revert to server .env config.</div>}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          {ollamaModels === null && <span style={{fontSize:12,color:C.textDim}}>Checking Ollama…</span>}
          {ollamaModels !== null && ollamaModels.length > 0 && <span style={{fontSize:12,color:C.green,display:'flex',alignItems:'center',gap:4}}><div style={{width:7,height:7,borderRadius:'50%',background:C.green}}/> Ollama detected ({ollamaModels.length} model{ollamaModels.length>1?'s':''})</span>}
          {ollamaModels !== null && ollamaModels.length === 0 && <span style={{fontSize:12,color:C.textMuted,display:'flex',alignItems:'center',gap:4}}><WifiOff size={12}/> Ollama not detected</span>}
        </div>
      </div>

      <Card title="Configure AI Provider">
        {/* Provider selector */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:12,color:C.textDim,fontWeight:600,textTransform:'uppercase',letterSpacing:0.5,marginBottom:10}}>Provider</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {PROVIDERS.map(p => (
              <label key={p.id} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'10px 14px',borderRadius:9,border:`1px solid ${editConfig.provider===p.id?C.accent:C.border}`,background:editConfig.provider===p.id?C.accent+'0d':C.bg,cursor:'pointer',transition:'border-color .15s'}}>
                <input type="radio" name="provider" value={p.id} checked={editConfig.provider===p.id} onChange={()=>setEditConfig(c=>({...c,provider:p.id,model:'',apiKey:'',baseUrl:''}))} style={{marginTop:2,accentColor:C.accent,flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.text,display:'flex',alignItems:'center',gap:8}}>
                    {p.label}
                    {p.cloud && <span style={{fontSize:10,padding:'1px 6px',borderRadius:8,background:C.orange+'22',color:C.orange,fontWeight:700,display:'inline-flex',alignItems:'center'}}><Cloud size={10} style={{marginRight:2}}/> Cloud</span>}
                    {!p.cloud && p.id!=='auto' && <span style={{fontSize:10,padding:'1px 6px',borderRadius:8,background:C.green+'22',color:C.green,fontWeight:700,display:'inline-flex',alignItems:'center'}}><Lock size={10} style={{marginRight:2}}/> Local</span>}
                    {p.id==='ollama' && ollamaModels !== null && ollamaModels.length > 0 && <span style={{fontSize:10,padding:'1px 6px',borderRadius:8,background:C.green+'22',color:C.green}}>● running</span>}
                    {p.id==='ollama' && ollamaModels !== null && ollamaModels.length === 0 && <span style={{fontSize:10,padding:'1px 6px',borderRadius:8,background:C.red+'22',color:C.red}}>not detected</span>}
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
                  <Key size={12}/> API Key
                </label>
                {inp(editConfig.apiKey, v => setEditConfig(c=>({...c,apiKey:v})), 'Paste your API key here (stored in browser localStorage only)', 'password')}
                <div style={{fontSize:11,color:C.textDim,marginTop:4}}>Stored locally in your browser — never sent to the server unless actively used for a chat or test.</div>
              </div>
            )}
            <div>
              <label style={{fontSize:12,color:C.accent,fontWeight:600,textTransform:'uppercase',letterSpacing:0.5,display:'block',marginBottom:6}}>Model (optional)</label>
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
                  {editConfig.provider==='ollama'?'Ollama Base URL':'Custom Base URL (optional)'}
                </label>
                {inp(editConfig.baseUrl, v => setEditConfig(c=>({...c,baseUrl:v})),
                  editConfig.provider==='ollama'?'http://localhost:11434 (default: host.docker.internal)':'Leave blank for default OpenAI endpoint')}
                {editConfig.provider==='ollama' && <div style={{fontSize:11,color:C.textDim,marginTop:4}}>Set to http://localhost:11434 if running Ollama on the same machine as your browser (not in Docker).</div>}
              </div>
            )}
          </div>
        )}

        {/* Ollama model list */}
        {editConfig.provider==='ollama' && ollamaModels && ollamaModels.length > 0 && (
          <div style={{marginTop:10,padding:'10px 14px',background:C.green+'0d',borderRadius:9,border:`1px solid ${C.green+'44'}`}}>
            <div style={{fontSize:12,fontWeight:600,color:C.green,marginBottom:6}}>Ollama models available locally:</div>
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
            {saved ? '✓ Saved' : 'Save'}
          </button>
          <button onClick={handleTest} disabled={testing || (editConfig.provider==='auto' && !serverProvider?.provider)} title={editConfig.provider==='auto'?`Test the server's .env provider${serverProvider?.provider?` (${serverProvider.provider})`:''}`:undefined} style={{padding:'9px 18px',borderRadius:8,border:`1px solid ${C.border}`,background:'transparent',color:C.text,fontSize:14,cursor:(testing||(editConfig.provider==='auto'&&!serverProvider?.provider))?'not-allowed':'pointer',opacity:(testing||(editConfig.provider==='auto'&&!serverProvider?.provider))?0.6:1}}>
            {testing ? 'Testing…' : (editConfig.provider==='auto' ? `Test .env Connection${serverProvider?.provider?` (${serverProvider.provider})`:''}` : 'Test Connection')}
          </button>
          {storedConfig && (
            <button onClick={()=>{ localStorage.removeItem('finance_hub_provider_config'); setEditConfig({provider:'auto',apiKey:'',model:'',baseUrl:''}); setSaved(false); setTestResult({ok:true,msg:'Cleared — reverted to server config.'}); }} style={{padding:'9px 16px',borderRadius:8,border:`1px solid ${C.red+'55'}`,background:'transparent',color:C.red,fontSize:14,cursor:'pointer'}}>
              Clear override
            </button>
          )}
        </div>

        {testResult && (
          <div style={{marginTop:14,padding:'10px 14px',borderRadius:9,background:testResult.ok?C.green+'0d':C.red+'0d',border:`1px solid ${testResult.ok?C.green+'44':C.red+'44'}`,fontSize:13,color:testResult.ok?C.green:C.red}}>
            {testResult.ok ? `✓ Connection successful${testResult.model?` — model: ${testResult.model}`:''}${testResult.msg?' — '+testResult.msg:''}` : `✗ ${testResult.error || 'Test failed'}`}
          </div>
        )}
      </Card>

      {/* Privacy note */}
      <div style={{marginTop:16,padding:'14px 18px',borderRadius:10,background:C.card,border:`1px solid ${C.border}`,fontSize:13,color:C.textMuted,lineHeight:1.7}}>
        <strong style={{color:C.text}}>Privacy note:</strong> API keys are stored in your browser's <code style={{background:C.bg,padding:'1px 5px',borderRadius:4}}>localStorage</code> only. They are sent to your self-hosted backend server solely when you use the AI chat or run a connection test. Cloud providers (Anthropic, OpenAI, Gemini) receive your financial context with each message — switch to Ollama for full local privacy.
      </div>
    </div>
  );
}

// ── Transactions Page ──
function TransactionsPage({ transactions, setTransactions, hideBalances }) {
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const [importPct, setImportPct] = useState(0);
  const [importPreview, setImportPreview] = useState(null);
  const [importName, setImportName] = useState('');
  const [importError, setImportError] = useState(null);
  const [filter, setFilter] = useState({ search: '', category: '', dateFrom: '', dateTo: '' });
  const [sort, setSort] = useState({ col: 'date', asc: false });
  const [editingRules, setEditingRules] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const fileRef = useRef(null);

  const DEFAULT_CATEGORIES = ['Groceries','Dining & Restaurants','Transport','Entertainment','Shopping','Health & Fitness','Subscriptions & Fees','Housing','Transfers','Income','Other'];
  const allCategories = [...DEFAULT_CATEGORIES, ...(transactions.customCategories || [])];

  const allTxns = (transactions.imports || []).flatMap(imp => imp.transactions.map(t => ({ ...t, importName: imp.name, currency: imp.currency })));

  // FX rates for currency conversion to CHF
  const [fxRates, setFxRates] = useState({ CHF: 1 });
  useEffect(() => {
    const currencies = [...new Set(allTxns.map(t => t.currency).filter(c => c && c !== 'CHF'))];
    if (!currencies.length) return;
    const symbols = currencies.map(c => c + 'CHF=X').join(',');
    fetch(`${API_URL}/market/quotes?symbols=${symbols}`).then(r => r.json()).then(d => {
      const fx = { CHF: 1 };
      for (const c of currencies) { const key = c + 'CHF=X'; if (d.quotes?.[key]?.currentPrice) fx[c] = d.quotes[key].currentPrice; }
      setFxRates(fx);
    }).catch(() => {});
  }, [allTxns.length]);
  const toCHF = (amount, currency) => {
    if (!currency || currency === 'CHF') return amount;
    const rate = fxRates[currency];
    return rate ? amount * rate : amount;
  };

  const filtered = useMemo(() => {
    let list = allTxns;
    if (filter.search) { const s = filter.search.toLowerCase(); list = list.filter(t => t.description.toLowerCase().includes(s) || (t.category||'').toLowerCase().includes(s)); }
    if (filter.category) list = list.filter(t => t.category === filter.category);
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
      months[m][cat] = (months[m][cat] || 0) + Math.abs(toCHF(t.amount, t.currency));
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
{"currency":"CHF","transactions":[{"date":"YYYY-MM-DD","description":"Merchant name","amount":-12.50,"fee":0,"category":"Category","type":"Card Payment"}]}

Rules:
- date: use the completed/settled date in YYYY-MM-DD format
- description: merchant or transfer description as shown
- amount: negative for expenses, positive for income. Keep original sign from the data.
- fee: any fee charged, 0 if none
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
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Transactions</h2>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={() => setPromptOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', color: transactions.prompt ? C.accentLight : C.textMuted, fontSize: 12 }}><Sparkles size={12}/>Import Prompt{transactions.prompt ? ' ✓' : ''}</button>
        <button onClick={() => setEditingRules(!editingRules)} title="Category rules" style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.textMuted, borderRadius: 8, padding: '6px 8px', cursor: 'pointer' }}><ClipboardList size={15}/></button>
        {allTxns.length > 0 && (confirmDeleteAll
          ? <span style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 12 }}>
              <span style={{ color: C.textMuted }}>Delete all?</span>
              <button onClick={deleteAllTxns} style={{ background: C.red, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Yes</button>
              <button onClick={() => setConfirmDeleteAll(false)} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.textMuted, borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>No</button>
            </span>
          : <button onClick={() => setConfirmDeleteAll(true)} title="Delete all transactions" style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.red, borderRadius: 8, padding: '6px 8px', cursor: 'pointer', opacity: 0.7 }}><Trash2 size={15}/></button>
        )}
        <button onClick={() => fileRef.current?.click()} disabled={importing} style={{ background: C.accent, color: '#000', border: 'none', borderRadius: 8, padding: '7px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: importing ? 0.6 : 1 }}>
          <Upload size={14}/> {importing ? 'Importing…' : 'Import Statement'}
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
          <h2 style={{margin:0,fontSize:18,fontWeight:700,color:C.text}}>Transaction Import Prompt</h2>
          <button onClick={() => setPromptOpen(false)} style={{background:'transparent',border:'none',cursor:'pointer',color:C.textDim}}><X size={18}/></button>
        </div>
        <p style={{margin:'0 0 12px',fontSize:13,color:C.textDim}}>
          Customise the AI prompt used when importing bank statements. Leave blank to use the built-in default.
          Category rules are always appended automatically.
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
        {transactions.prompt && <div style={{marginTop:6,fontSize:12,color:C.green}}>✓ Custom import prompt active — will be used instead of the default.</div>}
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
          <h2 style={{margin:0,fontSize:18,fontWeight:700,color:C.text}}>Import Failed</h2>
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
        <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Category Rules</h3>
        <p style={{ color: C.textMuted, fontSize: 12, margin: '0 0 12px' }}>When a merchant matches a rule, it gets auto-categorized. Rules are also sent to the AI as context.</p>
        {(transactions.categoryRules || []).length === 0 && <p style={{ color: C.textDim, fontSize: 13 }}>No rules yet. Change a transaction's category to create one.</p>}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
          {(transactions.categoryRules || []).map((r, i) => <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
            <td style={{ padding: '6px 8px', fontSize: 13 }}>{r.match}</td>
            <td style={{ padding: '6px 8px', fontSize: 13, color: C.textMuted }}>{r.category}</td>
            <td style={{ padding: '6px 4px', textAlign: 'right' }}><button onClick={() => deleteRule(i)} style={{ background: 'transparent', border: 'none', color: C.red, cursor: 'pointer', padding: 2 }}><Trash2 size={13}/></button></td>
          </tr>)}
        </tbody></table>
        <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>Custom Categories</h4>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {(transactions.customCategories || []).map((c, i) => <span key={i} style={{ background: C.input, border: `1px solid ${C.border}`, borderRadius: 6, padding: '3px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>{c} <button onClick={() => setTransactions(prev => ({ ...prev, customCategories: prev.customCategories.filter((_, j) => j !== i) }))} style={{ background: 'transparent', border: 'none', color: C.red, cursor: 'pointer', padding: 0 }}><X size={11}/></button></span>)}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCategory()} placeholder="New category…" style={{ flex: 1, background: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 8px', fontSize: 12 }} />
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
        <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Import Preview</h3>
        <p style={{ color: C.textMuted, fontSize: 12, margin: '0 0 14px' }}>{importPreview.transactions.length} transactions · {importPreview.currency || 'CHF'}{importPreview.failedBatches > 0 ? <span style={{ color: C.orange, marginLeft: 8 }}>({importPreview.failedBatches} batch{importPreview.failedBatches > 1 ? 'es' : ''} failed — some transactions may be missing)</span> : ''}</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
          <label style={{ fontSize: 12, color: C.textMuted }}>Name:</label>
          <input value={importName} onChange={e => setImportName(e.target.value)} style={{ flex: 1, background: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 8px', fontSize: 13 }} />
        </div>
        <div style={{ overflowX: 'auto', maxHeight: '50vh' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ position: 'sticky', top: 0, background: C.card }}><tr>
              <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.textDim }}>Date</th>
              <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.textDim }}>Description</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.textDim }}>Amount</th>
              <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.textDim }}>Category</th>
              <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.textDim }}>Type</th>
            </tr></thead>
            <tbody>{importPreview.transactions.map((t, i) => <tr key={i} style={{ borderBottom: `1px solid ${C.border}22` }}>
              <td style={{ padding: '5px 8px', whiteSpace: 'nowrap' }}>{t.date}</td>
              <td style={{ padding: '5px 8px' }}>{t.description}</td>
              <td style={{ padding: '5px 8px', textAlign: 'right', color: t.amount < 0 ? C.red : C.green, fontWeight: 500 }}>{t.amount < 0 ? '' : '+'}{t.amount.toFixed(2)}</td>
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
              <td style={{ padding: '5px 8px', color: C.textMuted, fontSize: 12 }}>{t.type}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button onClick={() => setImportPreview(null)} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.textMuted, borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button onClick={() => confirmImport('merge')} style={{ background: C.green, color: '#000', border: 'none', borderRadius: 8, padding: '7px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Merge (skip duplicates)</button>
          <button onClick={() => confirmImport('replace')} style={{ background: C.accent, color: '#000', border: 'none', borderRadius: 8, padding: '7px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Replace date range</button>
        </div>
      </div>
    </div>}

    {/* Filter bar */}
    {allTxns.length > 0 && <Card>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="date" value={filter.dateFrom} onChange={e => setFilter(f => ({ ...f, dateFrom: e.target.value }))} style={{ background: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 8px', fontSize: 12 }} />
        <span style={{ color: C.textDim, fontSize: 12 }}>to</span>
        <input type="date" value={filter.dateTo} onChange={e => setFilter(f => ({ ...f, dateTo: e.target.value }))} style={{ background: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 8px', fontSize: 12 }} />
        <select value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value }))} style={{ background: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 8px', fontSize: 12 }}>
          <option value="">All Categories</option>
          {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input placeholder="Search…" value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} style={{ flex: 1, minWidth: 120, background: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 8px', fontSize: 12 }} />
        {(filter.search || filter.category || filter.dateFrom || filter.dateTo) && <button onClick={() => setFilter({ search: '', category: '', dateFrom: '', dateTo: '' })} style={{ background: 'transparent', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 11 }}>Clear</button>}
      </div>
    </Card>}

    {/* Summary cards */}
    {allTxns.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
      {[
        { label: 'Income', value: totalIncome, color: C.green },
        { label: 'Expenses', value: totalExpenses, color: C.red },
        { label: 'Net', value: net, color: net >= 0 ? C.green : C.red },
        { label: 'Top Category', value: topCategory ? topCategory[1] : 0, color: C.accent, sub: topCategory ? topCategory[0] : '-' },
      ].map((s, i) => <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}{hasNonCHF ? ' (CHF)' : ''}</div>
        <div style={{ fontSize: 20, fontWeight: 600, color: s.color }}>{fmt(s.value)}</div>
        {s.sub && <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{s.sub}</div>}
      </div>)}
    </div>}

    {/* Charts */}
    {allTxns.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: pieData.length > 0 ? '1fr 1.5fr' : '1fr', gap: 14 }}>
      {pieData.length > 0 && <Card title="Spending by Category">
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
      {monthlyData.length > 1 && <Card title="Monthly Spending Trend">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.textMuted }} />
            <YAxis tick={{ fontSize: 11, fill: C.textMuted }} />
            <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
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
            <SortTH col="date">Date</SortTH>
            <SortTH col="description">Description</SortTH>
            <SortTH col="amount" style={{ textAlign: 'right' }}>Amount</SortTH>
            <SortTH col="category">Category</SortTH>
            <SortTH col="type">Type</SortTH>
            <th style={{ padding: '8px 10px', width: 32, borderBottom: `1px solid ${C.border}` }}></th>
          </tr></thead>
          <tbody>{filtered.map(t => <tr key={t.id} style={{ borderBottom: `1px solid ${C.border}22` }}>
            <td style={{ padding: '7px 10px', whiteSpace: 'nowrap', fontSize: 13 }}>{t.date}</td>
            <td style={{ padding: '7px 10px', fontSize: 13 }}>{t.description}</td>
            <td style={{ padding: '7px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              <div style={{ fontWeight: 500, fontSize: 13, color: t.amount < 0 ? C.red : C.green }}>{hideBalances ? '•••' : `${t.amount < 0 ? '' : '+'}${t.amount.toFixed(2)}`} {t.currency}</div>
              {t.currency && t.currency !== 'CHF' && fxRates[t.currency] && !hideBalances && <div style={{ fontSize: 11, color: C.textDim }}>{toCHF(t.amount, t.currency) < 0 ? '' : '+'}{toCHF(t.amount, t.currency).toFixed(2)} CHF</div>}
            </td>
            <td style={{ padding: '7px 10px' }}>
              <select value={t.category || 'Other'} onChange={e => handleCategoryChange(t.id, e.target.value)} style={{ background: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: 4, padding: '2px 6px', fontSize: 12, cursor: 'pointer' }}>
                {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </td>
            <td style={{ padding: '7px 10px', color: C.textMuted, fontSize: 12 }}>{t.type}</td>
            <td style={{ padding: '7px 4px', textAlign: 'right' }}><button onClick={() => deleteTxn(t.id)} style={{ background: 'transparent', border: 'none', color: C.red, cursor: 'pointer', padding: 2, opacity: 0.5 }}><Trash2 size={13}/></button></td>
          </tr>)}</tbody>
        </table>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: C.textDim }}>{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</div>
    </Card> : <Card>
      <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textMuted }}>
        <Receipt size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>No transactions yet</div>
        <div style={{ fontSize: 13 }}>Import a bank statement to see your spending breakdown</div>
      </div>
    </Card>}
  </div>;
}

const NAV = [
  { id:"dashboard", label:"Dashboard", icon:LayoutDashboard },
  { id:"accounts", label:"Accounts", icon:Landmark },
  { id:"portfolio", label:"Portfolio", icon:TrendingUp },
  { id:"scenarios", label:"Scenarios", icon:Target },
  { id:"tracker", label:"Tracker", icon:Activity },
  { id:"expenses", label:"Expenses", icon:CreditCard },
  { id:"transactions", label:"Transactions", icon:Receipt },
  { id:"pillars", label:"Strategy", icon:PiggyBank },
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
  const [onboarding, setOnboarding] = useState({ dismissed: false, welcomeAck: false, aiAdviserAck: false, dataCleared: false, backupDone: false, lastMonthlyUpdate: null, lastTrackerSync: null });
  const [darkMode, setDarkMode] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [notesVersion, setNotesVersion] = useState(0);
  const [ollamaDetected, setOllamaDetected] = useState(false);
  const [serverProviderLabel, setServerProviderLabel] = useState('');
  const [ollamaBannerDismissed, setOllamaBannerDismissed] = useState(() => sessionStorage.getItem('ollama_banner_dismissed') === 'true');
  const importJsonRef = useRef(null);
  C = darkMode ? DARK : LIGHT;

  // Load all data from API on mount
  useEffect(() => {
    const keys = ['accounts','scenarios','tracker','subscriptions_personal','yearly','taxes','insurance','settings','profile','transactions'];
    Promise.all(keys.map(k => fetch(`${API_URL}/${k}`).then(r => r.status === 404 ? null : r.json())))
      .then(([acc, sc, tr, subP, yr, tx, ins, settings, prof, txns]) => {
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
        }
        // profile key is loaded separately
        if (prof) setProfile(prof);
        if (txns) setTransactions(txns);
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
  useEffect(() => { save('settings', { subsPInScenario, promptTemplate, extractionPrompt, payrollExtractionPrompt, insPrompt, taxPrompt, recPrompt, subPrompt, onboarding }); }, [subsPInScenario, promptTemplate, extractionPrompt, payrollExtractionPrompt, insPrompt, taxPrompt, recPrompt, subPrompt, onboarding, save]);

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
          <div style={{fontSize:8,color:C.textDim,marginTop:1,fontFamily:"'DM Mono',monospace",letterSpacing:"0.08em",textTransform:"uppercase"}}>Personal Finance</div>
        </div>}
        {!isMobile && <button onClick={()=>setSidebarOpen(o=>!o)} style={{background:"transparent",border:"none",cursor:"pointer",color:C.textDim,padding:3,borderRadius:5,display:"flex",alignItems:"center",flexShrink:0}} title={sidebarOpen?"Collapse":"Expand"}>
          {sidebarOpen ? <ChevronLeft size={15}/> : <ChevronRight size={15}/>}
        </button>}
      </div>

      {/* Navigation */}
      <nav style={{display:"flex",flexDirection:"column",gap:1}}>
        {NAV.map(n=>{
          const a=page===n.id;
          return <button key={n.id} onClick={()=>{setPage(n.id);if(isMobile)setSidebarOpen(false);}} title={sidebarOpen?undefined:n.label}
            style={{display:"flex",alignItems:"center",gap:8,padding:sidebarOpen?"7px 10px":"8px 0",justifyContent:sidebarOpen?"flex-start":"center",borderRadius:7,border:"none",cursor:"pointer",fontSize:13,fontWeight:a?600:400,color:a?C.text:C.textMuted,background:a?C.accent+"18":"transparent",textAlign:"left",whiteSpace:"nowrap",transition:"background .12s,color .12s",position:"relative"}}>
            <n.icon size={15} color={a?C.accentLight:C.textDim}/>
            {sidebarOpen && <span style={{flex:1}}>{n.label}</span>}
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
          {sidebarOpen && <span style={{fontSize:11,color:C.textDim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{profile.firstName?`${profile.firstName} ${profile.lastName}`.trim():"Profile"}</span>}
        </button>

        {/* AI Prompt */}
        <button onClick={()=>setPromptOpen(true)} title={sidebarOpen?undefined:"AI Advisor Prompt"}
          style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"6px 10px",borderRadius:7,border:"none",background:"transparent",cursor:"pointer",textAlign:"left",justifyContent:sidebarOpen?"flex-start":"center",color:C.textMuted,marginBottom:2}}>
          <Sparkles size={14} color={C.accentLight}/>
          {sidebarOpen && <span style={{fontSize:11,color:C.textDim}}>AI Advisor Prompt</span>}
        </button>

        {/* AI Settings */}
        <button onClick={()=>{setPage('ai-settings');if(isMobile)setSidebarOpen(false);}} title={sidebarOpen?undefined:"AI Settings"}
          style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"6px 10px",borderRadius:7,border:"none",background:page==='ai-settings'?C.accent+"18":"transparent",cursor:"pointer",textAlign:"left",justifyContent:sidebarOpen?"flex-start":"center",color:page==='ai-settings'?C.accentLight:C.textMuted,marginBottom:4}}>
          <Settings size={14} color={page==='ai-settings'?C.accentLight:undefined}/>
          {sidebarOpen && <span style={{fontSize:11,color:page==='ai-settings'?C.accentLight:C.textDim}}>AI Settings</span>}
        </button>

        {/* Dark Mode toggle row */}
        {sidebarOpen ? (
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 10px",borderRadius:7}}>
            <div style={{display:"flex",alignItems:"center",gap:7,color:C.textMuted}}>
              {darkMode ? <Sun size={13}/> : <Moon size={13}/>}
              <span style={{fontSize:11}}>{darkMode?"Light Mode":"Dark Mode"}</span>
            </div>
            <Toggle on={darkMode} onToggle={()=>setDarkMode(d=>!d)}/>
          </div>
        ) : (
          <button onClick={()=>setDarkMode(d=>!d)} title={darkMode?"Light Mode":"Dark Mode"} style={{display:"flex",alignItems:"center",justifyContent:"center",width:"100%",padding:"8px 0",borderRadius:7,border:"none",background:"transparent",color:C.textMuted,cursor:"pointer"}}>
            {darkMode ? <Sun size={15}/> : <Moon size={15}/>}
          </button>
        )}

        {/* Hide Balances toggle row */}
        {sidebarOpen ? (
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 10px",borderRadius:7}}>
            <div style={{display:"flex",alignItems:"center",gap:7,color:C.textMuted}}>
              {hideBalances ? <EyeOff size={13}/> : <Eye size={13}/>}
              <span style={{fontSize:11}}>Hide Balances</span>
            </div>
            <Toggle on={hideBalances} onToggle={()=>setHideBalances(h=>!h)}/>
          </div>
        ) : (
          <button onClick={()=>setHideBalances(h=>!h)} title={hideBalances?"Show Balances":"Hide Balances"} style={{display:"flex",alignItems:"center",justifyContent:"center",width:"100%",padding:"8px 0",borderRadius:7,border:"none",background:"transparent",color:hideBalances?C.accentLight:C.textMuted,cursor:"pointer"}}>
            {hideBalances ? <EyeOff size={15}/> : <Eye size={15}/>}
          </button>
        )}

        {/* Getting Started */}
        <button onClick={()=>{setOnboarding(o=>({...o,dismissed:false}));setPage('dashboard');}} title={sidebarOpen?undefined:"Getting Started"}
          style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"6px 10px",borderRadius:7,border:"none",background:!onboarding.dismissed?C.accent+"18":"transparent",cursor:"pointer",textAlign:"left",justifyContent:sidebarOpen?"flex-start":"center",color:!onboarding.dismissed?C.accentLight:C.textMuted,marginTop:2}}>
          <BookOpen size={13}/>{sidebarOpen && <span style={{fontSize:11}}>Getting Started</span>}
        </button>

        {/* Export / Import */}
        {sidebarOpen && <div style={{display:"flex",gap:4,marginTop:6}}>
          <button onClick={async()=>{
            const keys=['accounts','scenarios','tracker','subscriptions_personal','yearly','taxes','insurance','settings','profile','ai_analysis','transactions'];
            const out={};
            for(const k of keys){ const r=await fetch(`${API_URL}/${k}`); out[k]=r.status===404?null:await r.json(); }
            const ts=new Date().toISOString().slice(0,16).replace('T','_').replace(':','');
            const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:'application/json'})); a.download=`finance_hub_${ts}.json`; a.style.display='none'; document.body.appendChild(a); a.click(); URL.revokeObjectURL(a.href); document.body.removeChild(a);
          }} style={{flex:1,padding:"4px 0",borderRadius:5,border:`1px solid ${C.border}`,background:"transparent",color:C.textDim,fontSize:10,cursor:"pointer",letterSpacing:"0.02em"}}>Export</button>
          <button onClick={()=>importJsonRef.current?.click()} style={{flex:1,padding:"4px 0",borderRadius:5,border:`1px solid ${C.border}`,background:"transparent",color:C.textDim,fontSize:10,cursor:"pointer",letterSpacing:"0.02em"}}>Import</button>
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
          <h1 style={{fontSize:20,fontWeight:700,margin:0}}>{NAV.find(n=>n.id===page)?.label}</h1>
        </div>}
        {!isMobile && <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
          <h1 style={{fontSize:26,fontWeight:400,fontFamily:"'Fraunces',serif",margin:0}}>{NAV.find(n=>n.id===page)?.label}</h1>
        </div>}

        {/* Ollama detection banner */}
        {ollamaDetected && serverProviderLabel !== 'ollama' && !ollamaBannerDismissed && (() => {
          const storedConf = getStoredProviderConfig();
          const usingOllama = storedConf?.provider === 'ollama';
          if (usingOllama) return null;
          return <div style={{marginBottom:18,padding:'12px 18px',borderRadius:10,background:C.green+'11',border:`1px solid ${C.green+'44'}`,display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:C.green,flexShrink:0,boxShadow:`0 0 6px ${C.green}`}}/>
            <div style={{flex:1,fontSize:13,color:C.text}}>
              <strong>Ollama detected!</strong> You have a local AI running on this machine — switch to it for 100% private, zero-cost AI.
              <button onClick={()=>setPage('ai-settings')} style={{marginLeft:10,padding:'2px 10px',borderRadius:6,border:`1px solid ${C.green}`,background:'transparent',color:C.green,fontSize:12,cursor:'pointer',fontWeight:600}}>Configure →</button>
            </div>
            <button onClick={()=>{ setOllamaBannerDismissed(true); sessionStorage.setItem('ollama_banner_dismissed','true'); }} style={{background:'transparent',border:'none',color:C.textDim,cursor:'pointer',padding:4,flexShrink:0}}><X size={14}/></button>
          </div>;
        })()}

        {page==="dashboard" && <>
          <OnboardingChecklist accounts={accounts} scenarios={scenarios} subsP={subsP} yearly={yearly} profile={profile} onboarding={onboarding} setOnboarding={setOnboarding} setPage={setPage} setProfileOpen={setProfileOpen} setPromptOpen={setPromptOpen} onClearAll={(skipConfirm)=>{ if(skipConfirm !== 'skip' && !window.confirm('Clear all data and start fresh? This cannot be undone.')) return; setAccounts([]); setScenarios([]); setSubsP([]); setYearly([]); setTaxes([]); setInsurance([]); setTracker({2026:[]}); setProfile({firstName:'',lastName:'',gender:'',birthDate:'',address:'',postalCode:'',city:'',canton:'',phone:'',maritalStatus:'',religion:'',children:'',ahvNumber:'',company:'',jobTitle:'',businessName:'',businessType:'',businessProjects:'',notes:''}); setOnboarding(o=>({...o,dataCleared:true})); }}/>
          <Dashboard accounts={accounts} scenarios={scenarios} subsP={subsP} subsPInScenario={subsPInScenario} yearly={yearly} taxes={taxes} insurance={insurance} profile={profile} hideBalances={hideBalances} setChatOpen={setChatOpen} setChatInput={setChatInput} notesVersion={notesVersion}/>
        </>}
        {page==="accounts" && <AccountsPage accounts={accounts} setAccounts={setAccounts} hideBalances={hideBalances} onAccountsUpdated={() => setOnboarding(o => ({...o, lastMonthlyUpdate: new Date().toISOString()}))} extractionPrompt={extractionPrompt} setExtractionPrompt={setExtractionPrompt}/>}
        {page==="portfolio" && <PortfolioPage accounts={accounts} setAccounts={setAccounts} hideBalances={hideBalances} setChatOpen={setChatOpen} setChatInput={setChatInput}/>}
        {page==="scenarios" && <ScenariosPage scenarios={scenarios} setScenarios={setScenarios} subsP={subsP} subsPInScenario={subsPInScenario} yearly={yearly} taxes={taxes} insurance={insurance} hideBalances={hideBalances} darkMode={darkMode} payrollExtractionPrompt={payrollExtractionPrompt} setPayrollExtractionPrompt={setPayrollExtractionPrompt}/>}
        {page==="tracker" && <TrackerPage tracker={tracker} setTracker={setTracker} accounts={accounts} hideBalances={hideBalances} onTrackerSynced={() => setOnboarding(o => ({...o, lastTrackerSync: new Date().toISOString()}))}/>}
        {page==="expenses" && <ExpensesPage subsP={subsP} setSubsP={setSubsP} subsPInScenario={subsPInScenario} setSubsPInScenario={setSubsPInScenario} yearly={yearly} setYearly={setYearly} taxes={taxes} setTaxes={setTaxes} insurance={insurance} setInsurance={setInsurance} hideBalances={hideBalances} profile={profile} accounts={accounts} scenarios={scenarios} darkMode={darkMode} insPrompt={insPrompt} setInsPrompt={setInsPrompt} taxPrompt={taxPrompt} setTaxPrompt={setTaxPrompt} recPrompt={recPrompt} setRecPrompt={setRecPrompt} subPrompt={subPrompt} setSubPrompt={setSubPrompt}/>}
        {page==="transactions" && <TransactionsPage transactions={transactions} setTransactions={setTransactions} hideBalances={hideBalances}/>}
        {page==="pillars" && <PillarPage accounts={accounts} scenarios={scenarios} subsP={subsP} subsPInScenario={subsPInScenario} yearly={yearly} taxes={taxes} insurance={insurance} hideBalances={hideBalances}/>}
        {page==="ai-settings" && <AISettingsPage/>}
      </div>
    </div>
    <ChatPanel accounts={accounts} scenarios={scenarios} subsP={subsP} subsPInScenario={subsPInScenario} yearly={yearly} taxes={taxes} insurance={insurance} profile={profile} open={chatOpen} setOpen={setChatOpen} externalInput={chatInput} setExternalInput={setChatInput} promptTemplate={promptTemplate} onPinned={() => setNotesVersion(v => v + 1)}/>
    {profileOpen && <div onClick={()=>setProfileOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,width:"100%",maxWidth:1140,maxHeight:"84vh",overflowY:"auto",padding:28,boxShadow:"0 24px 80px rgba(0,0,0,0.6)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
          <h2 style={{margin:0,fontSize:18,fontWeight:700,color:C.text}}>My Profile</h2>
          <button onClick={()=>setProfileOpen(false)} style={{background:"transparent",border:"none",cursor:"pointer",color:C.textDim}}><X size={18}/></button>
        </div>
        <p style={{margin:"0 0 20px",fontSize:13,color:C.textDim}}>This information is included in every AI analysis so the advisor can personalise advice for your specific situation.</p>

        {/* ── Personal Info ── */}
        <div style={{fontSize:12,color:C.textDim,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,marginBottom:12}}>Personal Info</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          {[{label:"First Name",key:"firstName"},{label:"Last Name",key:"lastName"},{label:"Gender",key:"gender"},{label:"Date of Birth",key:"birthDate"}].map(({label,key})=>(
            <div key={key} style={{marginBottom:14}}>
              <label style={{fontSize:12,color:C.accent,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:4}}>{label}</label>
              <input value={profile[key]||''} onChange={e=>setProfile(p=>({...p,[key]:e.target.value}))}
                style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:14,outline:"none",boxSizing:"border-box"}}/>
            </div>
          ))}
        </div>

        {/* ── Residence & Contact ── */}
        <div style={{fontSize:12,color:C.textDim,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,marginBottom:12,marginTop:4,paddingTop:12,borderTop:`1px solid ${C.border}`}}>Residence &amp; Contact</div>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:12,color:C.accent,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:4}}>Street Address</label>
          <input value={profile.address||''} onChange={e=>setProfile(p=>({...p,address:e.target.value}))}
            style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:14,outline:"none",boxSizing:"border-box"}}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"120px 1fr 1fr 1fr",gap:"0 12px"}}>
          {[{label:"Postal Code (PLZ)",key:"postalCode"},{label:"City / Municipality",key:"city"},{label:"Canton",key:"canton"},{label:"Phone",key:"phone"}].map(({label,key})=>{
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
        <div style={{fontSize:12,color:C.textDim,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,marginBottom:12,marginTop:4,paddingTop:12,borderTop:`1px solid ${C.border}`}}>Tax Information</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"0 16px"}}>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:12,color:C.accent,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:4}}>Marital Status</label>
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
            <label style={{fontSize:12,color:C.accent,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:4}}>Religion (Church Tax)</label>
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
            <label style={{fontSize:12,color:C.accent,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:4}}>Children (Kinder)</label>
            <input type="number" min="0" value={profile.children||''} onChange={e=>setProfile(p=>({...p,children:e.target.value}))} placeholder="0"
              style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:14,outline:"none",boxSizing:"border-box"}}/>
          </div>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:12,color:C.accent,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:4}}>AHV / AVS Number</label>
            <input value={profile.ahvNumber||''} onChange={e=>setProfile(p=>({...p,ahvNumber:e.target.value}))} placeholder="756.XXXX.XXXX.XX"
              style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:14,outline:"none",boxSizing:"border-box"}}/>
          </div>
        </div>

        {/* ── Employment ── */}
        <div style={{fontSize:12,color:C.textDim,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,marginBottom:12,marginTop:4,paddingTop:12,borderTop:`1px solid ${C.border}`}}>Employment</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          {[{label:"Employer / Company",key:"company"},{label:"Job Title",key:"jobTitle"}].map(({label,key})=>(
            <div key={key} style={{marginBottom:14}}>
              <label style={{fontSize:12,color:C.accent,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:4}}>{label}</label>
              <input value={profile[key]||''} onChange={e=>setProfile(p=>({...p,[key]:e.target.value}))}
                style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:14,outline:"none",boxSizing:"border-box"}}/>
            </div>
          ))}
        </div>

        {/* ── Side Business ── */}
        <div style={{fontSize:12,color:C.textDim,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,marginBottom:12,marginTop:4,paddingTop:12,borderTop:`1px solid ${C.border}`}}>Side Business</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0 16px"}}>
          {[{label:"Business Name",key:"businessName"},{label:"Business Type",key:"businessType"},{label:"Active Projects / Products",key:"businessProjects"}].map(({label,key})=>(
            <div key={key} style={{marginBottom:14}}>
              <label style={{fontSize:12,color:C.accent,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:4}}>{label}</label>
              <input value={profile[key]||''} onChange={e=>setProfile(p=>({...p,[key]:e.target.value}))}
                style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:14,outline:"none",boxSizing:"border-box"}}/>
            </div>
          ))}
        </div>

        <div style={{marginBottom:14,paddingTop:12,borderTop:`1px solid ${C.border}`}}>
          <label style={{fontSize:12,color:C.accent,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:4}}>Additional Notes for AI</label>
          <textarea value={profile.notes||''} onChange={e=>setProfile(p=>({...p,notes:e.target.value}))} rows={3}
            placeholder="e.g. planning to buy property, partner earns CHF X, business revenue target..."
            style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,fontSize:14,outline:"none",resize:"vertical",boxSizing:"border-box",fontFamily:"inherit"}}/>
        </div>
        <button onClick={()=>setProfileOpen(false)} style={{width:"100%",padding:"11px",borderRadius:8,border:"none",background:C.accent,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",marginTop:8}}>Save & Close</button>
      </div>
    </div>}
    {promptOpen && <div onClick={()=>setPromptOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,width:"100%",maxWidth:1140,maxHeight:"84vh",overflowY:"auto",padding:28,boxShadow:"0 24px 80px rgba(0,0,0,0.6)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <h2 style={{margin:0,fontSize:18,fontWeight:700,color:C.text}}>AI Advisor Prompt</h2>
          <button onClick={()=>setPromptOpen(false)} style={{background:"transparent",border:"none",cursor:"pointer",color:C.textDim}}><X size={18}/></button>
        </div>
        <p style={{margin:'0 0 12px',fontSize:13,color:C.textDim}}>
          Customise the system prompt for your AI financial advisor. Applied to every chat session.
          Leave blank to use the built-in default prompt.
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
          placeholder="Leave blank to use the built-in default prompt…"
          rows={28}
          style={{width:'100%',padding:'10px 12px',borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,color:C.text,
            fontSize:13,outline:'none',resize:'vertical',boxSizing:'border-box',fontFamily:"'DM Mono',monospace",lineHeight:1.5}}
        />
        {promptTemplate && <div style={{marginTop:6,fontSize:12,color:C.green}}>✓ Custom prompt active — will be used instead of the default.</div>}
        <button onClick={()=>setPromptOpen(false)} style={{width:'100%',padding:'11px',borderRadius:8,border:'none',background:C.accent,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',marginTop:12}}>
          Save & Close
        </button>
      </div>
    </div>}
  </div>;
}
