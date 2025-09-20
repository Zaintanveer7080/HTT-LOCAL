import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useData } from '@/contexts/DataContext';
import { useFilters } from '@/hooks/useFilters';
import FilterToolbar from '@/components/FilterToolbar';
import ReportWrapper from './ReportWrapper';
import { Download, ShoppingCart, Truck, RotateCcw, Ban, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toDate, format } from 'date-fns-tz';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const getStatusStyles = (status) => {
  switch (status) {
    case 'Shipped': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'Delivered': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'Returned': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
    case 'Cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
};

const OnlineOrdersReport = () => {
  const { data } = useData();
  const { onlineOrders, sales, customers, expenses, settings } = data;
  const { toast } = useToast();

  const statusOptions = ['Shipped', 'Delivered', 'Returned', 'Cancelled', 'Pending', 'In Transit'];

  const {
    filters,
    handleFilterChange,
    handleDateRangeChange,
    handleStatusChange,
    resetFilters,
    setDatePreset,
    debouncedSearchTerm,
    timeZone,
  } = useFilters('onlineOrdersReport', statusOptions);

  const getCustomerName = (customerId) => (customers || []).find(c => c.id === customerId)?.name || 'N/A';

  const processedOrders = useMemo(() => {
    return (onlineOrders || [])
      .map(order => {
        const sale = (sales || []).find(s => s.id === order.saleId);
        if (!sale) return null;

        const orderDate = toDate(sale.date, { timeZone });
        const fromDate = filters.dateRange.from ? toDate(filters.dateRange.from, { timeZone }) : null;
        const toDateFilter = filters.dateRange.to ? toDate(filters.dateRange.to, { timeZone }) : null;
        
        const dateMatch = (!fromDate || orderDate >= fromDate) && (!toDateFilter || orderDate <= toDateFilter);
        const statusMatch = filters.statuses.length === 0 || filters.statuses.includes(order.status);
        const searchMatch = !debouncedSearchTerm || 
            (order.invoiceNumber && order.invoiceNumber.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) || 
            getCustomerName(sale.customerId).toLowerCase().includes(debouncedSearchTerm.toLowerCase());
        
        if (dateMatch && statusMatch && searchMatch) {
          const deliveryExpense = (expenses || []).find(e => e.id === order.deliveryChargeExpenseId);
          const rtoExpense = (expenses || []).find(e => e.id === order.rtoChargeExpenseId);
          const totalFees = (deliveryExpense?.amount || 0) + (rtoExpense?.amount || 0);

          return {
            ...order,
            date: sale.date,
            customerName: getCustomerName(sale.customerId),
            items: sale.items,
            subtotal: sale.subTotal,
            discounts: sale.discount,
            tax: 0, 
            net: sale.totalCost,
            notes: sale.notes,
            shippingFee: deliveryExpense?.amount || 0,
            totalFees,
          };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [onlineOrders, sales, expenses, filters, debouncedSearchTerm, getCustomerName, timeZone, customers]);

  const summary = useMemo(() => {
    return (onlineOrders || []).reduce((acc, order) => {
      acc.totalOrders += 1;
      if (order.status === 'Delivered') acc.delivered += 1;
      if (order.status === 'Returned') acc.returned += 1;
      if (order.status === 'Shipped') acc.shipped += 1;
      if (order.status === 'Cancelled') acc.cancelled += 1;
      
      const deliveryExpense = (expenses || []).find(e => e.id === order.deliveryChargeExpenseId);
      const rtoExpense = (expenses || []).find(e => e.id === order.rtoChargeExpenseId);
      acc.totalExpenses += (deliveryExpense?.amount || 0) + (rtoExpense?.amount || 0);

      return acc;
    }, { totalOrders: 0, delivered: 0, returned: 0, shipped: 0, cancelled: 0, totalExpenses: 0 });
  }, [onlineOrders, expenses]);
  
  const handleExport = () => {
    toast({
      title: "🚧 Feature not implemented",
      description: "Export functionality for this report is coming soon!",
    });
  };

  const paginatedOrders = useMemo(() => {
    const startIndex = (filters.page - 1) * filters.pageSize;
    return processedOrders.slice(startIndex, startIndex + filters.pageSize);
  }, [processedOrders, filters.page, filters.pageSize]);

  const totalPages = Math.ceil(processedOrders.length / filters.pageSize);

  const toolbar = (
    <FilterToolbar
      filters={filters}
      onFilterChange={handleFilterChange}
      onDateRangeChange={handleDateRangeChange}
      onReset={resetFilters}
      onSetDatePreset={setDatePreset}
      moduleName="online orders"
    >
      <Button onClick={handleExport} variant="outline">
        <Download className="mr-2 h-4 w-4" /> Export
      </Button>
    </FilterToolbar>
  );

  return (
    <ReportWrapper title="Online Orders Report" filterToolbar={toolbar}>
        <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-5 mb-6">
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Orders</CardTitle><ShoppingCart className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{summary.totalOrders}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Delivered</CardTitle><Truck className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{summary.delivered}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Returned</CardTitle><RotateCcw className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{summary.returned}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Cancelled</CardTitle><Ban className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{summary.cancelled}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Expenses</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{settings?.currency} {summary.totalExpenses.toFixed(2)}</div></CardContent></Card>
        </div>
        <div className="overflow-x-auto">
        <Table>
            <TableHeader><TableRow><TableHead>Date/Time</TableHead><TableHead>Order No.</TableHead><TableHead>Customer</TableHead><TableHead>Status</TableHead><TableHead>Items/Qty</TableHead><TableHead className="text-right">Subtotal</TableHead><TableHead className="text-right">Fees</TableHead><TableHead className="text-right">Net</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
            <TableBody>
            {paginatedOrders.map(order => (
                <TableRow key={order.id}><TableCell>{format(toDate(order.date, { timeZone }), 'PPpp')}</TableCell><TableCell>{order.invoiceNumber}</TableCell><TableCell>{order.customerName}</TableCell><TableCell><Badge className={getStatusStyles(order.status)}>{order.status}</Badge></TableCell><TableCell>{order.items.reduce((acc, item) => acc + item.quantity, 0)}</TableCell><TableCell className="text-right">{order.subtotal.toFixed(2)}</TableCell><TableCell className="text-right">{order.totalFees.toFixed(2)}</TableCell><TableCell className="text-right font-semibold">{order.net.toFixed(2)}</TableCell><TableCell>{order.notes}</TableCell></TableRow>
            ))}
            </TableBody>
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
            <Select value={String(filters.pageSize)} onValueChange={value => handleFilterChange('pageSize', Number(value))}>
            <SelectTrigger className="w-[70px] h-8"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem><SelectItem value="100">100</SelectItem></SelectContent>
            </Select>
        </div>
        </CardFooter>
    </ReportWrapper>
  );
};

export default OnlineOrdersReport;