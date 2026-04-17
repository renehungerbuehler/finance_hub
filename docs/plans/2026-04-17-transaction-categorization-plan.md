# Transaction Categorization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Transactions page that imports bank statements (any format), AI-categorizes spending, and provides spending insights with charts.

**Architecture:** New TransactionsPage component in FinanceApp.jsx. AI parses uploaded CSV/XLSX and returns normalized, categorized transactions as JSON. Category rules persist user corrections for future imports. Data stored via existing `/api/:key` pattern with key `transactions`.

**Tech Stack:** React (existing), Recharts (existing), Lucide icons (existing), XLSX library (existing), AI chat endpoint (existing `/api/chat`).

---

### Task 1: Add transactions state and persistence

**Files:**
- Modify: `src/FinanceApp.jsx:4401` (state declarations)
- Modify: `src/FinanceApp.jsx:4434` (fetch on mount)
- Modify: `src/FinanceApp.jsx:4489-4497` (auto-save effects)
- Modify: `api/index.js:12-16` (VALID_KEYS)

**Step 1: Add `transactions` to VALID_KEYS in api/index.js**

At line 12, add `'transactions'` to the array:
```javascript
const VALID_KEYS = [
  'accounts', 'scenarios', 'tracker',
  'subscriptions_personal', 'subscriptions_business',
  'yearly', 'taxes', 'insurance', 'settings', 'profile', 'ai_analysis',
  'transactions',
];
```

**Step 2: Add transactions state in FinanceApp.jsx**

After line 4408 (`insurance` state), add:
```javascript
const [transactions, setTransactions] = useState({ imports: [], categoryRules: [], customCategories: [], prompt: '' });
```

**Step 3: Load transactions on mount**

In the fetch keys array at line 4434, add `'transactions'`:
```javascript
const keys = ['accounts','scenarios','tracker','subscriptions_personal','yearly','taxes','insurance','settings','profile','transactions'];
```

Update the destructuring at line 4436:
```javascript
.then(([acc, sc, tr, subP, yr, tx, ins, settings, prof, txns]) => {
```

Before `loaded.current = true` (line 4466), add:
```javascript
if (txns) setTransactions(txns);
```

**Step 4: Add auto-save effect**

After line 4496 (`insurance` save effect), add:
```javascript
useEffect(() => { save('transactions', transactions); }, [transactions, save]);
```

**Step 5: Commit**
```bash
git add src/FinanceApp.jsx api/index.js
git commit -m "feat: add transactions state and persistence"
```

---

### Task 2: Add Transactions nav entry

**Files:**
- Modify: `src/FinanceApp.jsx:3` (Lucide imports)
- Modify: `src/FinanceApp.jsx:4384-4392` (NAV array)

**Step 1: Add Receipt icon to Lucide imports**

At line 3, add `Receipt` to the import:
```javascript
import { ..., Menu, Receipt } from "lucide-react";
```

**Step 2: Add nav entry**

After the `expenses` entry (line 4390), add:
```javascript
{ id:"transactions", label:"Transactions", icon:Receipt },
```

**Step 3: Commit**
```bash
git add src/FinanceApp.jsx
git commit -m "feat: add Transactions nav entry"
```

---

### Task 3: Create TransactionsPage shell with import button

**Files:**
- Modify: `src/FinanceApp.jsx` — add TransactionsPage function before FinanceApp, add page rendering

**Step 1: Create the TransactionsPage component**

Add the component before the `const NAV = [` line (~4384). This is a shell with the import button, filter bar, and empty table:

