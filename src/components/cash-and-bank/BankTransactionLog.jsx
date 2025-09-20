import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as CustomTableFooter } from "@/components/ui/table";
import { Eye, Landmark, Wallet, TrendingUp, ShoppingCart, CreditCard, ArrowLeftRight, ChevronDown, Filter, X, Search, RefreshCw } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay, subDays, parseISO } from 'date-fns';
import { formatInTimeZone, toDate } from 'date-fns-tz';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatMoney } from '@/lib/money';

const allTransactionTypes = ['Bank In', 'Bank Out', 'Expenses', 'Sales Receipts', 'Purchase Payments', 'Bank Transfers', 'Bank Fees', 'Refunds'];

const TransactionIcon = ({ type }) => {
    const icons = {
      'Sales Receipts': <TrendingUp className="h-5 w-5 text-green-500" />,
      'Purchase Payments': <ShoppingCart className="h-5 w-5 text-red-500" />,
      'Expenses': <CreditCard className="h-5 w-5 text-orange-500" />,
      'Bank In': <ArrowLeftRight className="h-5 w-5 text-blue-500" />,
      'Bank Out': <ArrowLeftRight className="h-5 w-5 text-purple-500" />,
    };
    return icons[type] || <Landmark className="h-5 w-5 text-gray-500" />;
};

const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

