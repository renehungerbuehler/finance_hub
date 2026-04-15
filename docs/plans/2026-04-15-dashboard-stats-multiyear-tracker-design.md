# Design: Dashboard Stats & Multi-Year Tracker

**Date:** 2026-04-15

## Overview

Two enhancements to Finance Hub:
1. Enrich the Dashboard with more financial KPI StatCards
2. Add a Multi-Year Trend view to the Tracker page

---

## 1. Dashboard — Additional StatCards

### Current State

The stat card row has 4 cards in a single `repeat(auto-fit, minmax(220px, 1fr))` grid:
- Monthly Savings + Invest
- Monthly Fixed Costs
- Unallocated
- Survival Runway

All values are already computed in the `Dashboard` component (`inc`, `sav`, `inv`, `exp`, `linkedTax`, `linkedInsurance`, `sc`).

### New Layout — Two Rows

**Row 1 — Income & Scenario (3 new cards):**

| Card | Value | Sub | Icon | Color |
|------|-------|-----|------|-------|
| Total Monthly Income | `CHF {inc}` | scenario name or "no active scenario" | `DollarSign` | `C.green` |
| Savings Rate | `{savingsRate}%` | `CHF {sav+inv}/mo saved` | `PiggyBank` | `C.teal` |
| Active Scenario | `{sc.name}` or "None" | `{incomes.length} incomes · {expenses.length} expenses` | `Activity` | `C.accent` |

Where `savingsRate = inc > 0 ? Math.round((sav + inv) / inc * 100) : 0`

**Row 2 — Cashflow Health (existing 4 + 1 new card):**

| Card | Status |
|------|--------|
| Monthly Savings + Invest | existing |
| Monthly Fixed Costs | existing |
| Unallocated | existing |
| Survival Runway | existing |
| Tax + Insurance | **new** — `CHF {linkedTax + linkedInsurance}/mo`, sub shows yearly total, icon `ShieldCheck`, color `C.red` |

Both rows use identical `display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16, marginBottom:24` — mobile wrapping is automatic.

---

## 2. Tracker — Multi-Year Trend Tab

### Current State

TrackerPage has 3 tabs:
- `grid` — per-year month grid with forecast/actual rows
- `chart` — single-year Forecast vs Result ComposedChart
- `compound` — compound interest calculator with sliders

State already available in TrackerPage scope: `growthRate`, `monthlyAdd`, `years`, `currentTotal`, `tracker` (all years' data), `selYear`.

### New Tab: `multiyear`

**Tab label:** `Multi-Year Trend`

**Data construction:**

1. **Historical series** — iterate over all tracked years in ascending order. For each year, get the December (month index 11) total: prefer `results[11]` (actual) if non-null, else fall back to the forecast `values[11]`. Build a point `{ year, total, isActual: boolean }` per tracked year.

2. **Projection series** — starting from `currentTotal`, project month-by-month for `years` years using the compound formula: `balance = (balance + monthlyAdd) * (1 + growthRate/100/12)` per month. Aggregate to year-end values. Start projection from current calendar year.

3. **Combined dataset** — merge historical + projection into a single array keyed by year, marking each point as `actual`, `forecast` (tracker forecast), or `projected` (compound).

**Chart:** `ComposedChart` (Recharts, consistent with app)
- X-axis: year labels
- Y-axis: CHF, formatted as `k` / `M`
- `Line` (solid, `C.green`, dot) for actual historical values
- `Line` (dashed, `C.accent`) for tracker forecast values
- `Area` (`C.blue+"33"` fill, `C.blue` stroke) for compound projection
- Tooltip shows CHF value + type label
- Vertical reference line at current year (today boundary between history and projection)

**Controls panel** (reuse existing compound sliders, shown above chart):
- Annual Growth Rate slider (`growthRate`)
- Monthly Contribution slider (`monthlyAdd`)
- Time Horizon slider (`years`)

These controls already exist in TrackerPage state — no new state needed.

**Layout:** Same `<Card>` wrapper pattern. Sliders in a compact horizontal row above the chart on desktop, stacked on mobile.

---

## Out of Scope

- No new state added to the top-level app (all data already flows into Dashboard and TrackerPage)
- No changes to data persistence format
- No changes to other pages
