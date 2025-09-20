import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import SaleSerialsManager from '@/components/sales/SaleSerialsManager';
import { formatMoney, toNumber } from '@/lib/money';
import { useData } from '@/contexts/DataContext';
import ProductCombobox from '@/components/ProductCombobox';

const SaleItemRow = ({ item, index, onItemChange, onRemove, onAddNewItem, items, getItemStock, getAvailableSerials, sale, itemProfit }) => {
  const { data } = useData();
  const currencySymbol = data.settings.currencySymbol || 'RS';

  const itemInfo = items.find(i => i.id === item.itemId);

  const handleFieldChange = (field, value) => {
    const newItem = { ...item, [field]: value };
    
    if (field === 'itemId') {
      const selectedItem = items.find(i => i.id === value);
      if (selectedItem) {
        newItem.price = selectedItem.salePrice || 0;
        newItem.quantity = selectedItem.hasImei ? (newItem.serials || []).length : 1;
        if (!selectedItem.hasImei) {
            newItem.serials = [];
        }
      }
    } else if (field === 'quantity') {
       if (!itemInfo?.hasImei) {
          newItem.quantity = toNumber(value) || 0;
       }
    } else if (field === 'price') {
        newItem.price = toNumber(value) || 0;
    }
    
    onItemChange(index, newItem);
  };

  const handleSerialsChange = (newSerials) => {
    const newItem = { ...item, serials: newSerials, quantity: newSerials.length };
    onItemChange(index, newItem);
  };

  const lineTotal = (toNumber(item.quantity) || 0) * (toNumber(item.price) || 0);

  const profitValue = itemProfit?.profit;
  const cogsValue = itemProfit?.cogs;

  return (
    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
      <div className="grid grid-cols-12 gap-2 items-center">
        <div className="col-span-12 md:col-span-5">
            <ProductCombobox
              value={item.itemId}
              onChange={(value) => handleFieldChange('itemId', value)}
              onAddNewItem={onAddNewItem}
              items={items.filter(i => getItemStock(i.id) > 0 || (sale && sale.items.find(si => si.itemId === i.id)))}
              getStock={getItemStock}
              placeholder="Select an item"
            />
        </div>
        <div className="col-span-4 md:col-span-2">
          <Input 
            type="number" 
            placeholder="Qty" 
            value={item.quantity} 
            onChange={e => handleFieldChange('quantity', e.target.value)} 
            min="1" 
            readOnly={itemInfo?.hasImei} 
            className="text-center"
          />
        </div>
        <div className="col-span-4 md:col-span-2">
          <Input 
            type="number" 
            placeholder="Price" 
            value={item.price} 
            onChange={e => handleFieldChange('price', e.target.value)} 
            className="text-right"
          />
        </div>
        <div className="col-span-4 md:col-span-2">
          <Input 
            type="text" 
            placeholder="Total" 
            value={formatMoney(lineTotal, currencySymbol)}
            readOnly
            className="font-semibold text-right bg-background"
          />
        </div>
        <div className="col-span-12 md:col-span-1 flex justify-end">
          <Button type="button" variant="destructive" size="icon" onClick={() => onRemove(index)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {itemInfo && (
        <div className="flex justify-end items-center gap-4 text-xs">
          {cogsValue !== undefined && (
            <div className="text-muted-foreground">COGS: {formatMoney(cogsValue, currencySymbol)}</div>
          )}
          {profitValue !== undefined && (
            <div className={`font-semibold flex items-center gap-1 ${profitValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Profit: {formatMoney(profitValue, currencySymbol)}
              {profitValue >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            </div>
          )}
        </div>
      )}
      {itemInfo?.hasImei && (
        <SaleSerialsManager
          item={item}
          onSerialsChange={handleSerialsChange}
          getAvailableSerials={getAvailableSerials}
          sale={sale}
        />
      )}
    </div>
  );
};

export default SaleItemRow;