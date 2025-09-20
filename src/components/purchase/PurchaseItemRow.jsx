import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { toNumber } from '@/lib/money';
import { SerialsManager } from './SerialsManager';
import ProductCombobox from '@/components/ProductCombobox';

const PurchaseItemRow = ({ item, index, onItemChange, onRemove, onAddNewItem, allItems, currencyCode, fxRate, baseCurrency }) => {
  const handleFieldChange = (field, value) => {
    let newItem = { ...item, [field]: value };

    const currentFxRate = toNumber(fxRate) || 1;
    
    if (field === 'itemId') {
      const selectedProduct = allItems.find(p => p.id === value);
      if (selectedProduct) {
        newItem.unit_price_foreign = selectedProduct.purchasePrice || 0;
        newItem.unit_price_local = (selectedProduct.purchasePrice || 0) * currentFxRate;
        if(selectedProduct.hasImei) {
          newItem.quantity = (newItem.serials || []).length;
        }
      }
    } else if (field === 'unit_price_foreign') {
      newItem.unit_price_local = (toNumber(value) || 0) * currentFxRate;
    } else if (field === 'quantity') {
       newItem.quantity = toNumber(value);
    }
    
    onItemChange(index, newItem);
  };

  const handleSerialsChange = (newSerials) => {
    onItemChange(index, { ...item, serials: newSerials, quantity: newSerials.length });
  };

  const selectedItem = useMemo(() => allItems.find(p => p.id === item.itemId), [item.itemId, allItems]);

  const totalInBase = useMemo(() => {
    const unitPriceLocal = toNumber(item.unit_price_local);
    const quantity = toNumber(item.quantity);
    return unitPriceLocal * quantity;
  }, [item.unit_price_local, item.quantity]);

  return (
    <Card className="p-4">
      <div className="grid grid-cols-12 gap-2 items-start">
        <div className="col-span-12 md:col-span-4">
          <label className="text-sm font-medium">Product</label>
           <ProductCombobox
              value={item.itemId}
              onChange={(value) => handleFieldChange('itemId', value)}
              onAddNewItem={onAddNewItem}
              items={allItems}
              placeholder="Select a product"
            />
        </div>
        <div className="col-span-6 md:col-span-1">
          <label className="text-sm font-medium">Quantity</label>
          <Input type="number" value={item.quantity} onChange={(e) => handleFieldChange('quantity', e.target.value)} readOnly={selectedItem?.hasImei} />
        </div>
        <div className="col-span-6 md:col-span-2">
          <label className="text-sm font-medium">Unit Price ({currencyCode})</label>
          <Input type="number" value={item.unit_price_foreign} onChange={(e) => handleFieldChange('unit_price_foreign', e.target.value)} />
        </div>
        <div className="col-span-6 md:col-span-2">
          <label className="text-sm font-medium">Unit Price ({baseCurrency})</label>
          <Input type="number" value={item.unit_price_local || 0} readOnly disabled className="bg-muted/50 text-right font-semibold" />
        </div>
        <div className="col-span-6 md:col-span-2">
          <label className="text-sm font-medium">Total ({baseCurrency})</label>
          <Input type="number" value={totalInBase.toFixed(2)} readOnly disabled className="bg-muted/50 text-right font-semibold" />
        </div>
        <div className="col-span-12 md:col-span-1 flex justify-end items-center self-end">
          <Button variant="destructive" size="icon" type="button" onClick={() => onRemove(index)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
      {selectedItem?.hasImei && (
        <div className="mt-4">
           <SerialsManager serials={item.serials || []} onSerialsChange={handleSerialsChange} />
        </div>
      )}
    </Card>
  );
};

export default PurchaseItemRow;