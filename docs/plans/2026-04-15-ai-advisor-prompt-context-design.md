# AI Advisor Prompt & Context Improvements — Design

**Date:** 2026-04-15

## Goal

Fix the AI Finance Advisor so it always grounds answers in the user's actual data, respects active scenario line items, includes all profile information, and never hallucinates figures.

## Problem

1. Active scenario sent as totals only — AI can't reference named line items like "your Rent of CHF 1'800"
2. Subscriptions and insurance sent as totals only — same issue
3. No explicit anti-hallucination grounding rule in the prompt
4. Today's date not injected — AI doesn't know current tax year or deadlines
5. Prompt doesn't require verifying figures from snapshot before answering

## Three-Part Fix

### Part 1 — Enrich `buildContext` in `FinanceApp.jsx`

Two `buildContext` functions exist: line ~1111 (ScenariosPage inline chat) and line ~3223 (ChatPanel). Both need updating.

**Replace `activeScenario` totals with named line items:**
```js
activeScenario: sc ? {
  name: sc.name,
  incomes:     sc.incomes.map(x => ({ label: x.label, amount: getA(x) })),
  expenses:    sc.expenses.map(x => ({ label: x.label, amount: getA(x), essential: x.essential !== false })),
  savings:     sc.savings.map(x => ({ label: x.label, amount: getA(x) })),
  investments: sc.investments.map(x => ({ label: x.label, amount: getA(x) })),
  totals: { income: inc, expenses: exp, savings: sav, investments: inv, unallocated: Math.round(inc - exp - sav - inv) },
} : null,
```

**Replace subscription/insurance totals with named lists:**
```js
subscriptions: subsP.map(x => ({ name: x.name, monthly: Math.round(subMonthly(x)) })),
insurance: insurance.map(i => ({ name: i.name, insurer: i.insurer || '', monthly: Math.round(insMonthlyCalc(i)) })),
```

**Add today's date:**
```js
today: new Date().toISOString().slice(0, 10),
```

Remove the old `monthlySubscriptions` total and `insuranceTotal` total (replaced by named arrays).

### Part 2 — Strengthen `finance-advisor.md`

Add a **CRITICAL: Grounding Rules** section at the very top of the file (before `## Your Role`):

```markdown
## CRITICAL: Grounding Rules

Before answering any question involving the user's finances:

1. **Read the snapshot first** — locate the relevant figure in the Current Financial Snapshot. Use those exact numbers.
2. **Never invent numbers** — if a figure is not in the snapshot, say "I don't have that in your Finance Hub" rather than estimating or using national averages.
3. **Use named line items** — refer to actual entries by name (e.g. "your Rent expense of CHF 1'800/mo") not generic category totals.
4. **Active scenario is the current reality** — when the user asks about income, expenses, or budget, use the active scenario's named line items. If no scenario is active, say so before answering.
5. **Search before guessing** — if a rate, regulation, or market figure may have changed since your training, use web_search to verify rather than citing from memory.
6. **Distinguish sources** — make explicit when a figure comes from (a) the snapshot, (b) a web search result, or (c) general Swiss law knowledge.
7. **Today's date is in the snapshot** — use it for tax year context, deadline calculations, and age computation. Never assume a year.
```

Also add one line to the existing `## Behaviour` section:
```
- **If you are uncertain about a current figure** → use web_search. Never guess rates, limits, or regulations.
```

### Part 3 — Inject today's date in `buildSystem` (`chat.js`)

In the `buildSystem` function, prepend the date to the rendered system prompt:

```js
function buildSystem(context, base = SYSTEM_BASE) {
  const todayStr = context.today || new Date().toISOString().slice(0, 10);
  // ... existing profile section building ...
  return `Today's date: ${todayStr}\n\n${base}${profileSection}\n\n## Current Financial Snapshot\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\``;
}
```

## Files Changed

| File | Change |
|------|--------|
| `src/FinanceApp.jsx` | Both `buildContext` functions: named scenario line items, named subscriptions, named insurance, add `today` |
| `api/prompts/finance-advisor.md` | Add Grounding Rules block at top; add one behaviour line |
| `api/routes/chat.js` | `buildSystem`: prepend today's date to system prompt |

## Out of Scope

- No new state or props
- No API schema changes
- No UI changes
- `yearlyExpenses` and `latestTax` are already sent in full — no change needed
