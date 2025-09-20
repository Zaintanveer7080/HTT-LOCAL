import React, { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Edit, Truck, History, ExternalLink, PackageCheck, PackageX, PackageSearch, Ban, Hourglass } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatInTimeZone, toDate } from 'date-fns-tz';
import { useFilters } from '@/hooks/useFilters';
import FilterToolbar from '@/components/FilterToolbar';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';


const StatusBadge = ({ status }) => {
  const statusStyles = {
    Pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    'In Transit': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    Delivered: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    Shipped: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
    Returned: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    Cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  };
  const statusIcons = {
    Pending: <Hourglass className="h-3 w-3" />,
    'In Transit': <Truck className="h-3 w-3" />,
    Shipped: <Truck className="h-3 w-3" />,
    Delivered: <PackageCheck className="h-3 w-3" />,
    Returned: <PackageX className="h-3 w-3" />,
    Cancelled: <Ban className="h-3 w-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status] || ''}`}>
      {statusIcons[status]}
      {status}
    </span>
  );
};

function OnlineOrders() {
  const { data, updateData, requestPasscode } = useData();
  const { onlineOrders, sales, customers, expenses, banks, cashInHand } = data;
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [formData, setFormData] = useState({});

  const statusOptions = ['Shipped', 'Returned', 'Pending', 'In Transit', 'Delivered', 'Cancelled'];
  const {
    filters,
    handleFilterChange,
    handleDateRangeChange,
    handleStatusChange,
    resetFilters,
    setDatePreset,
    debouncedSearchTerm,
    timeZone,
  } = useFilters('onlineOrders', statusOptions);

  const enrichedOrders = useMemo(() => {
    return (onlineOrders || []).map(order => {
      const sale = sales.find(s => s.id === order.saleId);
      const customer = customers.find(c => c.id === sale?.customerId);
      return {
        ...order,
        invoiceNumber: sale?.saleNumber || 'N/A',
        customerName: customer?.name || 'Unknown Customer',
        customerContact: customer?.contact || '',
        saleData: sale,
        date: sale?.date,
      };
    }).sort((a,b) => new Date(b.date) - new Date(a.date));
  }, [onlineOrders, sales, customers]);

  const filteredOrders = useMemo(() => {
    return enrichedOrders.filter(order => {
      const orderDate = toDate(order.date, { timeZone });
      const fromDate = filters.dateRange.from ? toDate(filters.dateRange.from, { timeZone }) : null;
      const toDateFilter = filters.dateRange.to ? toDate(filters.dateRange.to, { timeZone }) : null;
      
      const dateMatch = (!fromDate || orderDate >= fromDate) && (!toDateFilter || orderDate <= toDateFilter);
      const statusMatch = filters.statuses.includes(order.status);
      
      const searchTermLower = debouncedSearchTerm.toLowerCase();
      const searchMatch = !debouncedSearchTerm || (
        order.invoiceNumber.toLowerCase().includes(searchTermLower) ||
        order.customerName.toLowerCase().includes(searchTermLower) ||
        order.customerContact.toLowerCase().includes(searchTermLower) ||
        (order.trackingNumber || '').toLowerCase().includes(searchTermLower) ||
        (order.courierName || '').toLowerCase().includes(searchTermLower)
      );

      return dateMatch && statusMatch && searchMatch;
    });
  }, [enrichedOrders, filters, debouncedSearchTerm, timeZone]);
  
  const paginatedOrders = useMemo(() => {
    const startIndex = (filters.page - 1) * filters.pageSize;
    return filteredOrders.slice(startIndex, startIndex + filters.pageSize);
  }, [filteredOrders, filters.page, filters.pageSize]);

  const totalPages = Math.ceil(filteredOrders.length / filters.pageSize);

  const handleEdit = (order) => {
    requestPasscode(() => {
      setEditingOrder(order);
      setFormData({
        orderNumber: order.orderNumber || '',
        courierName: order.courierName || '',
        trackingNumber: order.trackingNumber || '',
        trackingLink: order.trackingLink || '',
        deliveryCharges: order.deliveryCharges || '',
        rtoCharges: order.rtoCharges || '',
        status: order.status,
        paymentMethod: order.paymentMethod || 'COD',
        bankId: order.bankId || '',
      });
      setIsDialogOpen(true);
    });
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    const deliveryCharges = parseFloat(formData.deliveryCharges) || 0;
    const rtoCharges = parseFloat(formData.rtoCharges) || 0;
  
    const updatedOrder = { ...editingOrder, ...formData, deliveryCharges, rtoCharges };
  
    if (formData.status !== editingOrder.status) {
      updatedOrder.statusHistory = [
        ...(editingOrder.statusHistory || []),
        { status: formData.status, date: new Date().toISOString() },
      ];
    }
    
    let updatedExpenses = [...expenses];
    let updatedCashInHand = cashInHand;
    let updatedBanks = JSON.parse(JSON.stringify(banks));

    const notes = `For Order #${updatedOrder.orderNumber || updatedOrder.invoiceNumber}`;

    const handleExpense = (category, amount, expenseId) => {
      let existingExpense = expenseId ? updatedExpenses.find(ex => ex.id === expenseId) : null;
      if (amount > 0) {
        if (existingExpense) {
          existingExpense.amount = amount;
          existingExpense.notes = notes;
        } else {
          const newExpenseId = Date.now().toString() + Math.random();
          updatedExpenses.push({
            id: newExpenseId, category, amount, notes,
            date: new Date().toISOString(),
            linkedOrderId: updatedOrder.id,
            paymentMethod: 'cash'
          });
          if (category === 'Delivery Charges') updatedOrder.deliveryChargeExpenseId = newExpenseId;
          if (category === 'RTO Charges') updatedOrder.rtoChargeExpenseId = newExpenseId;
          toast({ title: 'Expense Added', description: `${category} of RS ${amount} recorded.` });
        }
      } else if (expenseId) {
        updatedExpenses = updatedExpenses.filter(ex => ex.id !== expenseId);
        if (category === 'Delivery Charges') delete updatedOrder.deliveryChargeExpenseId;
        if (category === 'RTO Charges') delete updatedOrder.rtoChargeExpenseId;
      }
    };
    
    handleExpense('Delivery Charges', deliveryCharges, editingOrder.deliveryChargeExpenseId);
    handleExpense('RTO Charges', formData.status === 'Returned' ? rtoCharges : 0, editingOrder.rtoChargeExpenseId);

    if (formData.status === 'Delivered' && editingOrder.status !== 'Delivered') {
      const saleAmount = editingOrder.saleData.totalCost;
      if (formData.paymentMethod === 'cash' || formData.paymentMethod === 'COD') {
        updatedCashInHand += saleAmount;
      } else if (formData.paymentMethod === 'bank' && formData.bankId) {
        const bankIndex = updatedBanks.findIndex(b => b.id === formData.bankId);
        if (bankIndex > -1) updatedBanks[bankIndex].balance += saleAmount;
      }
    }

    const updatedOrders = onlineOrders.map(o => o.id === editingOrder.id ? updatedOrder : o);
    
    updateData({ onlineOrders: updatedOrders, expenses: updatedExpenses, cashInHand: updatedCashInHand, banks: updatedBanks });
    toast({ title: 'Success', description: 'Online order updated successfully!' });
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Online Orders</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track and manage your online sales shipments.</p>
        </div>
      </div>
      
      <FilterToolbar
        filters={filters}
        onFilterChange={handleFilterChange}
        onDateRangeChange={handleDateRangeChange}
        onStatusChange={handleStatusChange}
        onReset={resetFilters}
        onSetDatePreset={setDatePreset}
        statusOptions={statusOptions}
        moduleName="online orders"
      />

      <Card>
        <CardHeader>
          <CardTitle>All Shipments</CardTitle>
        </CardHeader>
        <CardContent>
          {paginatedOrders.length === 0 ? (
            <div className="text-center py-12"><PackageSearch className="h-12 w-12 mx-auto text-gray-400 mb-4" /><p className="text-gray-500">No online orders found for the selected filters.</p><p className="text-sm text-gray-400 mt-1">Create a sale and toggle "Is Online Order?" to add one here.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b"><th className="text-left p-2">Invoice #</th><th className="text-left p-2">Customer</th><th className="text-left p-2">Courier</th><th className="text-left p-2">Tracking #</th><th className="text-left p-2">Status</th><th className="text-left p-2">Actions</th></tr>
                </thead>
                <tbody>
                  {paginatedOrders.map((order, index) => (
                    <motion.tr key={order.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                      <td className="p-2 font-medium">{order.invoiceNumber}</td>
                      <td className="p-2">{order.customerName}</td>
                      <td className="p-2">{order.courierName || '-'}</td>
                      <td className="p-2">{order.trackingLink ? <a href={order.trackingLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">{order.trackingNumber || 'View Tracking'} <ExternalLink className="h-3 w-3" /></a> : (order.trackingNumber || '-')}</td>
                      <td className="p-2"><StatusBadge status={order.status} /></td>
                      <td className="p-2"><Button size="sm" variant="outline" onClick={() => handleEdit(order)}><Edit className="h-4 w-4" /></Button></td>
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
      
      {editingOrder && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Online Order - {editingOrder.invoiceNumber}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="py-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label htmlFor="orderNumber">Order Number</Label><Input id="orderNumber" value={formData.orderNumber} onChange={e => setFormData({...formData, orderNumber: e.target.value})} /></div>
                <div><Label htmlFor="courierName">Courier Name</Label><Input id="courierName" value={formData.courierName} onChange={e => setFormData({...formData, courierName: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label htmlFor="trackingNumber">Tracking Number</Label><Input id="trackingNumber" value={formData.trackingNumber} onChange={e => setFormData({...formData, trackingNumber: e.target.value})} /></div>
                <div><Label htmlFor="trackingLink">Tracking Link</Label><Input id="trackingLink" value={formData.trackingLink} onChange={e => setFormData({...formData, trackingLink: e.target.value})} /></div>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={value => setFormData({...formData, status: value})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Payment Method</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={formData.paymentMethod} onValueChange={(v) => setFormData({...formData, paymentMethod: v, bankId: ''})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="COD">COD</SelectItem><SelectItem value="Bank">Bank Transfer</SelectItem><SelectItem value="Gateway">Payment Gateway</SelectItem></SelectContent>
                  </Select>
                  {formData.paymentMethod === 'bank' && (
                    <Select value={formData.bankId} onValueChange={(v) => setFormData({...formData, bankId: v})}>
                      <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                      <SelectContent>{(banks || []).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label htmlFor="deliveryCharges">Delivery Charges</Label><Input id="deliveryCharges" type="number" value={formData.deliveryCharges} onChange={e => setFormData({...formData, deliveryCharges: e.target.value})} placeholder="e.g. 80" /></div>
                <div><Label htmlFor="rtoCharges">RTO Charges</Label><Input id="rtoCharges" type="number" value={formData.rtoCharges} onChange={e => setFormData({...formData, rtoCharges: e.target.value})} placeholder="e.g. 120" disabled={formData.status !== 'Returned'}/></div>
              </div>
              <div className="bg-muted p-3 rounded-lg mt-4">
                <h4 className="font-semibold flex items-center gap-2 mb-2"><History className="h-4 w-4"/>Status History</h4>
                <ul className="text-sm space-y-1 max-h-24 overflow-y-auto">
                  {(editingOrder.statusHistory || []).map((s, i) => (
                    <li key={i} className="flex justify-between"><span>{s.status}</span><span className="text-muted-foreground">{formatInTimeZone(new Date(s.date), 'Asia/Dubai', 'PP p')}</span></li>
                  ))}
                </ul>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default OnlineOrders;