const BankTransactionLog = () => {
    const { data, setTransactionToView } = useData();
    const { sales, purchases, expenses, payments, banks, customers, suppliers, settings } = data;
    const currencySymbol = settings?.currencySymbol || 'Rs';
    const timeZone = 'Asia/Dubai';

    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        types: [...allTransactionTypes],
        bankIds: [],
        searchTerm: '',
    });

    const debouncedSearchTerm = useDebounce(filters.searchTerm, 200);

    const setDatePreset = useCallback((preset) => {
        const now = toDate(new Date(), { timeZone });
        let start, end;
        switch (preset) {
            case 'today': start = startOfDay(now); end = endOfDay(now); break;
            case 'yesterday': const y = subDays(now, 1); start = startOfDay(y); end = endOfDay(y); break;
            case 'last7': start = startOfDay(subDays(now, 6)); end = endOfDay(now); break;
            case 'lastMonth': const lm = subMonths(now, 1); start = startOfMonth(lm); end = endOfMonth(lm); break;
            default: start = startOfMonth(now); end = endOfMonth(now); break;
        }
        setFilters(prev => ({
            ...prev,
            startDate: format(start, 'yyyy-MM-dd'),
            endDate: format(end, 'yyyy-MM-dd')
        }));
    }, [timeZone]);

    useEffect(() => {
        setDatePreset('thisMonth');
        if (banks && banks.length > 0) {
            setFilters(prev => ({ ...prev, bankIds: banks.map(b => b.id) }));
        }
    }, [setDatePreset, banks]);

    const resetFilters = () => {
        setDatePreset('thisMonth');
        setFilters(prev => ({ ...prev, types: [...allTransactionTypes], bankIds: banks.map(b => b.id), searchTerm: '' }));
    };

    const combinedTransactions = useMemo(() => {
        let allTransactions = [];
        (payments || []).forEach(p => {
            if (p.method === 'bank') {
                const partyName = p.partyType === 'customer' ? customers.find(c => c.id === p.partyId)?.name : suppliers.find(s => s.id === p.partyId)?.name;
                allTransactions.push({
                    id: `payment-${p.id}`, date: p.date, type: p.type === 'in' ? 'Bank In' : 'Bank Out',
                    party: partyName || 'N/A', description: `Payment ref: ${p.id}`,
                    amount: p.amount, flow: p.type, bankId: p.bankId, ref: p, refType: 'payment'
                });
            }
        });
        return allTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [payments, customers, suppliers]);

    const { transactionsWithBalance, openingBalance, closingBalance, totalInflow, totalOutflow } = useMemo(() => {
        const filteredByDateAndType = combinedTransactions.filter(tx => {
            const txDate = toDate(tx.date, { timeZone });
            const startDate = filters.startDate ? toDate(`${filters.startDate}T00:00:00`, { timeZone }) : null;
            const endDate = filters.endDate ? toDate(`${filters.endDate}T23:59:59`, { timeZone }) : null;

            if (!filters.bankIds.includes(tx.bankId)) return false;

            const searchMatch = debouncedSearchTerm ? (
                tx.description?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                tx.party?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                (tx.ref?.saleNumber || tx.ref?.purchaseNumber || tx.ref?.id)?.toString().toLowerCase().includes(debouncedSearchTerm.toLowerCase())
            ) : true;

            return txDate >= startDate && txDate <= endDate && filters.types.includes(tx.type) && searchMatch;
        });

        const calcOpeningBalance = () => {
            let balance = 0;
            const startDate = filters.startDate ? toDate(`${filters.startDate}T00:00:00`, { timeZone }) : null;
            
            (banks || []).filter(b => filters.bankIds.includes(b.id)).forEach(b => balance += b.balance);

            [...combinedTransactions].reverse().forEach(tx => {
                 if (filters.bankIds.includes(tx.bankId)) {
                    const txDate = toDate(tx.date, { timeZone });
                    if (txDate >= startDate) {
                        if (tx.flow === 'in') balance -= tx.amount;
                        else balance += tx.amount;
                    }
                }
            });
            return balance;
        };

        const opening = calcOpeningBalance();
        let runningBalance = opening;
        const transactionsWithBalance = filteredByDateAndType.map(tx => {
            runningBalance += tx.flow === 'in' ? tx.amount : -tx.amount;
            return { ...tx, runningBalance };
        });

        const totalIn = transactionsWithBalance.reduce((sum, tx) => tx.flow === 'in' ? sum + tx.amount : sum, 0);
        const totalOut = transactionsWithBalance.reduce((sum, tx) => tx.flow === 'out' ? sum + tx.amount : sum, 0);

        return {
            transactionsWithBalance,
            openingBalance: opening,
            closingBalance: runningBalance,
            totalInflow: totalIn,
            totalOutflow: totalOut,
        };
    }, [combinedTransactions, filters, debouncedSearchTerm, timeZone, banks]);
    
    return (
        <Card className="mt-4">
            <CardHeader>
                <div className="flex flex-col md:flex-row gap-2 justify-between">
                    <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
                        <div className="flex gap-2">
                            <Input type="date" value={filters.startDate} onChange={e => setFilters(p=>({...p, startDate: e.target.value}))} className="w-auto"/>
                            <Input type="date" value={filters.endDate} onChange={e => setFilters(p=>({...p, endDate: e.target.value}))} className="w-auto"/>
                        </div>
                        <div className="flex gap-1 flex-wrap">
                            <Button variant="outline" size="sm" onClick={()=>setDatePreset('today')}>Today</Button>
                            <Button variant="outline" size="sm" onClick={()=>setDatePreset('last7')}>Last 7</Button>
                            <Button variant="outline" size="sm" onClick={()=>setDatePreset('thisMonth')}>This Month</Button>
                            <Button variant="outline" size="sm" onClick={()=>setDatePreset('lastMonth')}>Last Month</Button>
                        </div>
                    </div>
                    <div className="flex gap-2 items-center">
                        <div className="relative flex-grow">
                             <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                             <Input placeholder="Search..." className="pl-8" value={filters.searchTerm} onChange={e=>setFilters(p=>({...p,searchTerm: e.target.value}))}/>
                        </div>
                       <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full md:w-auto">
                                    <Landmark className="mr-2 h-4 w-4"/>
                                    Banks ({filters.bankIds.length})
                                    <ChevronDown className="ml-2 h-4 w-4"/>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Filter by Bank</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {(banks || []).map(bank => (
                                    <DropdownMenuCheckboxItem key={bank.id} checked={filters.bankIds.includes(bank.id)} onCheckedChange={() => setFilters(p => ({ ...p, bankIds: p.bankIds.includes(bank.id) ? p.bankIds.filter(id => id !== bank.id) : [...p.bankIds, bank.id] }))}>
                                        {bank.name}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full md:w-auto">
                                    <Filter className="mr-2 h-4 w-4"/>
                                    Types ({filters.types.length})
                                    <ChevronDown className="ml-2 h-4 w-4"/>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {allTransactionTypes.map(type => (
                                    <DropdownMenuCheckboxItem key={type} checked={filters.types.includes(type)} onCheckedChange={() => setFilters(p => ({ ...p, types: p.types.includes(type) ? p.types.filter(t => t !== type) : [...p.types, type] }))}>
                                        {type}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="ghost" onClick={resetFilters}><RefreshCw className="h-4 w-4"/></Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
                    <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                            <TableRow>
                                <TableHead className="w-[150px]">Time</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead className="text-right">Inflow</TableHead>
                                <TableHead className="text-right">Outflow</TableHead>
                                <TableHead className="text-right">Running Balance</TableHead>
                                <TableHead className="text-center w-[50px]">View</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow className="font-semibold bg-muted/50">
                                <TableCell colSpan={4}>Opening Balance</TableCell>
                                <TableCell className="text-right">{formatMoney(openingBalance, currencySymbol)}</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                            {transactionsWithBalance.length > 0 ? transactionsWithBalance.map((tx) => (
                                <TableRow key={tx.id} className="hover:bg-muted/50">
                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatInTimeZone(new Date(tx.date), timeZone, 'PP p')}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <TransactionIcon type={tx.type} />
                                            <div>
                                                <span className="font-medium">{tx.description}</span>
                                                <p className="text-sm text-muted-foreground">{tx.party} • {banks.find(b=>b.id === tx.bankId)?.name || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-right text-green-600">{tx.flow === 'in' ? `+${formatMoney(tx.amount, '')}` : '-'}</TableCell>
                                    <TableCell className="font-mono text-right text-red-600">{tx.flow === 'out' ? `-${formatMoney(tx.amount, '')}` : '-'}</TableCell>
                                    <TableCell className="font-mono text-right text-muted-foreground">{formatMoney(tx.runningBalance, '')}</TableCell>
                                    <TableCell className="text-center">
                                        <Button variant="ghost" size="icon" onClick={() => setTransactionToView({ transaction: tx.ref, type: tx.refType })}>
                                            <Eye className="h-4 w-4 text-purple-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan="6" className="text-center text-gray-500 py-8">No bank transactions match the current filters.</TableCell></TableRow>
                            )}
                        </TableBody>
                         <CustomTableFooter>
                            <TableRow className="font-bold bg-muted">
                                <TableCell colSpan={2}>Closing Balance & Totals</TableCell>
                                <TableCell className="text-right text-green-600">{formatMoney(totalInflow, currencySymbol)}</TableCell>
                                <TableCell className="text-right text-red-600">{formatMoney(totalOutflow, currencySymbol)}</TableCell>
                                <TableCell className="text-right">{formatMoney(closingBalance, currencySymbol)}</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                         </CustomTableFooter>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};

export default BankTransactionLog;