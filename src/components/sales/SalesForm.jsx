import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { formatInTimeZone } from 'date-fns-tz';
import { useBeforeunload } from 'react-beforeunload';
import SalesFormHeader from './SalesFormHeader';
import SalesFormItems from './SalesFormItems';
import SalesFormFooter from './SalesFormFooter';
import AttachmentsManager from '@/components/AttachmentsManager';
import { toNumber } from '@/lib/money';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const UnsavedChangesDialog = ({ open, onConfirm, onCancel }) => (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>You have unsaved changes</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to discard your changes and leave?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Stay</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Leave</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
);

const SalesForm = ({ sale, onClose }) => {
  const { data, updateData, getProfitOfSale, requestPasscode } = useData();
  const { customers, items, banks, cashInHand, sales, purchases, payments } = data;
  const { toast } = useToast();
  const isEditing = !!sale;

  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [navigationAction, setNavigationAction] = useState(null);
  const [draftId, setDraftId] = useState(null);

  const generateSaleNumber = useCallback(() => {
    const validSales = (sales || [])
      .filter(s => s && s.saleNumber && typeof s.saleNumber === 'string' && s.saleNumber.startsWith('S-'))
      .map(s => parseInt(s.saleNumber.split('-')[1] || '0', 10))
      .sort((a, b) => a - b);
      
    if (validSales.length === 0) return 'S-0001';
    const lastNum = validSales[validSales.length - 1];
    return `S-${(lastNum + 1).toString().padStart(4, '0')}`;
  }, [sales]);

  const getInitialState = useCallback(() => {
    if (sale) {
      return {
        ...sale,
        date: formatInTimeZone(new Date(sale.date), 'Asia/Dubai', 'yyyy-MM-dd\'T\'HH:mm'),
      };
    }
    return {
      id: null,
      saleNumber: generateSaleNumber(),
      customerId: '',
      date: formatInTimeZone(new Date(), 'Asia/Dubai', 'yyyy-MM-dd\'T\'HH:mm'),
      items: [{ itemId: '', quantity: 1, price: 0, serials: [] }],
      notes: '',
      discount: '',
      discountType: 'flat',
      paymentMethod: 'cash',
      paidAmount: '0.00',
      bankId: '',
      paymentRef: '',
    };
  }, [sale, generateSaleNumber]);

  const [formState, setFormState] = useState(getInitialState());

  const initialStateRef = useRef(getInitialState());

  useEffect(() => {
    if (!isEditing && !draftId) {
      setDraftId(crypto.randomUUID());
    } else if (isEditing) {
      setDraftId(sale.id);
    }
  }, [isEditing, draftId, sale]);

  useEffect(() => {
    setIsDirty(JSON.stringify(formState) !== JSON.stringify(initialStateRef.current));
  }, [formState]);
  
  useBeforeunload(isDirty ? (event) => event.preventDefault() : undefined);

  const handleCloseAttempt = () => {
    if (isDirty) {
      setShowUnsavedDialog(true);
      setNavigationAction(() => onClose);
    } else {
      onClose();
    }
  };

  const confirmNavigation = () => {
    if (navigationAction) {
      setIsDirty(false); 
      setTimeout(navigationAction, 0); 
    }
    setShowUnsavedDialog(false);
  };

  const cancelNavigation = () => {
    setShowUnsavedDialog(false);
    setNavigationAction(null);
  };

  const handleFormChange = (field, value) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const { subTotal, totalDiscount, totalCost, totalQuantity, balance, unit, profit, itemProfits } = useMemo(() => {
    const currentSaleItems = Array.isArray(formState.items) ? formState.items : [];
    const subTotal = currentSaleItems.reduce((sum, item) => sum + ((toNumber(item.quantity) || 0) * (toNumber(item.price) || 0)), 0);
    const enteredDiscount = toNumber(formState.discount) || 0;
    let totalDiscount = formState.discountType === 'flat' ? enteredDiscount : subTotal * (enteredDiscount / 100);
    if(isNaN(totalDiscount)) totalDiscount = 0;

    const totalCost = subTotal - totalDiscount;
    const totalQuantity = currentSaleItems.reduce((sum, item) => sum + (toNumber(item.quantity) || 0), 0);
    const balance = totalCost - (toNumber(formState.paidAmount) || 0);
    
    const firstItem = currentSaleItems.length > 0 ? (items || []).find(i => i.id === currentSaleItems[0].itemId) : null;
    const unit = firstItem ? firstItem.unit : '';

    const draftSale = {
      id: sale?.id || 'draft-sale',
      date: formState.date,
      items: formState.items,
      subTotal,
      discount: { value: toNumber(formState.discount) || 0, type: formState.discountType },
      totalCost,
    };
    const { totalProfit, itemProfits } = getProfitOfSale(draftSale);

    return { subTotal, totalDiscount, totalCost, totalQuantity, balance, unit, profit: totalProfit, itemProfits };
  }, [formState.items, formState.discount, formState.discountType, formState.paidAmount, items, getProfitOfSale, formState.date, sale]);

  const handleSave = () => {
    if ((formState.items || []).length === 0) {
      toast({ title: 'Validation Error', description: 'Add at least one item to the sale.', variant: 'destructive' });
      return;
    }
    if (!formState.customerId || formState.items.some(i => !i.itemId)) {
      toast({ title: 'Error', description: 'Customer and all items must be selected.', variant: 'destructive' });
      return;
    }
    if (formState.items.some(item => !item.price || toNumber(item.price) <= 0)) {
        toast({ title: 'Error', description: 'Please ensure all items have a unit price greater than zero.', variant: 'destructive' });
        return;
    }
    if ((sales || []).some(s => s.saleNumber === formState.saleNumber && s.id !== sale?.id)) {
      toast({ title: 'Error', description: 'Sale number must be unique.', variant: 'destructive' });
      return;
    }
    const enteredPaidAmount = toNumber(formState.paidAmount) || 0;
    if (enteredPaidAmount > totalCost) {
      toast({ title: 'Error', description: 'Paid amount cannot be greater than the total bill.', variant: 'destructive' });
      return;
    }
    
    const saleId = sale ? sale.id : draftId;
    const finalItems = formState.items.map(i => {
        const profitInfo = itemProfits[i.itemId] || { cogs_unit_pkr: 0, cogs_total_pkr: 0 };
        return {
            ...i,
            quantity: toNumber(i.quantity) || 0,
            price: toNumber(i.price) || 0,
            cogs_unit_pkr: profitInfo.cogs_unit_pkr,
            cogs_total_pkr: profitInfo.cogs_total_pkr
        };
    });
    
    const saleData = {
      id: saleId, saleNumber: formState.saleNumber, customerId: formState.customerId, date: new Date(formState.date).toISOString(), notes: formState.notes,
      items: finalItems,
      subTotal, totalQuantity, totalCost,
      discount: { value: toNumber(formState.discount) || 0, type: formState.discountType },
      paidAmount: enteredPaidAmount,
      profit,
      payment: { method: formState.paymentMethod, bankId: formState.bankId, ref: formState.paymentRef }
    };
    
    const newPayments = [];
    const oldPayment = sale ? (payments || []).find(p => p.invoiceId === sale.id) : null;

    if (enteredPaidAmount > 0) {
      newPayments.push({
        id: oldPayment?.id || `${Date.now()}_${saleId}`,
        partyId: formState.customerId, partyType: 'customer', type: 'in', invoiceId: saleId,
        amount: enteredPaidAmount, date: saleData.date, method: formState.paymentMethod,
        bankId: formState.paymentMethod === 'bank' ? formState.bankId : undefined, notes: `Payment for Sale #${formState.saleNumber}`
      });
    }

    let updatedCashInHand = cashInHand;
    let updatedBanks = JSON.parse(JSON.stringify(banks || []));
    if (oldPayment) {
      if (oldPayment.method === 'cash') updatedCashInHand -= oldPayment.amount;
      else if (oldPayment.bankId) {
        const oldBankIndex = updatedBanks.findIndex(b => b.id === oldPayment.bankId);
        if (oldBankIndex > -1) updatedBanks[oldBankIndex].balance -= oldPayment.amount;
      }
    }

    if (enteredPaidAmount > 0) {
      if (formState.paymentMethod === 'cash') updatedCashInHand += enteredPaidAmount;
      else if (formState.bankId) {
        const newBankIndex = updatedBanks.findIndex(b => b.id === formState.bankId);
        if (newBankIndex > -1) updatedBanks[newBankIndex].balance += enteredPaidAmount;
      }
    }
    
    const otherPayments = (payments || []).filter(p => p.invoiceId !== saleId);
    const updatedPayments = [...otherPayments, ...newPayments];
    const newSales = sale ? (sales || []).map(s => s.id === sale.id ? saleData : s) : [...(sales || []), saleData];
    
    const finalUpdate = { sales: newSales, banks: updatedBanks, cashInHand: updatedCashInHand, payments: updatedPayments };

    updateData(finalUpdate);

    toast({ title: 'Success', description: `Sale ${sale ? 'updated' : 'saved'}.` });
    setIsDirty(false);
    onClose();
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEditing) {
      requestPasscode(handleSave, { isEdit: true });
    } else {
      handleSave();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <UnsavedChangesDialog open={showUnsavedDialog} onConfirm={confirmNavigation} onCancel={cancelNavigation} />
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <SalesFormHeader
            saleNumber={formState.saleNumber}
            onSaleNumberChange={(val) => handleFormChange('saleNumber', val)}
            customerId={formState.customerId}
            onCustomerChange={(val) => handleFormChange('customerId', val)}
            customers={customers}
            date={formState.date}
            onDateChange={(val) => handleFormChange('date', val)}
          />
          <SalesFormItems
            saleItems={formState.items}
            onItemsChange={(val) => handleFormChange('items', val)}
            allItems={items}
            sale={formState}
            itemProfits={itemProfits}
            purchases={purchases}
            sales={sales}
          />
          <AttachmentsManager 
            transactionType="sale" 
            transactionId={isEditing ? formState.id : null}
            draftId={draftId}
            isEditing={isEditing}
          />
        </div>
        
        <SalesFormFooter
          paymentMethod={formState.paymentMethod} onPaymentMethodChange={(val) => handleFormChange('paymentMethod', val)}
          paidAmount={formState.paidAmount} onPaidAmountChange={(val) => handleFormChange('paidAmount', val)}
          notes={formState.notes} onNotesChange={(val) => handleFormChange('notes', val)}
          bankId={formState.bankId} onBankIdChange={(val) => handleFormChange('bankId', val)}
          banks={banks}
          paymentRef={formState.paymentRef} onPaymentRefChange={(val) => handleFormChange('paymentRef', val)}
          totalQuantity={totalQuantity}
          unit={unit}
          subTotal={subTotal}
          discount={formState.discount} onDiscountChange={(val) => handleFormChange('discount', val)}
          discountType={formState.discountType} onDiscountTypeChange={(val) => handleFormChange('discountType', val)}
          totalDiscount={totalDiscount}
          totalCost={totalCost}
          balance={balance}
          profit={profit}
          onClose={handleCloseAttempt}
          isEdit={isEditing}
        />
      </form>
    </div>
  );
};

export default SalesForm;