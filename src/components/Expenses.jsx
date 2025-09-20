import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, CreditCard, FileDown, Eye } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useData } from '@/contexts/DataContext';
import { generatePdf } from '@/components/pdf/PdfGenerator';
import ExpenseVoucherTemplate from '@/components/pdf/ExpenseVoucherTemplate';
import { formatInTimeZone, toDate } from 'date-fns-tz';
import { useFilters } from '@/hooks/useFilters';
import FilterToolbar from '@/components/FilterToolbar';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { formatMoney } from '@/lib/money';

const expenseCategories = [
  'Salaries', 'Rent', 'Utilities', 'Marketing', 'Office Supplies', 'Travel',
  'Insurance', 'Maintenance', 'Professional Services', 'Delivery Charges', 'RTO Charges', 'Other'
];

function Expenses() {
  const { data, updateData, requestPasscode, setTransactionToView } = useData();
  const { expenses, banks, cashInHand } = data;
  const { toast } = useToast();
  const currencySymbol = data.settings?.currencySymbol || 'Rs';

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  
  const {
    filters,
    handleFilterChange,
    handleDateRangeChange,
    handleStatusChange,
    resetFilters,
    setDatePreset,
    debouncedSearchTerm,
    timeZone,
  } = useFilters('expenses', []); // All expenses are considered paid

  const [formData, setFormData] = useState({
    category: '', amount: '', notes: '',
    date: formatInTimeZone(new Date(), 'Asia/Dubai', 'yyyy-MM-dd\'T\'HH:mm'),
    paymentMethod: 'cash', bankId: ''
  });

  const handleDownloadPdf = (expense) => {
    generatePdf(
      <ExpenseVoucherTemplate expense={expense} settings={data.settings} />,
      `Expense-Voucher-${expense.id}.pdf`
    );
  };
  
  const handleSave = () => {
    if (!formData.category || !formData.amount || !formData.paymentMethod || (formData.paymentMethod === 'bank' && !formData.bankId)) {
      toast({ title: "Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    const expenseData = {
      id: editingExpense ? editingExpense.id : Date.now().toString(),
      ...formData,
      amount: parseFloat(formData.amount)
    };

    let updatedExpenses;
    let updatedCashInHand = cashInHand;
    let updatedBanks = JSON.parse(JSON.stringify(banks));

    if (editingExpense) {
      if (editingExpense.paymentMethod === 'cash') {
        updatedCashInHand += editingExpense.amount;
      } else if (editingExpense.bankId) {
        const oldBankIndex = updatedBanks.findIndex(b => b.id === editingExpense.bankId);
        if (oldBankIndex > -1) updatedBanks[oldBankIndex].balance += editingExpense.amount;
      }
    }

    if (expenseData.paymentMethod === 'cash') {
      updatedCashInHand -= expenseData.amount;
    } else if (expenseData.bankId) {
      const newBankIndex = updatedBanks.findIndex(b => b.id === expenseData.bankId);
      if (newBankIndex > -1) updatedBanks[newBankIndex].balance -= expenseData.amount;
    }

    if (editingExpense) {
      updatedExpenses = expenses.map(e => e.id === editingExpense.id ? expenseData : e);
      toast({ title: "Success", description: "Expense updated successfully!" });
    } else {
      updatedExpenses = [...(expenses || []), expenseData];
      toast({ title: "Success", description: "Expense added successfully!" });
    }
  
    updateData({ expenses: updatedExpenses, cashInHand: updatedCashInHand, banks: updatedBanks });
    resetForm();
    setIsDialogOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if(editingExpense) {
      requestPasscode(handleSave);
    } else {
      handleSave();
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      category: expense.category,
      amount: expense.amount.toString(),
      notes: expense.notes,
      date: expense.date,
      paymentMethod: expense.paymentMethod || 'cash',
      bankId: expense.bankId || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id) => {
    const expenseToDelete = expenses.find(e => e.id === id);
    if (!expenseToDelete) return;

    if(expenseToDelete.linkedOrderId) {
        toast({ title: "Action Not Allowed", description: "This expense is linked to an online order and cannot be deleted here.", variant: "destructive" });
        return;
    }
    requestPasscode(() => {
        let updatedCashInHand = cashInHand;
        let updatedBanks = JSON.parse(JSON.stringify(banks));

        if (expenseToDelete.paymentMethod === 'cash') {
          updatedCashInHand += expenseToDelete.amount;
        } else if (expenseToDelete.bankId) {
          const bankIndex = updatedBanks.findIndex(b => b.id === expenseToDelete.bankId);
          if (bankIndex > -1) updatedBanks[bankIndex].balance += expenseToDelete.amount;
        }

        const updatedExpenses = expenses.filter(e => e.id !== id);
        updateData({ expenses: updatedExpenses, cashInHand: updatedCashInHand, banks: updatedBanks });
        toast({ title: "Success", description: "Expense deleted successfully!" });
    });
  };

  const resetForm = () => {
    setFormData({
      category: '', amount: '', notes: '',
      date: formatInTimeZone(new Date(), 'Asia/Dubai', 'yyyy-MM-dd\'T\'HH:mm'),
      paymentMethod: 'cash', bankId: ''
    });
    setEditingExpense(null);
  };

  const filteredExpenses = useMemo(() => {
    return (expenses || [])
      .filter(expense => {
        const expenseDate = toDate(expense.date, { timeZone });
        const fromDate = filters.dateRange.from ? toDate(filters.dateRange.from, { timeZone }) : null;
        const toDateFilter = filters.dateRange.to ? toDate(filters.dateRange.to, { timeZone }) : null;

        const dateMatch = (!fromDate || expenseDate >= fromDate) && (!toDateFilter || expenseDate <= toDateFilter);
        
        const searchTermLower = debouncedSearchTerm.toLowerCase();
        const searchMatch = !debouncedSearchTerm || (
          expense.category.toLowerCase().includes(searchTermLower) ||
          (expense.notes || '').toLowerCase().includes(searchTermLower) ||
          expense.amount.toString().includes(searchTermLower)
        );
        return dateMatch && searchMatch;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [expenses, filters, debouncedSearchTerm, timeZone]);

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const paginatedExpenses = useMemo(() => {
    const startIndex = (filters.page - 1) * filters.pageSize;
    return filteredExpenses.slice(startIndex, startIndex + filters.pageSize);
  }, [filteredExpenses, filters.page, filters.pageSize]);

  const totalPages = Math.ceil(filteredExpenses.length / filters.pageSize);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Expense Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track and categorize business expenses</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) resetForm(); setIsDialogOpen(isOpen); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="py-4 space-y-4">
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{expenseCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label htmlFor="amount">Amount *</Label><Input id="amount" type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} placeholder="Enter amount" /></div>
              <div>
                <Label>Payment Method *</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={formData.paymentMethod} onValueChange={(v) => setFormData({...formData, paymentMethod: v, bankId: ''})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="bank">Bank</SelectItem></SelectContent>
                  </Select>
                  {formData.paymentMethod === 'bank' && (
                    <Select value={formData.bankId} onValueChange={(v) => setFormData({...formData, bankId: v})}>
                      <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                      <SelectContent>{(banks || []).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              <div><Label htmlFor="notes">Notes</Label><Input id="notes" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Enter notes (optional)" /></div>
              <div><Label htmlFor="date">Date & Time</Label><Input id="date" type="datetime-local" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit">{editingExpense ? 'Update' : 'Add'} Expense</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <FilterToolbar
        filters={filters}
        onFilterChange={handleFilterChange}
        onDateRangeChange={handleDateRangeChange}
        onStatusChange={handleStatusChange}
        onReset={resetFilters}
        onSetDatePreset={setDatePreset}
        statusOptions={[]} 
        moduleName="expenses"
      />

      <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center"><CreditCard className="h-5 w-5 mr-2" />Expense Records</CardTitle>
              <div className="text-right">
                <p className="text-sm font-medium text-muted-foreground">Total Displayed Expenses</p>
                <p className="text-2xl font-bold text-red-600">{formatMoney(totalExpenses, currencySymbol)}</p>
              </div>
            </div>
        </CardHeader>
        <CardContent>
          {paginatedExpenses.length === 0 ? (
            <div className="text-center py-8"><CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-4" /><p className="text-gray-500">No expenses found for the selected filters.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b"><th className="text-left p-2">Date</th><th className="text-left p-2">Category</th><th className="text-left p-2">Amount</th><th className="text-left p-2">Method</th><th className="text-left p-2">Notes</th><th className="text-left p-2">Actions</th></tr>
                </thead>
                <tbody>
                  {paginatedExpenses.map((expense, index) => (
                    <motion.tr key={expense.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="border-b hover:bg-muted">
                      <td className="p-2">{formatInTimeZone(new Date(expense.date), 'Asia/Dubai', 'PP p')}</td>
                      <td className="p-2"><span className="px-2 py-1 bg-muted rounded-full text-sm">{expense.category}</span></td>
                      <td className="p-2 font-semibold text-red-600">{formatMoney(expense.amount, currencySymbol)}</td>
                      <td className="p-2 text-sm">{expense.paymentMethod === 'bank' ? banks.find(b => b.id === expense.bankId)?.name || 'Bank' : 'Cash'}</td>
                      <td className="p-2 text-muted-foreground">{expense.notes || '-'}</td>
                      <td className="p-2">
                        <div className="flex space-x-1">
                          <Button size="icon" variant="ghost" onClick={() => setTransactionToView({ transaction: expense, type: 'expense' })}><Eye className="h-4 w-4 text-purple-500" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(expense)} disabled={!!expense.linkedOrderId}><Edit className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(expense.id)} disabled={!!expense.linkedOrderId}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDownloadPdf(expense)}><FileDown className="h-4 w-4 text-blue-500" /></Button>
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
    </div>
  );
}

export default Expenses;