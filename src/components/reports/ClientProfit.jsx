import React, { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { generatePdf } from '@/components/pdf/PdfGenerator';
import ClientProfitReportTemplate from '@/components/pdf/ClientProfitReportTemplate';
import { formatInTimeZone, toDate } from 'date-fns-tz';
import ReportWrapper from './ReportWrapper';
import FilterToolbar from '../FilterToolbar';
import { useFilters } from '@/hooks/useFilters';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { formatMoney } from '@/lib/money';

const ClientProfit = () => {
  const { data, getProfitOfSale } = useData();
  const { sales, customers, settings } = data;
  const { toast } = useToast();
  const currencySymbol = settings?.currencySymbol || 'Rs';
  
  const { 
    filters, 
    handleFilterChange, 
    handleDateRangeChange, 
    setDatePreset,
    debouncedSearchTerm,
    timeZone,
  } = useFilters('clientProfit', []);

  const clientProfitData = useMemo(() => {
    if (!customers || !sales) return [];

    const fromDate = filters.dateRange?.from ? toDate(filters.dateRange.from, { timeZone }) : null;
    const toDateFilter = filters.dateRange?.to ? toDate(filters.dateRange.to, { timeZone }) : null;
    
    const profitByClient = customers.map(customer => {
      const clientSales = sales.filter(s => {
        const saleDate = toDate(s.date, { timeZone });
        return s.customerId === customer.id && 
               (!fromDate || saleDate >= fromDate) &&
               (!toDateFilter || saleDate <= toDateFilter);
      });
      
      const saleDetails = clientSales.map(sale => {
        const { totalProfit } = getProfitOfSale(sale);
        const revenue = sale.totalCost;
        return { ...sale, profit: totalProfit, revenue };
      });

      const totalProfit = saleDetails.reduce((sum, s) => sum + s.profit, 0);
      const totalRevenue = saleDetails.reduce((sum, s) => sum + s.revenue, 0);

      return {
        ...customer,
        totalProfit,
        totalRevenue,
        totalSales: clientSales.length,
        saleDetails,
      };
    });
    return profitByClient.filter(c => c.totalSales > 0);
  }, [sales, customers, getProfitOfSale, filters.dateRange, timeZone]);

  const filteredClientData = useMemo(() => {
    return clientProfitData.filter(client =>
      client.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [clientProfitData, debouncedSearchTerm]);
  
  const paginatedData = useMemo(() => {
    const startIndex = (filters.page - 1) * filters.pageSize;
    return filteredClientData.slice(startIndex, startIndex + filters.pageSize);
  }, [filteredClientData, filters.page, filters.pageSize]);

  const totalPages = Math.ceil(filteredClientData.length / filters.pageSize);

  const grandTotalProfit = useMemo(() => {
    return filteredClientData.reduce((sum, client) => sum + client.totalProfit, 0);
  }, [filteredClientData]);

  const handleExport = () => {
    if (filteredClientData.length === 0) {
      toast({ title: "No Data", description: "Cannot export an empty report.", variant: "destructive" });
      return;
    }
    generatePdf(
      <ClientProfitReportTemplate data={filteredClientData} settings={settings} grandTotalProfit={grandTotalProfit} />,
      `Client-Profit-Report.pdf`
    );
  };

  const toolbar = (
    <FilterToolbar
      filters={filters}
      onFilterChange={handleFilterChange}
      onDateRangeChange={handleDateRangeChange}
      onSetDatePreset={setDatePreset}
      onReset={() => {}}
      moduleName="clients"
    >
      <Button variant="outline" onClick={handleExport}>
        <Download className="mr-2 h-4 w-4" /> Export PDF
      </Button>
    </FilterToolbar>
  );
  
  return (
    <ReportWrapper title="Client-wise Profit" filterToolbar={toolbar}>
      <Accordion type="single" collapsible className="w-full">
        {paginatedData.map(client => (
          <AccordionItem value={client.id} key={client.id}>
            <AccordionTrigger>
              <div className="flex justify-between w-full pr-4">
                <span className="font-semibold">{client.name}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">Sales: {client.totalSales}</span>
                  <span className={`font-bold ${client.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Profit: {formatMoney(client.totalProfit, currencySymbol)}
                  </span>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="p-4 bg-muted rounded-md">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b"><th className="p-2 text-left">Invoice #</th><th className="p-2 text-left">Date</th><th className="p-2 text-right">Revenue</th><th className="p-2 text-right">Profit</th></tr></thead>
                    <tbody>
                      {client.saleDetails.map(sale => (
                        <tr key={sale.id} className="border-b">
                          <td className="p-2 font-mono">{sale.saleNumber}</td>
                          <td className="p-2">{formatInTimeZone(new Date(sale.date), 'Asia/Dubai', 'PP')}</td>
                          <td className="p-2 text-right">{formatMoney(sale.revenue, currencySymbol)}</td>
                          <td className={`p-2 text-right font-medium ${sale.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatMoney(sale.profit, currencySymbol)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <CardFooter className="flex items-center justify-between pt-6">
        <div className="text-lg font-bold">
          Grand Total Profit: <span className={grandTotalProfit >= 0 ? 'text-green-600' : 'text-red-600'}>{formatMoney(grandTotalProfit, currencySymbol)}</span>
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

export default ClientProfit;