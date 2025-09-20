import React, { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, TrendingUp, FileDown, Eye } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import SalesForm from '@/components/sales/SalesForm';
import FormPanel from '@/components/FormPanel';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { generatePdf } from '@/components/pdf/PdfGenerator';
import SaleInvoiceTemplate from '@/components/pdf/SaleInvoiceTemplate';
import { formatInTimeZone, toDate } from 'date-fns-tz';
import { useFilters } from '@/hooks/useFilters';
import FilterToolbar from '@/components/FilterToolbar';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatMoney } from '@/lib/money';

const PaymentStatusBadge = ({ status }) => {
  const statusStyles = {
    Paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    Partial: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    Credit: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  };
  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status] || ''}`}>
      {status}
    </span>
  );
};

function Sales() {
  const { data, updateData, requestPasscode, setTransactionToView, getInvoiceStatus } = useData();
  const { sales, customers, items, payments, banks, cashInHand } = data;
  const { toast } = useToast();
  const currencySymbol = data.settings?.currency || 'RS';
  const [view, setView] = useState('list');
  const [editingSale, setEditingSale] = useState(null);

  const {
    filters,
    handleFilterChange,
    handleDateRangeChange,
    handleStatusChange,
    resetFilters,
    setDatePreset,
    debouncedSearchTerm,
    timeZone,
  } = useFilters('sales', ['Paid', 'Partial', 'Credit']);

  const getCustomerName = (customerId) => (customers || []).find(c => c.id === customerId)?.name || 'Unknown';
  
  const salesList = useMemo(() => {
    return (sales || [])
      .map(s => ({
        ...s,
        customerName: getCustomerName(s.customerId),
        statusInfo: getInvoiceStatus(s)
      }))
      .filter(s => {
        const saleDate = toDate(s.date, { timeZone });
        const fromDate = filters.dateRange.from ? toDate(filters.dateRange.from, { timeZone }) : null;
        const toDateFilter = filters.dateRange.to ? toDate(filters.dateRange.to, { timeZone }) : null;

        const dateMatch = (!fromDate || saleDate >= fromDate) && (!toDateFilter || saleDate <= toDateFilter);
        const statusMatch = filters.statuses.includes(s.statusInfo.status);
        
        const searchTermLower = debouncedSearchTerm.toLowerCase();
        const itemNames = (s.items || []).map(item => (items.find(i => i.id === item.itemId)?.name || '')).join(' ').toLowerCase();
        const itemSkus = (s.items || []).map(item => (items.find(i => i.id === item.itemId)?.sku || '')).join(' ').toLowerCase();
        const searchMatch = !debouncedSearchTerm || (
          (s.saleNumber && s.saleNumber.toLowerCase().includes(searchTermLower)) ||
          s.customerName.toLowerCase().includes(searchTermLower) ||
          itemNames.includes(searchTermLower) ||
          itemSkus.includes(searchTermLower)
        );

        return dateMatch && statusMatch && searchMatch;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [sales, customers, getInvoiceStatus, items, filters, debouncedSearchTerm, timeZone]);

  const paginatedSales = useMemo(() => {
    const startIndex = (filters.page - 1) * filters.pageSize;
    return salesList.slice(startIndex, startIndex + filters.pageSize);
  }, [salesList, filters.page, filters.pageSize]);

  const totalPages = Math.ceil(salesList.length / filters.pageSize);

  const handleDownloadPdf = (sale) => {
    const customer = customers.find(c => c.id === sale.customerId);
    const filename = `Sale-Invoice-${sale.saleNumber}.pdf`;
    generatePdf(
      <SaleInvoiceTemplate sale={sale} customer={customer} items={items} settings={data.settings} getInvoiceStatus={getInvoiceStatus} />,
      filename
    );
  };
  
  const handleEdit = (sale) => {
    requestPasscode(() => {
        setEditingSale(sale);
        setView('form');
    }, { isEdit: true });
  };
  
  const handleDelete = (id) => {
    requestPasscode(() => {
        const saleToDelete = sales.find(s => s.id === id);
        if (!saleToDelete) return;

        let updatedCashInHand = cashInHand;
        let updatedBanks = JSON.parse(JSON.stringify(banks || []));

        const directPayment = (payments || []).find(p => p.invoiceId === id);
        if (directPayment) {
            if (directPayment.method === 'cash') {
                updatedCashInHand -= directPayment.amount;
            } else if (directPayment.bankId) {
                const bankIndex = updatedBanks.findIndex(b => b.id === directPayment.bankId);
                if(bankIndex > -1) updatedBanks[bankIndex].balance -= directPayment.amount;
            }
        }

        const updatedSales = sales.filter(s => s.id !== id);
        const updatedPayments = payments.filter(p => p.invoiceId !== id);
        
        updateData({ sales: updatedSales, payments: updatedPayments, cashInHand: updatedCashInHand, banks: updatedBanks });
        toast({ title: "Success", description: "Sale and associated payments deleted successfully!" });
    }, { isEdit: true });
  };

  const handleAddNew = () => {
    setEditingSale(null);
    setView('form');
  };

  const handleCloseForm = () => {
    setView('list');
    setEditingSale(null);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Sales Invoices</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Create and manage customer invoices.</p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-2" />
          New Sale
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {view === 'list' && (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1">
             <FilterToolbar
              filters={filters}
              onFilterChange={handleFilterChange}
              onDateRangeChange={handleDateRangeChange}
              onStatusChange={handleStatusChange}
              onReset={resetFilters}
              onSetDatePreset={setDatePreset}
              statusOptions={['Paid', 'Partial', 'Credit']}
              moduleName="sales"
            />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><TrendingUp className="h-5 w-5 mr-2" />Recent Sales</CardTitle>
              </CardHeader>
              <CardContent>
                {paginatedSales.length === 0 ? (
                  <div className="text-center py-8"><TrendingUp className="h-12 w-12 mx-auto text-gray-400 mb-4" /><p className="text-gray-500">No sales found for the selected filters.</p></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b"><th className="text-left p-2">Inv #</th><th className="text-left p-2">Date</th><th className="text-left p-2">Customer</th><th className="text-right p-2">Total Bill</th><th className="text-right p-2">Paid Amount</th><th className="text-center p-2">Status</th><th className="text-center p-2">Actions</th></tr>
                      </thead>
                      <tbody>
                        {paginatedSales.map((sale, index) => (
                          <motion.tr key={sale.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="border-b hover:bg-muted">
                            <td className="p-2 font-mono">{sale.saleNumber}</td>
                            <td className="p-2">{formatInTimeZone(new Date(sale.date), 'Asia/Dubai', 'PP')}</td>
                            <td className="p-2">{sale.customerName}</td>
                            <td className="p-2 font-semibold text-right text-blue-600">{formatMoney(sale.totalCost, currencySymbol)}</td>
                            <td className="p-2 font-semibold text-right text-green-600">{formatMoney(sale.paidAmount, currencySymbol)}</td>
                            <td className="p-2 text-center"><PaymentStatusBadge status={sale.statusInfo.status} /></td>
                            <td className="p-2">
                              <div className="flex justify-center space-x-1">
                                <Button size="icon" variant="ghost" onClick={() => setTransactionToView({ transaction: sale, type: 'sale' })}><Eye className="h-4 w-4 text-purple-500" /></Button>
                                <Button size="icon" variant="ghost" onClick={() => handleEdit(sale)}><Edit className="h-4 w-4" /></Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild><Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-red-500" /></Button></AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will delete the sale invoice and all associated payments. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(sale.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                                <Button size="icon" variant="ghost" onClick={() => handleDownloadPdf(sale)}><FileDown className="h-4 w-4 text-blue-500" /></Button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex items-center justify-between">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); handleFilterChange('page', Math.max(1, filters.page - 1)); }} disabled={filters.page === 1} />
                    </PaginationItem>
                    <PaginationItem><PaginationLink>{filters.page} of {totalPages}</PaginationLink></PaginationItem>
                    <PaginationItem>
                      <PaginationNext href="#" onClick={(e) => { e.preventDefault(); handleFilterChange('page', Math.min(totalPages, filters.page + 1)); }} disabled={filters.page === totalPages} />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rows per page:</span>
                  <Select value={String(filters.pageSize)} onValueChange={value => handleFilterChange('pageSize', Number(value))}>
                    <SelectTrigger className="w-[70px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardFooter>
            </Card>
          </motion.div>
        )}

        {view === 'form' && (
          <FormPanel key="form" title={editingSale ? 'Edit Sale Invoice' : 'New Sale Invoice'} onClose={handleCloseForm}>
            <SalesForm sale={editingSale} onClose={handleCloseForm} />
          </FormPanel>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Sales;