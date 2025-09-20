// src/components/reports/CreditManagement.jsx
import React, { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/components/ui/use-toast';
import { differenceInDays, parseISO } from 'date-fns';
import { generatePdf } from '@/components/pdf/PdfGenerator';
import CreditReportTemplate from '@/components/pdf/CreditReportTemplate';
import ReportWrapper from './ReportWrapper';
import FilterToolbar from '../FilterToolbar';
import { useFilters } from '@/hooks/useFilters';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { formatMoney, toNumber } from '@/lib/money';

// ---------- helpers (local currency = AED by design) ----------
const nz = (v) => toNumber(v ?? 0);
const norm = (s) => String(s ?? '').trim().toLowerCase();

// internal/non-ledger payment types we never count
const INTERNAL_TYPES = new Set([
  'cash_adjustment',
  'auto_cash_post',
  'bank_transfer',
  'opening_balance_seed',
  'rounding',
  'internal_settlement',
]);

const isPaymentIn  = (p) => norm(p?.type) === 'in';
const isPaymentOut = (p) => norm(p?.type) === 'out';

const localFromPayment  = (p) => nz(p?.amount_local ?? p?.amount);
const localFromSale     = (s) => nz(s?.total_local ?? s?.totalCost);
const localFromPurchase = (b) => nz(b?.total_local ?? b?.totalCost);

// ---------- main component ----------
const CreditManagement = () => {
  const { data } = useData();
  const { customers = [], suppliers = [], sales = [], purchases = [], payments = [], settings = {} } = data || {};
  const { toast } = useToast();

  const currencySymbol = settings?.currencySymbol || data?.settings?.currencySymbol || 'AED';

  const {
    filters,
    handleFilterChange,
    debouncedSearchTerm,
    handleDateRangeChange,
    setDatePreset
  } = useFilters('creditManagement', []);

  // Fast lookups for inferring party from invoiceId
  const salesById = useMemo(() => new Map(sales.map(s => [s.id, s])), [sales]);
  const purchById = useMemo(() => new Map(purchases.map(p => [p.id, p])), [purchases]);

  // If a sale/purchase already has explicit payment rows, we will NOT also count inline-paid
  const saleHasPayment = useMemo(() => {
    const s = new Set();
    for (const p of payments) {
      if (INTERNAL_TYPES.has(norm(p?.type))) continue;
      if (isPaymentIn(p) && p?.invoiceId) s.add(p.invoiceId);
    }
    return s;
  }, [payments]);

  const purchaseHasPayment = useMemo(() => {
    const s = new Set();
    for (const p of payments) {
      if (INTERNAL_TYPES.has(norm(p?.type))) continue;
      if (isPaymentOut(p) && p?.invoiceId) s.add(p.invoiceId);
    }
    return s;
  }, [payments]);

  // ---------------- Receivables (Customers) ----------------
  const receivables = useMemo(() => {
    const byCustomer = new Map(customers.map(c => [c.id, {
      id: c.id,
      name: c.name,
      salesLocal: 0,
      paymentsInLocal: 0,
      creditNotesLocal: 0, // reserved (if you add credit notes later)
      oldestUnpaidDate: null,
    }]));

    // 1) All-time Sales
    for (const s of sales) {
      if (!s?.customerId || !byCustomer.has(s.customerId)) continue;
      byCustomer.get(s.customerId).salesLocal += localFromSale(s);
    }

    // 2) All-time Payment In (explicit rows) — infer customer by invoice if missing
    for (const p of payments) {
      if (INTERNAL_TYPES.has(norm(p?.type))) continue;
      if (!isPaymentIn(p)) continue;

      let customerId = p?.partyId;
      if (!customerId && p?.invoiceId && salesById.has(p.invoiceId)) {
        customerId = salesById.get(p.invoiceId)?.customerId;
      }
      if (!customerId || !byCustomer.has(customerId)) continue;

      const amt = localFromPayment(p);
      if (amt > 0) byCustomer.get(customerId).paymentsInLocal += amt;

      const disc = nz(p?.discount);
      if (disc > 0) byCustomer.get(customerId).paymentsInLocal += disc; // discount reduces receivable
    }

    // 3) Inline paid on sale ONLY if no explicit row exists
    for (const s of sales) {
      const cid = s?.customerId;
      if (!cid || !byCustomer.has(cid)) continue;
      const inlinePaid = nz(s?.paid_amount_local ?? s?.paidAmount);
      if (inlinePaid > 0 && !saleHasPayment.has(s.id)) {
        byCustomer.get(cid).paymentsInLocal += inlinePaid;
      }
    }

    // 4) Oldest unpaid invoice date per customer
    for (const s of sales) {
      const cid = s?.customerId;
      if (!cid || !byCustomer.has(cid)) continue;

      const total = localFromSale(s);
      let paid = 0;

      // explicit rows linked to this sale
      for (const p of payments) {
        if (!isPaymentIn(p)) continue;
        if (p?.invoiceId !== s.id) continue;
        paid += localFromPayment(p) + nz(p?.discount);
      }
      // inline only if no explicit
      if (!saleHasPayment.has(s.id)) {
        paid += nz(s?.paid_amount_local ?? s?.paidAmount);
      }

      const due = total - paid;
      if (due > 0) {
        const prev = byCustomer.get(cid).oldestUnpaidDate;
        if (!prev || new Date(s.date) < new Date(prev)) {
          byCustomer.get(cid).oldestUnpaidDate = s.date;
        }
      }
    }

    // Build rows (search by name)
    const st = (debouncedSearchTerm || '').toLowerCase();
    const rows = [];
    for (const row of byCustomer.values()) {
      const balance = row.salesLocal - row.paymentsInLocal - row.creditNotesLocal; // AED receivable
      if (Math.abs(balance) < 0.0001) continue;
      if (st && !row.name.toLowerCase().includes(st)) continue;

      rows.push({
        id: row.id,
        name: row.name,
        balance,
        oldestInvoiceDate: row.oldestUnpaidDate,
        overdueDays: row.oldestUnpaidDate ? Math.max(0, differenceInDays(new Date(), parseISO(row.oldestUnpaidDate))) : 0,
      });
    }

    return rows;
  }, [customers, sales, payments, debouncedSearchTerm, saleHasPayment, salesById]);

  // ---------------- Payables (Suppliers) ----------------
  const payables = useMemo(() => {
    const bySupplier = new Map(suppliers.map(su => [su.id, {
      id: su.id,
      name: su.name,
      purchasesLocal: 0,
      paymentsOutLocal: 0,
      debitNotesLocal: 0, // reserved (if you add debit notes later)
      oldestUnpaidDate: null,
    }]));

    // 1) All-time Purchases
    for (const b of purchases) {
      if (!b?.supplierId || !bySupplier.has(b.supplierId)) continue;
      bySupplier.get(b.supplierId).purchasesLocal += localFromPurchase(b);
    }

    // 2) All-time Payment Out (explicit rows) — infer supplier by invoice if missing
    for (const p of payments) {
      if (INTERNAL_TYPES.has(norm(p?.type))) continue;
      if (!isPaymentOut(p)) continue;

      let supplierId = p?.partyId;
      if (!supplierId && p?.invoiceId && purchById.has(p.invoiceId)) {
        supplierId = purchById.get(p.invoiceId)?.supplierId;
      }
      if (!supplierId || !bySupplier.has(supplierId)) continue;

      const amt = localFromPayment(p);
      if (amt > 0) bySupplier.get(supplierId).paymentsOutLocal += amt;

      const disc = nz(p?.discount);
      if (disc > 0) bySupplier.get(supplierId).paymentsOutLocal += disc; // discount reduces payable
    }

    // 3) Inline paid on purchase ONLY if no explicit row exists
    for (const b of purchases) {
      const sid = b?.supplierId;
      if (!sid || !bySupplier.has(sid)) continue;
      const inlinePaid = nz(b?.paid_amount_local ?? b?.paidAmount_base ?? b?.paidAmount);
      if (inlinePaid > 0 && !purchaseHasPayment.has(b.id)) {
        bySupplier.get(sid).paymentsOutLocal += inlinePaid;
      }
    }

    // 4) Oldest unpaid bill date per supplier
    for (const b of purchases) {
      const sid = b?.supplierId;
      if (!sid || !bySupplier.has(sid)) continue;

      const total = localFromPurchase(b);
      let paid = 0;

      for (const p of payments) {
        if (!isPaymentOut(p)) continue;
        if (p?.invoiceId !== b.id) continue;
        paid += localFromPayment(p) + nz(p?.discount);
      }
      if (!purchaseHasPayment.has(b.id)) {
        paid += nz(b?.paid_amount_local ?? b?.paidAmount_base ?? b?.paidAmount);
      }

      const due = total - paid;
      if (due > 0) {
        const prev = bySupplier.get(sid).oldestUnpaidDate;
        if (!prev || new Date(b.date) < new Date(prev)) {
          bySupplier.get(sid).oldestUnpaidDate = b.date;
        }
      }
    }

    // Build rows (search by name)
    const st = (debouncedSearchTerm || '').toLowerCase();
    const rows = [];
    for (const row of bySupplier.values()) {
      // Payable we show as positive AED amount
      const balance = row.purchasesLocal - row.paymentsOutLocal - row.debitNotesLocal;
      if (Math.abs(balance) < 0.0001) continue;
      if (st && !row.name.toLowerCase().includes(st)) continue;

      rows.push({
        id: row.id,
        name: row.name,
        balance, // AED payable
        oldestInvoiceDate: row.oldestUnpaidDate,
        overdueDays: row.oldestUnpaidDate ? Math.max(0, differenceInDays(new Date(), parseISO(row.oldestUnpaidDate))) : 0,
      });
    }

    return rows;
  }, [suppliers, purchases, payments, debouncedSearchTerm, purchaseHasPayment, purchById]);

  // name-filter already applied above; here we just paginate & render
  const CreditTable = ({ data, type, total }) => {
    const paginatedData = useMemo(() => {
      const startIndex = (filters.page - 1) * filters.pageSize;
      return data.slice(startIndex, startIndex + filters.pageSize);
    }, [data, filters.page, filters.pageSize]);

    const totalPages = Math.ceil(data.length / filters.pageSize);

    const toolbar = (
      <FilterToolbar
        filters={filters}
        onFilterChange={handleFilterChange}
        onDateRangeChange={handleDateRangeChange}
        onSetDatePreset={setDatePreset}
        moduleName={type}
      >
        <Button variant="outline" onClick={() => handleExport(type, data, total)}>
          <Download className="mr-2 h-4 w-4" /> Export PDF
        </Button>
      </FilterToolbar>
    );

    return (
      <ReportWrapper title={`${type} — Total: ${formatMoney(total, currencySymbol)}`} filterToolbar={toolbar}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{type === 'Receivables' ? 'Customer' : 'Supplier'}</TableHead>
                <TableHead className="text-right">Balance Due</TableHead>
                <TableHead>Oldest Invoice Date</TableHead>
                <TableHead className="text-right">Overdue (Days)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatMoney(item.balance, currencySymbol)}
                  </TableCell>
                  <TableCell>{item.oldestInvoiceDate ? new Date(item.oldestInvoiceDate).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell className={`text-right ${item.overdueDays > 30 ? 'text-red-600 font-bold' : item.overdueDays > 15 ? 'text-orange-600' : ''}`}>
                    {item.overdueDays > 0 ? item.overdueDays : '-'}
                  </TableCell>
                </TableRow>
              ))}
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                    No credit found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <CardFooter className="flex items-center justify-between pt-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); handleFilterChange('page', Math.max(1, filters.page - 1)); }}
                  disabled={filters.page === 1}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink>{filters.page} of {Math.max(1, Math.ceil(data.length / filters.pageSize))}</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => { e.preventDefault(); handleFilterChange('page', Math.min(Math.ceil(data.length / filters.pageSize), filters.page + 1)); }}
                  disabled={filters.page >= Math.ceil(data.length / filters.pageSize)}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </CardFooter>
      </ReportWrapper>
    );
  };

  const totalReceivables = useMemo(() => receivables.reduce((sum, r) => sum + r.balance, 0), [receivables]);
  const totalPayables   = useMemo(() => payables.reduce((sum, p) => sum + p.balance, 0),   [payables]);

  const handleExport = (type, rows, total) => {
    if (rows.length === 0) {
      toast({ title: "No Data", description: "Cannot export an empty report.", variant: "destructive" });
      return;
    }
    generatePdf(
      <CreditReportTemplate data={rows} type={type} total={total} settings={settings} />,
      `${type}-Report.pdf`,
      toast
    );
  };

  return (
    <Tabs defaultValue="receivables" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="receivables">Receivables</TabsTrigger>
        <TabsTrigger value="payables">Payables</TabsTrigger>
      </TabsList>

      <TabsContent value="receivables" className="mt-4">
        <CreditTable data={receivables} type="Receivables" total={totalReceivables} />
      </TabsContent>

      <TabsContent value="payables" className="mt-4">
        <CreditTable data={payables} type="Payables" total={totalPayables} />
      </TabsContent>
    </Tabs>
  );
};

export default CreditManagement;