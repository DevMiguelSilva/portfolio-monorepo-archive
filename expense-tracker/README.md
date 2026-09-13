# Splitplan — Household budget

A clearer version of the Excel *Presupuesto* + *Tarjetas* workbook: monthly bills, possible vs real income, leftover pots, and credit cards.

Data stays in the browser (`localStorage`). Same stack as ApplyTrack: React, TypeScript, Vite, Tailwind.

## How it maps to the spreadsheet

| Excel | Splitplan |
|-------|-----------|
| Explicación / Método / Tarjeta / Gasto / Día | Budget lines (grouped) |
| Ingresos posibles vs reales (Miguel, Sandra) | Income sidebar |
| Distribución (A mano, Ahorros, Abuelo, Tobby) | Leftover pots |
| Anualidad | Annual expenses |
| Tarjetas: límite, deuda, pendiente, ahorros | Cards page |

A bit more detail than the sheet: planned vs actual, paid checkbox, automatic available credit (`limit − debt − pending`), utilization %, and a short monthly analysis.

Starter rows use your usual names (cards and bills) with **$0** — fill amounts locally. Nothing is linked from the portfolio site yet.

## Run

```bash
cd expense-tracker
npm install
npm run dev
```

[http://localhost:5174](http://localhost:5174)
