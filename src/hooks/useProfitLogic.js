import { useCallback, useMemo } from 'react';
import { toNumber } from '@/lib/money';

export const useProfitLogic = (data) => {
  const { items = [], purchases = [], sales = [] } = data;

  const fifoData = useMemo(() => {
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
            id: s.id,
            itemId: si.itemId,
            date: new Date(s.date),
            qty,
            price: toNumber(si.price),
            serials: si.serials || [],
          });
        }
      });
    });
    salesLines.sort((a, b) => a.date - b.date);
    
    const purchaseQueue = JSON.parse(JSON.stringify(purchaseLots));
    const saleCogsMapping = {};
    
    for (const sale of salesLines) {
      if (!saleCogsMapping[sale.id]) {
        saleCogsMapping[sale.id] = { cogs: 0, itemCogs: {} };
      }

      let qtyToFulfill = sale.qty;
      let costForThisSaleItem = 0;
      
      const itemInfo = items.find(i => i.id === sale.itemId);

      if(itemInfo?.hasImei && sale.serials.length > 0) {
        // Special handling for IMEI items could be done here by finding exact purchase lot.
        // For now, falling back to general FIFO
      }
      
      for (let i = 0; i < purchaseQueue.length; i++) {
        if (purchaseQueue[i].itemId !== sale.itemId || purchaseQueue[i].qty === 0) continue;
        
        const qtyFromLot = Math.min(qtyToFulfill, purchaseQueue[i].qty);
        costForThisSaleItem += qtyFromLot * purchaseQueue[i].cost;
        purchaseQueue[i].qty -= qtyFromLot;
        qtyToFulfill -= qtyFromLot;
        
        if (qtyToFulfill === 0) break;
      }
      
      if (qtyToFulfill > 0) {
          const fallbackPrice = itemInfo?.purchasePrice || 0;
          costForThisSaleItem += qtyToFulfill * fallbackPrice;
      }
      
      saleCogsMapping[sale.id].cogs += costForThisSaleItem;
      saleCogsMapping[sale.id].itemCogs[sale.itemId] = (saleCogsMapping[sale.id].itemCogs[sale.itemId] || 0) + costForThisSaleItem;
    }

    return saleCogsMapping;
  }, [purchases, sales, items]);

  const getProfitOfSale = useCallback((sale) => {
    if (!sale || !sale.items) return { totalProfit: 0, itemProfits: {} };
    
    const saleCogs = fifoData[sale.id]?.cogs || 0;
    
    const itemProfits = {};
    (sale.items || []).forEach(saleItem => {
        const itemCogs = fifoData[sale.id]?.itemCogs?.[saleItem.itemId] || 0;
        const revenue = toNumber(saleItem.price) * toNumber(saleItem.quantity);
        const profit = revenue - itemCogs;
        const cogsUnit = toNumber(saleItem.quantity) > 0 ? itemCogs / toNumber(saleItem.quantity) : 0;
        
        itemProfits[saleItem.itemId] = {
            cogs: itemCogs,
            profit,
            revenue,
            cogs_unit_pkr: cogsUnit,
            cogs_total_pkr: itemCogs,
        };
    });
    
    const totalRevenue = sale.items.reduce((sum, item) => sum + (toNumber(item.price) * toNumber(item.quantity)), 0);
    const saleDiscount = sale.discount?.type === 'flat' ? (toNumber(sale.discount.value) || 0) : (totalRevenue * (toNumber(sale.discount?.value) || 0) / 100);

    const grossProfit = totalRevenue - saleCogs;
    const netProfit = grossProfit - saleDiscount;

    return { totalProfit: netProfit, itemProfits };
  }, [fifoData]);

  return { getProfitOfSale };
};