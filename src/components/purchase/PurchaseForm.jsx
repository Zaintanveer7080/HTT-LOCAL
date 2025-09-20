import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/components/ui/use-toast';
import { formatInTimeZone } from 'date-fns-tz';
import { useBeforeunload } from 'react-beforeunload';
import PurchaseFormHeader from './PurchaseFormHeader';
import PurchaseItems from './PurchaseItems';
import PurchaseFormFooter from './PurchaseFormFooter';
import AttachmentsManager from '@/components/AttachmentsManager';
import { toNumber } from '@/lib/money';
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


const PurchaseForm = ({ purchase, onClose }) => {
  const { data, updateData, requestPasscode } = useData();
  const { suppliers, items, purchases, payments, cashInHand, banks } = data;
  const { toast } = useToast();
  const isEditing = !!purchase;
  const baseCurrency = data.settings.currency;

  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [navigationAction, setNavigationAction] = useState(null);
  const [draftId, setDraftId] = useState(null);

  const generatePurchaseNumber = useCallback(() => {
    const validPurchases = (purchases || [])
      .filter(p => p && p.purchaseNumber && typeof p.purchaseNumber === 'string' && p.purchaseNumber.startsWith('P-'))
      .map(p => parseInt(p.purchaseNumber.split('-')[1] || '0', 10))
      .sort((a, b) => a - b);
      
    if (validPurchases.length === 0) return 'P-0001';
    const lastNum = validPurchases[validPurchases.length - 1];
    return `P-${(lastNum + 1).toString().padStart(4, '0')}`;
  }, [purchases]);

  const getInitialState = useCallback(() => {
    if (purchase) {
      const fxRate = toNumber(purchase.fx_rate_to_business) || 1;
      return {
        ...purchase,
        date: formatInTimeZone(new Date(purchase.date), 'Asia/Dubai', 'yyyy-MM-dd\'T\'HH:mm'),
        items: (purchase.items || []).map(i => {
            const itemFxRate = toNumber(purchase.fx_rate_to_business) || 1;
            const unitPriceForeign = toNumber(i.unit_price_foreign);
            const unitPriceLocal = toNumber(i.unit_price_local);

            let derivedUnitPriceForeign = unitPriceForeign;
            let derivedUnitPriceLocal = unitPriceLocal;

            if (unitPriceForeign > 0 && unitPriceLocal === 0) {
                derivedUnitPriceLocal = unitPriceForeign * itemFxRate;
            } else if (unitPriceLocal > 0 && unitPriceForeign === 0) {
                derivedUnitPriceForeign = unitPriceLocal / itemFxRate;
            }

            return {
                ...i,
                unit_price_foreign: derivedUnitPriceForeign,
                unit_price_local: derivedUnitPriceLocal,
            };
        }),
        paid_amount_local: purchase.paid_amount_local || 0.00,
        paymentMethod: purchase.payment?.method || 'cash',
        bankId: purchase.payment?.bankId || '',
        currency: purchase.currency || baseCurrency,
        fx_rate_to_business: fxRate,
      };
    }
    return {
      id: null,
      purchaseNumber: generatePurchaseNumber(),
      date: formatInTimeZone(new Date(), 'Asia/Dubai', 'yyyy-MM-dd\'T\'HH:mm'),
      supplierId: null,
      items: [{ itemId: null, quantity: 1, unit_price_foreign: 0, unit_price_local: 0, serials: [] }],
      notes: '',
      paymentMethod: 'cash',
      bankId: '',
      currency: baseCurrency,
      fx_rate_to_business: 1,
      discount_foreign: 0,
      tax_foreign: 0,
      shipping_foreign: 0,
      paid_amount_local: 0,
    };
  }, [purchase, generatePurchaseNumber, baseCurrency]);
  
  const [currentPurchase, setCurrentPurchase] = useState(getInitialState);
  const [isDirty, setIsDirty] = useState(false);
  const initialStateRef = useRef(getInitialState());

  useEffect(() => {
    if (!isEditing && !draftId) {
      setDraftId(crypto.randomUUID());
    } else if (isEditing) {
      setDraftId(purchase.id);
    }
  }, [isEditing, draftId, purchase]);

  useEffect(() => {
    setIsDirty(JSON.stringify(currentPurchase) !== JSON.stringify(initialStateRef.current));
  }, [currentPurchase]);

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
  
  const handleFieldChange = (field, value) => {
    let newPurchaseState = { ...currentPurchase, [field]: value };
    if (field === 'fx_rate_to_business' || field === 'currency') {
        const newFxRate = field === 'currency' && value === baseCurrency ? 1 : (field === 'fx_rate_to_business' ? toNumber(value) : toNumber(newPurchaseState.fx_rate_to_business));
        newPurchaseState.items = newPurchaseState.items.map(item => ({
            ...item,
            unit_price_local: (toNumber(item.unit_price_foreign) || 0) * (newFxRate || 1)
        }));
    }
    setCurrentPurchase(newPurchaseState);
  };

  const { 
    subtotal_foreign, subtotal_local, 
    total_foreign, total_local, 
    balance_foreign, balance_local, 
    totalQuantity,
    paid_amount_foreign
  } = useMemo(() => {
    const items = currentPurchase.items || [];
    const fxRate = toNumber(currentPurchase.fx_rate_to_business) || 1;
    
    let subtotal_foreign = 0;
    let totalQuantity = 0;

    items.forEach(item => {
        const quantity = toNumber(item.quantity) || 0;
        const unitPriceForeign = toNumber(item.unit_price_foreign) || 0;
        subtotal_foreign += quantity * unitPriceForeign;
        totalQuantity += quantity;
    });
    
    const subtotal_local = subtotal_foreign * fxRate;
    
    const discount_foreign = toNumber(currentPurchase.discount_foreign) || 0;
    const tax_foreign = toNumber(currentPurchase.tax_foreign) || 0;
    const shipping_foreign = toNumber(currentPurchase.shipping_foreign) || 0;
    
    const total_foreign = subtotal_foreign - discount_foreign + tax_foreign + shipping_foreign;
    const total_local = total_foreign * fxRate;

    const paid_amount_local = toNumber(currentPurchase.paid_amount_local) || 0;
    const paid_amount_foreign = fxRate > 0 ? paid_amount_local / fxRate : 0;

    const balance_local = total_local - paid_amount_local;
    const balance_foreign = total_foreign - paid_amount_foreign;

    return { 
        subtotal_foreign, subtotal_local, 
        total_foreign, total_local, 
        balance_foreign, balance_local, 
        totalQuantity,
        paid_amount_foreign
    };
  }, [currentPurchase]);

  const handleItemsChange = (newItems) => {
    setCurrentPurchase(prev => ({ ...prev, items: newItems }));
  };

  const validateSerials = () => {
    const allEnteredSerials = currentPurchase.items.flatMap(i => i.serials || []).filter(s => s);
    if (allEnteredSerials.length === 0) return true;

    const uniqueSerials = new Set(allEnteredSerials);
    if (allEnteredSerials.length !== uniqueSerials.size) {
        toast({ title: 'Validation Error', description: 'Duplicate serial numbers found within this purchase.', variant: 'destructive' });
        return false;
    }

    const allExistingSerials = (purchases || [])
      .filter(p => p.id !== currentPurchase.id)
      .flatMap(p => p.items || [])
      .flatMap(i => i.serials || [])
      .filter(s => s);

    const duplicateInDb = allEnteredSerials.find(s => allExistingSerials.includes(s));
    if (duplicateInDb) {
        toast({ title: 'Validation Error', description: `Serial number "${duplicateInDb}" already exists in another purchase.`, variant: 'destructive' });
        return false;
    }

    return true;
  };

  const handleSave = () => {
    if ((currentPurchase.items || []).length === 0) {
      toast({ title: 'Validation Error', description: 'Add at least one item to the purchase.', variant: 'destructive' });
      return;
    }
    if (!currentPurchase.supplierId) {
      toast({ title: 'Validation Error', description: 'Please select a supplier.', variant: 'destructive' });
      return;
    }
    if (currentPurchase.items.some(item => !item.itemId || (toNumber(item.quantity) || 0) <= 0)) {
      toast({ title: 'Validation Error', description: 'Please ensure all items have a product and quantity.', variant: 'destructive' });
      return;
    }

    if (!validateSerials()) return;

    const fxRate = toNumber(currentPurchase.fx_rate_to_business) || 1;
    
    const purchaseData = {
      ...currentPurchase,
      id: purchase?.id || draftId,
      date: new Date(currentPurchase.date).toISOString(),
      
      subtotal_foreign, subtotal_local,
      discount_foreign: toNumber(currentPurchase.discount_foreign),
      discount_local: toNumber(currentPurchase.discount_foreign) * fxRate,
      tax_foreign: toNumber(currentPurchase.tax_foreign),
      tax_local: toNumber(currentPurchase.tax_foreign) * fxRate,
      shipping_foreign: toNumber(currentPurchase.shipping_foreign),
      shipping_local: toNumber(currentPurchase.shipping_foreign) * fxRate,
      total_foreign, total_local,
      paid_amount_foreign, paid_amount_local: toNumber(currentPurchase.paid_amount_local),
      balance_foreign, balance_local,

      // Legacy fields for compatibility
      totalCost: total_foreign,
      totalCost_base: total_local,
      paidAmount_base: toNumber(currentPurchase.paid_amount_local),

      items: currentPurchase.items.map(i => {
        const qty = toNumber(i.quantity) || 0;
        const price_foreign = toNumber(i.unit_price_foreign) || 0;
        const price_local = price_foreign * fxRate;
        return {
            ...i, 
            quantity: qty, 
            unit_price_foreign: price_foreign,
            unit_price_local: price_local,
            line_total_foreign: qty * price_foreign,
            line_total_local: qty * price_local,
            // Legacy
            unitPrice: price_foreign,
            unitPrice_base: price_local,
        }
      }),
      payment: {
        method: currentPurchase.paymentMethod,
        bankId: currentPurchase.paymentMethod === 'bank' ? currentPurchase.bankId : undefined,
      },
    };
    
    const newPayments = [];
    const oldPayment = purchase ? (payments || []).find(p => p.invoiceId === purchase.id) : null;

    if (purchaseData.paid_amount_local > 0) {
        newPayments.push({
            id: oldPayment?.id || `${Date.now()}_${purchaseData.id}`,
            partyId: purchaseData.supplierId, partyType: 'supplier', type: 'out', invoiceId: purchaseData.id,
            amount: purchaseData.paid_amount_local,
            date: purchaseData.date, method: purchaseData.paymentMethod,
            bankId: purchaseData.paymentMethod === 'bank' ? purchaseData.bankId : undefined, notes: `Payment for Purchase #${purchaseData.purchaseNumber}`
        });
    }

    let updatedCashInHand = cashInHand;
    let updatedBanks = JSON.parse(JSON.stringify(banks || []));
    if (oldPayment) {
        if (oldPayment.method === 'cash') updatedCashInHand += oldPayment.amount;
        else if (oldPayment.bankId) {
            const oldBankIndex = updatedBanks.findIndex(b => b.id === oldPayment.bankId);
            if(oldBankIndex > -1) updatedBanks[oldBankIndex].balance += oldPayment.amount;
        }
    }

    if (purchaseData.paid_amount_local > 0) {
        if (purchaseData.paymentMethod === 'cash') updatedCashInHand -= purchaseData.paid_amount_local;
        else if (purchaseData.bankId) {
            const newBankIndex = updatedBanks.findIndex(b => b.id === purchaseData.bankId);
            if(newBankIndex > -1) updatedBanks[newBankIndex].balance -= purchaseData.paid_amount_local;
        }
    }
    
    const otherPayments = (payments || []).filter(p => p.invoiceId !== purchaseData.id);
    const updatedPayments = [...otherPayments, ...newPayments];

    const newPurchases = purchase ? (purchases || []).map(p => p.id === purchase.id ? purchaseData : p) : [...(purchases || []), purchaseData];
    
    const finalUpdate = { purchases: newPurchases, payments: updatedPayments, cashInHand: updatedCashInHand, banks: updatedBanks };
    
    updateData(finalUpdate);

    toast({ title: 'Success', description: `Purchase ${purchase ? 'updated' : 'saved'}.` });
    setIsDirty(false);
    onClose();
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    requestPasscode(handleSave, { isEdit: isEditing });
  };
  
  return (
    <div className="flex flex-col h-full">
       <UnsavedChangesDialog open={showUnsavedDialog} onConfirm={confirmNavigation} onCancel={cancelNavigation} />
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <PurchaseFormHeader
            purchase={currentPurchase}
            onFieldChange={handleFieldChange}
            suppliers={suppliers}
            isEditing={isEditing}
            settings={data.settings}
          />
          <PurchaseItems
            items={currentPurchase.items}
            onItemsChange={handleItemsChange}
            allItems={items}
            currencyCode={currentPurchase.currency}
            fxRate={currentPurchase.fx_rate_to_business}
            baseCurrency={baseCurrency}
          />
           <AttachmentsManager 
            transactionType="purchase" 
            transactionId={isEditing ? currentPurchase.id : null}
            draftId={draftId}
            isEditing={isEditing}
          />
        </div>
        <PurchaseFormFooter
          purchase={currentPurchase}
          onFieldChange={handleFieldChange}
          subtotal_foreign={subtotal_foreign}
          subtotal_local={subtotal_local}
          total_foreign={total_foreign}
          total_local={total_local}
          balance_foreign={balance_foreign}
          balance_local={balance_local}
          paid_amount_foreign={paid_amount_foreign}
          paid_amount_local={toNumber(currentPurchase.paid_amount_local)}
          totalQuantity={totalQuantity}
          onClose={handleCloseAttempt}
          isEditing={isEditing}
          banks={banks}
          settings={data.settings}
        />
      </form>
    </div>
  );
};

export default PurchaseForm;