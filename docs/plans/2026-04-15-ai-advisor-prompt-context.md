# AI Advisor Prompt & Context Improvements — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the AI Finance Advisor always ground answers in the user's actual named line items, prevent hallucination, and inject today's date.

**Architecture:** Three independent changes — (1) enrich frontend context objects with named scenario line items + named subscriptions/insurance + today's date, (2) add grounding rules to the system prompt markdown file, (3) prepend today's date in the backend `buildSystem` function. No new state, no new endpoints, no UI changes.

**Tech Stack:** React (FinanceApp.jsx), Node.js/Express (api/routes/chat.js), Markdown (api/prompts/finance-advisor.md).

---

## How to verify

No automated tests exist. Verify by:
1. Opening Finance Hub at `http://localhost:5173`
2. Opening the AI Advisor chat
3. Asking "What are my monthly expenses?" — the AI should list named items (e.g. "Rent: CHF 1'800") not just totals
4. Asking "What is today's date?" — should respond with the correct date

---

### Task 1: Enrich ChatPanel `buildContext` with named line items

**File:** Modify `src/FinanceApp.jsx` — the `buildContext` function inside `ChatPanel` (around line 3223)

**Context:** This is the main AI advisor context. It currently sends scenario totals only and a single integer for subscriptions/insurance. We replace those with named arrays and add `today`.

**Step 1: Find the exact block to replace**

Read lines 3234–3251 of `src/FinanceApp.jsx`. You will see:
```js
    return {
      totalWealth, liquidTotal,
      lockedTotal: totalWealth - liquidTotal,
      survivalMonths: essentialCosts > 0 ? Math.floor(liquidTotal / essentialCosts) : 0,
      activeScenario: sc ? { name: sc.name, income: inc, expenses: exp, savings: sav, investments: inv, essentialCosts } : null,
      accounts: accounts.map(a => ({
        name: a.name, type: a.type, balance: a.balance,
        ...(a.interestRate!=null && { interestRate: a.interestRate }),
        ...(a.positions?.length && { positions: a.positions.map(p=>({ ticker:p.ticker, shares:p.shares, avgBuyPrice:p.avgBuyPrice })) }),
        ...(a.instructions && { instructions: a.instructions }),
      })),
      monthlySubscriptions: subsP.reduce((s,x)=>s+subMonthly(x),0),
      yearlyExpenses: yearly,
      insuranceTotal: insurance.reduce((s,i)=>s+i.yearly,0),
      latestTax: taxes[taxes.length-1] || null,
      _profile: profile || null,
    };
```

**Step 2: Replace with enriched version**

Use the Edit tool to replace that exact block with:
```js
    return {
      today: new Date().toISOString().slice(0, 10),
      totalWealth, liquidTotal,
      lockedTotal: totalWealth - liquidTotal,
      survivalMonths: essentialCosts > 0 ? Math.floor(liquidTotal / essentialCosts) : 0,
      activeScenario: sc ? {
        name: sc.name,
        incomes:     sc.incomes.map(x => ({ label: x.label, amount: Math.round(getA(x)) })),
        expenses:    sc.expenses.map(x => ({ label: x.label, amount: Math.round(getA(x)), essential: x.essential !== false })),
        savings:     sc.savings.map(x => ({ label: x.label, amount: Math.round(getA(x)) })),
        investments: sc.investments.map(x => ({ label: x.label, amount: Math.round(getA(x)) })),
        totals: { income: Math.round(inc), expenses: Math.round(exp), savings: Math.round(sav), investments: Math.round(inv), unallocated: Math.round(inc - exp - sav - inv) },
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
```

**Step 3: Verify**

Read lines 3234–3260 and confirm the new structure is in place. Check that `monthlySubscriptions` and `insuranceTotal` are gone and replaced by `subscriptions` and `insurance` arrays.

**Step 4: Commit**
```bash
cd /Volumes/ssd/repository/finance_hub
git add src/FinanceApp.jsx
git commit -m "feat: enrich ChatPanel buildContext with named scenario line items"
```

---

### Task 2: Enrich ScenariosPage `buildContext` with named line items

**File:** Modify `src/FinanceApp.jsx` — the `buildContext` function inside the `ScenariosPage` inline chat (around line 1111)

**Context:** A second, simpler `buildContext` exists inside ScenariosPage for its own inline chat widget. It also sends scenario totals only. We apply the same enrichment for consistency.

**Step 1: Find the exact block to replace**

Read lines 1123–1132 of `src/FinanceApp.jsx`. You will see:
```js
    return { totalWealth, liquidTotal, lockedTotal: totalWealth - liquidTotal,
      survivalMonths: essentialCosts > 0 ? Math.floor(liquidTotal / essentialCosts) : 0,
      activeScenario: sc ? { name:sc.name, income:inc, expenses:exp, savings:sav, investments:inv, essentialCosts } : null,
      accounts: accounts.map(a=>({name:a.name,type:a.type,balance:a.balance})),
      monthlySubscriptions: subsP.reduce((s,x)=>s+subMonthly(x),0),
      yearlyExpenses: yearly, insuranceYearly: insurance.reduce((s,i)=>s+insMonthlyCalc(i)*12,0),
      latestTaxYear: latestTax ? { year: latestTax.year, total: latestTax.lines.reduce((s,l)=>s+l.amount,0) } : null,
      _profile: profile,
    };
```

**Step 2: Replace with enriched version**

