import React, { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Download, Eye } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import ReportWrapper from './ReportWrapper';
import FilterToolbar from '../FilterToolbar';
import { useFilters } from '@/hooks/useFilters';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toDate } from 'date-fns-tz';
import { formatMoney } from '@/lib/money';
import { generatePdf } from '@/components/pdf/PdfGenerator';
import DailyBookReportTemplate from '@/components/pdf/DailyBookReportTemplate';

const DailyBook = () => {
  const { data, getProfitOfSale, setTransactionToView } = useData();
  const { sales, purchases, expenses, payments, customers, suppliers, banks, settings } = data;
  const { toast } = useToast();
  const currencySymbol = settings?.currencySymbol || 'Rs';
  
  const { filters, handleDateRangeChange, setDatePreset } = useFilters('dailyBook');

  const dailyData = useMemo(() => {
    const fromDate = filters?.dateRange?.from ? toDate(filters.dateRange.from) : null;
    const toDateFilter = filters?.dateRange?.to ? toDate(filters.dateRange.to) : null;

    if (!fromDate || !toDateFilter) {
        return { transactions: [] };
    }

    fromDate.setHours(0, 0, 0, 0);
    toDateFilter.setHours(23, 59, 59, 999);
    
    const dailyTransactions = [];

    (sales || []).filter(s => {
        const sDate = toDate(s.date);
        return sDate >= fromDate && sDate <= toDateFilter;
    }).forEach(s => {
      const { totalProfit } = getProfitOfSale(s);
      dailyTransactions.push({ time: toDate(s.date), type: 'Sale', ref: s.saleNumber, party: customers.find(c => c.id === s.customerId)?.name, amount: s.total_local, notes: `Profit: ${formatMoney(totalProfit, currencySymbol)}`, raw: s, rawType: 'sale' });
    });

    (purchases || []).filter(p => {
        const pDate = toDate(p.date);
        return pDate >= fromDate && pDate <= toDateFilter;
    }).forEach(p => {
      dailyTransactions.push({ time: toDate(p.date), type: 'Purchase', ref: p.purchaseNumber, party: suppliers.find(sup => sup.id === p.supplierId)?.name, amount: p.total_local, notes: '', raw: p, rawType: 'purchase' });
    });

    (payments || []).filter(p => {
        const pDate = toDate(p.date);
        return pDate >= fromDate && pDate <= toDateFilter;
    }).forEach(p => {
      dailyTransactions.push({ time: toDate(p.date), type: p.type === 'in' ? 'Payment In' : 'Payment Out', ref: p.id.slice(-6), party: p.partyType === 'customer' ? customers.find(c=>c.id === p.partyId)?.name : suppliers.find(sup=>sup.id === p.partyId)?.name, amount: p.amount, notes: `${p.method === 'bank' ? banks.find(b=>b.id===p.bankId)?.name : 'Cash'}`, raw: p, rawType: 'payment' });
    });

    (expenses || []).filter(e => {
        const eDate = toDate(e.date);
        return eDate >= fromDate && eDate <= toDateFilter;
    }).forEach(e => {
        dailyTransactions.push({ time: toDate(e.date), type: 'Expense', ref: e.id.slice(-6), party: e.category, amount: e.amount, notes: e.description, raw: e, rawType: 'expense' })
    });

    dailyTransactions.sort((a,b) => a.time - b.time);

    return {
        transactions: dailyTransactions,
    };
  }, [filters.dateRange, sales, purchases, payments, expenses, customers, suppliers, banks, settings, getProfitOfSale]);

  const handleExport = () => {
    if (dailyData.transactions.length === 0) {
      toast({ title: "No Data", description: "Cannot export an empty report.", variant: "destructive" });
      return;
    }
    const from = filters.dateRange.from ? format(filters.dateRange.from, 'PP') : 'start';
    const to = filters.dateRange.to ? format(filters.dateRange.to, 'PP') : 'today';
    generatePdf(
      <DailyBookReportTemplate data={dailyData.transactions} settings={settings} dateRange={{ from, to }} />,
      `Daily-Book-Report-${from}-to-${to}.pdf`,
      toast
    );
  };

  const toolbar = (
    <FilterToolbar
        filters={filters}
        onDateRangeChange={handleDateRangeChange}
        onSetDatePreset={setDatePreset}
        moduleName="daily book"
        showSearch={false}
    >
        <Button variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Export</Button>
    </FilterToolbar>
  );
  
  return (
    <ReportWrapper title="Daily Book" filterToolbar={toolbar}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Type</TableHead><TableHead>Ref #</TableHead><TableHead>Party/Details</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Notes</TableHead><TableHead className="text-center">View</TableHead></TableRow></TableHeader>
          <TableBody>
            {dailyData.transactions.length > 0 ? (
              dailyData.transactions.map((tx, idx) => (
                <TableRow key={idx}><TableCell>{format(tx.time, 'PP p')}</TableCell><TableCell className="font-medium">{tx.type}</TableCell><TableCell className="font-mono text-xs">{tx.ref}</TableCell><TableCell>{tx.party}</TableCell><TableCell className="text-right font-semibold">{formatMoney(tx.amount, currencySymbol)}</TableCell><TableCell className="text-xs text-muted-foreground">{tx.notes}</TableCell><TableCell className="text-center"><Button variant="ghost" size="icon" onClick={() => setTransactionToView({ transaction: tx.raw, type: tx.rawType })}><Eye className="h-4 w-4" /></Button></TableCell></TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                  No transactions found for the selected date range.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </ReportWrapper>
  );
};

export default DailyBook;