```javascript
// ── Transactions Page ──
function TransactionsPage({ transactions, setTransactions, hideBalances }) {
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [importName, setImportName] = useState('');
  const [filter, setFilter] = useState({ search: '', category: '', dateFrom: '', dateTo: '' });
  const [sort, setSort] = useState({ col: 'date', asc: false });
  const [editingRules, setEditingRules] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const fileRef = useRef(null);

  const DEFAULT_CATEGORIES = ['Groceries','Dining & Restaurants','Transport','Entertainment','Shopping','Health & Fitness','Subscriptions & Fees','Housing','Transfers','Income','Other'];
  const allCategories = [...DEFAULT_CATEGORIES, ...(transactions.customCategories || [])];

  const allTxns = (transactions.imports || []).flatMap(imp => imp.transactions.map(t => ({ ...t, importName: imp.name, currency: imp.currency })));

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

  // --- Summary stats ---
  const totalIncome = filtered.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalExpenses = filtered.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const net = totalIncome - totalExpenses;
  const categoryTotals = {};
  filtered.filter(t => t.amount < 0).forEach(t => { categoryTotals[t.category || 'Other'] = (categoryTotals[t.category || 'Other'] || 0) + Math.abs(t.amount); });
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

  // --- Charts data ---
  const pieData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 })).sort((a, b) => b.value - a.value);
  const PIE_COLORS = [C.accent, C.green, C.blue, C.teal, C.orange, C.red, '#8884d8', '#82ca9d', '#ffc658', '#ff7c43', '#665191'];

  const monthlyData = useMemo(() => {
    const months = {};
    filtered.filter(t => t.amount < 0).forEach(t => {
      const m = t.date.slice(0, 7); // "2026-01"
      if (!months[m]) months[m] = {};
      const cat = t.category || 'Other';
      months[m][cat] = (months[m][cat] || 0) + Math.abs(t.amount);
    });
    return Object.entries(months).sort((a, b) => a[0].localeCompare(b[0])).map(([month, cats]) => ({ month, ...cats }));
  }, [filtered]);
  const allChartCategories = [...new Set(filtered.filter(t => t.amount < 0).map(t => t.category || 'Other'))];

  const fmt = (v) => hideBalances ? '•••' : v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // --- Category change handler ---
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

  // --- Import handler ---
  const DEFAULT_TXN_PROMPT = `You are a financial data parser. Given a bank statement file (CSV, XLSX, or PDF), do the following:
1. Auto-detect the file format and column mapping.
2. Extract every transaction row.
3. Categorize each transaction into one of these categories: ${allCategories.join(', ')}.
4. Apply these user-defined category rules first (exact description match overrides AI): ${JSON.stringify(transactions.categoryRules || [])}.
5. Return ONLY valid JSON (no markdown, no explanation) in this exact format:
{
  "currency": "CHF",
  "transactions": [
    { "date": "YYYY-MM-DD", "description": "Merchant name", "amount": -12.50, "fee": 0, "category": "Category", "type": "Card Payment" }
  ]
}
Negative amounts = expenses. Positive = income. Keep original sign from the data. Use the completed/settled date. Type should reflect the original transaction type from the statement.`;

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);

    try {
      let content = '';
      let mediaType = 'text/plain';
      const ext = file.name.split('.').pop().toLowerCase();

      if (['xlsx', 'xls'].includes(ext)) {
        const XLSX = (await import('xlsx')).default;
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        content = btoa(XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]));
        mediaType = 'text/csv';
      } else if (ext === 'pdf') {
        content = btoa(String.fromCharCode(...new Uint8Array(await file.arrayBuffer())));
        mediaType = 'application/pdf';
      } else {
        content = btoa(await file.text());
        mediaType = 'text/csv';
      }

      const prompt = transactions.prompt || DEFAULT_TXN_PROMPT;
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          attachments: [{ name: file.name, type: mediaType, data: content }],
        }),
      });

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || data.content?.[0]?.text || data.message?.content || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('AI did not return valid JSON');
      const parsed = JSON.parse(jsonMatch[0]);

      // Ensure every transaction has an id
      parsed.transactions = (parsed.transactions || []).map(t => ({ ...t, id: t.id || crypto.randomUUID() }));
      setImportPreview(parsed);
      setImportName(file.name.replace(/\.[^.]+$/, ''));
    } catch (err) {
      alert('Import failed: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  // --- Confirm import with merge/replace ---
  const confirmImport = (mode) => {
    if (!importPreview) return;
    const newTxns = importPreview.transactions;
    const newDates = newTxns.map(t => t.date).sort();
    const dateFrom = newDates[0], dateTo = newDates[newDates.length - 1];

    setTransactions(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      // Check for overlap with existing imports
      let merged = [];
      for (const imp of next.imports) {
        if (mode === 'replace') {
          // Keep transactions outside the new date range
          imp.transactions = imp.transactions.filter(t => t.date < dateFrom || t.date > dateTo);
        } else {
          // Merge: remove duplicates (same date+description+amount)
          const newKeys = new Set(newTxns.map(t => `${t.date}|${t.description}|${t.amount}`));
          imp.transactions = imp.transactions.filter(t => !newKeys.has(`${t.date}|${t.description}|${t.amount}`));
        }
        if (imp.transactions.length > 0) merged.push(imp);
      }
      merged.push({
        id: crypto.randomUUID(),
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

  // --- Delete a rule ---
  const deleteRule = (idx) => {
    setTransactions(prev => {
      const next = { ...prev, categoryRules: prev.categoryRules.filter((_, i) => i !== idx) };
      return next;
    });
  };

  // --- Add custom category ---
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
        <button onClick={() => setPromptOpen(true)} title="Edit import prompt" style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.textMuted, borderRadius: 8, padding: '6px 8px', cursor: 'pointer' }}><Settings size={15}/></button>
        <button onClick={() => setEditingRules(!editingRules)} title="Category rules" style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.textMuted, borderRadius: 8, padding: '6px 8px', cursor: 'pointer' }}><ClipboardList size={15}/></button>
        <button onClick={() => fileRef.current?.click()} disabled={importing} style={{ background: C.accent, color: '#000', border: 'none', borderRadius: 8, padding: '7px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: importing ? 0.6 : 1 }}>
          <Upload size={14}/> {importing ? 'Importing…' : 'Import Statement'}
        </button>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.pdf" onChange={handleImport} style={{ display: 'none' }} />
      </div>
    </div>

    {/* Prompt edit modal */}
    {promptOpen && <div onClick={() => setPromptOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, width: '100%', maxWidth: 700, padding: 24, maxHeight: '80vh', overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Transaction Import Prompt</h3>
        <textarea value={transactions.prompt || DEFAULT_TXN_PROMPT} onChange={e => setTransactions(prev => ({ ...prev, prompt: e.target.value }))} style={{ width: '100%', minHeight: 200, background: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, fontSize: 12, fontFamily: 'monospace', resize: 'vertical' }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
          <button onClick={() => setTransactions(prev => ({ ...prev, prompt: '' }))} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.textMuted, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12 }}>Reset to Default</button>
          <button onClick={() => setPromptOpen(false)} style={{ background: C.accent, color: '#000', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Done</button>
        </div>
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
        <p style={{ color: C.textMuted, fontSize: 12, margin: '0 0 14px' }}>{importPreview.transactions.length} transactions · {importPreview.currency || 'CHF'}</p>
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
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
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
          </tr></thead>
          <tbody>{filtered.map(t => <tr key={t.id} style={{ borderBottom: `1px solid ${C.border}22` }}>
            <td style={{ padding: '7px 10px', whiteSpace: 'nowrap', fontSize: 13 }}>{t.date}</td>
            <td style={{ padding: '7px 10px', fontSize: 13 }}>{t.description}</td>
            <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 500, fontSize: 13, color: t.amount < 0 ? C.red : C.green, fontVariantNumeric: 'tabular-nums' }}>{hideBalances ? '•••' : `${t.amount < 0 ? '' : '+'}${t.amount.toFixed(2)}`} {t.currency}</td>
            <td style={{ padding: '7px 10px' }}>
              <select value={t.category || 'Other'} onChange={e => handleCategoryChange(t.id, e.target.value)} style={{ background: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: 4, padding: '2px 6px', fontSize: 12, cursor: 'pointer' }}>
                {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </td>
            <td style={{ padding: '7px 10px', color: C.textMuted, fontSize: 12 }}>{t.type}</td>
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
```

