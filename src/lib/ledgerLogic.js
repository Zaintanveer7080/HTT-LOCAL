// src/lib/ledgerLogic.js
// Robust Party Ledger builder for Admin App (shared DB with Salesman App)
//
// ✅ Supplier: Purchases -> CREDIT, Payment Out/Debit Note -> DEBIT
// ✅ Customer: Sales -> DEBIT, Payment In/Credit Note -> CREDIT
// ✅ Counts each payment exactly once (dedupe by id / synthetic ids)
// ✅ Infers party by invoiceId if partyType is missing
// ✅ Includes inline paidAmount from invoice ONLY if no explicit payment row exists
// ✅ Ignores internal adjustments (cash_adjustment, transfer, etc.)
// ✅ Uses *_local (AED) when present, falls back gracefully

import { toDate as toDateInTz } from 'date-fns-tz';

const INTERNAL_TYPES = new Set([
  'cash_adjustment',
  'auto_cash_post',
  'bank_transfer',
  'opening_balance_seed',
  'rounding',
  'internal_settlement',
]);

const nz = (v) => Number(v ?? 0);
const norm = (v) => String(v ?? '').toLowerCase();

const getDocTotalLocal = (doc) =>
  nz(doc?.total_local ?? doc?.totalCost ?? doc?.total);

const getPaymentLocal = (p) =>
  nz(p?.amount_local ?? p?.amount);

const isPaymentIn  = (p) => ['in','payment_in','customer_payment'].includes(norm(p?.type ?? p?.direction ?? p?.kind));
const isPaymentOut = (p) => ['out','payment_out','supplier_payment'].includes(norm(p?.type ?? p?.direction ?? p?.kind));
const isInternal   = (p) => INTERNAL_TYPES.has(norm(p?.type)) || p?.isInternal === true || p?.meta?.internal === true;

function withinRange(d, fromDate, toDate) {
  if (!d) return true;
  if (fromDate && d < fromDate) return false;
  if (toDate && d > toDate) return false;
  return true;
}

