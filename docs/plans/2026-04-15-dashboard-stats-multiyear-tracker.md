# Dashboard Stats & Multi-Year Tracker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 5 new StatCards to the Dashboard and a Multi-Year Trend tab to the Tracker page.

**Architecture:** All changes are in `src/FinanceApp.jsx` — a single-file React app. The Dashboard component already computes all needed values (`inc`, `sav`, `inv`, `linkedTax`, `linkedInsurance`, `sc`). The TrackerPage already has compound growth state (`growthRate`, `monthlyAdd`, `years`). No new state or props needed anywhere.

**Tech Stack:** React, Recharts (`ComposedChart`, `Area`, `Line`, `ReferenceLine`), Lucide icons, Vite dev server (`npm run dev`).

---

## How to verify changes

Start dev server once and leave it running:
```bash
cd /Volumes/ssd/repository/finance_hub
npm run dev
```
Open `http://localhost:5173` in browser. All verification is visual — check the Dashboard and Tracker pages after each task.

---

### Task 1: Add Row 1 — Income & Scenario StatCards to Dashboard

**File:** Modify `src/FinanceApp.jsx` around line 799

**Context:** The Dashboard stat grid currently starts at line 799. We insert a new grid **above** it (before line 799) with 3 new cards.

**Step 1: Locate the existing stat grid**

In `FinanceApp.jsx`, find this exact block (around line 799):
```jsx
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16, marginBottom:24 }}>
      <StatCard label="Monthly Savings + Invest" ...
```

**Step 2: Insert new Row 1 grid above it**

Insert this block immediately before the existing grid div (after the closing `</Card>` of the net worth card at line 797):

```jsx
    {/* Row 1: Income & Scenario overview */}
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16, marginBottom:16 }}>
      <StatCard label="Total Monthly Income" value={`CHF ${mask(fmt(Math.round(inc)))}`} sub={sc?`from ${sc.name}`:"no active scenario"} icon={DollarSign} color={C.green}/>
      <StatCard label="Savings Rate" value={inc>0?`${Math.round((sav+inv)/inc*100)}%`:"—"} sub={inc>0?`CHF ${mask(fmt(Math.round(sav+inv)))}/mo saved`:"no active scenario"} icon={PiggyBank} color={C.teal}/>
      <StatCard label="Active Scenario" value={sc?sc.name:"None"} sub={sc?`${sc.incomes.length} income${sc.incomes.length!==1?'s':''} · ${sc.expenses.length} expense${sc.expenses.length!==1?'s':''}`:"set a scenario active"} icon={Activity} color={C.accent}/>
    </div>
```

**Step 3: Verify icons are available**

`DollarSign`, `PiggyBank`, and `Activity` are already imported on line 3. No import changes needed.

**Step 4: Check in browser**

Navigate to Dashboard. You should see 3 new cards above the existing 4: Total Monthly Income, Savings Rate, Active Scenario.

**Step 5: Commit**
```bash
git add src/FinanceApp.jsx
git commit -m "feat: add income, savings rate, scenario StatCards to Dashboard"
```

---

### Task 2: Add Tax + Insurance StatCard to Dashboard Row 2

**File:** Modify `src/FinanceApp.jsx` around line 808

**Context:** The existing row 2 grid ends with the Survival Runway card. We append one more card.

**Step 1: Find the Survival Runway card**

In the existing stat grid, find this exact line (around line 808):
```jsx
      <StatCard label="Survival Runway" value={sc?`${survivalMonths} months`:"—"} sub={sc?`Liquid CHF ${mask(fmt(liquidTotal))} ÷ CHF ${mask(fmt(Math.round(essentialTotal)))}/mo`:"no active scenario"} icon={Shield} color={survivalMonths>=6?C.green:survivalMonths>=3?C.yellow:C.red} iconColor={C.cyan}/>
    </div>
```

**Step 2: Insert Tax + Insurance card before the closing `</div>`**

Replace that block with:
```jsx
      <StatCard label="Survival Runway" value={sc?`${survivalMonths} months`:"—"} sub={sc?`Liquid CHF ${mask(fmt(liquidTotal))} ÷ CHF ${mask(fmt(Math.round(essentialTotal)))}/mo`:"no active scenario"} icon={Shield} color={survivalMonths>=6?C.green:survivalMonths>=3?C.yellow:C.red} iconColor={C.cyan}/>
      <StatCard label="Tax + Insurance" value={`CHF ${mask(fmt(Math.round(linkedTax+linkedInsurance)))}/mo`} sub={`CHF ${mask(fmt(Math.round((linkedTax+linkedInsurance)*12)))}/yr`} icon={ShieldCheck} color={C.red}/>
    </div>
```