**Step 2: Wire up TransactionsPage in the page rendering block**

After the expenses rendering at line 4650, add:
```javascript
{page==="transactions" && <TransactionsPage transactions={transactions} setTransactions={setTransactions} hideBalances={hideBalances}/>}
```

**Step 3: Verify the app loads and the Transactions tab appears**

Run: `npm run dev` and navigate to the Transactions tab. Verify empty state shows.

**Step 4: Commit**
```bash
git add src/FinanceApp.jsx
git commit -m "feat: add TransactionsPage with import, categorization, charts, and rules"
```

---

### Task 4: Test end-to-end with Revolut CSV

**Step 1: Manual test**

1. Navigate to Transactions tab
2. Click "Import Statement"
3. Select a Revolut CSV file
4. Verify AI returns categorized transactions in preview modal
5. Edit a category in the preview (e.g., change "Migros" from whatever to "Groceries")
6. Click "Merge" to confirm
7. Verify transactions appear in the table with charts
8. Verify the category rule was created (click rules icon)
9. Import the same file again — verify "Merge" skips duplicates

**Step 2: Test filters**

1. Use date range filter to narrow to one month
2. Use category dropdown to filter to one category
3. Use search to find a specific merchant
4. Verify summary cards and charts update with filters

**Step 3: Commit any fixes**

---

### Task 5: Build and deploy

**Step 1: Build and verify**
```bash
make build
```

**Step 2: Deploy**
```bash
make deploy
```
