import React, { useMemo, useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download, Search, Landmark, TrendingUp, ShoppingCart, CreditCard, ArrowLeftRight, Wallet } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { generatePdf } from '@/components/pdf/PdfGenerator';
import BankStatementTemplate from '@/components/pdf/BankStatementTemplate';
import ReportWrapper from './ReportWrapper';
import FilterToolbar from '../FilterToolbar';
import { useFilters } from '@/hooks/useFilters';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { toDate } from 'date-fns-tz';

const BankStatement = () => {
  const { data } = useData();
  const { banks, payments, sales, purchases, expenses, customers, suppliers, settings } = data;
  const { toast } = useToast();
  
  const [selectedBankId, setSelectedBankId] = useState('');

  const { 
    filters, 
    handleFilterChange, 
    handleDateRangeChange, 
    setDatePreset,
    debouncedSearchTerm,
    timeZone,
  } = useFilters(`bankStatement_${selectedBankId}`, []);
  
  useEffect(() => {
    if (!selectedBankId && banks.length > 0) {
      setSelectedBankId(banks[0].id);
    }
  }, [banks, selectedBankId]);

  const transactions = useMemo(() => {
    if (!selectedBankId) return [];
    
    const txs = [];
    (sales || []).forEach(s => {
        if (s.paidAmount > 0 && s.payment.method === 'bank' && s.payment.bankId === selectedBankId) txs.push({
            id: `sale-${s.id}`, date: s.date, type: 'Sale',
            description: `Sale #${s.saleNumber} to ${customers.find(c=>c.id === s.customerId)?.name || ''}`,
            amount: s.paidAmount, flow: 'in',
        });
    });
    (purchases || []).forEach(p => {
        if (p.paidAmount > 0 && p.payment.method === 'bank' && p.payment.bankId === selectedBankId) txs.push({
            id: `purchase-${p.id}`, date: p.date, type: 'Purchase',
            description: `Purchase #${p.purchaseNumber} from ${suppliers.find(sup=>sup.id === p.supplierId)?.name || ''}`,
            amount: p.paidAmount, flow: 'out',
        });
    });
    (payments || []).forEach(p => {
        if (p.method === 'bank' && p.bankId === selectedBankId) {
            const partyName = p.type === 'in' ? customers.find(c=>c.id === p.partyId)?.name : suppliers.find(sup=>sup.id === p.partyId)?.name;
            txs.push({
                id: `payment-${p.id}`, date: p.date, type: 'Payment',
                description: `Payment ${p.type === 'in' ? 'In' : 'Out'} - ${partyName || ''}`,
                amount: p.amount, flow: p.type,
            });
        }
    });
    
    return txs.sort((a,b) => new Date(b.date) - new Date(a.date));

  }, [selectedBankId, payments, sales, purchases, customers, suppliers]);

  const filteredTransactions = useMemo(() => {
    const fromDate = filters.dateRange.from ? toDate(filters.dateRange.from, { timeZone }) : null;
    const toDateFilter = filters.dateRange.to ? toDate(filters.dateRange.to, { timeZone }) : null;
    
    return transactions.filter(t => {
        const txDate = toDate(t.date, { timeZone });
        if (fromDate && txDate < fromDate) return false;
        if (toDateFilter && txDate > toDateFilter) return false;
        return t.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    });
  }, [transactions, filters.dateRange, debouncedSearchTerm, timeZone]);

  const selectedBank = banks.find(b => b.id === selectedBankId);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (filters.page - 1) * filters.pageSize;
    return filteredTransactions.slice(startIndex, startIndex + filters.pageSize);
  }, [filteredTransactions, filters.page, filters.pageSize]);

  const totalPages = Math.ceil(filteredTransactions.length / filters.pageSize);

  const transactionsWithBalance = useMemo(() => {
    if (!selectedBank) return [];
    // This is a simplified balance calculation for display and may not reflect historical balance accurately.
    // For a true running balance, a more complex calculation would be needed.
    let runningBalance = selectedBank.balance;
    
    return paginatedTransactions.map(tx => {
        return { ...tx, balance: runningBalance }; // Simplified
    }).reverse();
  }, [paginatedTransactions, selectedBank]);

  const handleExport = () => {
    if (!selectedBank || filteredTransactions.length === 0) {
      toast({ title: "No Data", description: "Cannot export an empty report.", variant: "destructive" });
      return;
    }
    generatePdf(
      <BankStatementTemplate 
        transactions={filteredTransactions} 
        bank={selectedBank} 
        dateRange={filters.dateRange} 
        settings={settings} 
      />,
      `Bank-Statement-${selectedBank.name}.pdf`
    );
  };

  const TransactionIcon = ({ type }) => {
    switch (type) {
        case 'Sale': return <TrendingUp className="h-5 w-5 text-green-500" />;
        case 'Purchase': return <ShoppingCart className="h-5 w-5 text-red-500" />;
        case 'Expense': return <CreditCard className="h-5 w-5 text-orange-500" />;
        case 'Payment': return <ArrowLeftRight className="h-5 w-5 text-blue-500" />;
        default: return <Wallet className="h-5 w-5 text-gray-500" />;
    }
  };

  const toolbar = (
    <FilterToolbar
      filters={filters}
      onFilterChange={handleFilterChange}
      onDateRangeChange={handleDateRangeChange}
      onSetDatePreset={setDatePreset}
      onReset={() => {}}
      moduleName="transactions"
    >
      <Select value={selectedBankId} onValueChange={setSelectedBankId}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Bank" />
          </SelectTrigger>
          <SelectContent>
              {banks.map(bank => <SelectItem key={bank.id} value={bank.id}>{bank.name}</SelectItem>)}
          </SelectContent>
      </Select>
      <Button variant="outline" onClick={handleExport}>
        <Download className="mr-2 h-4 w-4" /> Export PDF
      </Button>
    </FilterToolbar>
  );
  
  return (
    <ReportWrapper title="Bank Statement" filterToolbar={toolbar}>
        {selectedBank && (
            <div className="mb-4 p-4 bg-muted rounded-lg flex justify-between items-center">
                <h3 className="text-lg font-semibold flex items-center"><Landmark className="mr-2 h-5 w-5"/>{selectedBank.name}</h3>
                <p className="text-xl font-bold">Current Balance: RS {selectedBank.balance.toFixed(2)}</p>
            </div>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Transaction Details</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{format(new Date(tx.date), 'PPpp')}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        <TransactionIcon type={tx.type} />
                        <div>
                            <p className="font-medium">{tx.description}</p>
                            <p className="text-xs text-muted-foreground">{tx.type}</p>
                        </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {tx.flow === 'out' ? `RS ${tx.amount.toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    {tx.flow === 'in' ? `RS ${tx.amount.toFixed(2)}` : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredTransactions.length === 0 && <p className="text-center p-4 text-muted-foreground">No transactions found for the selected criteria.</p>}
        </div>
      <CardFooter className="flex items-center justify-between pt-6">
        <Pagination>
          <PaginationContent>
            <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); handleFilterChange('page', Math.max(1, filters.page - 1)); }} disabled={filters.page === 1} /></PaginationItem>
            <PaginationItem><PaginationLink>{filters.page} of {totalPages}</PaginationLink></PaginationItem>
            <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); handleFilterChange('page', Math.min(totalPages, filters.page + 1)); }} disabled={filters.page === totalPages} /></PaginationItem>
          </PaginationContent>
        </Pagination>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select value={String(filters.pageSize)} onValueChange={value => handleFilterChange('pageSize', Number(value))}>
            <SelectTrigger className="w-[70px] h-8"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem><SelectItem value="100">100</SelectItem></SelectContent>
          </Select>
        </div>
      </CardFooter>
    </ReportWrapper>
  );
};

export default BankStatement;