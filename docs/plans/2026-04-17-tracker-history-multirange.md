# Tracker Historical Import & Multi-Year Grid

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Import 2023-2025 historical tracker data, enable multi-year range selection with a continuous timeline grid, add delete-year functionality, and remove the Multi-Year Trend tab.

**Architecture:** All changes are in `src/FinanceApp.jsx` within the `TrackerPage` component (lines ~1985-2289). Historical data is hardcoded as initial seed data. The grid is extended to render columns across a year range. The multi-year trend tab is deleted entirely.

**Tech Stack:** React, Recharts (already in use), single-file SPA

---

### Task 1: Seed Historical Tracker Data (2023-2025)

**Files:**
- Modify: `src/FinanceApp.jsx:4367` (initial tracker state)

**Step 1: Add historical data constant**

Above the component that uses `useState({ 2026: [] })` (~line 4367), add a `HISTORICAL_TRACKER` constant. Each year has an array of account rows matching the 2026 tracker account names.

Data mapping (spreadsheet → app names):
- Sperrkonto Mietkaution → ZKB (Blocked Account Flat)
- 2a SwissLife → SwissLife - 2A Pillar
- 3a frankly → Frankly - 3A Pillar
- Crypto Currencies → Crypto (CoinStats)
- Yuh Project - Investing → Yuh Invest
- Yuh Project - Golden Egg → Yuh Golden Egg
- Yuh Project - Emergancy → Yuh Emergency
- Swissquote → SKIP (not in 2026 accounts)

```javascript
const HISTORICAL_TRACKER = {
  2023: [
    {id:"ht-23-1",name:"ZKB (Blocked Account Flat)",startBal:2900,recurring:0,activeUntil:12,active:true,
     results:[2900,2900,2900,2900,2900,2900,2900,2900,2900,2900,2900,2900]},
    {id:"ht-23-2",name:"SwissLife - 2A Pillar",startBal:26569,recurring:690,activeUntil:12,active:true,
     results:[null,null,26569,27259,27949,28640,29330,30020,31945,32583,33325,34015]},
    {id:"ht-23-3",name:"Frankly - 3A Pillar",startBal:19200,recurring:600,activeUntil:12,active:true,
     results:[null,null,19326,20257,21033,21765,22580,22638,22473,22825,24532,25841]},
    {id:"ht-23-4",name:"Crypto (CoinStats)",startBal:12000,recurring:0,activeUntil:12,active:true,
     results:[12000,12000,12000,12000,12000,12000,12000,12000,12000,12000,15753,19000]},
    {id:"ht-23-5",name:"Yuh Invest",startBal:0,recurring:1000,activeUntil:12,active:true,
     results:[null,null,1006,2524,3520,3513,5023,5084,5082,5562,6504,7569]},
    {id:"ht-23-6",name:"Yuh Golden Egg",startBal:0,recurring:1000,activeUntil:12,active:true,
     results:[0,0,0,0,0,0,0,0,0,0,0,0]},
    {id:"ht-23-7",name:"Yuh Emergency",startBal:0,recurring:1000,activeUntil:12,active:true,
     results:[0,0,0,0,0,0,3000,0,0,0,0,0]},
  ],
  2024: [
    {id:"ht-24-1",name:"ZKB (Blocked Account Flat)",startBal:2900,recurring:0,activeUntil:12,active:true,
     results:[2900,2900,2900,2900,2900,2900,2900,2900,2900,2900,2900,2900]},
    {id:"ht-24-2",name:"SwissLife - 2A Pillar",startBal:34495,recurring:480,activeUntil:12,active:true,
     results:[34705,34975,35455,35935,36415,36895,37375,37375,38335,38815,39295,39854]},
    {id:"ht-24-3",name:"Frankly - 3A Pillar",startBal:26429,recurring:588,activeUntil:12,active:true,
     results:[26426,27793,29236,29615,31192,31714,32379,33027,33983,34926,35756,36086]},
    {id:"ht-24-4",name:"Crypto (CoinStats)",startBal:0,recurring:0,activeUntil:12,active:true,
     results:[0,0,0,0,0,607,626,556,545,576,707,700]},
    {id:"ht-24-5",name:"Yuh Invest",startBal:8569,recurring:1000,activeUntil:12,active:true,
     results:[9213,10509,11003,11002,11750,11864,12689,12872,12980,13320,13260,13628]},
    {id:"ht-24-6",name:"Yuh Golden Egg",startBal:0,recurring:0,activeUntil:12,active:true,
     results:[0,0,0,0,0,0,0,0,0,0,0,0]},
    {id:"ht-24-7",name:"Yuh Emergency",startBal:0,recurring:1500,activeUntil:12,active:true,
     results:[0,1000,1500,2000,2500,5000,5000,6000,9000,12000,15000,15000]},
  ],
  2025: [
    {id:"ht-25-1",name:"ZKB (Blocked Account Flat)",startBal:8901,recurring:0,activeUntil:12,active:true,
     results:[8901,8901,8901,8901,8901,8901,8901,8901,8901,8901,8901,8901]},
    {id:"ht-25-2",name:"SwissLife - 2A Pillar",startBal:48212,recurring:690,activeUntil:12,active:true,
     results:[48212,48902,48272,50282,50972,51662,52352,53042,53732,54422,55112,61685]},
    {id:"ht-25-3",name:"Frankly - 3A Pillar",startBal:35919,recurring:600,activeUntil:12,active:true,
     results:[37866,38692,38870,37548,39679,40672,42109,43277,44192,45989,46904,48170]},
    {id:"ht-25-4",name:"Crypto (CoinStats)",startBal:500,recurring:0,activeUntil:12,active:true,
     results:[500,500,539,544,632,585,725,639,732,721,548,523]},
    {id:"ht-25-5",name:"Yuh Invest",startBal:14689,recurring:1000,activeUntil:12,active:true,
     results:[14524,14704,15227,15343,16449,17472,17790,18045,18384,19058,20265,20984]},
    {id:"ht-25-6",name:"Yuh Golden Egg",startBal:0,recurring:200,activeUntil:12,active:true,
     results:[0,0,0,0,0,0,0,0,0,0,0,0]},
    {id:"ht-25-7",name:"Yuh Emergency",startBal:15000,recurring:0,activeUntil:12,active:true,
     results:[4000,15000,15000,15000,15000,15000,15000,15000,13000,12500,15000,15000]},
  ],
};
```