**Step 3: Verify `ShieldCheck` is imported**

Check line 3 of FinanceApp.jsx — `ShieldCheck` is already imported in the lucide-react import. No change needed.

**Step 4: Check in browser**

Dashboard row 2 should now show 5 cards: the existing 4 plus "Tax + Insurance" with a red icon.

**Step 5: Commit**
```bash
git add src/FinanceApp.jsx
git commit -m "feat: add Tax + Insurance StatCard to Dashboard"
```

---

### Task 3: Add Multi-Year Trend tab to TrackerPage

**File:** Modify `src/FinanceApp.jsx` — TrackerPage function (starts at line 1892)

**Context:** TrackerPage currently has 3 tabs: `grid`, `chart`, `compound`. We add a 4th tab `multiyear`. All needed state (`growthRate`, `monthlyAdd`, `years`, `currentTotal`, `tracker`, `selYear`) already exists in the component scope.

**Step 1: Add the tab button**

Find the tab buttons block (around line 1976-1979):
```jsx
    <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
      <Tab active={view==="grid"} onClick={()=>setView("grid")}>{selYear} Tracker Grid</Tab>
      <Tab active={view==="chart"} onClick={()=>setView("chart")}>Forecast vs Result</Tab>
      <Tab active={view==="compound"} onClick={()=>setView("compound")}>Compound Interest</Tab>
    </div>
```

Replace with:
```jsx
    <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
      <Tab active={view==="grid"} onClick={()=>setView("grid")}>{selYear} Tracker Grid</Tab>
      <Tab active={view==="chart"} onClick={()=>setView("chart")}>Forecast vs Result</Tab>
      <Tab active={view==="compound"} onClick={()=>setView("compound")}>Compound Interest</Tab>
      <Tab active={view==="multiyear"} onClick={()=>setView("multiyear")}>Multi-Year Trend</Tab>
    </div>
```

**Step 2: Build the multiYearData memo**

Find the line where `const proj = useMemo(...)` ends (around line 1966). Insert the new memo immediately after it:

```jsx
  const multiYearData = useMemo(() => {
    const trackedYears = Object.keys(tracker).map(Number).sort((a,b)=>a-b);
    // Historical: for each tracked year, get Dec total (actual preferred, else forecast)
    const historical = trackedYears.map(yr => {
      const rows = tracker[yr] || [];
      const activeRows = rows.filter(r => r.active !== false);
      // Compute forecast values for this year's rows
      const withForecast = activeRows.map(a => {
        const f = [];
        for (let m = 0; m < 12; m++) {
          if (m === 0) f.push(a.startBal);
          else if (m < (a.activeUntil ?? 12)) f.push(f[m-1] + (a.recurring ?? 0));
          else f.push(f[m-1]);
        }
        return { ...a, values: f };
      });
      const decActual = withForecast.every(r => r.results[11] !== null && r.results[11] !== undefined)
        ? withForecast.reduce((s, r) => s + (r.results[11] ?? 0), 0)
        : null;
      const decForecast = withForecast.reduce((s, r) => s + r.values[11], 0);
      return { year: yr, actual: decActual, forecast: decForecast };
    });
    // Projection: compound growth from currentTotal, year-by-year
    const projYears = [];
    let bal = currentTotal;
    const startYear = new Date().getFullYear();
    for (let y = 0; y <= years; y++) {
      // compound monthly for 12 months
      for (let m = 0; m < 12; m++) {
        bal = (bal + monthlyAdd) * (1 + growthRate / 100 / 12);
      }
      projYears.push({ year: startYear + y + 1, projected: Math.round(bal) });
    }
    // Merge: historical points + projection points (avoid duplicating current year)
    const allYears = new Map();
    historical.forEach(h => allYears.set(h.year, { year: h.year, actual: h.actual, forecast: h.forecast }));
    projYears.forEach(p => {
      const existing = allYears.get(p.year) || { year: p.year };
      allYears.set(p.year, { ...existing, projected: p.projected });
    });
    return Array.from(allYears.values()).sort((a,b) => a.year - b.year);
  }, [tracker, currentTotal, growthRate, monthlyAdd, years]);
```

**Step 3: Add the Multi-Year Trend view JSX**

Find the `{view==="compound" && ...}` block which ends at line ~2119 with `</div>}`. Insert the new view immediately after it (before the final `</div>` closing the TrackerPage return):

