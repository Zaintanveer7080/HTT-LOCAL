import React, { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Plus, ArrowLeftRight, User, Building, Hand, Landmark, Edit, Trash2, Eye } from 'lucide-react';
import PaymentForm from '@/components/payments/PaymentForm';
import { formatInTimeZone, toDate } from 'date-fns-tz';
import { useFilters } from '@/hooks/useFilters';
import FilterToolbar from '@/components/FilterToolbar';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatMoney } from '@/lib/money';


function Payments() {
  const { data, updateData, requestPasscode, setTransactionToView, recalculateAndSyncInvoices } = useData();
  const { customers, suppliers, payments, banks, cashInHand, cashTransactions } = data;
  const { toast } = useToast();
  const currencySymbol = data.settings?.currencySymbol || 'AED';
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [paymentType, setPaymentType] = useState('in'); // 'in' or 'out'
  const [editingPayment, setEditingPayment] = useState(null);

  const statusOptions = ['In', 'Out', 'Cash', 'Bank'];
  const {
    filters,
    handleFilterChange,
    handleDateRangeChange,
    handleStatusChange: handleTypeChange, // Renaming for clarity
    resetFilters,
    setDatePreset,
    debouncedSearchTerm,
    timeZone,
  } = useFilters('payments', statusOptions);

  const getPartyName = (type, id) => {
    if (type === 'in') return customers.find(c => c.id === id)?.name || 'Unknown';
    return suppliers.find(s => s.id === id)?.name || 'Unknown';
  };
  
  const paymentHistory = useMemo(() => {
    return [...(payments || [])]
      .map(p => ({
        ...p,
        partyName: getPartyName(p.type, p.partyId)
      }))
      .filter(p => {
        const paymentDate = toDate(p.date, { timeZone });
        const fromDate = filters.dateRange.from ? toDate(filters.dateRange.from, { timeZone }) : null;
        const toDateFilter = filters.dateRange.to ? toDate(filters.dateRange.to, { timeZone }) : null;

        const dateMatch = (!fromDate || paymentDate >= fromDate) && (!toDateFilter || paymentDate <= toDateFilter);
        
        const typeMatch = (filters.statuses.includes('In') && p.type === 'in') || (filters.statuses.includes('Out') && p.type === 'out');
        const methodMatch = (filters.statuses.includes('Cash') && p.method === 'cash') || (filters.statuses.includes('Bank') && p.method === 'bank');
        
        const searchTermLower = debouncedSearchTerm.toLowerCase();
        const searchMatch = !debouncedSearchTerm || (
          p.partyName.toLowerCase().includes(searchTermLower) ||
          p.amount.toString().includes(searchTermLower) ||
          (p.notes || '').toLowerCase().includes(searchTermLower)
        );

        return dateMatch && typeMatch && methodMatch && searchMatch;
      })
      .sort((a,b) => new Date(b.date) - new Date(a.date));
  }, [payments, customers, suppliers, filters, debouncedSearchTerm, timeZone]);

  const paginatedPayments = useMemo(() => {
    const startIndex = (filters.page - 1) * filters.pageSize;
    return paymentHistory.slice(startIndex, startIndex + filters.pageSize);
  }, [paymentHistory, filters.page, filters.pageSize]);
  
  const totalPages = Math.ceil(paymentHistory.length / filters.pageSize);

  const handleEdit = (payment) => {
     requestPasscode(() => {
        setPaymentType(payment.type);
        setEditingPayment(payment);
        setIsDialogOpen(true);
    });
  };

  const handleDelete = (paymentToDelete) => {
    requestPasscode(() => {
      let updatedCashInHand = cashInHand;
      let updatedBanks = JSON.parse(JSON.stringify(banks));
      
      if (paymentToDelete.method === 'cash') {
        if (paymentToDelete.type === 'in') updatedCashInHand -= paymentToDelete.amount;
        else updatedCashInHand += paymentToDelete.amount;
      } else {
        const bankIndex = updatedBanks.findIndex(b => b.id === paymentToDelete.bankId);
        if (bankIndex !== -1) {
          if (paymentToDelete.type === 'in') updatedBanks[bankIndex].balance -= paymentToDelete.amount;
          else updatedBanks[bankIndex].balance += paymentToDelete.amount;
        }
      }

      const updatedPayments = payments.filter(p => p.id !== paymentToDelete.id);
      
      const partyName = getPartyName(paymentToDelete.type, paymentToDelete.partyId);
      const expectedDescription = `Payment ${paymentToDelete.type === 'in' ? 'from' : 'to'} ${partyName}`;
      const updatedCashTransactions = cashTransactions.filter(ct => 
        !(ct.amount === paymentToDelete.amount && ct.description === expectedDescription)
      );

      const invoiceUpdates = recalculateAndSyncInvoices([paymentToDelete.invoiceId], updatedPayments);

      updateData({
        ...invoiceUpdates,
        payments: updatedPayments,
        cashInHand: updatedCashInHand,
        banks: updatedBanks,
        cashTransactions: updatedCashTransactions,
      });

      toast({ title: "Success", description: "Payment deleted successfully." });
    });
  };

  const openNewPaymentDialog = (type) => {
    setPaymentType(type);
    setEditingPayment(null);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Payments</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage incoming and outgoing payments with advanced allocation.</p>
        </div>
        <div className="flex gap-2">
           <Button onClick={() => openNewPaymentDialog('in')} className="bg-green-600 hover:bg-green-700">
             <Plus className="h-4 w-4 mr-2" /> Payment In
           </Button>
           <Button onClick={() => openNewPaymentDialog('out')} className="bg-red-600 hover:bg-red-700">
             <Plus className="h-4 w-4 mr-2" /> Payment Out
           </Button>
        </div>
      </div>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingPayment ? 'Edit' : 'Record'} Payment {paymentType === 'in' ? 'In' : 'Out'}</DialogTitle>
          </DialogHeader>
          <PaymentForm 
            paymentType={paymentType} 
            onClose={() => setIsDialogOpen(false)}
            paymentToEdit={editingPayment}
          />
        </DialogContent>
      </Dialog>
      
      <FilterToolbar
        filters={filters}
        onFilterChange={handleFilterChange}
        onDateRangeChange={handleDateRangeChange}
        onStatusChange={handleTypeChange}
        onReset={resetFilters}
        onSetDatePreset={setDatePreset}
        statusOptions={statusOptions}
        moduleName="payments"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><ArrowLeftRight className="h-5 w-5 mr-2" /> Payment History</CardTitle>
        </CardHeader>
        <CardContent>
           {paginatedPayments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No payments found for the selected filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Party</th>
                    <th className="text-left p-2">Amount</th>
                    <th className="text-left p-2">Method</th>
                    <th className="text-left p-2">Discount</th>
                    <th className="text-right p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPayments.map(p => (
                    <tr key={p.id} className="border-b">
                      <td className="p-2">{formatInTimeZone(new Date(p.date), timeZone, 'PP')}</td>
                      <td className="p-2">
                        <span className={`font-semibold ${p.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                          {p.type === 'in' ? 'Payment In' : 'Payment Out'}
                        </span>
                      </td>
                      <td className="p-2 flex items-center gap-2">
                        {p.type === 'in' ? <User className="h-4 w-4 text-gray-500" /> : <Building className="h-4 w-4 text-gray-500" />}
                        {p.partyName}
                      </td>
                      <td className="p-2 font-bold">{formatMoney(p.amount, currencySymbol)}</td>
                      <td className="p-2 flex items-center gap-2">
                        {p.method === 'cash' ? <Hand className="h-4 w-4 text-gray-500" /> : <Landmark className="h-4 w-4 text-gray-500" />}
                        {p.method === 'cash' ? 'Cash' : banks.find(b => b.id === p.bankId)?.name || 'Bank'}
                      </td>
                      <td className="p-2 font-semibold text-blue-600">
                        {formatMoney(p.discount || 0, currencySymbol)}
                      </td>
                      <td className="p-2 text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => setTransactionToView({ transaction: p, type: 'payment' })}><Eye className="h-4 w-4 text-purple-500" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}><Edit className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the payment record and reverse its financial impact.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(p)}>Continue</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
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
    </div>
  );
}

export default Payments;