**Step 2: Merge historical data into initial tracker state**

Change the initial state at line 4367 from:
```javascript
const [tracker, setTracker] = useState({ 2026: [] });
```
to:
```javascript
const [tracker, setTracker] = useState({ ...HISTORICAL_TRACKER, 2026: [] });
```

**Step 3: Prevent auto-sync from pruning historical years**

The `useEffect` at lines 2043-2055 syncs tracker rows with the Accounts page and prunes orphaned rows. This runs on `selYear` change, which means switching to 2023 could prune rows since those account names may differ slightly.

Modify the auto-sync effect to only run for the **current year** (2026), not historical years:
```javascript
useEffect(()=>{
  if (selYear !== currentYear) return; // Don't prune historical years
  // ... rest of existing logic
}, [selYear, portfolioAccounts.map(a=>a.name).join(",")]);
```

Wait - actually `selYear` will become a range. We need to guard against auto-sync for any year that isn't the current year. The safest approach: only auto-sync for `currentYear`, regardless of what's selected.

Change the guard to check if the year being synced is the current calendar year:

```javascript
useEffect(()=>{
  const syncYear = currentYear; // Always sync current year only
  const acctNames = new Set(portfolioAccounts.map(a=>a.name));
  const current = tracker[syncYear] || [];
  const pruned = current.filter(r => acctNames.has(r.name) || r.results.some(v=>v!==null));
  const existingNames = new Set(pruned.map(r=>r.name));
  const newRows = portfolioAccounts.filter(a=>!existingNames.has(a.name) && a.type!=="Debt").map(a=>({id:uid(),name:a.name,recurring:0,startBal:a.balance,results:Array(12).fill(null),active:true,activeUntil:12}));
  if(pruned.length !== current.length || newRows.length > 0){
    setTracker(p=>({...p,[syncYear]:[...pruned,...newRows]}));
  }
}, [portfolioAccounts.map(a=>a.name).join(",")]);
```

Note: remove `selYear` from the dependency array since we always sync currentYear.

**Step 4: Verify**

Run the app, navigate to Tracker. The year selector should show 2023, 2024, 2025, 2026 buttons. Clicking each should show the historical data in the grid with both forecast and result rows populated.

**Step 5: Commit**
```bash
git add src/FinanceApp.jsx
git commit -m "feat: seed tracker with 2023-2025 historical data from spreadsheet"
```

