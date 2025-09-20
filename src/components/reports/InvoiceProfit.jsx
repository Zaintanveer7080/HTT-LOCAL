import React, { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, TrendingUp, TrendingDown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { generatePdf } from '@/components/pdf/PdfGenerator';
import InvoiceProfitReportTemplate from '@/components/pdf/InvoiceProfitReportTemplate';
import { formatInTimeZone, toDate } from 'date-fns-tz';
import ReportWrapper from './ReportWrapper';
import FilterToolbar from '../FilterToolbar';
import { useFilters } from '@/hooks/useFilters';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

const InvoiceProfit = () => {
  const { data, getProfitOfSale } = useData();
  const { sales, customers, settings } = data;
  const { toast } = useToast();
  
  const { 
    filters, 
    handleFilterChange, 
    handleDateRangeChange, 
    setDatePreset,
    debouncedSearchTerm,
    timeZone,
  } = useFilters('invoiceProfit', []);

  const profitData = useMemo(() => {
    if (!sales || !customers) return [];
    
    const fromDate = filters.dateRange.from ? toDate(filters.dateRange.from, { timeZone }) : null;
    const toDateFilter = filters.dateRange.to ? toDate(filters.dateRange.to, { timeZone }) : null;

    return sales.map(sale => {
      const saleDate = toDate(sale.date, { timeZone });
      if ((fromDate && saleDate < fromDate) || (toDateFilter && saleDate > toDateFilter)) return null;

      const { totalProfit } = getProfitOfSale(sale);
      const revenue = sale.totalCost || 0;
      const itemsCost = revenue - totalProfit;
      const customer = customers.find(c => c.id === sale.customerId);
      return {
        ...sale,
        customerName: customer?.name || 'Unknown',
        profit: totalProfit,
        itemsCost,
        revenue,
      };
    }).filter(Boolean).sort((a,b) => new Date(b.date) - new Date(a.date));
  }, [sales, customers, getProfitOfSale, filters.dateRange, timeZone]);

  const filteredProfitData = useMemo(() => {
    return profitData.filter(sale =>
      (sale.saleNumber && sale.saleNumber.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
      (sale.customerName && sale.customerName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
    );
  }, [profitData, debouncedSearchTerm]);

  const paginatedData = useMemo(() => {
    const startIndex = (filters.page - 1) * filters.pageSize;
    return filteredProfitData.slice(startIndex, startIndex + filters.pageSize);
  }, [filteredProfitData, filters.page, filters.pageSize]);

  const totalPages = Math.ceil(filteredProfitData.length / filters.pageSize);

  const totalProfit = useMemo(() => {
    return filteredProfitData.reduce((sum, sale) => sum + sale.profit, 0);
  }, [filteredProfitData]);

  const handleExport = () => {
    if (filteredProfitData.length === 0) {
      toast({ title: "No Data", description: "Cannot export an empty report.", variant: "destructive" });
      return;
    }
    generatePdf(
      <InvoiceProfitReportTemplate data={filteredProfitData} settings={settings} totalProfit={totalProfit} />,
      `Invoice-Profit-Report.pdf`
    );
  };
  
  const toolbar = (
    <FilterToolbar
      filters={filters}
      onFilterChange={handleFilterChange}
      onDateRangeChange={handleDateRangeChange}
      onSetDatePreset={setDatePreset}
      onReset={() => {}}
      moduleName="invoices or customers"
    >
      <Button variant="outline" onClick={handleExport}>
        <Download className="mr-2 h-4 w-4" /> Export PDF
      </Button>
    </FilterToolbar>
  );

  return (
    <ReportWrapper title="Invoice-wise Profit" filterToolbar={toolbar}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Invoice #</TableHead><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Cost of Goods</TableHead><TableHead className="text-right">Profit</TableHead></TableRow></TableHeader>
            <TableBody>
              {paginatedData.map(sale => (
                <TableRow key={sale.id}>
                  <TableCell className="font-mono text-sm">{sale.saleNumber}</TableCell>
                  <TableCell>{formatInTimeZone(new Date(sale.date), 'Asia/Dubai', 'PP')}</TableCell>
                  <TableCell>{sale.customerName}</TableCell>
                  <TableCell className="text-right">RS {sale.revenue.toFixed(2)}</TableCell>
                  <TableCell className="text-right">RS {sale.itemsCost.toFixed(2)}</TableCell>
                  <TableCell className={`text-right font-semibold ${sale.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <div className="flex justify-end items-center">{sale.profit >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}RS {sale.profit.toFixed(2)}</div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <tfoot><tr className="font-bold border-t-2"><td colSpan="5" className="p-2 text-right">Total Profit</td><td className={`p-2 text-right ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>RS {totalProfit.toFixed(2)}</td></tr></tfoot>
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
      </CardFooter>
    </ReportWrapper>
  );
};

export default InvoiceProfit;