```js
    return { today: new Date().toISOString().slice(0, 10),
      totalWealth, liquidTotal, lockedTotal: totalWealth - liquidTotal,
      survivalMonths: essentialCosts > 0 ? Math.floor(liquidTotal / essentialCosts) : 0,
      activeScenario: sc ? {
        name: sc.name,
        incomes:     sc.incomes.map(x => ({ label: x.label, amount: Math.round(getA(x)) })),
        expenses:    sc.expenses.map(x => ({ label: x.label, amount: Math.round(getA(x)), essential: x.essential !== false })),
        savings:     sc.savings.map(x => ({ label: x.label, amount: Math.round(getA(x)) })),
        investments: sc.investments.map(x => ({ label: x.label, amount: Math.round(getA(x)) })),
        totals: { income: Math.round(inc), expenses: Math.round(exp), savings: Math.round(sav), investments: Math.round(inv), unallocated: Math.round(inc - exp - sav - inv) },
      } : null,
      accounts: accounts.map(a=>({name:a.name,type:a.type,balance:a.balance})),
      subscriptions: subsP.map(x => ({ name: x.name, monthly: Math.round(subMonthly(x)) })),
      yearlyExpenses: yearly,
      insurance: insurance.map(i => ({ name: i.name, insurer: i.insurer || '', monthly: Math.round(insMonthlyCalc(i)) })),
      latestTaxYear: latestTax ? { year: latestTax.year, total: latestTax.lines.reduce((s,l)=>s+l.amount,0) } : null,
      _profile: profile,
    };
```

**Step 3: Verify**

Read lines 1123–1140 and confirm the new structure matches. `monthlySubscriptions` and `insuranceYearly` should be gone.

**Step 4: Commit**
```bash
git add src/FinanceApp.jsx
git commit -m "feat: enrich ScenariosPage buildContext with named scenario line items"
```

---

### Task 3: Add grounding rules to `finance-advisor.md`

**File:** Modify `api/prompts/finance-advisor.md`

**Context:** The system prompt currently has no explicit anti-hallucination rule. We add a `## CRITICAL: Grounding Rules` section as the very first section, before the existing `## Your Role` section.

**Step 1: Read the current file start**

Read lines 1–10 of `api/prompts/finance-advisor.md`. You will see it starts with:
```
You are a personal financial advisor...

## Your Role
```

**Step 2: Insert the grounding rules block**

Use the Edit tool to find the line:
```
## Your Role
```

And replace it with:
```markdown
## CRITICAL: Grounding Rules

Before answering any question involving the user's finances:

1. **Read the snapshot first** — locate the relevant figure in the Current Financial Snapshot below. Use those exact numbers.
2. **Never invent numbers** — if a figure is not in the snapshot, say "I don't have that in your Finance Hub" rather than estimating or substituting Swiss averages.
3. **Use named line items** — refer to actual entries by name (e.g. "your Rent expense of CHF 1'800/mo") not just category totals.
4. **Active scenario is the current reality** — when the user asks about income, expenses, savings, or cash flow, use the active scenario's named line items. If no scenario is active, say so before answering.
5. **Search before guessing** — if a rate, regulation, or market figure may have changed since your training, use web_search to verify rather than citing from memory.
6. **Distinguish sources** — make explicit when a figure comes from (a) the snapshot, (b) a web search result, or (c) general Swiss law knowledge.
7. **Today's date is in the snapshot** — use it for tax year context, deadline calculations, and age computation. Never assume a year.

---

## Your Role
```

**Step 3: Strengthen the Behaviour section**

Find this exact line near the bottom of the file:
```
- Never give generic advice — always ground it in the user's actual current numbers
```

Replace it with:
```
- Never give generic advice — always ground it in the user's actual current numbers
- **If you are uncertain about a current figure** — use web_search. Never guess rates, contribution limits, or regulations; they change annually
```

**Step 4: Verify**

Read lines 1–30 of `api/prompts/finance-advisor.md` and confirm the CRITICAL block is at the top before `## Your Role`.

**Step 5: Commit**
```bash
git add api/prompts/finance-advisor.md
git commit -m "feat: add grounding rules and anti-hallucination instructions to AI advisor prompt"
```

---

### Task 4: Inject today's date in `buildSystem` (chat.js)

**File:** Modify `api/routes/chat.js` — the `buildSystem` function (lines 24–44)

**Context:** The `buildSystem` function assembles the final system prompt sent to the AI. We prepend today's date as the very first line so the model always has explicit temporal grounding, independent of what's in the context JSON.

**Step 1: Read the current `buildSystem` function**

Read lines 24–44 of `api/routes/chat.js`. You will see it ends with:
```js
  return `${base}${profileSection}\n\n## Current Financial Snapshot\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\``;
```

**Step 2: Add `todayStr` variable and prepend to return**

Find this exact line:
```js
function buildSystem(context, base = SYSTEM_BASE) {
```

Replace it with:
```js
function buildSystem(context, base = SYSTEM_BASE) {
  const todayStr = context.today || new Date().toISOString().slice(0, 10);
```

Then find the return statement:
```js
  return `${base}${profileSection}\n\n## Current Financial Snapshot\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\``;
```

Replace it with:
```js
  return `Today's date: ${todayStr}\n\n${base}${profileSection}\n\n## Current Financial Snapshot\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\``;
```

**Step 3: Verify**

Read lines 24–46 of `api/routes/chat.js` and confirm:
- `todayStr` is declared at the top of `buildSystem`
- The return string starts with `` `Today's date: ${todayStr}\n\n` ``

**Step 4: Commit**
```bash
git add api/routes/chat.js
git commit -m "feat: inject today's date into AI advisor system prompt"
```

---

## Done

All 4 tasks complete. The AI advisor now:
- Receives full named line items for the active scenario (incomes, expenses, savings, investments with labels and amounts)
- Receives named subscription and insurance lists instead of totals
- Has explicit grounding rules forbidding invented numbers
- Knows today's date in every conversation
