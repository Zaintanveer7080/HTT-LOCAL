import { useCallback } from 'react';
import { toNumber } from '@/lib/money';

export const useInvoiceLogic = (data) => {
  const getInvoiceStatus = useCallback((invoice, allPayments) => {
    const payments = allPayments || data.payments || [];
    if (!invoice || !invoice.id) {
        const totalCost = toNumber(invoice?.totalCost_base || invoice?.totalCost || 0);
        return { status: 'Credit', paidAmount: 0, balance: totalCost };
    }
    
    const paymentsForInvoice = payments.filter(p => p.invoiceId === invoice.id);
    const paidAmount = paymentsForInvoice.reduce((sum, p) => sum + toNumber(p.amount) + toNumber(p.discount), 0);
    const totalCost = toNumber(invoice.totalCost_base ?? invoice.totalCost ?? 0);
    
    const paidRounded = Math.round(paidAmount * 100) / 100;
    const totalRounded = Math.round(totalCost * 100) / 100;
    
    const balance = totalCost - paidAmount;

    let status = 'Credit';
    if (paidRounded >= totalRounded && totalRounded > 0) {
      status = 'Paid';
    } else if (paidRounded > 0) {
      status = 'Partial';
    }

    return {
      status,
      paidAmount: paidAmount,
      balance: balance > 0.01 ? balance : 0,
    };
  }, [data.payments]);

  const recalculateAndSyncInvoices = useCallback((invoiceIds, allPayments) => {
    const currentSales = [...(data.sales || [])];
    const currentPurchases = [...(data.purchases || [])];
    let salesUpdated = false;
    let purchasesUpdated = false;

    invoiceIds.forEach(invoiceId => {
        const saleIndex = currentSales.findIndex(s => s.id === invoiceId);
        if (saleIndex > -1) {
            const originalSale = currentSales[saleIndex];
            const paymentsForThisInvoice = allPayments.filter(p => p.invoiceId === invoiceId);
            const totalPaid = paymentsForThisInvoice.reduce((sum, p) => sum + toNumber(p.amount) + toNumber(p.discount), 0);
            currentSales[saleIndex] = { ...originalSale, paidAmount: totalPaid };
            salesUpdated = true;
        }

        const purchaseIndex = currentPurchases.findIndex(p => p.id === invoiceId);
        if (purchaseIndex > -1) {
            const originalPurchase = currentPurchases[purchaseIndex];
            const paymentsForThisInvoice = allPayments.filter(p => p.invoiceId === invoiceId);
            const totalPaid = paymentsForThisInvoice.reduce((sum, p) => sum + toNumber(p.amount) + toNumber(p.discount), 0);
            currentPurchases[purchaseIndex] = { ...originalPurchase, paid_amount_local: totalPaid, paidAmount_base: totalPaid };
            purchasesUpdated = true;
        }
    });

    const updatePayload = {};
    if (salesUpdated) updatePayload.sales = currentSales;
    if (purchasesUpdated) updatePayload.purchases = currentPurchases;
    
    return updatePayload;
  }, [data.sales, data.purchases]);

  return { getInvoiceStatus, recalculateAndSyncInvoices };
};