---

### Task 2: Add Delete Year Functionality

**Files:**
- Modify: `src/FinanceApp.jsx:2018-2028` (year management), `src/FinanceApp.jsx:2099-2106` (year selector UI)

**Step 1: Add deleteYear function**

After the `addYear` function (~line 2028), add:

```javascript
const deleteYear = (yr) => {
  if (!window.confirm(`Delete tracker data for ${yr}? This cannot be undone.`)) return;
  setTracker(p => {
    const next = { ...p };
    delete next[yr];
    return next;
  });
  // If deleting the currently selected year, switch to nearest year
  if (selYear === yr) {
    const remaining = Object.keys(tracker).map(Number).filter(y => y !== yr).sort((a,b) => b-a);
    if (remaining.length) setSelYear(remaining[0]);
  }
};
```

**Step 2: Add delete button to year selector**

In the year selector UI (~line 2102-2104), add a small trash icon button next to each year button. Don't allow deleting the current calendar year (to protect active tracking).

Replace the year button mapping:
```jsx
{[...Object.keys(tracker).map(Number).sort((a,b)=>a-b)].map(yr=>(
  <div key={yr} style={{display:"flex",alignItems:"center",gap:2}}>
    <button onClick={()=>setSelYear(yr)} style={{padding:"6px 16px",borderRadius:8,border:`1px solid ${selYear===yr?C.accent:C.border}`,background:selYear===yr?C.accent+"18":C.card,color:selYear===yr?C.accentLight:C.textMuted,fontSize:14,fontWeight:selYear===yr?700:400,cursor:"pointer"}}>{yr}</button>
    {yr !== currentYear && <button onClick={()=>deleteYear(yr)} style={{padding:"4px",borderRadius:6,border:"none",background:"transparent",color:C.textDim,cursor:"pointer",opacity:0.4,fontSize:12}} title={`Delete ${yr}`}><Trash2 size={12}/></button>}
  </div>
))}
```

**Step 3: Verify**

Click the trash icon next to 2027. Confirm the dialog. The year should disappear. Verify 2026 (current year) has no delete button.

**Step 4: Commit**
```bash
git add src/FinanceApp.jsx
git commit -m "feat: add ability to delete tracker years"
```

---

### Task 3: Multi-Year Range Selector & Combined Grid

**Files:**
- Modify: `src/FinanceApp.jsx:1988-2058` (state & computed), `src/FinanceApp.jsx:2099-2234` (grid UI)

This is the largest task. It replaces the single-year selector with a start/end year range and renders a continuous timeline grid.

**Step 1: Change state from single year to range**

Replace:
```javascript
const [selYear, setSelYear] = useState(sortedYears[0] || 2026);
```
with:
```javascript
const [startYear, setStartYear] = useState(sortedYears[sortedYears.length - 1] || 2023);
const [endYear, setEndYear] = useState(sortedYears[0] || 2026);
// Convenience: selected range of years
const rangeYears = Object.keys(tracker).map(Number).filter(y => y >= startYear && y <= endYear).sort((a,b) => a-b);
```

Keep `selYear` as a derived value for backwards compatibility with sync and addYear:
```javascript
const selYear = endYear; // For sync, addYear, etc.
```

**Step 2: Update year selector UI**

Replace the year button row with a range selector. Use two dropdowns (start year, end year):