export function buildLedgerData({
  partyType,          // 'customer' | 'supplier'
  selectedParty,      // party id
  data,               // { sales, purchases, payments, sales_returns, purchase_returns, credit_notes, debit_notes, ... }
  filters,            // { dateRange: { from, to } }
  timeZone,
  debouncedSearchTerm
}) {
  if (!selectedParty) return { transactions: [], openingBalance: 0, closingBalance: 0 };

  const {
    sales = [],
    purchases = [],
    payments = [],
    sales_returns = [],
    purchase_returns = [],
    credit_notes = [],
    debit_notes = [],
  } = data;

  const fromDate = filters?.dateRange?.from ? toDateInTz(filters.dateRange.from, { timeZone }) : null;
  const toDate   = filters?.dateRange?.to   ? toDateInTz(filters.dateRange.to,   { timeZone }) : null;
  if (fromDate) fromDate.setHours(0,0,0,0);
  if (toDate)   toDate.setHours(23,59,59,999);

  // Fast lookup by id
  const salesById     = new Map(sales.map(s => [s.id, s]));
  const purchaseById  = new Map(purchases.map(b => [b.id, b]));

  const rows = [];
  const seenPaymentIds = new Set(); // to avoid duplicates across sources

  if (partyType === 'customer') {
    // Sales -> DEBIT
    sales
      .filter(s => s?.customerId === selectedParty)
      .forEach(s => {
        rows.push({
          date: toDateInTz(s.date, { timeZone }),
          type: 'Sale',
          refId: s.saleNumber || s.id?.slice(-6) || 'INV',
          debit: getDocTotalLocal(s),
          credit: 0,
          doc: s, docType: 'sale',
        });
      });

    // Payments (module) -> CREDIT (include by partyType or by invoiceId inference)
    payments
      .filter(p => !isInternal(p))
      .forEach(p => {
        let belongs = false;

        // explicit
        if (norm(p.partyType) === 'customer' && p.partyId === selectedParty && isPaymentIn(p)) {
          belongs = true;
        }
        // infer by invoice link
        if (!belongs && p.invoiceId && salesById.has(p.invoiceId)) {
          const inv = salesById.get(p.invoiceId);
          if (inv?.customerId === selectedParty && isPaymentIn(p)) belongs = true;
        }
        if (!belongs) return;

        const pid = p.id || `${p.type}-${p.date}-${p.amount}`;
        if (seenPaymentIds.has(pid)) return;
        seenPaymentIds.add(pid);

        const amt = getPaymentLocal(p);
        if (amt > 0) {
          rows.push({
            date: toDateInTz(p.date, { timeZone }),
            type: 'Payment In',
            refId: p.ref || p.linkedInvoices?.[0] || pid.slice(-6) || 'PMTIN',
            debit: 0, credit: amt,
            doc: p, docType: 'payment',
          });
        }
        const disc = nz(p.discount);
        if (disc > 0) {
          rows.push({
            date: toDateInTz(p.date, { timeZone }),
            type: 'Discount',
            refId: p.ref || pid.slice(-6) || 'DISC',
            debit: 0, credit: disc,
            doc: p, docType: 'payment',
          });
        }
      });

    // Inline paid at save (only if NO explicit payment row exists)
    sales
      .filter(s => s?.customerId === selectedParty)
      .forEach(s => {
        const inlinePaid = nz(s.paidAmount ?? s.paid_amount_local);
        if (inlinePaid <= 0) return;

        const hasExplicit = payments.some(p =>
          !isInternal(p) &&
          isPaymentIn(p) &&
          (p.invoiceId === s.id ||
            (norm(p.partyType) === 'customer' && p.partyId === selectedParty && nz(p.amount) === inlinePaid))
        );
        if (hasExplicit) return;

        const sid = `inline-sale-${s.id}`;
        if (seenPaymentIds.has(sid)) return;
        seenPaymentIds.add(sid);

        rows.push({
          date: toDateInTz(s.date, { timeZone }),
          type: 'Payment In',
          refId: s.saleNumber || s.id?.slice(-6) || 'PMTIN',
          debit: 0, credit: inlinePaid,
          doc: { id: sid, source: 'inline_payment', invoiceId: s.id },
          docType: 'payment',
        });
      });

    // Credit Notes / Sales Returns -> CREDIT
    [...(sales_returns || []), ...(credit_notes || [])]
      .filter(r => r?.customerId === selectedParty)
      .forEach(r => {
        const amt = nz(r.total_local ?? r.amount_local ?? r.amount);
        if (amt > 0) {
          rows.push({
            date: toDateInTz(r.date, { timeZone }),
            type: 'Credit Note',
            refId: r.noteNumber || r.ref || r.id?.slice(-6) || 'CRN',
            debit: 0, credit: amt,
            doc: r, docType: 'sales_return',
          });
        }
      });
  } else {
    // SUPPLIER

    // Purchases -> CREDIT
    purchases
      .filter(b => b?.supplierId === selectedParty)
      .forEach(b => {
        rows.push({
          date: toDateInTz(b.date, { timeZone }),
          type: 'Purchase',
          refId: b.purchaseNumber || b.id?.slice(-6) || 'BILL',
          debit: 0, credit: getDocTotalLocal(b),
          doc: b, docType: 'purchase',
        });
      });

    // Payments (module) -> DEBIT (include by partyType or by invoiceId inference)
    payments
      .filter(p => !isInternal(p))
      .forEach(p => {
        let belongs = false;

        // explicit
        if (norm(p.partyType) === 'supplier' && p.partyId === selectedParty && isPaymentOut(p)) {
          belongs = true;
        }
        // infer by invoice link
        if (!belongs && p.invoiceId && purchaseById.has(p.invoiceId)) {
          const bill = purchaseById.get(p.invoiceId);
          if (bill?.supplierId === selectedParty && isPaymentOut(p)) belongs = true;
        }
        if (!belongs) return;

        const pid = p.id || `${p.type}-${p.date}-${p.amount}`;
        if (seenPaymentIds.has(pid)) return;
        seenPaymentIds.add(pid);

        const amt = getPaymentLocal(p);
        if (amt > 0) {
          rows.push({
            date: toDateInTz(p.date, { timeZone }),
            type: 'Payment Out',
            refId: p.ref || p.linkedInvoices?.[0] || pid.slice(-6) || 'PMTOUT',
            debit: amt, credit: 0, // reduces AP
            doc: p, docType: 'payment',
          });
        }
        const disc = nz(p.discount);
        if (disc > 0) {
          rows.push({
            date: toDateInTz(p.date, { timeZone }),
            type: 'Discount',
            refId: p.ref || pid.slice(-6) || 'DISC',
            debit: disc, credit: 0,
            doc: p, docType: 'payment',
          });
        }
      });

    // Inline paid at save (only if NO explicit payment row exists)
    purchases
      .filter(b => b?.supplierId === selectedParty)
      .forEach(b => {
        const inlinePaid = nz(b.paid_amount_local ?? b.paidAmount_base ?? b.paidAmount);
        if (inlinePaid <= 0) return;

        const hasExplicit = payments.some(p =>
          !isInternal(p) &&
          isPaymentOut(p) &&
          (p.invoiceId === b.id ||
            (norm(p.partyType) === 'supplier' && p.partyId === selectedParty && nz(p.amount) === inlinePaid))
        );
        if (hasExplicit) return;

        const sid = `inline-purchase-${b.id}`;
        if (seenPaymentIds.has(sid)) return;
        seenPaymentIds.add(sid);

        rows.push({
          date: toDateInTz(b.date, { timeZone }),
          type: 'Payment Out',
          refId: b.purchaseNumber || b.id?.slice(-6) || 'PMTOUT',
          debit: inlinePaid, credit: 0,
          doc: { id: sid, source: 'inline_payment', invoiceId: b.id },
          docType: 'payment',
        });
      });

    // Purchase Returns / Debit Notes -> DEBIT
    [...(purchase_returns || []), ...(debit_notes || [])]
      .filter(r => r?.supplierId === selectedParty)
      .forEach(r => {
        const amt = nz(r.total_local ?? r.amount_local ?? r.amount);
        if (amt > 0) {
          rows.push({
            date: toDateInTz(r.date, { timeZone }),
            type: 'Debit Note',
            refId: r.noteNumber || r.ref || r.id?.slice(-6) || 'DBN',
            debit: amt, credit: 0,
            doc: r, docType: 'purchase_return',
          });
        }
      });
  }

  // Opening balance & in-range
  let opening = 0;
  const inRange = [];
  rows.forEach(tx => {
    const d = tx.date;
    const impact = nz(tx.debit) - nz(tx.credit); // unified
    if (!withinRange(d, fromDate, toDate)) {
      if (fromDate && d < fromDate) opening += impact;
    } else {
      inRange.push(tx);
    }
  });

  // Sort + optional search
  inRange.sort((a, b) => {
    const da = a.date?.getTime?.() ?? 0;
    const db = b.date?.getTime?.() ?? 0;
    if (da !== db) return da - db;
    return String(a.refId).localeCompare(String(b.refId));
  });

  const searched = debouncedSearchTerm
    ? inRange.filter(tx =>
        String(tx.refId).toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        String(tx.type).toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
    : inRange;

  // Running balance
  let run = opening;
  const transactions = searched.map(tx => {
    run += nz(tx.debit) - nz(tx.credit);
    return { ...tx, balance: run };
  });

  return { transactions, openingBalance: opening, closingBalance: run };
}