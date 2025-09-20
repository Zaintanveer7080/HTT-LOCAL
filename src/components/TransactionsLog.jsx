import React, { useMemo, useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, TrendingUp, ShoppingCart, CreditCard, ArrowLeftRight, Wallet, ArrowUpDown } from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatMoney } from '@/lib/money';
import FilterToolbar from './FilterToolbar';
import { useFilters } from '@/hooks/useFilters';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TransactionIcon = ({ type }) => {
    const icons = {
      'Sale': <TrendingUp className="h-5 w-5 text-green-500" />,
      'Purchase': <ShoppingCart className="h-5 w-5 text-red-500" />,
      'Expense': <CreditCard className="h-5 w-5 text-orange-500" />,
      'Payment': <ArrowLeftRight className="h-5 w-5 text-blue-500" />,
      'Cash Adjustment': <Wallet className="h-5 w-5 text-yellow-500" />,
    };
    return icons[type] || <Wallet className="h-5 w-5 text-gray-500" />;
};

const allTransactionTypes = ['Sale', 'Purchase', 'Expense', 'Payment', 'Cash Adjustment'];

const TransactionsLog = () => {
    const { data, setTransactionToView } = useData();
    const { sales, purchases, expenses, payments, cashTransactions, customers, suppliers, banks, settings } = data;
    const currencySymbol = settings?.currencySymbol || 'Rs';

    const { filters, handleFilterChange, handleDateRangeChange, handleStatusChange, setDatePreset, resetFilters, debouncedSearchTerm } = useFilters('transactions', allTransactionTypes);
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'descending' });

    const combinedTransactions = useMemo(() => {
        let allTransactions = [];

        (sales || []).forEach(sale => {
            allTransactions.push({
                id: `sale-${sale.id}`, date: sale.date, type: 'Sale',
                description: `Invoice #${sale.saleNumber} to ${customers.find(c => c.id === sale.customerId)?.name || 'N/A'}`,
                amount: sale.total_local, flow: 'in',
                method: sale.paid_amount_local > 0 ? (sale.payment?.method === 'bank' ? `Bank: ${banks.find(b=>b.id === sale.payment.bankId)?.name || ''}` : 'Cash') : 'Credit',
                ref: sale, refType: 'sale', party: customers.find(c => c.id === sale.customerId)?.name || '', reference: sale.saleNumber
            });
        });
        (purchases || []).forEach(p => {
             allTransactions.push({
                id: `purchase-${p.id}`, date: p.date, type: 'Purchase',
                description: `Bill #${p.purchaseNumber} from ${suppliers.find(s => s.id === p.supplierId)?.name || 'N/A'}`,
                amount: p.total_local, flow: 'out',
                method: p.paid_amount_local > 0 ? (p.payment?.method === 'bank' ? `Bank: ${banks.find(b=>b.id === p.payment.bankId)?.name || ''}` : 'Cash') : 'Credit',
                ref: p, refType: 'purchase', party: suppliers.find(s => s.id === p.supplierId)?.name || '', reference: p.purchaseNumber
            });
        });
        (payments || []).forEach(p => {
            const partyName = p.partyType === 'customer' ? customers.find(c => c.id === p.partyId)?.name : suppliers.find(s => s.id === p.partyId)?.name;
            allTransactions.push({
                id: `payment-${p.id}`, date: p.date, type: 'Payment',
                description: `${p.type === 'in' ? 'From' : 'To'}: ${partyName || 'N/A'}`,
                amount: p.amount, flow: p.type,
                method: p.method === 'bank' ? `Bank: ${banks.find(b=>b.id === p.bankId)?.name || 'N/A'}` : 'Cash',
                ref: p, refType: 'payment', party: partyName || '', reference: p.id
            });
        });
        (expenses || []).forEach(expense => {
            allTransactions.push({
                id: `expense-${expense.id}`, date: expense.date, type: 'Expense',
                description: `${expense.category}: ${expense.notes || ''}`, amount: expense.amount, flow: 'out',
                method: expense.paymentMethod === 'bank' ? `Bank: ${banks.find(b=>b.id === expense.bankId)?.name || 'N/A'}` : 'Cash',
                ref: expense, refType: 'expense', party: expense.category, reference: expense.id
            });
        });
        (cashTransactions || []).forEach(tx => {
            allTransactions.push({
                id: `cash-${tx.id}`, date: tx.date, type: 'Cash Adjustment',
                description: tx.description, amount: tx.amount, flow: tx.type === 'add' ? 'in' : 'out',
                method: 'Cash', ref: tx, refType: 'cash', party: tx.type, reference: tx.id
            });
        });

        return allTransactions;
    }, [sales, purchases, expenses, payments, cashTransactions, customers, suppliers, banks]);
    
    const filteredAndSortedTransactions = useMemo(() => {
        let filtered = combinedTransactions.filter(tx => {
            const txDate = new Date(tx.date);
            const startDate = filters.dateRange.from ? new Date(filters.dateRange.from) : null;
            const endDate = filters.dateRange.to ? new Date(filters.dateRange.to) : null;
            
            if (startDate) startDate.setHours(0, 0, 0, 0);
            if (endDate) endDate.setHours(23, 59, 59, 999);
            
            if(startDate && txDate < startDate) return false;
            if(endDate && txDate > endDate) return false;
            if (!filters.statuses.includes(tx.type)) return false;

            if (debouncedSearchTerm) {
                const term = debouncedSearchTerm.toLowerCase();
                const dateString = formatInTimeZone(txDate, 'Asia/Dubai', 'yyyy-MM-dd PP p');
                return (
                    String(tx.reference).toLowerCase().includes(term) ||
                    String(tx.party).toLowerCase().includes(term) ||
                    String(tx.description).toLowerCase().includes(term) ||
                    String(tx.amount).includes(term) ||
                    String(tx.method).toLowerCase().includes(term) ||
                    String(tx.type).toLowerCase().includes(term) ||
                    dateString.toLowerCase().includes(term)
                );
            }

            return true;
        });

        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];
                if (sortConfig.key === 'date') {
                    aVal = new Date(aVal);
                    bVal = new Date(bVal);
                }
                if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    }, [combinedTransactions, filters, debouncedSearchTerm, sortConfig]);

    const paginatedTransactions = useMemo(() => {
        const startIndex = (filters.page - 1) * filters.pageSize;
        return filteredAndSortedTransactions.slice(startIndex, startIndex + filters.pageSize);
    }, [filteredAndSortedTransactions, filters.page, filters.pageSize]);

    const totalPages = Math.ceil(filteredAndSortedTransactions.length / filters.pageSize);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        setSortConfig({ key, direction });
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold gradient-text">Transactions Log</h1>
                <p className="text-muted-foreground mt-1">A unified view of all financial activities.</p>
            </div>

            <Card>
                <CardHeader>
                    <FilterToolbar
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onDateRangeChange={handleDateRangeChange}
                        onStatusChange={handleStatusChange}
                        onReset={resetFilters}
                        onSetDatePreset={setDatePreset}
                        moduleName="transactions"
                        statusOptions={allTransactionTypes}
                    />
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background z-10">
                                <TableRow>
                                    <TableHead className="w-[180px] cursor-pointer" onClick={() => requestSort('date')}>
                                        <div className="flex items-center">Time <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                                    </TableHead>
                                    <TableHead className="w-[180px]">Type</TableHead>
                                    <TableHead>Details</TableHead>
                                    <TableHead className="text-right cursor-pointer" onClick={() => requestSort('amount')}>
                                        <div className="flex items-center justify-end">Amount <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                                    </TableHead>
                                    <TableHead className="text-center w-[80px]">View</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedTransactions.length > 0 ? paginatedTransactions.map((tx) => (
                                    <TableRow key={tx.id} className="hover:bg-muted/50">
                                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap align-top">{formatInTimeZone(new Date(tx.date), 'Asia/Dubai', 'PP p')}</TableCell>
                                        <TableCell className="align-top">
                                            <div className="flex items-center gap-2">
                                                <TransactionIcon type={tx.type} />
                                                <span className="font-medium whitespace-nowrap">{tx.type}</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground pl-7 mt-1 whitespace-nowrap">{tx.method}</div>
                                        </TableCell>
                                        <TableCell className="break-words align-top">{tx.description}</TableCell>
                                        <TableCell className={`font-bold text-right align-top ${tx.flow === 'in' ? 'text-green-500' : tx.flow === 'out' ? 'text-red-500' : 'text-muted-foreground'}`}>
                                            {tx.flow !== 'neutral' && formatMoney(tx.amount, currencySymbol)}
                                        </TableCell>
                                        <TableCell className="text-center align-top">
                                            <Button variant="ghost" size="icon" onClick={() => setTransactionToView({ transaction: tx.ref, type: tx.refType })}>
                                                <Eye className="h-4 w-4 text-purple-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan="5" className="text-center text-gray-500 py-8">No transactions match the current filters.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between pt-6">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Rows per page:</span>
                        <Select value={String(filters.pageSize)} onValueChange={value => handleFilterChange('pageSize', Number(value))}>
                            <SelectTrigger className="w-[70px] h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); handleFilterChange('page', Math.max(1, filters.page - 1)); }} disabled={filters.page === 1} /></PaginationItem>
                            <PaginationItem><PaginationLink>{filters.page} of {totalPages}</PaginationLink></PaginationItem>
                            <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); handleFilterChange('page', Math.min(totalPages, filters.page + 1)); }} disabled={filters.page === totalPages} /></PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </CardFooter>
            </Card>
        </div>
    );
};

export default TransactionsLog;