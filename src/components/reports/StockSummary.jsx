import React, { useMemo, useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { generatePdf } from '@/components/pdf/PdfGenerator';
import StockSummaryReportTemplate from '@/components/pdf/StockSummaryReportTemplate';
import ReportWrapper from './ReportWrapper';
import FilterToolbar from '../FilterToolbar';
import { useFilters } from '@/hooks/useFilters';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatMoney } from '@/lib/money';

const StockSummary = () => {
  const { data, getStockDetails } = useData();
  const { settings } = data;
  const currencySymbol = settings.currencySymbol || 'AED';
  const { toast } = useToast();
  
  const [stockStatusFilter, setStockStatusFilter] = useState('all');

  const { 
    filters, 
    handleFilterChange, 
    debouncedSearchTerm 
  } = useFilters('stockSummary', []);

  const stockData = useMemo(() => {
    return getStockDetails ? getStockDetails() : [];
  }, [getStockDetails]);


  const filteredStock = useMemo(() => {
    return stockData.filter(item => {
      const searchMatch = (item.name && item.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
                          (item.sku && item.sku.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
      
      const statusMatch = stockStatusFilter === 'all' || 
                          (stockStatusFilter === 'inStock' && item.onHand > 0) ||
                          (stockStatusFilter === 'outOfStock' && item.onHand <= 0);

      return searchMatch && statusMatch;
    });
  }, [stockData, debouncedSearchTerm, stockStatusFilter]);

  const paginatedStock = useMemo(() => {
    const startIndex = (filters.page - 1) * filters.pageSize;
    return filteredStock.slice(startIndex, startIndex + filters.pageSize);
  }, [filteredStock, filters.page, filters.pageSize]);

  const totalPages = Math.ceil(filteredStock.length / filters.pageSize);

  const totalStockValue = useMemo(() => {
    return filteredStock.reduce((sum, item) => sum + item.stockValue, 0);
  }, [filteredStock]);
  
  const totalStockQuantity = useMemo(() => {
    return filteredStock.reduce((sum, item) => sum + item.onHand, 0);
  }, [filteredStock]);

  const handleExport = () => {
    if (filteredStock.length === 0) {
      toast({ title: "No Data", description: "Cannot export an empty report.", variant: "destructive" });
      return;
    }

    generatePdf(
      <StockSummaryReportTemplate data={filteredStock} settings={settings} totalValue={totalStockValue} totalQuantity={totalStockQuantity} />,
      `Stock-Summary-Report.pdf`
    );
  };

  const getStatusIndicator = (status) => {
    switch (status) {
      case 'Out of Stock': return <div className="flex items-center text-red-600"><AlertTriangle className="h-4 w-4 mr-1" /><span className="text-xs">{status}</span></div>;
      case 'Low Stock': return <div className="flex items-center text-orange-600"><AlertTriangle className="h-4 w-4 mr-1" /><span className="text-xs">{status}</span></div>;
      default: return <div className="flex items-center text-green-600"><CheckCircle className="h-4 w-4 mr-1" /><span className="text-xs">{status}</span></div>;
    }
  };

  const toolbar = (
    <FilterToolbar filters={filters} onFilterChange={handleFilterChange} moduleName="name or SKU" showSearch={true}>
      <Select value={stockStatusFilter} onValueChange={setStockStatusFilter}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by stock status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Stock</SelectItem>
          <SelectItem value="inStock">In Stock</SelectItem>
          <SelectItem value="outOfStock">Out of Stock</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Export PDF</Button>
    </FilterToolbar>
  );

  return (
    <ReportWrapper title="Stock Summary Report" filterToolbar={toolbar}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>IMEIs/Serials</TableHead>
              <TableHead className="text-right">On Hand</TableHead>
              <TableHead className="text-right">Avg. Pur. Price</TableHead>
              <TableHead className="text-right">Last Sale Price</TableHead>
              <TableHead className="text-right">Total Value</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedStock.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-xs">
                  {item.hasImei ? (item.availableSerials || []).join(', ') : 'N/A'}
                </TableCell>
                <TableCell className="text-right">{item.onHand} {item.unit}</TableCell>
                <TableCell className="text-right">{formatMoney(item.avgPurchasePrice, currencySymbol)}</TableCell>
                <TableCell className="text-right">{item.lastSalePrice ? formatMoney(item.lastSalePrice, currencySymbol) : '—'}</TableCell>
                <TableCell className="text-right font-semibold">{formatMoney(item.stockValue, currencySymbol)}</TableCell>
                <TableCell>{getStatusIndicator(item.status)}</TableCell>
              </TableRow>
             ))}
          </TableBody>
          <TableFooter>
            <TableRow className="font-bold border-t-2 bg-muted/50">
              <TableCell colSpan="3" className="p-2 text-right">Totals (for all filtered items)</TableCell>
              <TableCell className="p-2 text-right">{totalStockQuantity}</TableCell>
              <TableCell colSpan="2" className="p-2 text-right">Total Stock Value</TableCell>
              <TableCell className="p-2 text-right">{formatMoney(totalStockValue, currencySymbol)}</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableFooter>
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
  );
};

export default StockSummary;