```jsx
    {view==="multiyear" && <div>
      {/* Sliders row — reuse compound params */}
      <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:16,padding:"16px 20px",background:C.card,borderRadius:12,border:`1px solid ${C.border}`}}>
        <div style={{flex:1,minWidth:160}}>
          <label style={{fontSize:12,color:C.textMuted,display:"flex",justifyContent:"space-between"}}><span>Annual Growth Rate</span><span style={{color:C.accent,fontWeight:600}}>{growthRate}%</span></label>
          <input type="range" min={0} max={15} step={0.5} value={growthRate} onChange={e=>setGrowthRate(Number(e.target.value))} style={{width:"100%",accentColor:C.accent}}/>
        </div>
        <div style={{flex:1,minWidth:160}}>
          <label style={{fontSize:12,color:C.textMuted,display:"flex",justifyContent:"space-between"}}><span>Monthly Contribution</span><span style={{color:C.accent,fontWeight:600}}>CHF {fmt(monthlyAdd)}</span></label>
          <input type="range" min={0} max={8000} step={100} value={monthlyAdd} onChange={e=>setMonthlyAdd(Number(e.target.value))} style={{width:"100%",accentColor:C.accent}}/>
        </div>
        <div style={{flex:1,minWidth:160}}>
          <label style={{fontSize:12,color:C.textMuted,display:"flex",justifyContent:"space-between"}}><span>Projection Horizon</span><span style={{color:C.accent,fontWeight:600}}>{years} years</span></label>
          <input type="range" min={1} max={40} step={1} value={years} onChange={e=>setYears(Number(e.target.value))} style={{width:"100%",accentColor:C.accent}}/>
        </div>
      </div>
      <Card title="Multi-Year Net Worth Trend">
        <ResponsiveContainer width="100%" height={isMobile?260:420}>
          <ComposedChart data={multiYearData} margin={{top:8,right:16,bottom:8,left:8}}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
            <XAxis dataKey="year" tick={{fill:C.textDim,fontSize:11}}/>
            <YAxis tick={{fill:C.textDim,fontSize:11}} tickFormatter={v=>v>=1e6?`${(v/1e6).toFixed(1)}M`:`${Math.round(v/1000)}k`}/>
            <Tooltip formatter={v=>`CHF ${fmt(v)}`} contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13}} labelStyle={{color:C.textMuted}} itemStyle={{color:C.text}}/>
            <Legend/>
            <ReferenceLine x={new Date().getFullYear()} stroke={C.accent} strokeDasharray="4 4" label={{value:"Today",fill:C.accentLight,fontSize:11}}/>
            <Area type="monotone" dataKey="projected" fill={C.blue+"33"} stroke={C.blue} strokeWidth={1.5} name="Projected" connectNulls/>
            <Line type="monotone" dataKey="forecast" stroke={C.accent} strokeWidth={2} strokeDasharray="5 3" dot={false} name="Tracker Forecast" connectNulls/>
            <Line type="monotone" dataKey="actual" stroke={C.green} strokeWidth={2.5} dot={{fill:C.green,r:4}} name="Actual" connectNulls={false}/>
          </ComposedChart>
        </ResponsiveContainer>
        <div style={{display:"flex",gap:16,marginTop:12,flexWrap:"wrap"}}>
          <div style={{fontSize:12,color:C.textDim}}><span style={{color:C.green,fontWeight:600}}>● Actual</span> — verified Dec balances from tracker</div>
          <div style={{fontSize:12,color:C.textDim}}><span style={{color:C.accent,fontWeight:600}}>– – Tracker Forecast</span> — Dec forecast from tracker rows</div>
          <div style={{fontSize:12,color:C.textDim}}><span style={{color:C.blue,fontWeight:600}}>▐ Projected</span> — compound growth from today</div>
        </div>
      </Card>
    </div>}
```

**Step 4: Verify `ReferenceLine` is imported from recharts**

Search for `ReferenceLine` in the imports at the top of `FinanceApp.jsx`:
```bash
grep "ReferenceLine" /Volumes/ssd/repository/finance_hub/src/FinanceApp.jsx | head -3
```

If `ReferenceLine` is NOT in the recharts import, find the recharts import line and add it. It looks like:
```jsx
import { ..., ReferenceLine } from "recharts";
```

**Step 5: Check in browser**

Go to Tracker page → click "Multi-Year Trend" tab. You should see:
- 3 sliders (growth rate, monthly contribution, horizon)
- A chart with up to 3 data series (actual dots, dashed forecast, projected area)
- A vertical reference line at the current year

**Step 6: Commit**
```bash
git add src/FinanceApp.jsx
git commit -m "feat: add Multi-Year Trend tab to Tracker"
```

---

## Done

All 3 tasks complete. The Dashboard now shows 8 StatCards across 2 logical rows, and the Tracker has a 4th tab showing historical + projected net worth across all years.
