import { useCallback, useMemo } from 'react';
import { toNumber } from '@/lib/money';
import { endOfDay, toDate } from 'date-fns';

export const useStockLogic = (data) => {
  const { items = [], purchases = [], sales = [], sales_returns = [], purchase_returns = [] } = data;

  const stockDetails = useMemo(() => {
    let purchaseLots = [];
    (purchases || []).forEach(p => {
      (p.items || []).forEach(pi => {
        const qty = toNumber(pi.quantity);
        if (qty > 0) {
          purchaseLots.push({
            itemId: pi.itemId,
            date: new Date(p.date),
            qty,
            cost: toNumber(pi.unit_price_local) || (toNumber(pi.unit_price_foreign) * toNumber(p.fx_rate_to_business)),
          });
        }
      });
    });
    purchaseLots.sort((a, b) => a.date - b.date);

    let salesLines = [];
    (sales || []).forEach(s => {
      (s.items || []).forEach(si => {
        const qty = toNumber(si.quantity);
        if (qty > 0) {
          salesLines.push({
            itemId: si.itemId,
            date: new Date(s.date),
            qty,
          });
        }
      });
    });
    salesLines.sort((a, b) => a.date - b.date);
    
    const purchaseQueue = JSON.parse(JSON.stringify(purchaseLots));
    
    for (const sale of salesLines) {
      let qtyToFulfill = sale.qty;
      for (let i = 0; i < purchaseQueue.length; i++) {
        if (purchaseQueue[i].itemId !== sale.itemId || purchaseQueue[i].qty === 0) continue;
        
        const qtyFromLot = Math.min(qtyToFulfill, purchaseQueue[i].qty);
        purchaseQueue[i].qty -= qtyFromLot;
        qtyToFulfill -= qtyFromLot;
        
        if (qtyToFulfill === 0) break;
      }
    }

    const itemMap = new Map();
    items.forEach(item => {
        itemMap.set(item.id, {
            ...item,
            onHand: 0,
            stockValue: 0,
            avgPurchasePrice: 0,
            lastSalePrice: null,
            lastSaleDate: null,
        });
    });
    
    const closingStockValueByItem = {};
    const onHandByItem = {};
    
    purchaseQueue.filter(lot => lot.qty > 0).forEach(lot => {
        onHandByItem[lot.itemId] = (onHandByItem[lot.itemId] || 0) + lot.qty;
        closingStockValueByItem[lot.itemId] = (closingStockValueByItem[lot.itemId] || 0) + (lot.qty * lot.cost);
    });

    sales.forEach(s => {
        const saleDate = toDate(s.date);
        (s.items || []).forEach(si => {
          if (!itemMap.has(si.itemId)) return;
          const item = itemMap.get(si.itemId);
          if (!item.lastSaleDate || saleDate > item.lastSaleDate) {
            item.lastSaleDate = saleDate;
            item.lastSalePrice = toNumber(si.price);
          }
        });
    });

    const result = Array.from(itemMap.values()).map(item => {
        const onHand = onHandByItem[item.id] || 0;
        const stockValue = closingStockValueByItem[item.id] || 0;
        const avgPurchasePrice = onHand > 0 ? stockValue / onHand : 0;
        
        let status = 'In Stock';
        if (onHand <= 0) status = 'Out of Stock';
        else if (item.lowStockThreshold && onHand <= item.lowStockThreshold) status = 'Low Stock';

        return {
            ...item,
            onHand,
            avgPurchasePrice,
            stockValue,
            status,
            availableSerials: [] // Serial logic simplified for pure FIFO valuation
        };
    });

    return result;
  }, [items, purchases, sales, sales_returns, purchase_returns]);


  const getStockDetails = useCallback(({ asOfDate = null } = {}) => {
      if (asOfDate) {
        console.warn("getStockDetails 'asOfDate' parameter is not fully implemented in this version of useStockLogic.");
      }
      return stockDetails;
  }, [stockDetails]);


  return { getStockDetails };
};