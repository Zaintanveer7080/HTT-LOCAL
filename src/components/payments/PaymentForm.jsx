import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Landmark, Hand } from 'lucide-react';
import { DialogFooter } from '@/components/ui/dialog';
import { formatMoney } from '@/lib/money';


const PaymentForm = ({ paymentType, onClose, paymentToEdit }) => {
  const { data, updateData, requestPasscode, getInvoiceStatus, recalculateAndSyncInvoices } = useData();
  const { customers, suppliers, sales, purchases, payments, banks, cashInHand, cashTransactions } = data;
  const { toast } = useToast();
  const currencySymbol = data.settings?.currencySymbol || 'AED';

  const [partyType, setPartyType] = useState(paymentType === 'in' ? 'customer' : 'supplier');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  
  const [amount, setAmount] = useState('');
  const [discount, setDiscount] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [bankId, setBankId] = useState('');

  const [allocations, setAllocations] = useState({});
  const [selectedInvoices, setSelectedInvoices] = useState({});
  const [isAutoLink, setIsAutoLink] = useState(true);

  const pendingBills = useMemo(() => {
    if (!selectedPartyId) return [];
    const bills = partyType === 'customer'
      ? (sales || [])
      : (purchases || []);
    
    const partyBills = bills.filter(bill => (bill.customerId || bill.supplierId) === selectedPartyId);

    return partyBills.map(bill => {
      const { balance } = getInvoiceStatus(bill, payments.filter(p => !paymentToEdit || p.id !== paymentToEdit.id));
      return { ...bill, due: balance, totalBillAmount: bill.totalCost, type: partyType === 'customer' ? 'Sale' : 'Purchase' };
    }).filter(b => b.due > 0.01 || (paymentToEdit && paymentToEdit.invoiceId === b.id)).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [selectedPartyId, partyType, sales, purchases, payments, paymentToEdit, getInvoiceStatus]);

  useEffect(() => {
    if (paymentToEdit) {
      setPartyType(paymentToEdit.type === 'in' ? 'customer' : 'supplier');
      setSelectedPartyId(paymentToEdit.partyId);
      setAmount(paymentToEdit.amount.toString());
      setDiscount((paymentToEdit.discount || 0).toString());
      setNotes(paymentToEdit.notes || '');
      setDate(paymentToEdit.date);
      setPaymentMethod(paymentToEdit.method);
      setBankId(paymentToEdit.bankId || '');
      
      setIsAutoLink(false);
      const initialAllocations = { [paymentToEdit.invoiceId]: paymentToEdit.amount.toFixed(2) };
      setAllocations(initialAllocations);
      const initialSelection = { [paymentToEdit.invoiceId]: true };
      setSelectedInvoices(initialSelection);
    } else {
      setSelectedPartyId('');
      setAmount('');
      setDiscount('');
      setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('cash');
      setBankId('');
      setAllocations({});
      setSelectedInvoices({});
      setIsAutoLink(true);
    }
  }, [paymentToEdit]);

  useEffect(() => {
    if (selectedPartyId && !paymentToEdit) {
      const initialSelection = pendingBills.reduce((acc, bill) => {
        acc[bill.id] = true;
        return acc;
      }, {});
      setSelectedInvoices(initialSelection);
    }
  }, [selectedPartyId, pendingBills, paymentToEdit]);

  useEffect(() => {
    if (!isAutoLink || !selectedPartyId || paymentToEdit) return;

    const paymentAmount = parseFloat(amount) || 0;
    let amountToAllocate = paymentAmount;
    const newAllocations = {};
    
    for (const bill of pendingBills) {
      if (selectedInvoices[bill.id] && amountToAllocate > 0) {
        const allocated = Math.min(amountToAllocate, bill.due);
        newAllocations[bill.id] = allocated.toFixed(2);
        amountToAllocate -= allocated;
      } else {
        newAllocations[bill.id] = '0.00';
      }
    }
    setAllocations(newAllocations);
  }, [amount, selectedInvoices, isAutoLink, pendingBills, paymentToEdit]);

  const totalAllocated = useMemo(() => {
    return Object.values(allocations).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  }, [allocations]);

  const handleAllocationChange = (invoiceId, value) => {
    if (isAutoLink) return;
    const newAllocations = { ...allocations, [invoiceId]: value };
    setAllocations(newAllocations);
  };

  const handleSave = () => {
    const paymentAmount = parseFloat(amount) || 0;
    if (!selectedPartyId || paymentAmount <= 0) {
      toast({ title: 'Error', description: 'Please select a party and enter a valid amount.', variant: 'destructive' });
      return;
    }
    if (Math.abs(paymentAmount - totalAllocated) > 0.01) {
      toast({ title: 'Error', description: 'Total allocated amount must match the payment amount.', variant: 'destructive' });
      return;
    }

    const discountAmount = parseFloat(discount) || 0;

    const newPayments = [];
    const affectedInvoiceIds = new Set();

    Object.entries(allocations).forEach(([invoiceId, allocatedValue]) => {
      const allocatedAmount = parseFloat(allocatedValue);
      if (allocatedAmount > 0) {
        newPayments.push({
          id: paymentToEdit?.id ? `${paymentToEdit.id}_${invoiceId}` : `${Date.now()}_${invoiceId}`,
          type: paymentType,
          partyId: selectedPartyId,
          invoiceId,
          amount: allocatedAmount,
          discount: 0,
          date,
          method: paymentMethod,
          bankId: paymentMethod === 'bank' ? bankId : undefined,
          notes,
        });
        affectedInvoiceIds.add(invoiceId);
      }
    });
    
    if(discountAmount > 0 && newPayments.length > 0) {
      newPayments[0].discount = discountAmount;
    }

    if (newPayments.length === 0) {
      toast({ title: 'Error', description: 'No allocations made.', variant: 'destructive' });
      return;
    }
    
    let updatedCashInHand = cashInHand;
    let updatedBanks = JSON.parse(JSON.stringify(banks));
    let updatedCashTransactions = [...(cashTransactions || [])];
    
    if (paymentToEdit) {
      affectedInvoiceIds.add(paymentToEdit.invoiceId);
      if (paymentToEdit.method === 'cash') {
        updatedCashInHand += paymentToEdit.type === 'in' ? -paymentToEdit.amount : paymentToEdit.amount;
      } else {
        const bankIndex = updatedBanks.findIndex(b => b.id === paymentToEdit.bankId);
        if (bankIndex !== -1) updatedBanks[bankIndex].balance += paymentToEdit.type === 'in' ? -paymentToEdit.amount : paymentToEdit.amount;
      }
    }

    let totalCashChange = 0;
    newPayments.forEach(p => {
      if (p.method === 'cash') {
        const cashAmount = p.type === 'in' ? p.amount : -p.amount;
        totalCashChange += cashAmount;
      } else {
        const bankIndex = updatedBanks.findIndex(b => b.id === p.bankId);
        if (bankIndex !== -1) updatedBanks[bankIndex].balance += p.type === 'in' ? p.amount : -p.amount;
      }
    });
    updatedCashInHand += totalCashChange;

    if(!paymentToEdit && totalCashChange !== 0){
      const partyName = (partyType === 'customer' ? customers : suppliers).find(p => p.id === selectedPartyId)?.name;
      const transactionDescription = `Payment ${paymentType === 'in' ? 'from' : 'to'} ${partyName}`;
      updatedCashTransactions.push({ id: Date.now().toString(), date: new Date().toISOString(), type: totalCashChange > 0 ? 'add' : 'remove', amount: Math.abs(totalCashChange), description: transactionDescription });
    }

    const finalPaymentsList = paymentToEdit
      ? [...payments.filter(p => p.id !== paymentToEdit.id), ...newPayments]
      : [...payments, ...newPayments];

    const invoiceUpdates = recalculateAndSyncInvoices(Array.from(affectedInvoiceIds), finalPaymentsList);

    updateData({
      ...invoiceUpdates,
      payments: finalPaymentsList,
      cashInHand: updatedCashInHand,
      banks: updatedBanks,
      cashTransactions: updatedCashTransactions,
    });

    toast({ title: 'Success', description: `Payment ${paymentToEdit ? 'updated' : 'recorded'} successfully!` });
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if(paymentToEdit) {
      requestPasscode(handleSave);
    } else {
      handleSave();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="py-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 space-y-4">
          <Tabs value={partyType} onValueChange={setPartyType} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="customer" disabled={paymentType === 'out' || !!paymentToEdit}>Customer</TabsTrigger>
              <TabsTrigger value="supplier" disabled={paymentType === 'in' || !!paymentToEdit}>Supplier</TabsTrigger>
            </TabsList>
          </Tabs>
          <div>
            <Label>{partyType === 'customer' ? 'Customer' : 'Supplier'}</Label>
            <Select value={selectedPartyId} onValueChange={setSelectedPartyId} disabled={!!paymentToEdit}>
              <SelectTrigger><SelectValue placeholder={`Select a ${partyType}`} /></SelectTrigger>
              <SelectContent>
                {(partyType === 'customer' ? (customers || []) : (suppliers || [])).map(party => (
                  <SelectItem key={party.id} value={party.id}>{party.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="amount">Payment Amount</Label>
            <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g., 5000" />
          </div>
          <div>
            <Label htmlFor="discount">Discount (Flat)</Label>
            <Input id="discount" type="number" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="e.g., 50" />
          </div>
          <div>
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash"><div className="flex items-center"><Hand className="h-4 w-4 mr-2" />Cash</div></SelectItem>
                <SelectItem value="bank"><div className="flex items-center"><Landmark className="h-4 w-4 mr-2" />Bank</div></SelectItem>
              </SelectContent>
            </Select>
          </div>
          {paymentMethod === 'bank' && (
            <div>
              <Label>Bank Account</Label>
              <Select value={bankId} onValueChange={setBankId}>
                <SelectTrigger><SelectValue placeholder="Select a bank" /></SelectTrigger>
                <SelectContent>
                  {(banks || []).map(bank => <SelectItem key={bank.id} value={bank.id}>{bank.name} (Balance: {formatMoney(bank.balance, currencySymbol)})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Invoice Allocation</CardTitle>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="auto-link-switch">Auto-Link</Label>
                  <Switch id="auto-link-switch" checked={isAutoLink} onCheckedChange={setIsAutoLink} disabled={!!paymentToEdit} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="max-h-64 overflow-y-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="p-2 text-left w-10"><Checkbox checked={Object.values(selectedInvoices).every(Boolean)} onCheckedChange={(checked) => { const newSelection = {}; pendingBills.forEach(b => newSelection[b.id] = checked); setSelectedInvoices(newSelection); }} disabled={!!paymentToEdit} /></th>
                      <th className="p-2 text-left">Invoice</th>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-right">Due Amount</th>
                      <th className="p-2 text-right">Allocation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingBills.length > 0 ? pendingBills.map(bill => (
                      <tr key={bill.id} className="border-b">
                        <td className="p-2"><Checkbox checked={selectedInvoices[bill.id] || false} onCheckedChange={(checked) => setSelectedInvoices({...selectedInvoices, [bill.id]: checked})} disabled={!!paymentToEdit} /></td>
                        <td className="p-2">#{bill.saleNumber || bill.purchaseNumber}</td>
                        <td className="p-2">{new Date(bill.date).toLocaleDateString()}</td>
                        <td className="p-2 text-right">{formatMoney(bill.due, currencySymbol)}</td>
                        <td className="p-2 text-right">
                          <Input type="number" value={allocations[bill.id] || '0.00'} onChange={e => handleAllocationChange(bill.id, e.target.value)} readOnly={isAutoLink} className="h-8 text-right" />
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan="5" className="p-4 text-center text-gray-500">No pending bills.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                <div className="flex justify-between font-medium">
                  <span>Payment Amount:</span>
                  <span>{formatMoney(parseFloat(amount) || 0, currencySymbol)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Total Allocated:</span>
                  <span className={Math.abs((parseFloat(amount) || 0) - totalAllocated) > 0.01 ? 'text-red-500' : 'text-green-500'}>{formatMoney(totalAllocated, currencySymbol)}</span>
                </div>
                <div className="flex justify-between font-medium text-blue-600">
                  <span>Unallocated:</span>
                  <span>{formatMoney(((parseFloat(amount) || 0) - totalAllocated), currencySymbol)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit">{paymentToEdit ? 'Update' : 'Record'} Payment</Button>
      </DialogFooter>
    </form>
  );
};

export default PaymentForm;