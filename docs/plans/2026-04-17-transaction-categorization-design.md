# Transaction Categorization — Design

## Overview

Import bank statements (any format) into a new Transactions page. AI automatically detects the CSV format, normalizes transactions, and assigns spending categories. Users can override categories, and corrections persist as rules for future imports.

## Data Model

```javascript
transactions: {
  imports: [
    {
      id: "uuid",
      name: "Revolut Jan-Apr 2026",
      importedAt: "2026-04-17T...",
      currency: "CHF",
      transactions: [
        {
          id: "uuid",
          date: "2026-01-01",
          description: "Migros",
          amount: -18.85,
          fee: 0,
          category: "Groceries",
          type: "Card Payment",
        }
      ]
    }
  ],
  categoryRules: [
    { match: "Migros", category: "Groceries" }
  ],
  customCategories: ["Coworking"],
  prompt: "..." // user-editable
}
```

**Default categories**: Groceries, Dining & Restaurants, Transport, Entertainment, Shopping, Health & Fitness, Subscriptions & Fees, Housing, Transfers, Income, Other.

**Persistence**: `/api/transactions` endpoint, JSON file storage like other data.

## Import Flow

1. User clicks "Import Statement" on Transactions page
2. File picker opens (`.csv`, `.xlsx`, `.xls`, `.pdf`)
3. PII scan runs (reuse existing attachment scanning)
4. File sent to AI with categorization prompt + existing categoryRules
5. AI returns normalized transactions with categories as JSON
6. Preview modal shows transaction table with editable categories
7. Overlap detection: match on `date + description + amount` — user chooses Merge (skip duplicates) or Replace (overwrite date range)
8. User confirms — transactions saved, category edits become new rules

## Transactions Page UI

1. **Header bar**: Title + "Import Statement" button + prompt edit icon
2. **Filter bar**: Date range picker, category filter, search box
3. **Summary cards**: Total income, Total expenses, Net, Top spending category
4. **Charts**: Category pie/donut chart + monthly stacked bar chart (trends)
5. **Transaction table**: Date, Description, Amount, Category (editable dropdown), Type — sortable
6. **Category management**: Add/rename/delete custom categories, view/edit rules

## Category Rules & Learning

- User category changes auto-create rules: `{ match: description, category: newCategory }`
- Rules applied before AI on next import
- Rules passed to AI as context so it follows patterns for similar merchants
- Users can view and delete rules
- Custom categories addable beyond defaults
