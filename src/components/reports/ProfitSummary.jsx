import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as CustomTableFooter } from '@/components/ui/table';
import { useData } from '@/contexts/DataContext';
import { useFilters } from '@/hooks/useFilters';
import FilterToolbar from '@/components/FilterToolbar';
import ReportWrapper from './ReportWrapper';
import { Download, TrendingUp, DollarSign, BarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toDate, format } from 'date-fns-tz';
import { useToast } from '@/components/ui/use-toast';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toNumber, formatMoney } from '@/lib/money';

const ProfitSummary = () => {
  const { data, getProfitOfSale } = useData();
  const { sales, customers, expenses, settings } = data;
  const { toast } = useToast();
  const currencySymbol = settings?.currencySymbol || 'Rs';

  const {
    filters,
    handleFilterChange,
    handleDateRangeChange,
    resetFilters,
    setDatePreset,
    timeZone,
    debouncedSearchTerm
  } = useFilters('profitSummary', []);

  const getCustomerName = (customerId) => (customers || []).find(c => c.id === customerId)?.name || 'N/A';

  const processedSales = useMemo(() => {
    return (sales || [])
      .map(sale => {
        const saleDate = toDate(sale.date, { timeZone });
        const fromDate = filters.dateRange?.from ? toDate(filters.dateRange.from, { timeZone }) : null;
        const toDateFilter = filters.dateRange?.to ? toDate(filters.dateRange.to, { timeZone }) : null;

        if ((fromDate && saleDate < fromDate) || (toDateFilter && saleDate > toDateFilter)) return null;

        const { totalProfit } = getProfitOfSale(sale);
        const cogs = (sale.totalCost || 0) - totalProfit;
        const profitPercentage = cogs > 0 ? (totalProfit / cogs) * 100 : 0;

        return {
          ...sale,
          customerName: getCustomerName(sale.customerId),
          cogs,
          profit: totalProfit,
          profitPercentage,
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [sales, filters.dateRange, getProfitOfSale, timeZone, customers]);
  
  const filteredSales = useMemo(() => {
    if (!debouncedSearchTerm) return processedSales;
    return processedSales.filter(sale => 
        (sale.saleNumber && sale.saleNumber.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        (sale.customerName && sale.customerName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
    );
  }, [processedSales, debouncedSearchTerm]);
  
  const paginatedSales = useMemo(() => {
    const startIndex = (filters.page - 1) * filters.pageSize;
    return filteredSales.slice(startIndex, startIndex + filters.pageSize);
  }, [filteredSales, filters.page, filters.pageSize]);

  const totalPages = Math.ceil(filteredSales.length / filters.pageSize);

  const { totalProfit, totalExpenses, netProfit } = useMemo(() => {
    const fromDate = filters.dateRange?.from ? toDate(filters.dateRange.from, { timeZone }) : null;
    const toDateFilter = filters.dateRange?.to ? toDate(filters.dateRange.to, { timeZone }) : null;

    const totalProfit = filteredSales.reduce((sum, sale) => sum + sale.profit, 0);
    
    const totalExpenses = (expenses || []).filter(exp => {
        const expDate = toDate(exp.date, { timeZone });
        return (!fromDate || expDate >= fromDate) && (!toDateFilter || expDate <= toDateFilter);
    }).reduce((sum, exp) => sum + toNumber(exp.amount), 0);

    const netProfit = totalProfit - totalExpenses;

    return { totalProfit, totalExpenses, netProfit };
  }, [filteredSales, expenses, filters.dateRange, timeZone]);


  const handleExport = () => {
    toast({ title: "🚧 Feature not implemented", description: "Export is coming soon!" });
  };

  const toolbar = (
    <FilterToolbar
      filters={filters}
      onFilterChange={handleFilterChange}
      onDateRangeChange={handleDateRangeChange}
      onReset={resetFilters}
      onSetDatePreset={setDatePreset}
      moduleName="invoice no/client"
    >
      <Button onClick={handleExport} variant="outline">
        <Download className="mr-2 h-4 w-4" /> Export
      </Button>
    </FilterToolbar>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Gross Profit</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatMoney(totalProfit, currencySymbol)}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Expenses</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatMoney(totalExpenses, currencySymbol)}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Net Profit</CardTitle><BarChart className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatMoney(netProfit, currencySymbol)}</div></CardContent></Card>
      </div>
      
      <ReportWrapper title="Detailed Profit Report" filterToolbar={toolbar}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Date/Time</TableHead><TableHead>Invoice No.</TableHead><TableHead>Client</TableHead><TableHead>Items/Qty</TableHead><TableHead className="text-right">Subtotal</TableHead><TableHead className="text-right">Discount</TableHead><TableHead className="text-right">Tax</TableHead><TableHead className="text-right">COGS</TableHead><TableHead className="text-right">Profit</TableHead><TableHead className="text-right">Profit %</TableHead></TableRow></TableHeader>
              <TableBody>
                {paginatedSales.map(sale => (
                  <TableRow key={sale.id}>
                    <TableCell>{format(toDate(sale.date, { timeZone }), 'PPpp')}</TableCell>
                    <TableCell>{sale.saleNumber}</TableCell>
                    <TableCell>{sale.customerName}</TableCell>
                    <TableCell>{sale.totalQuantity}</TableCell>
                    <TableCell className="text-right">{formatMoney(sale.subTotal || 0, '')}</TableCell>
                    <TableCell className="text-right">{formatMoney((sale.discount?.type === 'percent' ? ((sale.subTotal || 0) * (sale.discount?.value || 0) / 100) : (sale.discount?.value || 0)), '')}</TableCell>
                    <TableCell className="text-right">{formatMoney(0, '')}</TableCell>
                    <TableCell className="text-right">{formatMoney(sale.cogs, '')}</TableCell>
                    <TableCell className="text-right font-semibold">{formatMoney(sale.profit, '')}</TableCell>
                    <TableCell className="text-right">{sale.profitPercentage.toFixed(2)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <CustomTableFooter>
                <TableRow>
                  <TableCell colSpan={8} className="font-bold text-right">Total Profit for this page</TableCell>
                  <TableCell className="text-right font-bold text-lg">{formatMoney(paginatedSales.reduce((acc, s) => acc + s.profit, 0), currencySymbol)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </CustomTableFooter>
            </Table>
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
            <Select value={String(filters.pageSize)} onValueChange={value => handleFilterChange('pageSize', Number(value))}><SelectTrigger className="w-[70px] h-8"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem><SelectItem value="100">100</SelectItem></SelectContent></Select>
          </div>
        </CardFooter>
      </ReportWrapper>
    </div>
  );
};

export default ProfitSummary;