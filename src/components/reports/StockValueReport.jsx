import React, { useMemo, useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ArrowUpDown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { generatePdf } from '@/components/pdf/PdfGenerator';
import StockValueReportTemplate from '@/components/pdf/StockValueReportTemplate';
import ReportWrapper from './ReportWrapper';
import FilterToolbar from '../FilterToolbar';
import { useFilters } from '@/hooks/useFilters';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatMoney } from '@/lib/money';
import { toDate } from 'date-fns-tz';
import { endOfDay } from 'date-fns';

const StockValueReport = () => {
  const { data, getStockDetails } = useData();
  const { settings } = data;
  const { toast } = useToast();
  const currencySymbol = settings.currencySymbol || 'AED';
  
  const { filters, handleFilterChange, debouncedSearchTerm, handleDateRangeChange, setDatePreset } = useFilters('stockValue', []);
  
  const [sortConfig, setSortConfig] = useState({ key: 'stockValue', direction: 'descending' });

  const stockReportData = useMemo(() => {
    const asOfDate = filters.dateRange.from || filters.dateRange.to ? (filters.dateRange.to || filters.dateRange.from) : null;
    return getStockDetails ? getStockDetails({ asOfDate }) : [];
  }, [filters.dateRange, getStockDetails]);

  const filteredAndSortedData = useMemo(() => {
    let sortableItems = [...stockReportData].filter(item =>
      ((item.name && item.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
      (item.sku && item.sku.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))) &&
      item.onHand !== 0
    );

    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [stockReportData, debouncedSearchTerm, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (filters.page - 1) * filters.pageSize;
    return filteredAndSortedData.slice(startIndex, startIndex + filters.pageSize);
  }, [filteredAndSortedData, filters.page, filters.pageSize]);

  const totalPages = Math.ceil(filteredAndSortedData.length / filters.pageSize);
  
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
    setSortConfig({ key, direction });
  };

  const grandTotalValue = useMemo(() => filteredAndSortedData.reduce((sum, item) => sum + item.stockValue, 0), [filteredAndSortedData]);
  const grandTotalQty = useMemo(() => filteredAndSortedData.reduce((sum, item) => sum + item.onHand, 0), [filteredAndSortedData]);


  const handleExport = () => {
    const asOfDate = filters.dateRange.to ? endOfDay(toDate(filters.dateRange.to)) : new Date();
    if (filteredAndSortedData.length === 0) {
      toast({ title: "No Data", description: "Cannot export an empty report.", variant: "destructive" });
      return;
    }
    generatePdf(
      <StockValueReportTemplate data={filteredAndSortedData} settings={settings} totalValue={grandTotalValue} asOfDate={asOfDate} />,
      `Stock-Value-Report-as-of-${asOfDate.toISOString().split('T')[0]}.pdf`
    );
  };
  
  const toolbar = (
    <FilterToolbar
      filters={filters}
      onFilterChange={handleFilterChange}
      onDateRangeChange={handleDateRangeChange}
      onSetDatePreset={setDatePreset}
      moduleName="name or SKU"
    >
      <Button variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Export PDF</Button>
    </FilterToolbar>
  );

  return (
    <ReportWrapper title="Stock Value Report" filterToolbar={toolbar}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>SKU</TableHead><TableHead className="text-right cursor-pointer" onClick={() => requestSort('onHand')}><div className="flex items-center justify-end">Qty On Hand <ArrowUpDown className="ml-2 h-4 w-4" /></div></TableHead><TableHead className="text-right">Avg. Pur. Price (AED)</TableHead><TableHead className="text-right cursor-pointer" onClick={() => requestSort('stockValue')}><div className="flex items-center justify-end">Stock Value (AED) <ArrowUpDown className="ml-2 h-4 w-4" /></div></TableHead></TableRow></TableHeader>
          <TableBody>
             {paginatedData.length > 0 ? paginatedData.map(item => (
              <TableRow key={item.id}><TableCell className="font-medium">{item.name}</TableCell><TableCell className="font-mono text-sm">{item.sku}</TableCell><TableCell className="text-right">{item.onHand} {item.unit}</TableCell><TableCell className="text-right">{formatMoney(item.avgPurchasePrice, currencySymbol)}</TableCell><TableCell className="text-right font-semibold">{formatMoney(item.stockValue, currencySymbol)}</TableCell></TableRow>
            )) : (
              <TableRow><TableCell colSpan={5} className="text-center h-24">No stock with value on the selected date.</TableCell></TableRow>
            )}
          </TableBody>
          <TableFooter>
            <TableRow className="font-bold border-t-2 bg-muted/50">
              <TableCell colSpan={2} className="text-right">Grand Totals</TableCell>
              <TableCell className="text-right">{grandTotalQty}</TableCell>
              <TableCell className="text-right"></TableCell>
              <TableCell className="text-right">{formatMoney(grandTotalValue, currencySymbol)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
      <CardFooter className="flex items-center justify-between pt-6">
        <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select value={String(filters.pageSize)} onValueChange={value => handleFilterChange('pageSize', Number(value))}><SelectTrigger className="w-[70px] h-8"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem><SelectItem value="100">100</SelectItem></SelectContent></Select>
        </div>
        <Pagination>
            <PaginationContent>
            <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); handleFilterChange('page', Math.max(1, filters.page - 1)); }} disabled={filters.page === 1} /></PaginationItem>
            <PaginationItem><PaginationLink>{filters.page} of {totalPages}</PaginationLink></PaginationItem>
            <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); handleFilterChange('page', Math.min(totalPages, filters.page + 1)); }} disabled={filters.page === totalPages} /></PaginationItem>
            </PaginationContent>
        </Pagination>
      </CardFooter>
    </ReportWrapper>
  );
};

export default StockValueReport;