import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, ShoppingCart, FileDown, Eye } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import PurchaseForm from '@/components/purchase/PurchaseForm';
import FormPanel from '@/components/FormPanel';
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
import PurchaseInvoiceTemplate from '@/components/pdf/PurchaseInvoiceTemplate';
import { formatInTimeZone, toDate } from 'date-fns-tz';
import { useFilters } from '@/hooks/useFilters';
import FilterToolbar from '@/components/FilterToolbar';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatFx } from '@/lib/fx';
import { toNumber } from '@/lib/money';


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

function Purchase() {
  const { data, updateData, requestPasscode, setTransactionToView, getInvoiceStatus } = useData();
  const { purchases, suppliers, items, sales, payments, cashInHand, banks } = data;
  const { toast } = useToast();
  const baseCurrency = data.settings?.currency || 'PKR';

  const [view, setView] = useState('list');
  const [editingPurchase, setEditingPurchase] = useState(null);

  const {
    filters,
    handleFilterChange,
    handleDateRangeChange,
    handleStatusChange,
    resetFilters,
    setDatePreset,
    debouncedSearchTerm,
    timeZone,
  } = useFilters('purchases', ['Paid', 'Partial', 'Credit']);

  const getSupplierName = (supplierId) => (suppliers || []).find(s => s.id === supplierId)?.name || 'Unknown';
  
  const purchaseList = useMemo(() => {
    return (purchases || [])
      .map(p => ({
        ...p,
        supplierName: getSupplierName(p.supplierId),
        statusInfo: getInvoiceStatus(p)
      }))
      .filter(p => {
        const purchaseDate = toDate(p.date, { timeZone });
        const fromDate = filters.dateRange.from ? toDate(filters.dateRange.from, { timeZone }) : null;
        const toDateFilter = filters.dateRange.to ? toDate(filters.dateRange.to, { timeZone }) : null;
        
        const dateMatch = (!fromDate || purchaseDate >= fromDate) && (!toDateFilter || purchaseDate <= toDateFilter);
        const statusMatch = filters.statuses.includes(p.statusInfo.status);
        
        const searchTermLower = debouncedSearchTerm.toLowerCase();
        const itemNames = (p.items || []).map(item => (items.find(i => i.id === item.itemId)?.name || '')).join(' ').toLowerCase();
        const itemSkus = (p.items || []).map(item => (items.find(i => i.id === item.itemId)?.sku || '')).join(' ').toLowerCase();
        const searchMatch = !debouncedSearchTerm || (
          p.purchaseNumber.toLowerCase().includes(searchTermLower) ||
          p.supplierName.toLowerCase().includes(searchTermLower) ||
          itemNames.includes(searchTermLower) ||
          itemSkus.includes(searchTermLower)
        );
        return dateMatch && statusMatch && searchMatch;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [purchases, suppliers, getInvoiceStatus, items, filters, debouncedSearchTerm, timeZone]);

  const paginatedPurchases = useMemo(() => {
    const startIndex = (filters.page - 1) * filters.pageSize;
    return purchaseList.slice(startIndex, startIndex + filters.pageSize);
  }, [purchaseList, filters.page, filters.pageSize]);

  const totalPages = Math.ceil(purchaseList.length / filters.pageSize);
  
  const handleDownloadPdf = (purchase) => {
    const supplier = suppliers.find(s => s.id === purchase.supplierId);
    generatePdf(
      <PurchaseInvoiceTemplate purchase={purchase} supplier={supplier} items={items} settings={data.settings} getInvoiceStatus={getInvoiceStatus} />,
      `Purchase-Invoice-${purchase.purchaseNumber}.pdf`
    );
  };

  const handleDelete = (id) => {
    requestPasscode(() => {
        const purchaseToDelete = purchases.find(p => p.id === id);
        if(!purchaseToDelete) return;
        
        const isAnyItemUsedInSale = (purchaseToDelete.items || []).some(purchaseItem => 
            (sales || []).some(sale => (sale.items || []).some(saleItem => saleItem.itemId === purchaseItem.itemId))
        );

        if(isAnyItemUsedInSale) {
            toast({ title: "Deletion Failed", description: "Cannot delete. One or more items from this purchase have been sold.", variant: "destructive" });
            return;
        }

        let updatedCashInHand = cashInHand;
        let updatedBanks = JSON.parse(JSON.stringify(banks));

        const directPayment = (payments || []).find(p => p.invoiceId === id);
        if (directPayment) {
            if (directPayment.method === 'cash') {
                updatedCashInHand += directPayment.amount;
            } else if (directPayment.bankId) {
                const bankIndex = updatedBanks.findIndex(b => b.id === directPayment.bankId);
                if (bankIndex > -1) {
                    updatedBanks[bankIndex].balance += directPayment.amount;
                }
            }
        }

        const updatedPurchases = purchases.filter(p => p.id !== id);
        const updatedPayments = payments.filter(p => p.invoiceId !== id);
        updateData({ purchases: updatedPurchases, payments: updatedPayments, cashInHand: updatedCashInHand, banks: updatedBanks });
        toast({ title: "Success", description: "Purchase and associated payments deleted successfully!" });
    }, { isEdit: true });
  };

  const handleEdit = (purchase) => {
     requestPasscode(() => {
        setEditingPurchase(purchase);
        setView('form');
    }, { isEdit: true });
  };
  
  const handleAddNew = () => {
    setEditingPurchase(null);
    setView('form');
  }

  const handleCloseForm = () => {
    setView('list');
    setEditingPurchase(null);
  }

  const renderMoney = (purchase) => {
    return formatFx(purchase.total_foreign, purchase.currency, purchase.total_local, baseCurrency);
  }

  const renderPaidAmount = (purchase) => {
    const { paidAmount } = getInvoiceStatus(purchase);
    const paidForeign = paidAmount / (toNumber(purchase.fx_rate_to_business) || 1);
    return formatFx(paidForeign, purchase.currency, paidAmount, baseCurrency);
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Purchase Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Create and manage your purchase invoices.</p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-2" />
          New Purchase
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
              moduleName="purchases"
            />
            <Card>
              <CardHeader>
                  <CardTitle className="flex items-center"><ShoppingCart className="h-5 w-5 mr-2" />Purchase History</CardTitle>
              </CardHeader>
              <CardContent>
                {paginatedPurchases.length === 0 ? (
                  <div className="text-center py-8"><ShoppingCart className="h-12 w-12 mx-auto text-gray-400 mb-4" /><p className="text-gray-500">No purchases found for the selected filters.</p></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b"><th className="text-left p-2">Inv #</th><th className="text-left p-2">Date</th><th className="text-left p-2">Supplier</th><th className="text-right p-2">Total Bill</th><th className="text-right p-2">Paid Amount</th><th className="text-center p-2">Status</th><th className="text-center p-2">Actions</th></tr>
                      </thead>
                      <tbody>
                        {paginatedPurchases.map((purchase, index) => (
                          <motion.tr key={purchase.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="border-b hover:bg-muted">
                            <td className="p-2 font-mono">{purchase.purchaseNumber}</td>
                            <td className="p-2">{formatInTimeZone(new Date(purchase.date), 'Asia/Dubai', 'PP')}</td>
                            <td className="p-2">{purchase.supplierName}</td>
                            <td className="p-2 font-semibold text-right text-blue-600">{renderMoney(purchase)}</td>
                            <td className="p-2 font-semibold text-right text-green-600">{renderPaidAmount(purchase)}</td>
                            <td className="p-2 text-center"><PaymentStatusBadge status={purchase.statusInfo.status} /></td>
                            <td className="p-2">
                              <div className="flex justify-center space-x-1">
                                <Button size="icon" variant="ghost" onClick={() => setTransactionToView({ transaction: purchase, type: 'purchase' })}><Eye className="h-4 w-4 text-purple-500" /></Button>
                                <Button size="icon" variant="ghost" onClick={() => handleEdit(purchase)}><Edit className="h-4 w-4" /></Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild><Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-red-500" /></Button></AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will delete the purchase invoice and all associated payments. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(purchase.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                                <Button size="icon" variant="ghost" onClick={() => handleDownloadPdf(purchase)}><FileDown className="h-4 w-4 text-blue-500" /></Button>
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
          <FormPanel key="form" title={editingPurchase ? 'Edit Purchase Bill' : 'New Purchase Bill'} onClose={handleCloseForm}>
            <PurchaseForm purchase={editingPurchase} onClose={handleCloseForm} />
          </FormPanel>
        )}
      </AnimatePresence>
    </div>
  );
}

export { Purchase };