```jsx
<div style={{display:"flex",alignItems:"center",gap:6,marginBottom:16,flexWrap:"wrap"}}>
  <select value={startYear} onChange={e=>{const v=Number(e.target.value);setStartYear(v);if(v>endYear)setEndYear(v);}}
    style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.card,color:C.text,fontSize:14,cursor:"pointer",outline:"none"}}>
    {Object.keys(tracker).map(Number).sort((a,b)=>a-b).map(yr=>
      <option key={yr} value={yr}>{yr}</option>
    )}
  </select>
  <span style={{color:C.textDim,fontSize:14}}>to</span>
  <select value={endYear} onChange={e=>{const v=Number(e.target.value);setEndYear(v);if(v<startYear)setStartYear(v);}}
    style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.card,color:C.text,fontSize:14,cursor:"pointer",outline:"none"}}>
    {Object.keys(tracker).map(Number).sort((a,b)=>a-b).map(yr=>
      <option key={yr} value={yr}>{yr}</option>
    )}
  </select>
  {/* Quick year buttons */}
  {Object.keys(tracker).map(Number).sort((a,b)=>a-b).map(yr=>(
    <div key={yr} style={{display:"flex",alignItems:"center",gap:2}}>
      <button onClick={()=>{setStartYear(yr);setEndYear(yr);}} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${(startYear<=yr&&yr<=endYear)?C.accent:C.border}`,background:(startYear<=yr&&yr<=endYear)?C.accent+"18":"transparent",color:(startYear<=yr&&yr<=endYear)?C.accentLight:C.textDim,fontSize:12,cursor:"pointer"}}>{yr}</button>
      {yr !== currentYear && <button onClick={()=>deleteYear(yr)} style={{padding:"2px",borderRadius:4,border:"none",background:"transparent",color:C.textDim,cursor:"pointer",opacity:0.3}} title={`Delete ${yr}`}><Trash2 size={10}/></button>}
    </div>
  ))}
  <button onClick={addYear} style={{padding:"6px 12px",borderRadius:8,border:`1px dashed ${C.border}`,background:"transparent",color:C.textDim,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><Plus size={13}/>New Year</button>
</div>
```

**Step 3: Build multi-year computed data**

Replace the `computed` and `totals` useMemo with multi-year versions:

```javascript
// Build unified account list across range years
const multiYearComputed = useMemo(() => {
  const accountNames = new Set();
  rangeYears.forEach(yr => (tracker[yr] || []).forEach(a => accountNames.add(a.name)));

  return Array.from(accountNames).map(name => {
    // Build forecast + results across all years in range
    const yearData = rangeYears.map(yr => {
      const row = (tracker[yr] || []).find(r => r.name === name);
      if (!row) return { forecast: Array(12).fill(null), results: Array(12).fill(null), active: true, row: null };
      const f = [];
      for (let m = 0; m < 12; m++) {
        if (m === 0) f.push(row.startBal);
        else if (m < (row.activeUntil ?? 12)) f.push(f[m-1] + (row.recurring ?? 0));
        else f.push(f[m-1]);
      }
      return { forecast: f, results: row.results, active: row.active !== false, row };
    });

    const allForecasts = yearData.flatMap(d => d.forecast);
    const allResults = yearData.flatMap(d => d.results);
    const active = yearData.some(d => d.active);
    // Get the row from the latest year that has this account (for editing)
    const latestRow = yearData.reverse().find(d => d.row)?.row;

    return { name, yearData: rangeYears.map((yr, i) => ({ ...yearData[rangeYears.length - 1 - i], year: yr })).reverse(), allForecasts, allResults, active, latestRow };
  });
}, [tracker, rangeYears.join(",")]);

// Sort
const sortedMultiYear = useMemo(() => {
  if (sortAsc === null) return multiYearComputed;
  return [...multiYearComputed].sort((a, b) => sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
}, [multiYearComputed, sortAsc]);

// Column definitions: [{year, month, monthIndex, label}]
const columns = useMemo(() =>
  rangeYears.flatMap(yr => MONTHS.map((m, mi) => ({
    year: yr, month: m, mi, label: rangeYears.length > 1 ? `${m.slice(0,3)} '${String(yr).slice(2)}` : m,
    isCurrent: yr === currentYear && mi === currentMonth,
  }))),
  [rangeYears.join(","), currentYear, currentMonth]
);

// Multi-year totals
const multiTotals = columns.map((col, ci) => {
  const yrIdx = rangeYears.indexOf(col.year);
  let forecast = 0, result = 0, hasResult = false;
  sortedMultiYear.forEach(acc => {
    if (!acc.active || debtNames.has(acc.name)) return;
    const yd = acc.yearData[yrIdx];
    if (!yd) return;
    forecast += yd.forecast[col.mi] ?? 0;
    if (yd.results[col.mi] != null) { result += yd.results[col.mi]; hasResult = true; }
  });
  return { ...col, forecast, result, hasResult };
});
```

**Step 4: Update grid rendering for multi-year**

Replace the `<thead>` month headers to use `columns` array:
```jsx
<thead>
  <tr style={{borderBottom:`2px solid ${C.border}`}}>
    <th onClick={()=>setSortAsc(s=>s===null?true:s===true?false:null)} style={{padding:"8px 12px",textAlign:"left",fontSize:12,fontWeight:700,color:C.textDim,textTransform:"uppercase",letterSpacing:0.5,cursor:"pointer",userSelect:"none",width:200,position:"sticky",left:0,background:C.card,zIndex:2}}>
      Account {sortAsc===null?<span style={{opacity:0.3}}>&#8597;</span>:sortAsc?"&#8593;":"&#8595;"}
    </th>
    {columns.map((col,ci)=>(
      <th key={ci} style={{padding:"8px 4px",textAlign:"right",fontSize:11,fontWeight:700,color:col.isCurrent?C.accentLight:C.textDim,textTransform:"uppercase",letterSpacing:0.3,background:col.isCurrent?C.accent+"18":"transparent",minWidth:56,borderLeft:col.mi===0&&ci>0?`2px solid ${C.border}`:"none"}}>
        {col.label}{col.isCurrent?" &#9666;":""}
      </th>
    ))}
    <th style={{width:28}}/>
  </tr>
</thead>
```

Add `position:"sticky",left:0,background:C.card,zIndex:1` to the account name `<td>` to keep the first column visible while scrolling horizontally.

**Step 5: Update forecast and result row rendering**

Replace the `computed.map` body to iterate `sortedMultiYear` instead, and render cells from `columns`:

For each account in `sortedMultiYear`:
- Forecast row: iterate `columns`, look up `acc.yearData[yrIdx].forecast[col.mi]`
- Result row: iterate `columns`, look up `acc.yearData[yrIdx].results[col.mi]`, with edit capability only for non-historical years (or allow editing all)

The edit cell logic needs to change from `{rowId, mi}` to `{name, year, mi}` since rows span multiple years.

When editing a result cell:
```javascript
const commitEdit = () => {
  const n = editVal.trim() === "" ? null : Number(editVal.replace(/[',]/g,""));
  if (n === null || !isNaN(n)) {
    setTracker(p => ({
      ...p,
      [editCell.year]: (p[editCell.year] || []).map(a =>
        a.name === editCell.name ? { ...a, results: a.results.map((v, i) => i === editCell.mi ? n : v) } : a
      ),
    }));
  }
  setEditCell(null);
};
```

**Step 6: Update totals row**

Replace `totals.map` with `multiTotals.map(...)`, using the same column structure. Add year separator borders on January columns.

**Step 7: Update tab labels**

Change tab labels to reflect range:
```jsx
<Tab active={view==="grid"} onClick={()=>setView("grid")}>
  {startYear === endYear ? `${startYear} Tracker Grid` : `${startYear}–${endYear} Tracker Grid`}
</Tab>
<Tab active={view==="chart"} onClick={()=>setView("chart")}>Forecast vs Result</Tab>
```

**Step 8: Verify**

- Select range 2023-2025: grid should show 36 columns with scrollable timeline
- January columns should have a visible year separator border
- Account name column should stay sticky while scrolling
- Edit a cell in 2025, verify it saves
- Select single year (2026): should work as before

**Step 9: Commit**
```bash
git add src/FinanceApp.jsx
git commit -m "feat: multi-year range selector with continuous timeline grid"
```

---

### Task 4: Update Chart View for Multi-Year Range

**Files:**
- Modify: `src/FinanceApp.jsx:2236-2238` (chart view)

**Step 1: Update chart to use multiTotals**

Replace the chart view to use `multiTotals` data:

```jsx
{view==="chart" && <Card title={startYear === endYear ? `${startYear}: Forecast vs Actual` : `${startYear}–${endYear}: Forecast vs Actual`}>
  <ResponsiveContainer width="100%" height={isMobile?220:350}>
    <ComposedChart data={multiTotals}>
      <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
      <XAxis dataKey="label" tick={{fill:C.textDim,fontSize:11}} interval={rangeYears.length > 1 ? 2 : 0}/>
      <YAxis tick={{fill:C.textDim,fontSize:11}} tickFormatter={v=>`${Math.round(v/1000)}k`}/>
      <Tooltip formatter={v=>`CHF ${fmt(v)}`} contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13}} labelStyle={{color:C.textMuted}} itemStyle={{color:C.text}}/>
      <Legend/>
      <Area type="monotone" dataKey="forecast" fill={C.accent+"22"} stroke={C.accent} strokeWidth={2} name="Forecast"/>
      <Line type="monotone" dataKey="result" stroke={C.green} strokeWidth={2.5} dot={{fill:C.green,r:4}} name="Result" connectNulls={false}/>
    </ComposedChart>
  </ResponsiveContainer>
</Card>}
```

**Step 2: Verify**

Switch to chart view with 2023-2025 range. The chart should show the full timeline with forecast area and result line.

**Step 3: Commit**
```bash
git add src/FinanceApp.jsx
git commit -m "feat: chart view spans multi-year range"
```

---

### Task 5: Remove Multi-Year Trend Tab

**Files:**
- Modify: `src/FinanceApp.jsx:2111` (tab button), `src/FinanceApp.jsx:2062-2097` (multiYearData useMemo), `src/FinanceApp.jsx:2252-2287` (multiyear view rendering)

**Step 1: Remove the tab button**

Delete this line:
```jsx
<Tab active={view==="multiyear"} onClick={()=>setView("multiyear")}>Multi-Year Trend</Tab>
```

**Step 2: Remove the multiYearData useMemo**

Delete lines 2062-2097 (the `multiYearData` computation). This is now unused.

**Step 3: Remove the multiyear view rendering**

Delete lines 2252-2287 (the `{view==="multiyear" && ...}` block).

**Step 4: Verify**

Only "Tracker Grid", "Forecast vs Result", and "Compound Interest" tabs should remain. No console errors.

**Step 5: Commit**
```bash
git add src/FinanceApp.jsx
git commit -m "feat: remove Multi-Year Trend tab (functionality merged into range grid)"
```

---

### Task 6: Fix Sync & AddYear for Range Context

**Files:**
- Modify: `src/FinanceApp.jsx` (syncFromAccounts, addYear functions)

**Step 1: Fix syncFromAccounts**

The sync function currently uses `selYear`. It should always sync to the current calendar year:

```javascript
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
```

**Step 2: Fix addYear**

`addYear` should create the next year after the highest existing year, which still works. But after creating, set `endYear` to the new year:

```javascript
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
```

**Step 3: Fix deleteYear**

Update to use startYear/endYear:
```javascript
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
```

**Step 4: Fix sync button visibility**

The sync button should only show when the current calendar year is within the selected range:

```jsx
headerRight={
  rangeYears.includes(currentYear) && <div style={{display:"flex",alignItems:"center",gap:6}}>
    ...sync controls...
  </div>
}
```

**Step 5: Verify**

- Sync from accounts works when 2026 is in range
- Add Year creates 2027 and switches view to it
- Delete a year updates range correctly

**Step 6: Commit**
```bash
git add src/FinanceApp.jsx
git commit -m "fix: sync, addYear, deleteYear work with range selector"
```

---

### Task 7: Final Polish & Build Verification

**Files:**
- Modify: `src/FinanceApp.jsx` (minor tweaks)

**Step 1: Update Compound Interest starting year**

The compound interest projection uses `selYear`. Change to use `endYear`:
```javascript
const proj = useMemo(()=>{
  const d=[]; let b=currentTotal;
  for(let y=0;y<=years;y++){
    d.push({year:endYear+y,balance:Math.round(b),contributed:currentTotal+monthlyAdd*12*y});
    b=(b+monthlyAdd*12)*(1+growthRate/100);
  }
  return d;
},[growthRate,monthlyAdd,years,currentTotal,endYear]);
```

**Step 2: Adjust minWidth for multi-year grid**

Change the table `minWidth` to scale with the number of columns:
```javascript
minWidth: Math.max(1100, columns.length * 62 + 200)
```

**Step 3: Build and verify**

```bash
cd /Volumes/ssd/repository/finance_hub && npm run build
```

Fix any build errors. Then run the dev server and manually verify:
1. Range 2023-2025: continuous 36-column grid, correct data
2. Range 2026 only: works as before
3. Chart spans range correctly
4. Delete year works
5. Add year works
6. Sync from accounts works for 2026
7. Compound interest still works
8. No Multi-Year Trend tab

**Step 4: Commit**
```bash
git add src/FinanceApp.jsx
git commit -m "polish: compound interest uses endYear, grid min-width scales with range"
```

---

### Data Verification Reference

When testing, verify these December 2025 result totals from the spreadsheet:
- ZKB (Blocked Account Flat): 8,901
- SwissLife - 2A Pillar: 61,685
- Frankly - 3A Pillar: 48,170
- Crypto (CoinStats): 523
- Yuh Invest: 20,984
- Yuh Golden Egg: 0
- Yuh Emergency: 15,000
- **Total Dec 2025 Result: ~155,263**
